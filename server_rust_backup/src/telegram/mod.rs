use reqwest::Client;
use serde_json::json;

pub struct TelegramBot {
    bot_token: String,
    client: Client,
}

impl TelegramBot {
    pub fn new(bot_token: String) -> Self {
        Self {
            bot_token,
            client: Client::new(),
        }
    }

    pub async fn send_message(
        &self,
        chat_id: i64,
        text: &str,
    ) -> Result<(), Box<dyn std::error::Error>> {
        let url = format!("https://api.telegram.org/bot{}/sendMessage", self.bot_token);

        let response = self
            .client
            .post(&url)
            .json(&json!({
                "chat_id": chat_id,
                "text": text,
                "parse_mode": "HTML"
            }))
            .send()
            .await?;

        if !response.status().is_success() {
            let error_text = response.text().await?;
            return Err(format!("Telegram API error: {}", error_text).into());
        }

        Ok(())
    }

    pub async fn send_otp_code(
        &self,
        chat_id: i64,
        code: &str,
    ) -> Result<(), Box<dyn std::error::Error>> {
        let message = format!(
            "🔐 <b>Код для входа:</b>\n\n<code>{}</code>\n\nКод действителен 5 минут.",
            code
        );
        self.send_message(chat_id, &message).await
    }
}
