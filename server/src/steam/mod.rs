use reqwest::Client;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone)]
pub struct SteamClient {
    api_key: String,
    steam_id: String,
    client: Client,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SteamPlayerSummary {
    pub personaname: String,
    pub avatarfull: String,
    pub gameextrainfo: Option<String>, // Current game name
    pub gameid: Option<String>,        // Current game ID
}

#[derive(Debug, Deserialize)]
struct PlayerSummariesResponse {
    response: PlayerSummariesData,
}

#[derive(Debug, Deserialize)]
struct PlayerSummariesData {
    players: Vec<SteamPlayerSummary>,
}

#[derive(Debug, Serialize)]
pub struct SteamProfile {
    pub nickname: String,
    pub avatar_url: String,
    pub current_game: Option<String>,
}

// Workshop structures
#[derive(Debug, Serialize, Deserialize)]
pub struct WorkshopItem {
    pub publishedfileid: String,
    pub title: String,
    pub description: String,
    pub preview_url: String,
    pub time_created: u64,
    pub time_updated: u64,
    pub subscriptions: u64,
    pub favorited: u64,
    pub views: u64,
    pub tags: Vec<WorkshopTag>,
    pub file_url: Option<String>,
    pub file_size: u64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct WorkshopTag {
    pub tag: String,
}

#[derive(Debug, Deserialize)]
struct WorkshopResponse {
    response: WorkshopData,
}

#[derive(Debug, Deserialize)]
struct WorkshopData {
    publishedfiledetails: Vec<WorkshopItemRaw>,
}

#[derive(Debug, Deserialize)]
struct WorkshopItemRaw {
    publishedfileid: String,
    title: String,
    description: String,
    preview_url: String,
    time_created: u64,
    time_updated: u64,
    subscriptions: u64,
    favorited: u64,
    views: u64,
    tags: Option<Vec<WorkshopTag>>,
    file_url: Option<String>,
    file_size: u64,
}

#[derive(Debug, Deserialize)]
struct UserFilesResponse {
    response: UserFilesData,
}

#[derive(Debug, Deserialize)]
struct UserFilesData {
    total: u32,
    #[serde(default)]
    publishedfiledetails: Vec<PublishedFileIdWrapper>,
}

#[derive(Debug, Deserialize)]
struct PublishedFileIdWrapper {
    publishedfileid: String,
    #[serde(default)]
    title: String,
    #[serde(default)]
    short_description: String,
    #[serde(default)]
    preview_url: String,
    #[serde(default)]
    time_created: u64,
    #[serde(default)]
    time_updated: u64,
    #[serde(default)]
    subscriptions: u64,
    #[serde(default)]
    favorited: u64,
    #[serde(default)]
    views: u64,
    #[serde(default)]
    tags: Vec<WorkshopTag>,
    #[serde(default)]
    file_url: Option<String>,
    #[serde(default)]
    file_size: String,  // Steam API returns this as string!
}

impl SteamClient {
    pub fn new(api_key: String, steam_id: String) -> Self {
        Self {
            api_key,
            steam_id,
            client: Client::new(),
        }
    }

    pub async fn get_player_summary(&self) -> Result<SteamProfile, Box<dyn std::error::Error>> {
        let url = format!(
            "https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key={}&steamids={}",
            self.api_key, self.steam_id
        );

        let response = self.client.get(&url).send().await?;

        if !response.status().is_success() {
            return Err(format!("Steam API error: {}", response.status()).into());
        }

        let data: PlayerSummariesResponse = response.json().await?;

        let player = data
            .response
            .players
            .into_iter()
            .next()
            .ok_or("No player data found")?;

        Ok(SteamProfile {
            nickname: player.personaname,
            avatar_url: player.avatarfull,
            current_game: player.gameextrainfo,
        })
    }

    pub async fn get_workshop_items(&self, appid: u32) -> Result<Vec<WorkshopItem>, Box<dyn std::error::Error>> {
        // First, get list of published file IDs
        let url = format!(
            "https://api.steampowered.com/IPublishedFileService/GetUserFiles/v1/?key={}&steamid={}&appid={}&page=1&numperpage=100",
            self.api_key, self.steam_id, appid
        );

        println!("============ STEAM WORKSHOP DEBUG ============");
        println!("Fetching workshop items from: {}", url.replace(&self.api_key, "***"));
        println!("Steam ID: {}", self.steam_id);
        println!("App ID: {}", appid);

        let response = self.client.get(&url).send().await?;

        println!("HTTP Status: {}", response.status());

        if !response.status().is_success() {
            let error_msg = format!("Steam API error: {}", response.status());
            println!("ERROR: {}", error_msg);
            return Err(error_msg.into());
        }

        let response_text = response.text().await?;
        println!("Raw API Response: {}", response_text);

        let user_files: UserFilesResponse = match serde_json::from_str(&response_text) {
            Ok(data) => data,
            Err(e) => {
                println!("ERROR parsing JSON: {}", e);
                return Err(Box::new(e));
            }
        };

        println!("Total files found: {}", user_files.response.total);
        println!("Files in response: {}", user_files.response.publishedfiledetails.len());
        println!("============================================");

        if user_files.response.publishedfiledetails.is_empty() {
            return Ok(Vec::new());
        }

        // Convert the response data directly to WorkshopItem
        let items = user_files.response.publishedfiledetails
            .into_iter()
            .map(|file| WorkshopItem {
                publishedfileid: file.publishedfileid,
                title: file.title,
                description: file.short_description,
                preview_url: file.preview_url,
                time_created: file.time_created,
                time_updated: file.time_updated,
                subscriptions: file.subscriptions,
                favorited: file.favorited,
                views: file.views,
                tags: file.tags,
                file_url: file.file_url,
                file_size: file.file_size.parse::<u64>().unwrap_or(0),
            })
            .collect();

        Ok(items)
    }

    async fn get_workshop_details(&self, file_ids: &[String]) -> Result<Vec<WorkshopItem>, Box<dyn std::error::Error>> {
        let url = "https://api.steampowered.com/ISteamRemoteStorage/GetPublishedFileDetails/v1/";

        let mut form = Vec::new();
        form.push(("key".to_string(), self.api_key.clone()));
        form.push(("itemcount".to_string(), file_ids.len().to_string()));

        for (i, id) in file_ids.iter().enumerate() {
            form.push((format!("publishedfileids[{}]", i), id.clone()));
        }

        let response = self.client.post(url).form(&form).send().await?;

        if !response.status().is_success() {
            return Err(format!("Steam API error: {}", response.status()).into());
        }

        let data: WorkshopResponse = response.json().await?;

        let items = data.response.publishedfiledetails
            .into_iter()
            .map(|raw| WorkshopItem {
                publishedfileid: raw.publishedfileid,
                title: raw.title,
                description: raw.description,
                preview_url: raw.preview_url,
                time_created: raw.time_created,
                time_updated: raw.time_updated,
                subscriptions: raw.subscriptions,
                favorited: raw.favorited,
                views: raw.views,
                tags: raw.tags.unwrap_or_default(),
                file_url: raw.file_url,
                file_size: raw.file_size,
            })
            .collect();

        Ok(items)
    }
}
