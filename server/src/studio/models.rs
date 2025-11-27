use serde::{Deserialize, Serialize};
use sqlx::FromRow;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct StudioUser {
    pub id: i64,
    pub steam_id: String,
    pub persona_name: String,
    pub avatar_url: String,
    pub profile_url: String,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct StudioProject {
    pub id: String,
    pub user_id: i64,
    pub name: String,
    #[sqlx(rename = "type")]
    pub project_type: String,
    pub sticker_type: String,
    pub thumbnail: Option<String>,
    pub data: Option<String>, // JSON string
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct StudioSession {
    pub id: i64,
    pub user_id: i64,
    pub token: String,
    pub expires_at: String,
    pub created_at: String,
}

// Request/Response types
#[derive(Debug, Deserialize)]
pub struct CreateProjectRequest {
    pub name: String,
    #[serde(rename = "type")]
    pub project_type: String,
    #[serde(rename = "stickerType")]
    pub sticker_type: String,
}

#[derive(Debug, Deserialize)]
pub struct UpdateProjectRequest {
    pub name: Option<String>,
    pub thumbnail: Option<String>,
    pub data: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct StudioUserResponse {
    #[serde(rename = "steamId")]
    pub steam_id: String,
    #[serde(rename = "personaName")]
    pub persona_name: String,
    #[serde(rename = "avatarUrl")]
    pub avatar_url: String,
    #[serde(rename = "profileUrl")]
    pub profile_url: String,
}

#[derive(Debug, Serialize)]
pub struct StudioProjectResponse {
    pub id: String,
    pub name: String,
    #[serde(rename = "type")]
    pub project_type: String,
    #[serde(rename = "stickerType")]
    pub sticker_type: String,
    pub thumbnail: Option<String>,
    pub data: Option<serde_json::Value>,
    #[serde(rename = "createdAt")]
    pub created_at: String,
    #[serde(rename = "updatedAt")]
    pub updated_at: String,
}

impl From<StudioProject> for StudioProjectResponse {
    fn from(p: StudioProject) -> Self {
        Self {
            id: p.id,
            name: p.name,
            project_type: p.project_type,
            sticker_type: p.sticker_type,
            thumbnail: p.thumbnail,
            data: p.data.and_then(|d| serde_json::from_str(&d).ok()),
            created_at: p.created_at,
            updated_at: p.updated_at,
        }
    }
}

impl From<StudioUser> for StudioUserResponse {
    fn from(u: StudioUser) -> Self {
        Self {
            steam_id: u.steam_id,
            persona_name: u.persona_name,
            avatar_url: u.avatar_url,
            profile_url: u.profile_url,
        }
    }
}

// Steam OpenID response - parsed from query string manually
#[derive(Debug, Clone, Default)]
pub struct SteamOpenIdResponse {
    pub claimed_id: Option<String>,
    pub identity: Option<String>,
    pub return_to: Option<String>,
    pub response_nonce: Option<String>,
    pub assoc_handle: Option<String>,
    pub signed: Option<String>,
    pub sig: Option<String>,
    pub op_endpoint: Option<String>,
}

impl SteamOpenIdResponse {
    /// Parse Steam OpenID response from query string
    pub fn from_query_string(query: &str) -> Self {
        let mut response = Self::default();

        for pair in query.split('&') {
            let mut parts = pair.splitn(2, '=');
            if let (Some(key), Some(value)) = (parts.next(), parts.next()) {
                let decoded = urlencoding::decode(value).unwrap_or_default().to_string();
                match key {
                    "openid.claimed_id" => response.claimed_id = Some(decoded),
                    "openid.identity" => response.identity = Some(decoded),
                    "openid.return_to" => response.return_to = Some(decoded),
                    "openid.response_nonce" => response.response_nonce = Some(decoded),
                    "openid.assoc_handle" => response.assoc_handle = Some(decoded),
                    "openid.signed" => response.signed = Some(decoded),
                    "openid.sig" => response.sig = Some(decoded),
                    "openid.op_endpoint" => response.op_endpoint = Some(decoded),
                    _ => {}
                }
            }
        }

        response
    }
}

// Steam API response for player summary
#[derive(Debug, Deserialize)]
pub struct SteamPlayerSummariesResponse {
    pub response: SteamPlayersData,
}

#[derive(Debug, Deserialize)]
pub struct SteamPlayersData {
    pub players: Vec<SteamPlayer>,
}

#[derive(Debug, Deserialize)]
pub struct SteamPlayer {
    pub steamid: String,
    pub personaname: String,
    pub profileurl: String,
    pub avatarfull: String,
}
