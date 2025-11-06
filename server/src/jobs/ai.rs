use reqwest::Client;
use serde_json::json;

pub struct AIClient {
    client: Client,
    api_key: String,
    model: String,
}

impl AIClient {
    pub fn new(api_key: String, model: String) -> Self {
        Self {
            client: Client::new(),
            api_key,
            model,
        }
    }

    pub async fn generate_cover_letter(
        &self,
        vacancy_title: &str,
        vacancy_description: &str,
        resume_text: &str,
        telegram: &str,
        email: &str,
    ) -> Result<String, String> {
        let system_prompt = "Ты профессиональный HR-ассистент. Напиши краткое сопроводительное письмо на русском языке для отклика на вакансию. Письмо должно быть профессиональным, 3-4 абзаца.";

        let user_prompt = format!(
            "Вакансия: {}\n\nОписание вакансии:\n{}\n\nМое резюме:\n{}\n\nНапиши сопроводительное письмо. В конце добавь контакты:\nTelegram: {}\nEmail: {}\nПортфолио: https://bgalin.ru/resume",
            vacancy_title, vacancy_description, resume_text, telegram, email
        );

        let res = self
            .client
            .post("https://openrouter.ai/api/v1/chat/completions")
            .header("Authorization", format!("Bearer {}", self.api_key))
            .header("Content-Type", "application/json")
            .header("HTTP-Referer", "https://bgalin.ru")
            .header("X-Title", "BGalin Portfolio")
            .json(&json!({
                "model": self.model,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ]
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
        let cover_letter = data["choices"][0]["message"]["content"]
            .as_str()
            .unwrap_or("")
            .to_string();

        Ok(cover_letter)
    }

    pub async fn generate_chat_response(
        &self,
        question: &str,
        resume_text: &str,
        vacancy_title: &str,
    ) -> Result<String, String> {
        let system_prompt = "Ты помощник по поиску работы. Отвечай на вопросы рекрутеров от лица кандидата на основе его резюме. Отвечай кратко, профессионально, на русском языке.";

        let user_prompt = format!(
            "Вакансия: {}\n\nМое резюме:\n{}\n\nВопрос от рекрутера: {}\n\nОтветь на вопрос кратко и по делу.",
            vacancy_title, resume_text, question
        );

        let res = self
            .client
            .post("https://openrouter.ai/api/v1/chat/completions")
            .header("Authorization", format!("Bearer {}", self.api_key))
            .header("Content-Type", "application/json")
            .header("HTTP-Referer", "https://bgalin.ru")
            .header("X-Title", "BGalin Portfolio")
            .json(&json!({
                "model": self.model,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ]
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
        let response = data["choices"][0]["message"]["content"]
            .as_str()
            .unwrap_or("")
            .to_string();

        Ok(response)
    }

    pub async fn generate_chat_intro(
        &self,
        cover_letter: &str,
        telegram: &str,
        email: &str,
    ) -> Result<String, String> {
        let system_prompt = "Ты помощник по поиску работы. Создай короткое вступительное сообщение для чата с рекрутером на основе сопроводительного письма. Максимум 2-3 предложения и контакты.";

        let user_prompt = format!(
            "Сопроводительное письмо:\n{}\n\nСоздай краткое вступительное сообщение для чата. В конце добавь:\nКонтакты для связи:\nTelegram: {}\nEmail: {}",
            cover_letter, telegram, email
        );

        let res = self
            .client
            .post("https://openrouter.ai/api/v1/chat/completions")
            .header("Authorization", format!("Bearer {}", self.api_key))
            .header("Content-Type", "application/json")
            .header("HTTP-Referer", "https://bgalin.ru")
            .header("X-Title", "BGalin Portfolio")
            .json(&json!({
                "model": self.model,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ]
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
        let intro = data["choices"][0]["message"]["content"]
            .as_str()
            .unwrap_or("")
            .to_string();

        Ok(intro)
    }

    // Detect if message is from a bot (contains typical bot patterns)
    pub fn is_bot_message(message: &str) -> bool {
        let bot_patterns = [
            "тестовое задание",
            "пройдите тест",
            "заполните анкету",
            "ответьте на вопросы",
            "пожалуйста, выберите",
            "выберите вариант",
            "нажмите кнопку",
        ];

        let message_lower = message.to_lowercase();
        bot_patterns.iter().any(|pattern| message_lower.contains(pattern))
    }

    pub async fn parse_hh_resume(&self, resume_html: &str) -> Result<String, String> {
        let system_prompt = "Ты помощник по парсингу резюме с HH.ru. Извлеки данные из HTML и верни ТОЛЬКО JSON без дополнительного текста.";

        let user_prompt = format!(
            "Извлеки данные из этого HTML резюме с HH.ru и верни JSON:\n\n{}\n\nФормат ответа (верни ТОЛЬКО JSON, без markdown кодблоков):\n{{\n  \"about\": \"текст о себе\",\n  \"skills\": [{{\"name\": \"JavaScript\", \"category\": \"Frontend\"}}, ...],\n  \"experience\": [{{\"title\": \"Senior Developer\", \"company\": \"Company\", \"date_from\": \"Январь 2020\", \"date_to\": \"Декабрь 2023\", \"description\": \"описание\"}}, ...]\n}}",
            resume_html
        );

        let res = self
            .client
            .post("https://openrouter.ai/api/v1/chat/completions")
            .header("Authorization", format!("Bearer {}", self.api_key))
            .header("Content-Type", "application/json")
            .header("HTTP-Referer", "https://bgalin.ru")
            .header("X-Title", "BGalin Portfolio")
            .json(&json!({
                "model": self.model,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ]
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
        let parsed_json = data["choices"][0]["message"]["content"]
            .as_str()
            .unwrap_or("")
            .to_string();

        Ok(parsed_json)
    }

    pub async fn improve_about_text(&self, text: &str) -> Result<String, String> {
        let system_prompt = "Ты профессиональный копирайтер. Улучши текст 'О себе' для портфолио разработчика. ВАЖНО: Верни ТОЛЬКО улучшенный текст в Markdown формате, БЕЗ объяснений, вариантов, вступлений или комментариев.";

        let user_prompt = format!(
            "Улучши этот текст 'О себе' для портфолио:\n\n{}\n\nПравила форматирования:\n- Используй ### для подзаголовков (например: ### Опыт, ### Навыки)\n- **Жирный текст** для акцентов и ключевых слов\n- Маркированные списки через дефис (- элемент)\n- Нумерованные списки через цифру (1. элемент)\n- Обычный текст в параграфах, разделённых пустой строкой\n\nТребования:\n- Сохрани ВСЮ ключевую информацию из исходного текста\n- Профессиональный тон, структурированность\n- Максимум 6000 символов\n- Текст на русском языке\n- БЕЗ мета-текста (\"Вот улучшенный\", \"Вариант 1\" и т.д.)\n\nВерни ТОЛЬКО готовый Markdown текст. Не пиши что-то от себя, пиши только текст резюме сразу же без комментариев твоих. И делай это с расстановкой. К примеру есть bold подзаголовок, сделай перенос и списком bullet перечисли навыки, если там перечисление и т.д.",
            text
        );

        let res = self
            .client
            .post("https://openrouter.ai/api/v1/chat/completions")
            .header("Authorization", format!("Bearer {}", self.api_key))
            .header("Content-Type", "application/json")
            .header("HTTP-Referer", "https://bgalin.ru")
            .header("X-Title", "BGalin Portfolio")
            .json(&json!({
                "model": self.model,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ]
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
        let improved_text = data["choices"][0]["message"]["content"]
            .as_str()
            .unwrap_or("")
            .to_string();

        Ok(improved_text)
    }
}
