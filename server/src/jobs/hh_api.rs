use reqwest::Client;
use serde_json::json;

pub struct HHClient {
    client: Client,
    access_token: Option<String>,
}

impl HHClient {
    pub fn new() -> Self {
        Self {
            client: Client::new(),
            access_token: None,
        }
    }

    pub fn set_token(&mut self, token: String) {
        self.access_token = Some(token);
    }

    // OAuth authorization URL
    pub fn get_auth_url(client_id: &str, redirect_uri: &str) -> String {
        format!(
            "https://hh.ru/oauth/authorize?response_type=code&client_id={}&redirect_uri={}",
            client_id, redirect_uri
        )
    }

    // Exchange code for tokens
    pub async fn exchange_code(
        client_id: &str,
        client_secret: &str,
        code: &str,
        redirect_uri: &str,
    ) -> Result<(String, String, i64), String> {
        let client = Client::new();
        let res = client
            .post("https://hh.ru/oauth/token")
            .form(&[
                ("grant_type", "authorization_code"),
                ("client_id", client_id),
                ("client_secret", client_secret),
                ("code", code),
                ("redirect_uri", redirect_uri),
            ])
            .send()
            .await
            .map_err(|e| e.to_string())?;

        if !res.status().is_success() {
            return Err(format!("HH API error: {}", res.status()));
        }

        let data: serde_json::Value = res.json().await.map_err(|e| e.to_string())?;
        let access_token = data["access_token"].as_str().unwrap().to_string();
        let refresh_token = data["refresh_token"].as_str().unwrap().to_string();
        let expires_in = data["expires_in"].as_i64().unwrap();

        Ok((access_token, refresh_token, expires_in))
    }

    // Search vacancies
    pub async fn search_vacancies(
        &self,
        text: &str,
        area: Option<&str>,
        salary: Option<i64>,
    ) -> Result<Vec<serde_json::Value>, String> {
        let token = self.access_token.as_ref().ok_or("Not authorized")?;

        let mut params = vec![("text", text.to_string()), ("per_page", "50".to_string())];
        if let Some(area) = area {
            params.push(("area", area.to_string()));
        }
        if let Some(salary) = salary {
            params.push(("salary", salary.to_string()));
        }

        let res = self
            .client
            .get("https://api.hh.ru/vacancies")
            .query(&params)
            .header("Authorization", format!("Bearer {}", token))
            .header("HH-User-Agent", "bgalin.ru (contact@bgalin.ru)")
            .send()
            .await
            .map_err(|e| e.to_string())?;

        if !res.status().is_success() {
            return Err(format!("HH API error: {}", res.status()));
        }

        let data: serde_json::Value = res.json().await.map_err(|e| e.to_string())?;
        let items = data["items"]
            .as_array()
            .ok_or("No items in response")?
            .clone();

        Ok(items)
    }

    // Apply to vacancy
    pub async fn apply_to_vacancy(
        &self,
        vacancy_id: &str,
        cover_letter: &str,
        resume_id: &str,
    ) -> Result<String, String> {
        let token = self.access_token.as_ref().ok_or("Not authorized")?;

        let res = self
            .client
            .post(format!("https://api.hh.ru/negotiations"))
            .header("Authorization", format!("Bearer {}", token))
            .header("HH-User-Agent", "bgalin.ru (contact@bgalin.ru)")
            .json(&json!({
                "vacancy_id": vacancy_id,
                "resume_id": resume_id,
                "message": cover_letter
            }))
            .send()
            .await
            .map_err(|e| e.to_string())?;

        if !res.status().is_success() {
            return Err(format!("Apply error: {}", res.status()));
        }

        let data: serde_json::Value = res.json().await.map_err(|e| e.to_string())?;
        Ok(data["id"].as_str().unwrap_or("").to_string())
    }

    // Get my negotiations (responses)
    pub async fn get_negotiations(&self) -> Result<Vec<serde_json::Value>, String> {
        let token = self.access_token.as_ref().ok_or("Not authorized")?;

        let res = self
            .client
            .get("https://api.hh.ru/negotiations")
            .header("Authorization", format!("Bearer {}", token))
            .header("HH-User-Agent", "bgalin.ru (contact@bgalin.ru)")
            .send()
            .await
            .map_err(|e| e.to_string())?;

        if !res.status().is_success() {
            return Err(format!("HH API error: {}", res.status()));
        }

        let data: serde_json::Value = res.json().await.map_err(|e| e.to_string())?;
        let items = data["items"]
            .as_array()
            .ok_or("No items")?
            .clone();

        Ok(items)
    }

    // Get my resumes
    pub async fn get_resumes(&self) -> Result<Vec<serde_json::Value>, String> {
        let token = self.access_token.as_ref().ok_or("Not authorized")?;

        let res = self
            .client
            .get("https://api.hh.ru/resumes/mine")
            .header("Authorization", format!("Bearer {}", token))
            .header("HH-User-Agent", "bgalin.ru (contact@bgalin.ru)")
            .send()
            .await
            .map_err(|e| e.to_string())?;

        if !res.status().is_success() {
            return Err(format!("HH API error: {}", res.status()));
        }

        let data: serde_json::Value = res.json().await.map_err(|e| e.to_string())?;
        let items = data["items"]
            .as_array()
            .ok_or("No resumes")?
            .clone();

        Ok(items)
    }

    // Get specific negotiation details
    pub async fn get_negotiation(&self, negotiation_id: &str) -> Result<serde_json::Value, String> {
        let token = self.access_token.as_ref().ok_or("Not authorized")?;

        let res = self
            .client
            .get(&format!("https://api.hh.ru/negotiations/{}", negotiation_id))
            .header("Authorization", format!("Bearer {}", token))
            .header("HH-User-Agent", "bgalin.ru (contact@bgalin.ru)")
            .send()
            .await
            .map_err(|e| e.to_string())?;

        if !res.status().is_success() {
            return Err(format!("HH API error: {}", res.status()));
        }

        let data: serde_json::Value = res.json().await.map_err(|e| e.to_string())?;
        Ok(data)
    }

    // Get messages in a negotiation
    pub async fn get_messages(&self, negotiation_id: &str) -> Result<Vec<serde_json::Value>, String> {
        let token = self.access_token.as_ref().ok_or("Not authorized")?;

        let res = self
            .client
            .get(&format!("https://api.hh.ru/negotiations/{}/messages", negotiation_id))
            .header("Authorization", format!("Bearer {}", token))
            .header("HH-User-Agent", "bgalin.ru (contact@bgalin.ru)")
            .send()
            .await
            .map_err(|e| e.to_string())?;

        if !res.status().is_success() {
            return Err(format!("HH API error: {}", res.status()));
        }

        let data: serde_json::Value = res.json().await.map_err(|e| e.to_string())?;
        let items = data["items"]
            .as_array()
            .ok_or("No messages")?
            .clone();

        Ok(items)
    }

    // Send message in a negotiation
    pub async fn send_message(&self, negotiation_id: &str, message: &str) -> Result<(), String> {
        let token = self.access_token.as_ref().ok_or("Not authorized")?;

        let res = self
            .client
            .post(&format!("https://api.hh.ru/negotiations/{}/messages", negotiation_id))
            .header("Authorization", format!("Bearer {}", token))
            .header("HH-User-Agent", "bgalin.ru (contact@bgalin.ru)")
            .json(&json!({
                "message": message
            }))
            .send()
            .await
            .map_err(|e| e.to_string())?;

        if !res.status().is_success() {
            return Err(format!("Send message error: {}", res.status()));
        }

        Ok(())
    }

    // Get vacancy details
    pub async fn get_vacancy(&self, vacancy_id: &str) -> Result<serde_json::Value, String> {
        let token = self.access_token.as_ref().ok_or("Not authorized")?;

        let res = self
            .client
            .get(&format!("https://api.hh.ru/vacancies/{}", vacancy_id))
            .header("Authorization", format!("Bearer {}", token))
            .header("HH-User-Agent", "bgalin.ru (contact@bgalin.ru)")
            .send()
            .await
            .map_err(|e| e.to_string())?;

        if !res.status().is_success() {
            return Err(format!("HH API error: {}", res.status()));
        }

        let data: serde_json::Value = res.json().await.map_err(|e| e.to_string())?;
        Ok(data)
    }

    // Refresh access token
    pub async fn refresh_token(
        client_id: &str,
        client_secret: &str,
        refresh_token: &str,
    ) -> Result<(String, String, i64), String> {
        let client = Client::new();
        let res = client
            .post("https://hh.ru/oauth/token")
            .form(&[
                ("grant_type", "refresh_token"),
                ("client_id", client_id),
                ("client_secret", client_secret),
                ("refresh_token", refresh_token),
            ])
            .send()
            .await
            .map_err(|e| e.to_string())?;

        if !res.status().is_success() {
            return Err(format!("Refresh token error: {}", res.status()));
        }

        let data: serde_json::Value = res.json().await.map_err(|e| e.to_string())?;
        let access_token = data["access_token"].as_str().unwrap().to_string();
        let refresh_token = data["refresh_token"].as_str().unwrap().to_string();
        let expires_in = data["expires_in"].as_i64().unwrap();

        Ok((access_token, refresh_token, expires_in))
    }
}
