use serde::{Deserialize, Serialize};
use tauri::AppHandle;

/// Steam OpenID authentication configuration
pub struct SteamAuthConfig {
    pub return_url: String,
    pub realm: String,
}

impl Default for SteamAuthConfig {
    fn default() -> Self {
        Self {
            return_url: "http://localhost:3000/studio/auth/callback".to_string(),
            realm: "http://localhost:3000".to_string(),
        }
    }
}

/// Generate Steam OpenID authentication URL
pub fn get_steam_auth_url(config: &SteamAuthConfig) -> String {
    format!(
        "https://steamcommunity.com/openid/login?\
        openid.ns=http://specs.openid.net/auth/2.0&\
        openid.mode=checkid_setup&\
        openid.return_to={}&\
        openid.realm={}&\
        openid.identity=http://specs.openid.net/auth/2.0/identifier_select&\
        openid.claimed_id=http://specs.openid.net/auth/2.0/identifier_select",
        urlencoded(&config.return_url),
        urlencoded(&config.realm)
    )
}

/// URL encode a string
fn urlencoded(s: &str) -> String {
    let mut result = String::new();
    for c in s.chars() {
        match c {
            'A'..='Z' | 'a'..='z' | '0'..='9' | '-' | '_' | '.' | '~' => {
                result.push(c);
            }
            _ => {
                for b in c.to_string().as_bytes() {
                    result.push_str(&format!("%{:02X}", b));
                }
            }
        }
    }
    result
}

/// Steam OpenID callback parameters
#[derive(Debug, Deserialize)]
pub struct SteamCallbackParams {
    #[serde(rename = "openid.assoc_handle")]
    pub assoc_handle: Option<String>,
    #[serde(rename = "openid.signed")]
    pub signed: Option<String>,
    #[serde(rename = "openid.sig")]
    pub sig: Option<String>,
    #[serde(rename = "openid.ns")]
    pub ns: Option<String>,
    #[serde(rename = "openid.mode")]
    pub mode: Option<String>,
    #[serde(rename = "openid.op_endpoint")]
    pub op_endpoint: Option<String>,
    #[serde(rename = "openid.claimed_id")]
    pub claimed_id: Option<String>,
    #[serde(rename = "openid.identity")]
    pub identity: Option<String>,
    #[serde(rename = "openid.return_to")]
    pub return_to: Option<String>,
    #[serde(rename = "openid.response_nonce")]
    pub response_nonce: Option<String>,
}

/// Extract Steam ID from OpenID claimed_id
pub fn extract_steam_id(claimed_id: &str) -> Option<String> {
    // Format: https://steamcommunity.com/openid/id/76561198xxxxxxxxx
    claimed_id
        .strip_prefix("https://steamcommunity.com/openid/id/")
        .or_else(|| claimed_id.strip_prefix("http://steamcommunity.com/openid/id/"))
        .map(|s| s.to_string())
}

/// Steam user info from API
#[derive(Debug, Serialize, Deserialize)]
pub struct SteamUserInfo {
    pub steamid: String,
    pub personaname: String,
    pub avatarfull: Option<String>,
    pub profileurl: Option<String>,
}

/// Response from Steam API
#[derive(Debug, Deserialize)]
pub struct SteamApiResponse {
    pub response: SteamPlayersResponse,
}

#[derive(Debug, Deserialize)]
pub struct SteamPlayersResponse {
    pub players: Vec<SteamUserInfo>,
}

/// Verify Steam authentication and get user info
/// This should be done server-side with a Steam API key
/// For the desktop app, we rely on the website backend to do this
pub async fn verify_steam_auth(
    app_handle: &AppHandle,
    callback_params: &str,
) -> Result<Option<SteamUserInfo>, String> {
    // Parse callback params
    let params: SteamCallbackParams = serde_json::from_str(callback_params)
        .map_err(|e| format!("Failed to parse callback params: {}", e))?;

    // Extract Steam ID from claimed_id
    let steam_id = params.claimed_id
        .as_ref()
        .and_then(|id| extract_steam_id(id))
        .ok_or_else(|| "No Steam ID in callback".to_string())?;

    // In a real implementation, you would:
    // 1. Verify the signature with Steam's server
    // 2. Use Steam Web API to get user info
    // For now, we return a placeholder that the frontend will handle

    Ok(Some(SteamUserInfo {
        steamid: steam_id,
        personaname: "Steam User".to_string(),
        avatarfull: None,
        profileurl: None,
    }))
}

/// Store authentication result in local database
pub async fn store_auth_result(
    app_handle: &AppHandle,
    user_info: &SteamUserInfo,
    access_token: Option<&str>,
    refresh_token: Option<&str>,
) -> Result<(), String> {
    crate::database::save_auth(
        app_handle,
        &user_info.steamid,
        &user_info.personaname,
        user_info.avatarfull.as_deref(),
        access_token,
        refresh_token,
        None,
    )
}

/// Authentication state for the app
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuthState {
    pub is_authenticated: bool,
    pub steam_id: Option<String>,
    pub username: Option<String>,
    pub avatar_url: Option<String>,
}

impl Default for AuthState {
    fn default() -> Self {
        Self {
            is_authenticated: false,
            steam_id: None,
            username: None,
            avatar_url: None,
        }
    }
}

/// Get current authentication state
pub fn get_auth_state(app_handle: &AppHandle) -> Result<AuthState, String> {
    let is_auth = crate::database::is_authenticated(app_handle)?;

    if !is_auth {
        return Ok(AuthState::default());
    }

    let user_info_json = crate::database::get_user_info(app_handle)?;

    match user_info_json {
        Some(json) => {
            let user_info: crate::database::UserInfo = serde_json::from_str(&json)
                .map_err(|e| e.to_string())?;

            Ok(AuthState {
                is_authenticated: true,
                steam_id: Some(user_info.steam_id),
                username: Some(user_info.username),
                avatar_url: user_info.avatar_url,
            })
        }
        None => Ok(AuthState::default()),
    }
}
