use crate::cs2::{GSIPayload, MatchStateManager, PlayerStatsClient};
use crate::models::ApiResponse;
use rocket::serde::json::Json;
use rocket::{get, post, State};
use std::env;

#[post("/gsi", data = "<payload>")]
pub async fn receive_gsi(
    payload: Json<GSIPayload>,
    match_state: &State<MatchStateManager>,
    player_stats_client: &State<PlayerStatsClient>,
) -> Json<ApiResponse<String>> {
    // Verify auth token
    let expected_token = env::var("GSI_AUTH_TOKEN").unwrap_or_else(|_| "your_secret_token_here".to_string());

    if let Some(auth) = &payload.auth {
        if auth.token != expected_token {
            return Json(ApiResponse::error("Invalid auth token".to_string()));
        }
    } else {
        return Json(ApiResponse::error("Missing auth token".to_string()));
    }

    // Only process competitive matches
    if !payload.is_competitive() {
        return Json(ApiResponse::success("Not a competitive match, ignoring".to_string()));
    }

    // Get my Steam ID from environment
    let my_steamid = env::var("STEAM_ID").unwrap_or_default();

    // Update match state
    match_state.update_from_gsi(&payload, &my_steamid);

    // Fetch player stats for all players asynchronously
    let steamids = payload.get_all_steamids();

    tokio::spawn({
        let match_state = match_state.inner().clone();
        let player_stats_client = player_stats_client.inner().clone();

        async move {
            for steamid in steamids {
                if let Ok(stats) = player_stats_client.get_player_stats(&steamid).await {
                    match_state.add_player_stats(steamid, stats);
                }
            }
        }
    });

    Json(ApiResponse::success("GSI data received".to_string()))
}

#[get("/match")]
pub async fn get_current_match(
    match_state: &State<MatchStateManager>,
) -> Json<ApiResponse<crate::cs2::MatchState>> {
    let state = match_state.get_state();

    if !state.is_active {
        return Json(ApiResponse::error("No active match".to_string()));
    }

    Json(ApiResponse::success(state))
}

#[post("/match/clear")]
pub async fn clear_match(
    match_state: &State<MatchStateManager>,
) -> Json<ApiResponse<String>> {
    match_state.clear();
    Json(ApiResponse::success("Match data cleared".to_string()))
}
