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

        if !res.status().is_success() {
            return Err(format!("OpenRouter API error: {}", res.status()));
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

        if !res.status().is_success() {
            return Err(format!("OpenRouter API error: {}", res.status()));
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

        if !res.status().is_success() {
            return Err(format!("OpenRouter API error: {}", res.status()));
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
}
