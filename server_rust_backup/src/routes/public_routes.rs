use crate::models::ApiResponse;
use crate::steam::SteamClient;
use rocket::get;
use rocket::serde::json::Json;
use rocket::State;
use serde::Serialize;

#[derive(Serialize)]
pub struct HealthResponse {
    pub status: String,
    pub version: String,
}

#[derive(Serialize)]
pub struct ServerTime {
    pub timestamp: i64,
    pub iso8601: String,
    pub date: String,
    pub time: String,
    pub timezone: String,
}

#[get("/")]
pub async fn index() -> Json<ApiResponse<HealthResponse>> {
    Json(ApiResponse::success(HealthResponse {
        status: "ok".to_string(),
        version: env!("CARGO_PKG_VERSION").to_string(),
    }))
}

#[get("/health")]
pub async fn health() -> Json<ApiResponse<HealthResponse>> {
    Json(ApiResponse::success(HealthResponse {
        status: "healthy".to_string(),
        version: env!("CARGO_PKG_VERSION").to_string(),
    }))
}

#[get("/time")]
pub async fn server_time() -> Json<ApiResponse<ServerTime>> {
    let now = chrono::Utc::now();

    Json(ApiResponse::success(ServerTime {
        timestamp: now.timestamp(),
        iso8601: now.to_rfc3339(),
        date: now.format("%Y-%m-%d").to_string(),
        time: now.format("%H:%M:%S").to_string(),
        timezone: "UTC".to_string(),
    }))
}

#[get("/steam")]
pub async fn steam_profile(
    steam_client: &State<SteamClient>,
) -> Json<ApiResponse<crate::steam::SteamProfile>> {
    match steam_client.get_player_summary().await {
        Ok(profile) => Json(ApiResponse::success(profile)),
        Err(e) => Json(ApiResponse::error(format!("Failed to get Steam profile: {}", e))),
    }
}

#[get("/workshop/<appid>")]
pub async fn workshop_items(
    appid: u32,
    steam_client: &State<SteamClient>,
) -> Json<ApiResponse<Vec<crate::steam::WorkshopItem>>> {
    match steam_client.get_workshop_items(appid).await {
        Ok(items) => Json(ApiResponse::success(items)),
        Err(e) => Json(ApiResponse::error(format!("Failed to get workshop items: {}", e))),
    }
}

// Workshop aliases
fn parse_game_alias(game: &str) -> Option<u32> {
    match game {
        "cs" | "cs2" | "csgo" => Some(730),
        "dota" | "dota2" => Some(570),
        "tf2" => Some(440),
        "gmod" | "garrysmod" => Some(4000),
        "l4d2" => Some(550),
        "wallpaperengine" | "wallpaper" => Some(431960),
        "cities" | "citiesskylines" => Some(255710),
        "skyrim" => Some(72850),
        _ => None,
    }
}

#[get("/workshop/game/<game>")]
pub async fn workshop_by_game(
    game: &str,
    steam_client: &State<SteamClient>,
) -> Json<ApiResponse<Vec<crate::steam::WorkshopItem>>> {
    let appid = match parse_game_alias(game) {
        Some(id) => id,
        None => return Json(ApiResponse::error(format!("Unknown game alias: {}", game))),
    };

    match steam_client.get_workshop_items(appid).await {
        Ok(items) => Json(ApiResponse::success(items)),
        Err(e) => Json(ApiResponse::error(format!("Failed to get workshop items: {}", e))),
    }
}

#[derive(Serialize)]
pub struct AllWorkshopItems {
    pub total_items: usize,
    pub by_game: std::collections::HashMap<String, Vec<crate::steam::WorkshopItem>>,
}

#[get("/workshop/all")]
pub async fn workshop_all(
    steam_client: &State<SteamClient>,
) -> Json<ApiResponse<AllWorkshopItems>> {
    use std::collections::HashMap;

    let games = vec![
        ("cs2", 730u32),
        ("dota2", 570u32),
        ("tf2", 440u32),
        ("gmod", 4000u32),
        ("l4d2", 550u32),
        ("wallpaperengine", 431960u32),
    ];

    let mut by_game = HashMap::new();
    let mut total = 0;

    for (name, appid) in games {
        if let Ok(items) = steam_client.get_workshop_items(appid).await {
            if !items.is_empty() {
                total += items.len();
                by_game.insert(name.to_string(), items);
            }
        }
    }

    Json(ApiResponse::success(AllWorkshopItems {
        total_items: total,
        by_game,
    }))
}
