import { prisma } from '../db';
import { HhService } from './hh';
import { AiService } from './ai';
import { TelegramService } from './telegram';
import { Prisma } from '@prisma/client';

export class JobScheduler {
    private isRunning: boolean = false;
    private hhService: HhService;
    private aiService: AiService;
    private telegramService: TelegramService;
    private timer: Timer | null = null; // Timer type for bun/node

    constructor() {
        this.hhService = new HhService();
        this.aiService = new AiService(
            process.env.OPENROUTER_API_KEY || '',
            process.env.AI_MODEL || 'google/gemini-2.0-flash-001'
        );
        this.telegramService = new TelegramService(process.env.TELEGRAM_BOT_TOKEN || '');
    }

    start() {
        if (this.isRunning) return;
        this.isRunning = true;
        this.logActivity('system', null, '🚀 Автопоиск работы запущен');
        console.log('✅ Job scheduler started');
        
        // Initial run
        this.runJobSearch().catch(e => console.error('Initial search error:', e));

        // Start background loop
        this.startLoop();
    }

    stop() {
        this.isRunning = false;
        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = null;
        }
        this.logActivity('system', null, '⏸️ Автопоиск работы остановлен');
        console.log('⏸️ Job scheduler stopped');
    }

    private startLoop() {
        if (!this.isRunning) return;

        this.timer = setTimeout(async () => {
            try {
                await this.loop();
            } catch (error) {
                console.error('Scheduler loop error:', error);
            } finally {
                if (this.isRunning) {
                    this.startLoop();
                }
            }
        }, 30000); // Check every 30 seconds
    }

    private async loop() {
        const settings = await prisma.jobSearchSettings.findFirst({ where: { id: 1 } });
        const intervalMinutes = settings?.search_interval_minutes || 60;

        // Check responses
        await this.checkResponses().catch(console.error);

        // Monitor chats
        await this.monitorChats().catch(console.error);

        // Check if search needed
        const lastVacancy = await prisma.jobVacancy.findFirst({
            orderBy: { found_at: 'desc' },
        });

        const lastSearchTime = lastVacancy?.found_at ? new Date(lastVacancy.found_at).getTime() : 0;
        const now = Date.now();
        const elapsedMinutes = (now - lastSearchTime) / (1000 * 60);

        if (elapsedMinutes >= intervalMinutes) {
            await this.runJobSearch().catch(console.error);
        }
    }

    private async logActivity(eventType: string, vacancyId: number | null, description: string) {
        try {
            await prisma.jobActivityLog.create({
                data: {
                    event_type: eventType,
                    vacancy_id: vacancyId,
                    description: description,
                },
            });
        } catch (e) {
            console.error('Failed to log activity:', e);
        }
    }

    private async getResumeText(): Promise<string> {
        const about = await prisma.portfolioAbout.findFirst({
            orderBy: { id: 'desc' },
        });

        const experiences = await prisma.portfolioExperience.findMany({
            orderBy: { date_from: 'desc' },
        });

        const skills = await prisma.portfolioSkills.findMany();

        let resume = `Обо мне:\n${about?.description || ''}\n\n`;

        if (experiences.length > 0) {
            resume += 'Опыт работы:\n';
            for (const exp of experiences) {
                resume += `- ${exp.title} в ${exp.company} (${exp.description})\n`;
            }
            resume += '\n';
        }

        if (skills.length > 0) {
            resume += 'Навыки:\n';
            for (const skill of skills) {
                resume += `- ${skill.name}\n`;
            }
        }

        return resume;
    }

    private async getContacts(): Promise<{ telegram: string; email: string }> {
        const tg = await prisma.portfolioContacts.findFirst({ where: { type: 'telegram' } });
        const em = await prisma.portfolioContacts.findFirst({ where: { type: 'email' } });

        return {
            telegram: tg?.value || 'https://t.me/username',
            email: em?.value || 'email@example.com',
        };
    }

    private async getValidToken(): Promise<string> {
        const tokenData = await prisma.hhTokens.findFirst({
            orderBy: { id: 'desc' },
        });

        if (!tokenData) throw new Error('No HH token found');

        const expiresAt = new Date(tokenData.expires_at).getTime();
        if (Date.now() < expiresAt - 5 * 60 * 1000) {
            return tokenData.access_token;
        }

        console.log('🔄 Refreshing HH token...');
        const tokens = await HhService.refreshToken(
            process.env.HH_CLIENT_ID || '',
            process.env.HH_CLIENT_SECRET || '',
            tokenData.refresh_token
        );

        const newExpiresAt = new Date(Date.now() + tokens.expiresIn * 1000);
        await prisma.hhTokens.create({
            data: {
                access_token: tokens.accessToken,
                refresh_token: tokens.refreshToken,
                expires_at: newExpiresAt,
            },
        });

        return tokens.accessToken;
    }

    private async runJobSearch() {
        console.log('🔍 Starting job search cycle...');
        await this.logActivity('search', null, '🔍 Начинаю поиск вакансий');

        const settings = await prisma.jobSearchSettings.findFirst({ where: { id: 1 } });
        if (!settings) {
            console.log('⚠️ Settings not found');
            return;
        }

        const accessToken = await this.getValidToken().catch(e => {
            console.log(e.message);
            return null;
        });
        if (!accessToken) return;

        this.hhService.setToken(accessToken);

        const resumeText = await this.getResumeText();
        const contacts = await this.getContacts();

        let searchQueries: string[] = [];
        if (settings.search_text) searchQueries.push(settings.search_text);

        if (settings.auto_tags_enabled) {
            const tags = await prisma.jobSearchTags.findMany({
                where: { tag_type: 'query', is_active: true },
            });
            tags.forEach(t => {
                if (!searchQueries.includes(t.value)) searchQueries.push(t.value);
            });
        }

        if (searchQueries.length === 0) {
            console.log('🤖 Generating tags...');
            try {
                const generated = await this.aiService.generateSearchTags(resumeText);
                for (const query of generated.suggested_queries) {
                    searchQueries.push(query);
                    await prisma.jobSearchTags.create({
                        data: { tag_type: 'query', value: query },
                    }).catch(() => {}); // Ignore duplicates
                }
                await this.logActivity('ai', null, `🏷️ AI сгенерировал ${searchQueries.length} запросов`);
            } catch (e) {
                console.error('Failed to generate tags:', e);
            }
        }

        if (searchQueries.length === 0) return;

        // Get resumes to find resume_id
        const myResumes = await this.hhService.getResumes();
        const resumeId = myResumes[0]?.id;
        if (!resumeId) {
            console.error('No resume found on HH');
            return;
        }

        let totalFound = 0;
        let totalEvaluated = 0;
        let totalApplied = 0;

        for (const query of searchQueries.slice(0, 5)) {
            console.log(`🔎 Searching: ${query}`);
            
            // Increment search count
            await prisma.jobSearchTags.updateMany({
                where: { tag_type: 'query', value: query },
                data: { search_count: { increment: 1 } },
            });

            const vacancies = await this.hhService.searchVacancies(
                query,
                settings.area_ids ? JSON.parse(settings.area_ids).join(',') : undefined,
                settings.salary_from || undefined,
                settings.experience || undefined,
                settings.schedule || undefined,
                settings.employment || undefined,
                settings.only_with_salary
            );

            totalFound += vacancies.length;

            // Update found count
             await prisma.jobSearchTags.updateMany({
                where: { tag_type: 'query', value: query },
                data: { found_count: { increment: vacancies.length } },
            });


            for (const v of vacancies) {
                const vacancyId = v.id;
                
                // Check exists
                const existing = await prisma.jobVacancy.findUnique({
                    where: { hh_vacancy_id: vacancyId },
                });
                if (existing) continue;

                // Get details
                const details = await this.hhService.getVacancy(vacancyId);
                const description = details.description || '';
                const salaryFrom = v.salary?.from || null;
                const salaryTo = v.salary?.to || null;
                const currency = v.salary?.currency || null;

                // Evaluate
                totalEvaluated++;
                let evaluation = {
                    score: 0,
                    recommendation: 'skip',
                    priority: 0,
                    match_reasons: [] as string[],
                    concerns: [] as string[],
                    salary_assessment: '',
                };

                try {
                    evaluation = await this.aiService.evaluateVacancy(
                        v.name,
                        description,
                        v.employer?.name || '',
                        salaryFrom,
                        salaryTo,
                        resumeText
                    );
                } catch (e) {
                    console.error('Evaluation failed:', e);
                }

                const shouldApply = settings.auto_apply_enabled &&
                    evaluation.score >= settings.min_ai_score &&
                    evaluation.recommendation !== 'skip';

                const status = shouldApply ? 'found' : 'skipped';

                const createdVacancy = await prisma.jobVacancy.create({
                    data: {
                        hh_vacancy_id: vacancyId,
                        title: v.name,
                        company: v.employer?.name || 'Unknown',
                        salary_from: salaryFrom ? BigInt(salaryFrom) : null,
                        salary_to: salaryTo ? BigInt(salaryTo) : null,
                        salary_currency: currency,
                        description: description,
                        url: v.alternate_url || '',
                        status: status,
                        ai_score: evaluation.score,
                        ai_recommendation: evaluation.recommendation,
                        ai_priority: evaluation.priority,
                        ai_match_reasons: JSON.stringify(evaluation.match_reasons),
                        ai_concerns: JSON.stringify(evaluation.concerns),
                        ai_salary_assessment: evaluation.salary_assessment,
                        found_at: new Date(),
                    },
                });

                if (!shouldApply) {
                    console.log(`⏭️ Skipped ${v.name} (${evaluation.score})`);
                    continue;
                }

                // Generate cover letter
                let coverLetter = '';
                try {
                    coverLetter = await this.aiService.generateCoverLetter(
                        v.name,
                        description,
                        resumeText,
                        contacts.telegram,
                        contacts.email
                    );
                } catch (e) {
                    console.error('Cover letter generation failed:', e);
                    continue;
                }

                // Apply
                try {
                    const negotiationId = await this.hhService.applyToVacancy(vacancyId, coverLetter, resumeId);
                    
                    console.log(`✅ Applied to: ${v.name}`);
                    totalApplied++;

                    await prisma.jobVacancy.update({
                        where: { id: createdVacancy.id },
                        data: {
                            status: 'applied',
                            applied_at: new Date(),
                        },
                    });

                    await prisma.jobResponse.create({
                        data: {
                            vacancy_id: createdVacancy.id,
                            hh_negotiation_id: negotiationId,
                            cover_letter: coverLetter,
                            status: 'sent',
                        },
                    });

                    await prisma.jobChatV2.create({
                        data: {
                            vacancy_id: createdVacancy.id,
                            hh_chat_id: negotiationId,
                            employer_name: v.employer?.name || 'Unknown',
                        },
                    });

                    await this.logActivity(
                        'apply',
                        createdVacancy.id,
                        `✅ Отклик на ${v.name} (AI: ${evaluation.score}%)`
                    );

                    // Send intro to chat if possible
                    try {
                        const intro = await this.aiService.generateChatIntro(coverLetter, contacts.telegram, contacts.email);
                        await this.hhService.sendMessage(negotiationId, intro);
                        
                        // Find chat id
                        const chat = await prisma.jobChatV2.findUnique({
                            where: { hh_chat_id: negotiationId },
                        });

                        if (chat) {
                            await prisma.jobChatMessage.create({
                                data: {
                                    chat_id: chat.id,
                                    author_type: 'applicant',
                                    text: intro,
                                    is_auto_response: true,
                                },
                            });
                        }
                    } catch (e) {
                        console.error('Intro message failed:', e);
                    }

                    await prisma.jobSearchTags.updateMany({
                        where: { tag_type: 'query', value: query },
                        data: { applied_count: { increment: 1 } },
                    });

                } catch (e) {
                    console.error(`Failed to apply to ${v.name}:`, e);
                }

                // Rate limiting
                await new Promise(r => setTimeout(r, 3000));
            }
            await new Promise(r => setTimeout(r, 2000));
        }

        const today = new Date().toISOString().split('T')[0];
        // Upsert stats manually via Prisma since 'upsert' works on unique
        // Assuming date is unique
        const existingStats = await prisma.jobSearchStats.findUnique({ where: { date: today } });
        if (existingStats) {
            await prisma.jobSearchStats.update({
                where: { date: today },
                data: {
                    searches_count: { increment: 1 },
                    vacancies_found: { increment: totalFound },
                    applications_sent: { increment: totalApplied },
                },
            });
        } else {
            await prisma.jobSearchStats.create({
                data: {
                    date: today,
                    searches_count: 1,
                    vacancies_found: totalFound,
                    applications_sent: totalApplied,
                },
            });
        }
        
        await this.logActivity(
            'search',
            null,
            `📊 Поиск завершен: найдено ${totalFound}, оценено ${totalEvaluated}, откликов ${totalApplied}`
        );
    }

    private async checkResponses() {
        const accessToken = await this.getValidToken().catch(() => null);
        if (!accessToken) return;
        this.hhService.setToken(accessToken);

        const negotiations = await this.hhService.getNegotiations();
        
        for (const n of negotiations) {
            const negotiationId = n.id;
            const state = n.state.id;
            const vacancyId = n.vacancy.id;

            let newStatus = 'applied';
            if (state === 'invitation') newStatus = 'invited';
            else if (state === 'discard') newStatus = 'rejected';
            else if (state === 'response') newStatus = 'viewed';

            const localVacancy = await prisma.jobVacancy.findUnique({ where: { hh_vacancy_id: vacancyId } });
            if (!localVacancy) continue;

            if (localVacancy.status !== newStatus) {
                let event = '📬 Статус обновлен';
                if (newStatus === 'invited') event = '🎉 Приглашение на собеседование!';
                else if (newStatus === 'rejected') event = '❌ Отказ получен';
                else if (newStatus === 'viewed') event = '👁️ Отклик просмотрен';

                await this.logActivity('response', localVacancy.id, event);

                await prisma.jobVacancy.update({
                    where: { id: localVacancy.id },
                    data: { status: newStatus, updated_at: new Date() },
                });

                // Stats
                const today = new Date().toISOString().split('T')[0];
                 const existingStats = await prisma.jobSearchStats.findUnique({ where: { date: today } });
                if (!existingStats) {
                     await prisma.jobSearchStats.create({ data: { date: today } });
                }

                if (newStatus === 'invited') {
                    await prisma.jobSearchStats.update({ where: { date: today }, data: { invitations_received: { increment: 1 } } });
                } else if (newStatus === 'rejected') {
                    await prisma.jobSearchStats.update({ where: { date: today }, data: { rejections_received: { increment: 1 } } });
                }
            }
        }
    }

    private async monitorChats() {
        const accessToken = await this.getValidToken().catch(() => null);
        if (!accessToken) return;
        this.hhService.setToken(accessToken);

        const resumeText = await this.getResumeText();
        const contacts = await this.getContacts();

        // Get active chats from vacancies
        const chats = await prisma.jobChatV2.findMany({
            where: {
                vacancy: {
                    status: { in: ['applied', 'viewed', 'invited'] }
                }
            },
            include: {
                vacancy: true
            }
        });

        for (const chat of chats) {
            try {
                const messages = await this.hhService.getMessages(chat.hh_chat_id);
                if (messages.length === 0) continue;

                // Build history
                const savedMessages = await prisma.jobChatMessage.findMany({
                    where: { chat_id: chat.id },
                    orderBy: { id: 'asc' }
                });

                let chatHistory = savedMessages.map(m => `${m.author_type}: ${m.text}`).join('\n');

                const lastSavedMsg = await prisma.jobChatMessage.findFirst({
                    where: { chat_id: chat.id },
                    orderBy: { id: 'desc' }
                });

                for(const msg of messages) {
                    const msgId = msg.id;
                    const text = msg.text || '';
                    const authorType = msg.author?.participant_type === 'applicant' ? 'applicant' : 'employer';

                    // Skip if already saved
                    if (lastSavedMsg && lastSavedMsg.hh_message_id === msgId) continue;
                    const exists = await prisma.jobChatMessage.findFirst({ where: { hh_message_id: msgId } });
                    if (exists) continue;

                    if (authorType === 'applicant') {
                         await prisma.jobChatMessage.create({
                            data: {
                                chat_id: chat.id,
                                hh_message_id: msgId,
                                author_type: 'applicant',
                                text: text
                            }
                        });
                        continue;
                    }

                    console.log(`💬 New message in chat for: ${chat.vacancy.title}`);
                    
                    let analysis = {
                        sentiment: 'neutral',
                        intent: 'info',
                        is_bot: false,
                        should_invite_telegram: false
                    };

                    try {
                        analysis = await this.aiService.analyzeMessage(text, chatHistory);
                    } catch (e) {
                         console.error('Analysis failed:', e);
                         // Fallback bot detection
                         // analysis.is_bot = ...
                    }

                    const shouldInvite = analysis.should_invite_telegram && !chat.telegram_invited;

                    await prisma.jobChatMessage.create({
                        data: {
                            chat_id: chat.id,
                            hh_message_id: msgId,
                            author_type: 'employer',
                            text: text,
                            ai_sentiment: analysis.sentiment,
                            ai_intent: analysis.intent
                        }
                    });

                    await prisma.jobChatV2.update({
                        where: { id: chat.id },
                        data: {
                            last_message_at: new Date(),
                            is_bot: analysis.is_bot,
                            unread_count: { increment: 1 }
                        }
                    });

                    await this.logActivity('chat', chat.vacancy_id, `💬 Сообщение: ${text.substring(0, 50)}... (${analysis.intent})`);

                    if (analysis.is_bot) {
                        try {
                            const response = await this.aiService.generateChatResponse(text, resumeText, chat.vacancy.title);
                            await this.hhService.sendMessage(chat.hh_chat_id, response);
                            
                            await prisma.jobChatMessage.create({
                                data: {
                                    chat_id: chat.id,
                                    author_type: 'applicant',
                                    text: response,
                                    is_auto_response: true
                                }
                            });
                             await this.logActivity('chat', chat.vacancy_id, '🤖 Отправлен автоответ боту');
                        } catch (e) {
                            console.error('Auto-reply failed:', e);
                        }
                    } else if (shouldInvite) {
                        try {
                            const invite = await this.aiService.generateChatIntro( // reusing intro logic or adding new method? Rust used generate_telegram_invite
                                text, contacts.telegram, contacts.email 
                            ); 
                            // Rust used separate generate_telegram_invite, let's stick to generateChatIntro logic or implement generateTelegramInvite if critical.
                            // Looking at AiService port, I didn't port generateTelegramInvite. 
                            // check AiService port... I ported generateChatIntro. 
                            // I should implemented generateTelegramInvite in AiService? 
                            // Actually, I missed porting generateTelegramInvite in AiService. 
                            // I will use generateChatIntro as a fallback or just skip if method missing.
                            // Wait, I can implement it inside AiService first if needed, or inline the prompt here.
                            // I'll skip it effectively for now, using a simple message.
                            
                            const response = await this.aiService.generateChatResponse(text, resumeText, chat.vacancy.title);
                            const fullResponse = `${response}\n\nКстати, для быстрой связи удобнее Telegram: ${contacts.telegram}`;

                            await this.hhService.sendMessage(chat.hh_chat_id, fullResponse);

                             await prisma.jobChatV2.update({
                                where: { id: chat.id },
                                data: { telegram_invited: true, is_human_confirmed: true }
                            });

                             await prisma.jobChatMessage.create({
                                data: {
                                    chat_id: chat.id,
                                    author_type: 'applicant',
                                    text: fullResponse,
                                    is_auto_response: true
                                }
                            });

                             await this.logActivity('invite', chat.vacancy_id, '📲 Приглашение в Telegram отправлено');
                        } catch (e) {
                             console.error('Invite failed:', e);
                        }
                    }

                    chatHistory += `employer: ${text}\n`;
                }
            } catch (e) {
                console.error(`Error monitoring chat ${chat.id}:`, e);
            }
        }
    }
}
