use crate::guards::AuthGuard;
use crate::models::ApiResponse;
use rocket::serde::json::Json;
use rocket::{get, put};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use std::collections::HashMap;

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct MenuItem {
    pub id: String,
    pub label: String,
    pub is_visible: bool,
    pub display_order: i32,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateMenuSettingsRequest {
    pub settings: HashMap<String, bool>,
}

/// Get menu settings (public - for sidebar visibility)
#[get("/menu-settings")]
pub async fn get_menu_settings(
    pool: &rocket::State<sqlx::SqlitePool>,
) -> Json<HashMap<String, bool>> {
    let items: Vec<MenuItem> = match sqlx::query_as(
        "SELECT id, label, is_visible, display_order FROM menu_settings ORDER BY display_order",
    )
    .fetch_all(pool.inner())
    .await
    {
        Ok(items) => items,
        Err(_) => return Json(HashMap::new()),
    };

    let mut settings = HashMap::new();
    for item in items {
        settings.insert(item.id, item.is_visible);
    }

    Json(settings)
}

/// Get all menu items with full details (admin only)
#[get("/admin/menu-items")]
pub async fn get_menu_items(
    _auth: AuthGuard,
    pool: &rocket::State<sqlx::SqlitePool>,
) -> Json<ApiResponse<Vec<MenuItem>>> {
    let items: Vec<MenuItem> = match sqlx::query_as(
        "SELECT id, label, is_visible, display_order FROM menu_settings ORDER BY display_order",
    )
    .fetch_all(pool.inner())
    .await
    {
        Ok(items) => items,
        Err(e) => return Json(ApiResponse::error(format!("Database error: {}", e))),
    };

    Json(ApiResponse::success(items))
}

/// Update menu settings (admin only)
#[put("/admin/menu-settings", data = "<request>")]
pub async fn update_menu_settings(
    _auth: AuthGuard,
    pool: &rocket::State<sqlx::SqlitePool>,
    request: Json<UpdateMenuSettingsRequest>,
) -> Json<ApiResponse<String>> {
    for (id, is_visible) in &request.settings {
        if let Err(e) = sqlx::query(
            "UPDATE menu_settings SET is_visible = ?, updated_at = datetime('now') WHERE id = ?",
        )
        .bind(is_visible)
        .bind(id)
        .execute(pool.inner())
        .await
        {
            return Json(ApiResponse::error(format!("Failed to update {}: {}", id, e)));
        }
    }

    Json(ApiResponse::success("Menu settings updated".to_string()))
}
