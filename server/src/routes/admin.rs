use crate::guards::AuthGuard;
use crate::models::ApiResponse;
use rocket::get;
use rocket::serde::json::Json;
use serde::Serialize;

#[derive(Serialize)]
pub struct AdminInfo {
    pub message: String,
    pub telegram_id: i64,
    pub user_id: i64,
}

#[derive(Serialize)]
pub struct AdminStats {
    pub total_sessions: i64,
    pub active_sessions: i64,
}

// Protected admin route example
#[get("/admin/info")]
pub async fn admin_info(_auth: AuthGuard) -> Json<ApiResponse<AdminInfo>> {
    Json(ApiResponse::success(AdminInfo {
        message: "You are authenticated as admin".to_string(),
        telegram_id: _auth.user.telegram_id,
        user_id: _auth.user.id,
    }))
}

// Another protected route example
#[get("/admin/dashboard")]
pub async fn admin_dashboard(_auth: AuthGuard) -> Json<ApiResponse<String>> {
    Json(ApiResponse::success(
        "Welcome to admin dashboard".to_string(),
    ))
}

// Example of admin endpoint that uses database
#[get("/admin/stats")]
pub async fn admin_stats(
    _auth: AuthGuard,
    pool: &rocket::State<sqlx::PgPool>,
) -> Json<ApiResponse<AdminStats>> {
    let total_sessions: (i64,) = match sqlx::query_as("SELECT COUNT(*) FROM sessions")
        .fetch_one(pool.inner())
        .await
    {
        Ok(result) => result,
        Err(e) => return Json(ApiResponse::error(format!("Database error: {}", e))),
    };

    let active_sessions: (i64,) = match sqlx::query_as(
        "SELECT COUNT(*) FROM sessions WHERE expires_at > NOW()",
    )
    .fetch_one(pool.inner())
    .await
    {
        Ok(result) => result,
        Err(e) => return Json(ApiResponse::error(format!("Database error: {}", e))),
    };

    Json(ApiResponse::success(AdminStats {
        total_sessions: total_sessions.0,
        active_sessions: active_sessions.0,
    }))
}
