use super::models::{ShikimoriAnime, ShikimoriAnimeDetails};
use reqwest::Client;

pub struct ShikimoriClient {
    client: Client,
    base_url: String,
}

impl ShikimoriClient {
    pub fn new() -> Self {
        Self {
            client: Client::new(),
            base_url: "https://shikimori.one/api".to_string(),
        }
    }

    pub async fn search_anime(&self, query: &str) -> Result<Vec<ShikimoriAnime>, String> {
        let url = format!("{}/animes", self.base_url);

        let response = self
            .client
            .get(&url)
            .query(&[
                ("search", query),
                ("limit", "5"),
                ("order", "popularity"),
            ])
            .header("User-Agent", "BGalin Portfolio (bgalin.ru)")
            .send()
            .await
            .map_err(|e| format!("Request error: {}", e))?;

        if !response.status().is_success() {
            return Err(format!("Shikimori API error: {}", response.status()));
        }

        let animes: Vec<ShikimoriAnime> = response
            .json()
            .await
            .map_err(|e| format!("Parse error: {}", e))?;

        Ok(animes)
    }

    pub async fn get_anime_details(&self, id: i64) -> Result<ShikimoriAnimeDetails, String> {
        let url = format!("{}/animes/{}", self.base_url, id);

        let response = self
            .client
            .get(&url)
            .header("User-Agent", "BGalin Portfolio (bgalin.ru)")
            .send()
            .await
            .map_err(|e| format!("Request error: {}", e))?;

        if !response.status().is_success() {
            return Err(format!("Shikimori API error: {}", response.status()));
        }

        let details: ShikimoriAnimeDetails = response
            .json()
            .await
            .map_err(|e| format!("Parse error: {}", e))?;

        Ok(details)
    }

    pub fn get_cover_url(&self, id: i64) -> String {
        format!("https://shikimori.one/system/animes/original/{}.jpg", id)
    }

    // Helper to clean and prepare title for search
    pub fn prepare_title_for_search(title: &str) -> String {
        // Remove extra info in parentheses, trim, etc.
        let cleaned = title
            .split('(')
            .next()
            .unwrap_or(title)
            .trim()
            .to_string();

        cleaned
    }
}
