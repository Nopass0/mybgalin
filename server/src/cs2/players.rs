use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone)]
pub struct PlayerStatsClient {
    steam_api_key: String,
    faceit_api_key: Option<String>,
    client: Client,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PlayerStats {
    pub steamid: String,
    pub nickname: String,
    pub avatar_url: String,
    pub steam_level: Option<u32>,
    pub cs2_hours: Option<f32>,
    pub faceit_level: Option<u32>,
    pub faceit_elo: Option<u32>,
    pub account_created: Option<String>,
}

#[derive(Debug, Deserialize)]
struct SteamOwnedGamesResponse {
    response: SteamGamesData,
}

#[derive(Debug, Deserialize)]
struct SteamGamesData {
    games: Option<Vec<SteamGame>>,
}

#[derive(Debug, Deserialize)]
struct SteamGame {
    appid: u32,
    playtime_forever: u32, // in minutes
}

#[allow(dead_code)]
#[derive(Debug, Deserialize)]
struct SteamPlayerSummary {
    steamid: String,
    personaname: String,
    avatarfull: String,
    timecreated: Option<u64>,
}

#[derive(Debug, Deserialize)]
struct SteamPlayerSummariesResponse {
    response: SteamPlayersData,
}

#[derive(Debug, Deserialize)]
struct SteamPlayersData {
    players: Vec<SteamPlayerSummary>,
}

#[derive(Debug, Deserialize)]
struct SteamLevelResponse {
    response: SteamLevelData,
}

#[derive(Debug, Deserialize)]
struct SteamLevelData {
    player_level: u32,
}

#[allow(dead_code)]
#[derive(Debug, Deserialize)]
struct FaceitPlayerResponse {
    player_id: String,
    nickname: String,
    games: HashMap<String, FaceitGameStats>,
}

#[derive(Debug, Deserialize)]
struct FaceitGameStats {
    skill_level: Option<u32>,
    faceit_elo: Option<u32>,
}

impl PlayerStatsClient {
    pub fn new(steam_api_key: String, faceit_api_key: Option<String>) -> Self {
        Self {
            steam_api_key,
            faceit_api_key,
            client: Client::new(),
        }
    }

    pub async fn get_player_stats(&self, steamid: &str) -> Result<PlayerStats, Box<dyn std::error::Error>> {
        // Get player summary (name, avatar, account creation)
        let summary = self.get_player_summary(steamid).await?;

        // Get Steam level
        let steam_level = self.get_steam_level(steamid).await.ok();

        // Get CS2 hours (CS2 appid = 730)
        let cs2_hours = self.get_game_hours(steamid, 730).await.ok();

        // Get Faceit stats if API key is available
        let (faceit_level, faceit_elo) = if self.faceit_api_key.is_some() {
            match self.get_faceit_stats(steamid).await {
                Ok((level, elo)) => (Some(level), Some(elo)),
                Err(_) => (None, None),
            }
        } else {
            (None, None)
        };

        Ok(PlayerStats {
            steamid: steamid.to_string(),
            nickname: summary.0,
            avatar_url: summary.1,
            steam_level,
            cs2_hours,
            faceit_level,
            faceit_elo,
            account_created: summary.2,
        })
    }

    async fn get_player_summary(&self, steamid: &str) -> Result<(String, String, Option<String>), Box<dyn std::error::Error>> {
        let url = format!(
            "https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key={}&steamids={}",
            self.steam_api_key, steamid
        );

        let response: SteamPlayerSummariesResponse = self.client.get(&url).send().await?.json().await?;
        let player = response.response.players.into_iter().next()
            .ok_or("Player not found")?;

        let account_created = player.timecreated.map(|t| {
            chrono::DateTime::from_timestamp(t as i64, 0)
                .map(|dt| dt.format("%Y-%m-%d").to_string())
                .unwrap_or_default()
        });

        Ok((player.personaname, player.avatarfull, account_created))
    }

    async fn get_steam_level(&self, steamid: &str) -> Result<u32, Box<dyn std::error::Error>> {
        let url = format!(
            "https://api.steampowered.com/IPlayerService/GetSteamLevel/v1/?key={}&steamid={}",
            self.steam_api_key, steamid
        );

        let response: SteamLevelResponse = self.client.get(&url).send().await?.json().await?;
        Ok(response.response.player_level)
    }

    async fn get_game_hours(&self, steamid: &str, appid: u32) -> Result<f32, Box<dyn std::error::Error>> {
        let url = format!(
            "https://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/?key={}&steamid={}&include_played_free_games=1",
            self.steam_api_key, steamid
        );

        let response: SteamOwnedGamesResponse = self.client.get(&url).send().await?.json().await?;

        if let Some(games) = response.response.games {
            if let Some(game) = games.iter().find(|g| g.appid == appid) {
                return Ok(game.playtime_forever as f32 / 60.0); // Convert minutes to hours
            }
        }

        Ok(0.0)
    }

    async fn get_faceit_stats(&self, steamid: &str) -> Result<(u32, u32), Box<dyn std::error::Error>> {
        let api_key = self.faceit_api_key.as_ref().ok_or("Faceit API key not set")?;

        let url = format!("https://open.faceit.com/data/v4/players?game=cs2&game_player_id={}", steamid);

        let response = self.client
            .get(&url)
            .header("Authorization", format!("Bearer {}", api_key))
            .send()
            .await?;

        if !response.status().is_success() {
            return Err("Faceit player not found".into());
        }

        let player: FaceitPlayerResponse = response.json().await?;

        if let Some(cs2_stats) = player.games.get("cs2") {
            let level = cs2_stats.skill_level.unwrap_or(0);
            let elo = cs2_stats.faceit_elo.unwrap_or(0);
            return Ok((level, elo));
        }

        Err("CS2 stats not found on Faceit".into())
    }
}
