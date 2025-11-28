use crate::models::ApiResponse;
use crate::studio::{
    CreateProjectRequest, StudioProjectResponse, StudioService, StudioUserResponse,
    UpdateProjectRequest,
};
use rocket::http::Status;
use rocket::request::{FromRequest, Outcome, Request};
use rocket::serde::json::Json;
use rocket::{delete, get, post, put, State};
use sqlx::SqlitePool;
use std::env;

// Request guard for Studio authentication
pub struct StudioAuth {
    pub user_id: i64,
    pub steam_id: String,
}

#[rocket::async_trait]
impl<'r> FromRequest<'r> for StudioAuth {
    type Error = &'static str;

    async fn from_request(request: &'r Request<'_>) -> Outcome<Self, Self::Error> {
        // Get token from Authorization header
        let token = match request.headers().get_one("Authorization") {
            Some(auth) => auth.strip_prefix("Bearer ").unwrap_or(auth),
            None => return Outcome::Error((Status::Unauthorized, "Missing authorization header")),
        };

        // Get database pool
        let pool = match request.guard::<&State<SqlitePool>>().await {
            Outcome::Success(pool) => pool,
            _ => return Outcome::Error((Status::InternalServerError, "Database error")),
        };

        // Validate session
        match StudioService::validate_session(pool, token).await {
            Ok(Some(user)) => Outcome::Success(StudioAuth {
                user_id: user.id,
                steam_id: user.steam_id,
            }),
            Ok(None) => Outcome::Error((Status::Unauthorized, "Invalid or expired token")),
            Err(_) => Outcome::Error((Status::InternalServerError, "Database error")),
        }
    }
}

/// Initiate Steam OpenID authentication
#[get("/studio/auth/steam?<return_url>")]
pub async fn steam_auth(return_url: Option<String>) -> rocket::response::Redirect {
    let realm = env::var("PUBLIC_URL").unwrap_or_else(|_| "http://localhost:3000".to_string());
    let return_to = format!(
        "{}/api/studio/auth/steam/callback?return_url={}",
        realm,
        return_url.unwrap_or_default()
    );

    let steam_login_url = format!(
        "https://steamcommunity.com/openid/login?\
        openid.ns=http://specs.openid.net/auth/2.0&\
        openid.mode=checkid_setup&\
        openid.return_to={}&\
        openid.realm={}&\
        openid.identity=http://specs.openid.net/auth/2.0/identifier_select&\
        openid.claimed_id=http://specs.openid.net/auth/2.0/identifier_select",
        urlencoding::encode(&return_to),
        urlencoding::encode(&realm)
    );

    rocket::response::Redirect::to(steam_login_url)
}

/// Steam OpenID callback
#[get("/studio/auth/steam/callback?<query_string>")]
pub async fn steam_auth_callback(
    query_string: Option<String>,
    pool: &State<SqlitePool>,
    origin: &rocket::http::uri::Origin<'_>,
) -> rocket::response::Redirect {
    // Parse OpenID response from raw query string
    let raw_query = origin.query().map(|q| q.as_str()).unwrap_or("");
    let openid = crate::studio::SteamOpenIdResponse::from_query_string(raw_query);
    let _ = query_string; // suppress unused warning

    let return_url = openid
        .return_to
        .as_ref()
        .and_then(|r| {
            url::Url::parse(r)
                .ok()
                .and_then(|u| {
                    u.query_pairs()
                        .find(|(k, _)| k == "return_url")
                        .map(|(_, v)| v.to_string())
                })
        })
        .unwrap_or_else(|| "http://localhost:3000/studio".to_string());

    // Extract Steam ID from claimed_id
    let steam_id = match openid.claimed_id.as_ref().and_then(|id| StudioService::extract_steam_id(id)) {
        Some(id) => id,
        None => {
            return rocket::response::Redirect::to(format!(
                "{}?error={}",
                return_url,
                urlencoding::encode("Invalid Steam response")
            ));
        }
    };

    // Fetch Steam profile
    let api_key = env::var("STEAM_API_KEY").unwrap_or_default();
    let player = match StudioService::fetch_steam_player(&api_key, &steam_id).await {
        Ok(p) => p,
        Err(e) => {
            return rocket::response::Redirect::to(format!(
                "{}?error={}",
                return_url,
                urlencoding::encode(&format!("Failed to fetch Steam profile: {}", e))
            ));
        }
    };

    // Get or create user
    let user = match StudioService::get_or_create_user(
        pool,
        &steam_id,
        &player.personaname,
        &player.avatarfull,
        &player.profileurl,
    )
    .await
    {
        Ok(u) => u,
        Err(e) => {
            return rocket::response::Redirect::to(format!(
                "{}?error={}",
                return_url,
                urlencoding::encode(&format!("Database error: {}", e))
            ));
        }
    };

    // Create session
    let token = match StudioService::create_session(pool, user.id).await {
        Ok(t) => t,
        Err(e) => {
            return rocket::response::Redirect::to(format!(
                "{}?error={}",
                return_url,
                urlencoding::encode(&format!("Session error: {}", e))
            ));
        }
    };

    // Redirect back with token
    rocket::response::Redirect::to(format!(
        "/studio/auth/callback?token={}",
        token
    ))
}

/// Get current user info
#[get("/studio/auth/me")]
pub async fn get_me(
    auth: StudioAuth,
    pool: &State<SqlitePool>,
) -> Json<ApiResponse<serde_json::Value>> {
    let user: Result<crate::studio::StudioUser, _> = sqlx::query_as(
        "SELECT * FROM studio_users WHERE id = ?"
    )
    .bind(auth.user_id)
    .fetch_one(pool.inner())
    .await;

    // Check if user is admin
    let admin_steam_id = env::var("ADMIN_STEAM_ID").unwrap_or_default();

    match user {
        Ok(u) => {
            let is_admin = u.steam_id == admin_steam_id;
            let response = StudioUserResponse::from(u);
            Json(ApiResponse::success(serde_json::json!({
                "user": response,
                "isAdmin": is_admin
            })))
        }
        Err(e) => Json(ApiResponse::error(format!("Database error: {}", e))),
    }
}

/// Get all projects for current user
#[get("/studio/projects")]
pub async fn get_projects(
    auth: StudioAuth,
    pool: &State<SqlitePool>,
) -> Json<ApiResponse<serde_json::Value>> {
    match StudioService::get_user_projects(pool, auth.user_id).await {
        Ok(projects) => {
            let responses: Vec<StudioProjectResponse> =
                projects.into_iter().map(StudioProjectResponse::from).collect();
            Json(ApiResponse::success(serde_json::json!({
                "projects": responses
            })))
        }
        Err(e) => Json(ApiResponse::error(format!("Database error: {}", e))),
    }
}

/// Create a new project
#[post("/studio/projects", data = "<request>")]
pub async fn create_project(
    auth: StudioAuth,
    request: Json<CreateProjectRequest>,
    pool: &State<SqlitePool>,
) -> Json<ApiResponse<serde_json::Value>> {
    match StudioService::create_project(
        pool,
        auth.user_id,
        &request.name,
        &request.project_type,
        &request.sticker_type,
    )
    .await
    {
        Ok(project) => {
            let response = StudioProjectResponse::from(project);
            Json(ApiResponse::success(serde_json::json!({
                "project": response
            })))
        }
        Err(e) => Json(ApiResponse::error(format!("Database error: {}", e))),
    }
}

/// Get a specific project
#[get("/studio/projects/<id>")]
pub async fn get_project(
    auth: StudioAuth,
    id: &str,
    pool: &State<SqlitePool>,
) -> Json<ApiResponse<serde_json::Value>> {
    match StudioService::get_project(pool, id, auth.user_id).await {
        Ok(Some(project)) => {
            let response = StudioProjectResponse::from(project);
            Json(ApiResponse::success(serde_json::json!({
                "project": response
            })))
        }
        Ok(None) => Json(ApiResponse::error("Project not found".to_string())),
        Err(e) => Json(ApiResponse::error(format!("Database error: {}", e))),
    }
}

/// Update a project
#[put("/studio/projects/<id>", data = "<request>")]
pub async fn update_project(
    auth: StudioAuth,
    id: &str,
    request: Json<UpdateProjectRequest>,
    pool: &State<SqlitePool>,
) -> Json<ApiResponse<serde_json::Value>> {
    match StudioService::update_project(
        pool,
        id,
        auth.user_id,
        request.name.as_deref(),
        request.thumbnail.as_deref(),
        request.data.as_deref(),
    )
    .await
    {
        Ok(Some(project)) => {
            let response = StudioProjectResponse::from(project);
            Json(ApiResponse::success(serde_json::json!({
                "project": response
            })))
        }
        Ok(None) => Json(ApiResponse::error("Project not found".to_string())),
        Err(e) => Json(ApiResponse::error(format!("Database error: {}", e))),
    }
}

/// Delete a project
#[delete("/studio/projects/<id>")]
pub async fn delete_project(
    auth: StudioAuth,
    id: &str,
    pool: &State<SqlitePool>,
) -> Json<ApiResponse<serde_json::Value>> {
    match StudioService::delete_project(pool, id, auth.user_id).await {
        Ok(true) => Json(ApiResponse::success(serde_json::json!({
            "deleted": true
        }))),
        Ok(false) => Json(ApiResponse::error("Project not found".to_string())),
        Err(e) => Json(ApiResponse::error(format!("Database error: {}", e))),
    }
}
