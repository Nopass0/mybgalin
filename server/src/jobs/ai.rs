use reqwest::Client;
use serde::{Deserialize, Serialize};
use serde_json::json;

pub struct AIClient {
    client: Client,
    api_key: String,
    model: String,
}

/// Результат оценки вакансии AI
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VacancyEvaluation {
    pub score: i32,                    // 0-100 общий рейтинг соответствия
    pub match_reasons: Vec<String>,    // Почему подходит
    pub concerns: Vec<String>,         // Возможные проблемы
    pub salary_assessment: String,     // Оценка зарплаты
    pub recommendation: String,        // Рекомендация: apply/skip/maybe
    pub priority: i32,                 // Приоритет отклика 1-5
}

/// Результат анализа сообщения
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MessageAnalysis {
    pub is_bot: bool,
    pub is_human_recruiter: bool,
    pub requires_response: bool,
    pub sentiment: String,          // positive/neutral/negative
    pub intent: String,             // question/invitation/rejection/info
    pub should_invite_telegram: bool,
}

/// Сгенерированные теги для поиска
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchTags {
    pub primary_tags: Vec<String>,      // Основные теги (должность)
    pub skill_tags: Vec<String>,        // Теги навыков
    pub industry_tags: Vec<String>,     // Отрасли
    pub suggested_queries: Vec<String>, // Готовые поисковые запросы
}

impl AIClient {
    pub fn new(api_key: String, model: String) -> Self {
        Self {
            client: Client::new(),
            api_key,
            model,
        }
    }

    async fn call_ai(&self, system_prompt: &str, user_prompt: &str) -> Result<String, String> {
        let res = self
            .client
            .post("https://openrouter.ai/api/v1/chat/completions")
            .header("Authorization", format!("Bearer {}", self.api_key))
            .header("Content-Type", "application/json")
            .header("HTTP-Referer", "https://bgalin.ru")
            .header("X-Title", "BGalin Job Search")
            .json(&json!({
                "model": self.model,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                "temperature": 0.7
            }))
            .send()
            .await
            .map_err(|e| e.to_string())?;

        let status = res.status();
        if !status.is_success() {
            let error_body = res.text().await.unwrap_or_else(|_| "Unknown error".to_string());
            return Err(format!("OpenRouter API error: {} - {}", status, error_body));
        }

        let data: serde_json::Value = res.json().await.map_err(|e| e.to_string())?;
        let content = data["choices"][0]["message"]["content"]
            .as_str()
            .unwrap_or("")
            .to_string();

        Ok(content)
    }

    /// Генерация человечного сопроводительного письма
    pub async fn generate_cover_letter(
        &self,
        vacancy_title: &str,
        vacancy_description: &str,
        resume_text: &str,
        telegram: &str,
        email: &str,
    ) -> Result<String, String> {
        let system_prompt = r#"Ты опытный специалист, который ищет работу и пишет сопроводительные письма.
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

НЕ пиши подпись с именем в конце (она добавится автоматически)."#;

        let user_prompt = format!(
            r#"Вакансия: {}

Описание вакансии:
{}

Моё резюме:
{}

Напиши сопроводительное письмо. В самом конце добавь:

---
Telegram: {}
Email: {}
Портфолио: https://bgalin.ru/resume"#,
            vacancy_title, vacancy_description, resume_text, telegram, email
        );

        self.call_ai(system_prompt, &user_prompt).await
    }

    /// Оценка вакансии на соответствие резюме
    pub async fn evaluate_vacancy(
        &self,
        vacancy_title: &str,
        vacancy_description: &str,
        company: &str,
        salary_from: Option<i64>,
        salary_to: Option<i64>,
        resume_text: &str,
    ) -> Result<VacancyEvaluation, String> {
        let system_prompt = r#"Ты эксперт по карьерному консультированию. Оцени вакансию на соответствие резюме кандидата.

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
- priority: 1-5 (5 = откликнуться первым делом)"#;

        let salary_info = match (salary_from, salary_to) {
            (Some(from), Some(to)) => format!("{} - {} руб.", from, to),
            (Some(from), None) => format!("от {} руб.", from),
            (None, Some(to)) => format!("до {} руб.", to),
            (None, None) => "не указана".to_string(),
        };

        let user_prompt = format!(
            r#"Вакансия: {}
Компания: {}
Зарплата: {}

Описание вакансии:
{}

Резюме кандидата:
{}

Оцени и верни JSON."#,
            vacancy_title, company, salary_info, vacancy_description, resume_text
        );

        let response = self.call_ai(system_prompt, &user_prompt).await?;

        // Парсим JSON, убирая возможные markdown блоки
        let clean_json = response
            .trim()
            .trim_start_matches("```json")
            .trim_start_matches("```")
            .trim_end_matches("```")
            .trim();

        serde_json::from_str(clean_json)
            .map_err(|e| format!("Failed to parse evaluation: {} - Response: {}", e, response))
    }

    /// Генерация тегов для поиска на основе резюме
    pub async fn generate_search_tags(&self, resume_text: &str) -> Result<SearchTags, String> {
        let system_prompt = r#"Ты эксперт по поиску работы на hh.ru. На основе резюме сгенерируй оптимальные теги и запросы для поиска вакансий.

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
- Разные варианты написания (русский/английский)"#;

        let user_prompt = format!("Резюме кандидата:\n{}\n\nСгенерируй теги и поисковые запросы.", resume_text);

        let response = self.call_ai(system_prompt, &user_prompt).await?;

        let clean_json = response
            .trim()
            .trim_start_matches("```json")
            .trim_start_matches("```")
            .trim_end_matches("```")
            .trim();

        serde_json::from_str(clean_json)
            .map_err(|e| format!("Failed to parse tags: {} - Response: {}", e, response))
    }

    /// Анализ сообщения от работодателя
    pub async fn analyze_message(&self, message: &str, chat_history: &str) -> Result<MessageAnalysis, String> {
        let system_prompt = r#"Ты эксперт по HR-коммуникациям. Проанализируй сообщение от работодателя/рекрутера.

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
- should_invite_telegram: стоит ли предложить перейти в Telegram для удобства общения?

Признаки бота:
- Шаблонные формулировки
- Просьба пройти тест/опрос
- Ссылки на внешние формы
- Автоматические уведомления о просмотре

Когда приглашать в Telegram:
- Живой HR проявил интерес
- Назначают собеседование
- Обсуждение деталей вакансии
- НЕ приглашать если это отказ или автосообщение"#;

        let user_prompt = format!(
            "История переписки:\n{}\n\nНовое сообщение для анализа:\n{}\n\nПроанализируй.",
            chat_history, message
        );

        let response = self.call_ai(system_prompt, &user_prompt).await?;

        let clean_json = response
            .trim()
            .trim_start_matches("```json")
            .trim_start_matches("```")
            .trim_end_matches("```")
            .trim();

        serde_json::from_str(clean_json)
            .map_err(|e| format!("Failed to parse analysis: {} - Response: {}", e, response))
    }

    /// Генерация ответа на сообщение
    pub async fn generate_chat_response(
        &self,
        message: &str,
        resume_text: &str,
        vacancy_title: &str,
    ) -> Result<String, String> {
        let system_prompt = r#"Ты кандидат на работу, который общается с рекрутером. Напиши ответ на его сообщение.

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
Если приглашают на собеседование — подтверди готовность и уточни детали."#;

        let user_prompt = format!(
            r#"Вакансия: {}

Моё резюме:
{}

Сообщение от рекрутера:
{}

Напиши естественный ответ."#,
            vacancy_title, resume_text, message
        );

        self.call_ai(system_prompt, &user_prompt).await
    }

    /// Генерация вступительного сообщения для чата
    pub async fn generate_chat_intro(
        &self,
        cover_letter: &str,
        telegram: &str,
        email: &str,
    ) -> Result<String, String> {
        let system_prompt = r#"Ты кандидат, который хочет представиться в чате после отклика на вакансию.

Напиши ОЧЕНЬ короткое вступление (1-2 предложения), которое:
- Не повторяет сопроводительное письмо
- Выражает живой интерес к позиции
- Показывает готовность к диалогу
- Звучит дружелюбно и профессионально

В конце добавь контакты для быстрой связи.

НЕ пиши "Здравствуйте" или "Добрый день" — начни сразу с сути."#;

        let user_prompt = format!(
            r#"Сопроводительное письмо (для контекста, НЕ повторяй его):
{}

Напиши короткое вступление и добавь:
Telegram для быстрой связи: {}
Email: {}"#,
            cover_letter, telegram, email
        );

        self.call_ai(system_prompt, &user_prompt).await
    }

    /// Генерация приглашения в Telegram
    pub async fn generate_telegram_invite(
        &self,
        context: &str,
        telegram: &str,
    ) -> Result<String, String> {
        let system_prompt = r#"Ты кандидат, который хочет предложить рекрутеру перейти в Telegram для удобства общения.

Напиши ОЧЕНЬ короткое и вежливое предложение (1-2 предложения), которое:
- Звучит естественно, не навязчиво
- Объясняет выгоду (быстрее отвечу, удобнее созвониться)
- НЕ давит на человека

Примеры хороших формулировок:
- "Кстати, если удобнее — могу ответить быстрее в Telegram"
- "Для быстрой связи можно написать мне в Telegram"
- "Если нужно будет созвониться или обсудить детали — удобнее через Telegram""#;

        let user_prompt = format!(
            "Контекст разговора:\n{}\n\nTelegram: {}\n\nПредложи перейти в Telegram.",
            context, telegram
        );

        self.call_ai(system_prompt, &user_prompt).await
    }

    /// Улучшенный детектор бота
    pub fn is_bot_message(message: &str) -> bool {
        let message_lower = message.to_lowercase();

        // Явные признаки бота
        let bot_patterns = [
            "тестовое задание",
            "пройдите тест",
            "заполните анкету",
            "ответьте на вопросы",
            "пожалуйста, выберите",
            "выберите вариант",
            "нажмите кнопку",
            "автоматическое уведомление",
            "ваш отклик просмотрен",
            "благодарим за интерес",
            "оцените качество",
            "пройдите опрос",
            "заполните форму",
            "перейдите по ссылке",
            "нажмите для подтверждения",
        ];

        // Шаблонные начала
        let template_starts = [
            "уважаемый кандидат",
            "уважаемый соискатель",
            "добрый день! ваш отклик",
            "здравствуйте! благодарим",
            "спасибо за ваш отклик!",
        ];

        let has_bot_pattern = bot_patterns.iter().any(|p| message_lower.contains(p));
        let has_template_start = template_starts.iter().any(|p| message_lower.starts_with(p));

        // Слишком короткое автоматическое уведомление
        let is_short_notification = message.len() < 100 &&
            (message_lower.contains("просмотр") || message_lower.contains("получен"));

        has_bot_pattern || has_template_start || is_short_notification
    }

    #[allow(dead_code)]
    pub async fn parse_hh_resume(&self, resume_html: &str) -> Result<String, String> {
        let system_prompt = "Ты помощник по парсингу резюме с HH.ru. Извлеки данные из HTML и верни ТОЛЬКО JSON без дополнительного текста.";

        let user_prompt = format!(
            "Извлеки данные из этого HTML резюме с HH.ru и верни JSON:\n\n{}\n\nФормат ответа (верни ТОЛЬКО JSON, без markdown кодблоков):\n{{\n  \"about\": \"текст о себе\",\n  \"skills\": [{{\"name\": \"JavaScript\", \"category\": \"Frontend\"}}, ...],\n  \"experience\": [{{\"title\": \"Senior Developer\", \"company\": \"Company\", \"date_from\": \"Январь 2020\", \"date_to\": \"Декабрь 2023\", \"description\": \"описание\"}}, ...]\n}}",
            resume_html
        );

        self.call_ai(system_prompt, &user_prompt).await
    }

    pub async fn improve_about_text(&self, text: &str) -> Result<String, String> {
        let system_prompt = "Ты профессиональный копирайтер. Улучши текст 'О себе' для портфолио разработчика. ВАЖНО: Верни ТОЛЬКО улучшенный текст в Markdown формате, БЕЗ объяснений, вариантов, вступлений или комментариев.";

        let user_prompt = format!(
            "Улучши этот текст 'О себе' для портфолио:\n\n{}\n\nПравила форматирования:\n- Используй ### для подзаголовков (например: ### Опыт, ### Навыки)\n- **Жирный текст** для акцентов и ключевых слов\n- Маркированные списки через дефис (- элемент)\n- Нумерованные списки через цифру (1. элемент)\n- Обычный текст в параграфах, разделённых пустой строкой\n\nТребования:\n- Сохрани ВСЮ ключевую информацию из исходного текста\n- Профессиональный тон, структурированность\n- Максимум 6000 символов\n- Текст на русском языке\n- БЕЗ мета-текста (\"Вот улучшенный\", \"Вариант 1\" и т.д.)\n\nВерни ТОЛЬКО готовый Markdown текст. Не пиши что-то от себя, пиши только текст резюме сразу же без комментариев твоих. И делай это с расстановкой. К примеру есть bold подзаголовок, сделай перенос и списком bullet перечисли навыки, если там перечисление и т.д.",
            text
        );

        self.call_ai(system_prompt, &user_prompt).await
    }
}
