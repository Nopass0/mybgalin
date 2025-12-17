use reqwest::Client;
use serde_json::json;
use std::env;

pub struct N8nClient {
    client: Client,
    base_url: String,
}

impl N8nClient {
    pub fn new() -> Self {
        let host = env::var("N8N_HOST").unwrap_or_else(|_| "localhost:5678".to_string());
        let protocol = env::var("N8N_PROTOCOL").unwrap_or_else(|_| "http".to_string());
        let base_url = format!("{}://{}", protocol, host);

        Self {
            client: Client::new(),
            base_url,
        }
    }

    pub async fn trigger_webhook(&self, webhook_path: &str, payload: serde_json::Value) -> Result<serde_json::Value, String> {
        let url = format!("{}/webhook/{}", self.base_url, webhook_path);

        let response = self.client.post(&url)
            .json(&payload)
            .send()
            .await
            .map_err(|e| format!("Request failed: {}", e))?;

        if !response.status().is_success() {
            return Err(format!("n8n returned error: {}", response.status()));
        }

        response.json().await.map_err(|e| format!("Failed to parse response: {}", e))
    }

    pub async fn trigger_workflow(&self, workflow_name: &str, params: serde_json::Value) -> Result<String, String> {
        // Map friendly names to webhook paths if needed, or use direct paths
        let webhook_path = match workflow_name {
            "test" => "test_webhook",
            _ => workflow_name,
        };

        let result = self.trigger_webhook(webhook_path, params).await?;

        // Extract message from response if available, or return success
        Ok(result["message"].as_str().unwrap_or("Workflow triggered successfully").to_string())
    }
}
