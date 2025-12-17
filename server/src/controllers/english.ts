import { Elysia, t } from 'elysia';
import { prisma } from '../db';
import { authMiddleware } from '../middleware/auth';
import { EnglishService } from '../services/english';

export const englishController = (app: Elysia) =>
    app
        .use(authMiddleware)
        .group('/api/english', (app) =>
            app
                // Categories
                .get('/categories', async () => {
                    const categories = await prisma.englishCategory.findMany({
                        orderBy: { display_order: 'asc' },
                        include: {
                            _count: {
                                select: { words: true }
                            }
                        }
                    });
                    return { success: true, data: categories };
                }, { isAuthorized: true })
                .post('/categories', async ({ body }) => {
                    const category = await prisma.englishCategory.create({
                        data: body
                    });
                    return { success: true, data: category };
                }, {
                    body: t.Object({
                        name: t.String(),
                        name_ru: t.String(),
                        description: t.Optional(t.String()),
                        icon: t.Optional(t.String()),
                        color: t.Optional(t.String()),
                        display_order: t.Optional(t.Number()),
                    }),
                    isAuthorized: true
                })

                // Words
                .get('/words', async ({ query }) => {
                    const { category_id, search, status, limit = 50, offset = 0 } = query;

                    const where: any = {};
                    if (category_id) where.category_id = Number(category_id);
                    if (search) {
                        where.OR = [
                            { word: { contains: search, mode: 'insensitive' } },
                            { translation: { contains: search, mode: 'insensitive' } }
                        ];
                    }
                    if (status) {
                        where.progress = { status };
                    }

                    const words = await prisma.englishWord.findMany({
                        where,
                        include: {
                            progress: true,
                            category: { select: { name: true } }
                        },
                        orderBy: { created_at: 'desc' },
                        take: Number(limit),
                        skip: Number(offset)
                    });

                    return { success: true, data: words };
                }, { isAuthorized: true })
                .post('/words', async ({ body }) => {
                    const word = await prisma.englishWord.create({
                        data: body
                    });

                    await EnglishService.updateDailyStat('new_words_added', 1);
                    await EnglishService.addXp(5);

                    return { success: true, data: word };
                }, {
                    body: t.Object({
                        word: t.String(),
                        translation: t.String(),
                        category_id: t.Optional(t.Number()),
                        transcription: t.Optional(t.String()),
                        definition: t.Optional(t.String()),
                        part_of_speech: t.Optional(t.String()),
                        examples: t.Optional(t.String()),
                        synonyms: t.Optional(t.String()),
                        antonyms: t.Optional(t.String()),
                        difficulty: t.Optional(t.Number()),
                        cefr_level: t.Optional(t.String()),
                    }),
                    isAuthorized: true
                })
                .delete('/words/:id', async ({ params: { id } }) => {
                    await prisma.englishWord.delete({ where: { id: Number(id) } });
                    return { success: true, data: 'Word deleted' };
                }, { isAuthorized: true })

                // SRS Review
                .get('/due-words', async ({ query }) => {
                    const limit = Number(query.limit) || 20;
                    const now = new Date();

                    const words = await prisma.englishWord.findMany({
                        where: {
                            OR: [
                                { progress: null },
                                { progress: { next_review: { lte: now } } }
                            ]
                        },
                        include: {
                            progress: true,
                            category: { select: { name: true } }
                        },
                        orderBy: [
                            { progress: { next_review: 'asc' } }
                        ],
                        take: limit
                    });

                    return { success: true, data: words };
                }, { isAuthorized: true })
                .post('/review', async ({ body }) => {
                    const { word_id, quality } = body;
                    const q = Math.max(0, Math.min(5, quality));
                    const now = new Date();

                    const existing = await prisma.englishWordProgress.findUnique({
                        where: { word_id }
                    });

                    let ef = 2.5;
                    let interval = 0;
                    let reps = 0;
                    let status = 'new';

                    if (existing) {
                        ef = existing.ease_factor;
                        interval = existing.interval_days;
                        reps = existing.repetitions;

                        if (q >= 3) {
                            if (reps === 0) interval = 1;
                            else if (reps === 1) interval = 6;
                            else interval = Math.round(interval * ef);

                            reps += 1;
                            ef = ef + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
                            if (ef < 1.3) ef = 1.3;
                        } else {
                            reps = 0;
                            interval = 1;
                        }

                        status = (reps >= 5 && ef >= 2.5) ? 'mastered' : (reps >= 1 ? 'learning' : 'new');
                    } else {
                        if (q >= 3) {
                            interval = 1;
                            reps = 1;
                            status = 'learning';
                        }
                    }

                    const nextReview = new Date(now.getTime() + interval * 24 * 60 * 60 * 1000);
                    const masteryLevel = Math.min(100, Math.round((reps / 10) * 100));

                    const progress = await prisma.englishWordProgress.upsert({
                        where: { word_id },
                        update: {
                            ease_factor: ef,
                            interval_days: interval,
                            repetitions: reps,
                            next_review: nextReview,
                            last_review: now,
                            status,
                            mastery_level: masteryLevel,
                            correct_count: { increment: q >= 3 ? 1 : 0 },
                            incorrect_count: { increment: q < 3 ? 1 : 0 },
                            updated_at: now
                        },
                        create: {
                            word_id,
                            ease_factor: ef,
                            interval_days: interval,
                            repetitions: reps,
                            next_review: nextReview,
                            last_review: now,
                            status,
                            mastery_level: masteryLevel,
                            correct_count: q >= 3 ? 1 : 0,
                            incorrect_count: q < 3 ? 1 : 0
                        }
                    });

                    // Stats and XP
                    if (q >= 3) {
                        await EnglishService.updateDailyStat('words_reviewed', 1);
                        await EnglishService.updateDailyStat('correct_answers', 1);
                        await EnglishService.addXp(10);
                    } else {
                        await EnglishService.updateDailyStat('incorrect_answers', 1);
                    }

                    if (!existing) {
                        await EnglishService.updateDailyStat('words_learned', 1);
                        await EnglishService.checkAchievements();
                    }

                    return { success: true, data: progress };
                }, {
                    body: t.Object({
                        word_id: t.Number(),
                        quality: t.Number()
                    }),
                    isAuthorized: true
                })

                // Dashboard
                .get('/dashboard', async () => {
                    const [totalWords, wordsLearned, wordsToReview, settings] = await Promise.all([
                        prisma.englishWord.count(),
                        prisma.englishWordProgress.count({ where: { status: 'mastered' } }),
                        prisma.englishWordProgress.count({
                            where: { next_review: { lte: new Date() } }
                        }),
                        prisma.englishSettings.findFirst()
                    ]);

                    const today = new Date().toISOString().split('T')[0];
                    const todayStats = await prisma.englishDailyStats.findUnique({
                        where: { date: today }
                    });

                    return {
                        success: true,
                        data: {
                            total_words: totalWords,
                            words_learned: wordsLearned,
                            words_to_review: wordsToReview,
                            current_streak: settings?.current_streak || 0,
                            total_xp: settings?.total_xp || 0,
                            level: settings?.level || 1,
                            today_words_learned: todayStats?.words_learned || 0,
                            today_goal: settings?.daily_goal_words || 10
                        }
                    };
                }, { isAuthorized: true })
        );
