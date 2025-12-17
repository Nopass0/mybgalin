export interface VacancyEvaluation {
  score: number;
  match_reasons: string[];
  concerns: string[];
  salary_assessment: string;
  recommendation: string;
  priority: number;
}

export interface MessageAnalysis {
  is_bot: boolean;
  is_human_recruiter: boolean;
  requires_response: boolean;
  sentiment: string;
  intent: string;
  should_invite_telegram: boolean;
}

export interface SearchTags {
  primary_tags: string[];
  skill_tags: string[];
  industry_tags: string[];
  suggested_queries: string[];
}

export class AiService {
  private apiKey: string;
  private model: string;

  constructor(apiKey: string, model: string = "google/gemini-2.0-flash-001") {
    this.apiKey = apiKey;
    this.model = model;
  }

  private async callAi(
    systemPrompt: string,
    userPrompt: string,
  ): Promise<string> {
    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://bgalin.ru",
          "X-Title": "BGalin Job Search",
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.7,
        }),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `OpenRouter API error: ${response.status} - ${errorText}`,
      );
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || "";
  }

  private cleanJson(text: string): string {
    return text
      .trim()
      .replace(/^```json/, "")
      .replace(/^```/, "")
      .replace(/```$/, "")
      .trim();
  }

  async generateCoverLetter(
    vacancyTitle: string,
    vacancyDescription: string,
    resumeText: string,
    telegram: string,
    email: string,
  ): Promise<string> {
    const systemPrompt = `Ты опытный специалист, который ищет работу и пишет сопроводительные письма.
Твоя задача — написать искреннее, живое сопроводительное письмо на русском языке.

КРИТИЧЕСКИ ВАЖНО - Пиши как реальный человек:
- Используй разговорный, но профессиональный стиль
- Начинай НЕ с "Здравствуйте" или "Добрый день" (это штампы) — начни сразу с сути
- Покажи, что ты внимательно прочитал вакансию, упоминая конкретные детали
- Добавь немного личности: покажи интерес, энтузиазм, но без перебора
- Пиши короткими предложениями, избегай канцелярита
- НЕ используй шаблонные фразы типа "с большим интересом", "прошу рассмотреть мою кандидатуру"
- Допускай небольшую неформальность — ты живой человек, а не бот
- Упоминай конкретные проекты/опыт, которые релевантны именно этой вакансии

Структура (2-3 абзаца, максимум 800 символов):
1. Зацепка — почему именно эта вакансия/компания тебя заинтересовала + кратко кто ты
2. Твой релевантный опыт — конкретные примеры, не абстрактные слова
3. Короткое завершение с контактами

НЕ пиши подпись с именем в конце (она добавится автоматически).`;

    const userPrompt = `Вакансия: ${vacancyTitle}

Описание вакансии:
${vacancyDescription}

Моё резюме:
${resumeText}

Напиши сопроводительное письмо. В самом конце добавь:

---
Telegram: ${telegram}
Email: ${email}
Портфолио: https://bgalin.ru/resume`;

    return await this.callAi(systemPrompt, userPrompt);
  }

  async evaluateVacancy(
    vacancyTitle: string,
    vacancyDescription: string,
    company: string,
    salaryFrom: number | null,
    salaryTo: number | null,
    resumeText: string,
  ): Promise<VacancyEvaluation> {
    const systemPrompt = `Ты эксперт по карьерному консультированию. Оцени вакансию на соответствие резюме кандидата.

ВЕРНИ ТОЛЬКО JSON без markdown блоков, строго в формате:
{
  "score": 75,
  "match_reasons": ["причина 1", "причина 2"],
  "concerns": ["риск 1", "риск 2"],
  "salary_assessment": "оценка зарплаты",
  "recommendation": "apply",
  "priority": 4
}

Где:
- score: 0-100, насколько кандидат подходит под вакансию
- match_reasons: 2-4 причины почему подходит (конкретно!)
- concerns: 0-3 возможные проблемы (если есть)
- salary_assessment: краткая оценка адекватности зарплаты рынку
- recommendation: "apply" (откликаться), "skip" (пропустить), "maybe" (возможно)
- priority: 1-5 (5 = откликнуться первым делом)`;

    const salaryInfo =
      salaryFrom && salaryTo
        ? `${salaryFrom} - ${salaryTo} руб.`
        : salaryFrom
          ? `от ${salaryFrom} руб.`
          : salaryTo
            ? `до ${salaryTo} руб.`
            : "не указана";

    const userPrompt = `Вакансия: ${vacancyTitle}
Компания: ${company}
Зарплата: ${salaryInfo}

Описание вакансии:
${vacancyDescription}

Резюме кандидата:
${resumeText}

Оцени и верни JSON.`;

    const response = await this.callAi(systemPrompt, userPrompt);
    return JSON.parse(this.cleanJson(response));
  }

  async generateSearchTags(resumeText: string): Promise<SearchTags> {
    const systemPrompt = `Ты эксперт по поиску работы на hh.ru. На основе резюме сгенерируй оптимальные теги и запросы для поиска вакансий.

ВЕРНИ ТОЛЬКО JSON без markdown блоков:
{
  "primary_tags": ["Frontend Developer", "React Developer"],
  "skill_tags": ["React", "TypeScript", "Node.js"],
  "industry_tags": ["IT", "Fintech", "E-commerce"],
  "suggested_queries": ["React разработчик", "Frontend developer remote"]
}

Где:
- primary_tags: 2-4 названия должностей (на русском и английском)
- skill_tags: 4-8 ключевых технических навыков
- industry_tags: 2-4 отрасли где кандидат может быть востребован
- suggested_queries: 3-6 готовых поисковых запросов для hh.ru

Учитывай:
- Популярные названия вакансий на hh.ru
- Синонимы должностей
- Разные варианты написания (русский/английский)`;

    const userPrompt = `Резюме кандидата:
${resumeText}

Сгенерируй теги и поисковые запросы.`;

    const response = await this.callAi(systemPrompt, userPrompt);
    return JSON.parse(this.cleanJson(response));
  }

  async analyzeMessage(
    message: string,
    chatHistory: string,
  ): Promise<MessageAnalysis> {
    const systemPrompt = `Ты эксперт по HR-коммуникациям. Проанализируй сообщение от работодателя/рекрутера.

ВЕРНИ ТОЛЬКО JSON без markdown блоков:
{
  "is_bot": false,
  "is_human_recruiter": true,
  "requires_response": true,
  "sentiment": "positive",
  "intent": "invitation",
  "should_invite_telegram": true
}

Определи:
- is_bot: это автоматическое сообщение от бота? (шаблонные тексты, тесты, опросы)
- is_human_recruiter: это живой HR/рекрутер пишет?
- requires_response: нужно ли отвечать?
- sentiment: "positive" (интерес), "neutral" (информация), "negative" (отказ)
- intent: "question" (вопрос), "invitation" (приглашение), "rejection" (отказ), "info" (информация), "test" (тест/задание)
- should_invite_telegram: стоит ли предложить перейти в Telegram для удобства общения?`;

    const userPrompt = `История переписки:
${chatHistory}

Новое сообщение для анализа:
${message}

Проанализируй.`;

    const response = await this.callAi(systemPrompt, userPrompt);
    return JSON.parse(this.cleanJson(response));
  }

  async generateChatResponse(
    message: string,
    resumeText: string,
    vacancyTitle: string,
  ): Promise<string> {
    const systemPrompt = `Ты кандидат на работу, который общается с рекрутером. Напиши ответ на его сообщение.

КРИТИЧЕСКИ ВАЖНО - Пиши как живой человек:
- Естественный, дружелюбный тон
- Короткие предложения
- Отвечай конкретно на заданный вопрос
- Если спрашивают о навыках — приведи конкретные примеры из опыта
- Если приглашают — вырази энтузиазм, но без излишней восторженности
- Допускай небольшую неформальность
- НЕ пиши длинные простыни текста
- Максимум 3-4 предложения для обычных ответов

Если это вопрос о технических навыках или опыте — отвечай на основе резюме.
Если приглашают на собеседование — подтверди готовность и уточни детали.`;

    const userPrompt = `Вакансия: ${vacancyTitle}

Моё резюме:
${resumeText}

Сообщение от рекрутера:
${message}

Напиши естественный ответ.`;

    return await this.callAi(systemPrompt, userPrompt);
  }

  async generateChatIntro(
    coverLetter: string,
    telegram: string,
    email: string,
  ): Promise<string> {
    const systemPrompt = `Ты кандидат, который хочет представиться в чате после отклика на вакансию.

Напиши ОЧЕНЬ короткое вступление (1-2 предложения), которое:
- Не повторяет сопроводительное письмо
- Выражает живой интерес к позиции
- Показывает готовность к диалогу
- Звучит дружелюбно и профессионально

В конце добавь контакты для быстрой связи.

НЕ пиши "Здравствуйте" или "Добрый день" — начни сразу с сути.`;

    const userPrompt = `Сопроводительное письмо (для контекста, НЕ повторяй его):
${coverLetter}

Напиши короткое вступление и добавь:
Telegram для быстрой связи: ${telegram}
Email: ${email}`;

    return await this.callAi(systemPrompt, userPrompt);
  }

  async improveAboutText(text: string): Promise<string> {
    const systemPrompt = `Ты профессиональный редактор и карьерный консультант.
Твоя задача — улучшить текст "О себе" для портфолио разработчика.

КРИТИЧЕСКИ ВАЖНО:
- Сохрани смысл и ключевые факты
- Сделай текст более профессиональным, но живым
- Исправь грамматические и стилистические ошибки
- Структурируй текст, если он идет сплошным полотном
- Убери лишнюю "воду" и штампы
- Текст должен быть на русском языке
- Верни ТОЛЬКО улучшенный текст, без комментариев от себя`;

    const userPrompt = `Вот мой текущий текст "О себе":
${text}

Улучши его.`;

    return await this.callAi(systemPrompt, userPrompt);
  }
}
