use crate::files::{
    AccessCodeRequest, CreateFolderRequest, FileResponse, FileService,
    FolderResponse, RenameFolderRequest, UpdateFileRequest,
};
use crate::models::ApiResponse;
use rocket::form::Form;
use rocket::fs::TempFile;
use rocket::http::{ContentType, Status};
use rocket::request::{FromRequest, Outcome, Request};
use rocket::serde::json::Json;
use rocket::{delete, get, post, put, FromForm, State};
use sqlx::SqlitePool;
use std::env;
use uuid::Uuid;

// Admin guard - checks if Steam ID matches admin
#[allow(dead_code)]
pub struct AdminAuth {
    pub steam_id: String,
}

#[rocket::async_trait]
impl<'r> FromRequest<'r> for AdminAuth {
    type Error = &'static str;

    async fn from_request(request: &'r Request<'_>) -> Outcome<Self, Self::Error> {
        let admin_steam_id = env::var("ADMIN_STEAM_ID").unwrap_or_default();

        // Get token from Authorization header
        let token = match request.headers().get_one("Authorization") {
            Some(auth) => auth.strip_prefix("Bearer ").unwrap_or(auth),
            None => {
                return Outcome::Error((Status::Unauthorized, "Missing authorization header"))
            }
        };

        // Get database pool
        let pool = match request.guard::<&State<SqlitePool>>().await {
            Outcome::Success(pool) => pool,
            _ => return Outcome::Error((Status::InternalServerError, "Database error")),
        };

        // Validate session and check if admin
        let result: Option<(String,)> = sqlx::query_as(
            r#"
            SELECT u.steam_id
            FROM studio_sessions s
            JOIN studio_users u ON s.user_id = u.id
            WHERE s.token = ? AND s.expires_at > datetime('now')
            "#,
        )
        .bind(token)
        .fetch_optional(pool.inner())
        .await
        .ok()
        .flatten();

        match result {
            Some((steam_id,)) if steam_id == admin_steam_id => {
                Outcome::Success(AdminAuth { steam_id })
            }
            Some(_) => Outcome::Error((Status::Forbidden, "Not an admin")),
            None => Outcome::Error((Status::Unauthorized, "Invalid or expired token")),
        }
    }
}

#[derive(FromForm)]
pub struct UploadForm<'r> {
    file: TempFile<'r>,
    #[field(name = "folderId")]
    folder_id: Option<String>,
    #[field(name = "isPublic")]
    is_public: Option<bool>,
    #[field(name = "accessCode")]
    access_code: Option<String>,
}

// ===== Admin routes (protected) =====

/// Get folder contents
#[get("/files/folders?<folder_id>")]
pub async fn get_folder_contents(
    _auth: AdminAuth,
    folder_id: Option<String>,
    pool: &State<SqlitePool>,
) -> Json<ApiResponse<serde_json::Value>> {
    match FileService::get_folder_contents(pool, folder_id.as_deref()).await {
        Ok(contents) => Json(ApiResponse::success(serde_json::json!(contents))),
        Err(e) => Json(ApiResponse::error(e)),
    }
}

/// Create folder
#[post("/files/folders", data = "<request>")]
pub async fn create_folder(
    _auth: AdminAuth,
    request: Json<CreateFolderRequest>,
    pool: &State<SqlitePool>,
) -> Json<ApiResponse<serde_json::Value>> {
    match FileService::create_folder(pool, &request.name, request.parent_id.as_deref()).await {
        Ok(folder) => Json(ApiResponse::success(serde_json::json!({
            "folder": FolderResponse::from(folder)
        }))),
        Err(e) => Json(ApiResponse::error(e)),
    }
}

/// Rename folder
#[put("/files/folders/<folder_id>", data = "<request>")]
pub async fn rename_folder(
    _auth: AdminAuth,
    folder_id: &str,
    request: Json<RenameFolderRequest>,
    pool: &State<SqlitePool>,
) -> Json<ApiResponse<serde_json::Value>> {
    match FileService::rename_folder(pool, folder_id, &request.name).await {
        Ok(Some(folder)) => Json(ApiResponse::success(serde_json::json!({
            "folder": FolderResponse::from(folder)
        }))),
        Ok(None) => Json(ApiResponse::error("Folder not found".to_string())),
        Err(e) => Json(ApiResponse::error(e)),
    }
}

/// Delete folder
#[delete("/files/folders/<folder_id>")]
pub async fn delete_folder(
    _auth: AdminAuth,
    folder_id: &str,
    pool: &State<SqlitePool>,
) -> Json<ApiResponse<serde_json::Value>> {
    match FileService::delete_folder(pool, folder_id).await {
        Ok(true) => Json(ApiResponse::success(serde_json::json!({ "deleted": true }))),
        Ok(false) => Json(ApiResponse::error("Folder not found".to_string())),
        Err(e) => Json(ApiResponse::error(e)),
    }
}

/// Upload file
#[post("/files/upload", data = "<form>")]
pub async fn upload_file(
    _auth: AdminAuth,
    mut form: Form<UploadForm<'_>>,
    pool: &State<SqlitePool>,
) -> Json<ApiResponse<serde_json::Value>> {
    // Get file info before persisting
    let name = form
        .file
        .name()
        .map(String::from)
        .or_else(|| form.file.raw_name().map(|n| n.dangerous_unsafe_unsanitized_raw().to_string()))
        .unwrap_or_else(|| "unnamed".to_string());

    let content_type = form
        .file
        .content_type()
        .map(|ct| ct.to_string())
        .unwrap_or_else(|| "application/octet-stream".to_string());

    // Create a temporary path to persist the file
    let temp_dir = std::env::temp_dir().join("bgalin_uploads");
    std::fs::create_dir_all(&temp_dir).ok();
    let temp_path = temp_dir.join(format!("upload_{}", Uuid::new_v4()));

    // Persist file to disk
    if let Err(e) = form.file.persist_to(&temp_path).await {
        return Json(ApiResponse::error(format!("Failed to save file: {}", e)));
    }

    // Read file data
    let data = match tokio::fs::read(&temp_path).await {
        Ok(d) => d,
        Err(e) => {
            tokio::fs::remove_file(&temp_path).await.ok();
            return Json(ApiResponse::error(format!("Failed to read file: {}", e)));
        }
    };

    // Clean up temp file
    tokio::fs::remove_file(&temp_path).await.ok();

    let is_public = form.is_public.unwrap_or(false);

    match FileService::upload_file(
        pool,
        &name,
        &data,
        &content_type,
        form.folder_id.as_deref(),
        is_public,
        form.access_code.as_deref(),
    )
    .await
    {
        Ok(file) => Json(ApiResponse::success(serde_json::json!({
            "file": FileResponse::from(file)
        }))),
        Err(e) => Json(ApiResponse::error(e)),
    }
}

/// Update file
#[put("/files/<file_id>", data = "<request>")]
pub async fn update_file(
    _auth: AdminAuth,
    file_id: &str,
    request: Json<UpdateFileRequest>,
    pool: &State<SqlitePool>,
) -> Json<ApiResponse<serde_json::Value>> {
    let folder_id = request.folder_id.as_ref().map(|f| Some(f.as_str()));

    match FileService::update_file(
        pool,
        file_id,
        request.name.as_deref(),
        request.is_public,
        request.access_code.as_deref(),
        folder_id,
    )
    .await
    {
        Ok(Some(file)) => Json(ApiResponse::success(serde_json::json!({
            "file": FileResponse::from(file)
        }))),
        Ok(None) => Json(ApiResponse::error("File not found".to_string())),
        Err(e) => Json(ApiResponse::error(e)),
    }
}

/// Delete file
#[delete("/files/<file_id>")]
pub async fn delete_file(
    _auth: AdminAuth,
    file_id: &str,
    pool: &State<SqlitePool>,
) -> Json<ApiResponse<serde_json::Value>> {
    match FileService::delete_file(pool, file_id).await {
        Ok(true) => Json(ApiResponse::success(serde_json::json!({ "deleted": true }))),
        Ok(false) => Json(ApiResponse::error("File not found".to_string())),
        Err(e) => Json(ApiResponse::error(e)),
    }
}

/// Get file info (admin)
#[get("/files/info/<file_id>")]
pub async fn get_file_info(
    _auth: AdminAuth,
    file_id: &str,
    pool: &State<SqlitePool>,
) -> Json<ApiResponse<serde_json::Value>> {
    match FileService::get_file(pool, file_id).await {
        Ok(Some(file)) => Json(ApiResponse::success(serde_json::json!({
            "file": FileResponse::from(file)
        }))),
        Ok(None) => Json(ApiResponse::error("File not found".to_string())),
        Err(e) => Json(ApiResponse::error(e)),
    }
}

// ===== Public routes =====

/// Get public file
#[get("/files/public/<file_id>")]
pub async fn get_public_file(
    file_id: &str,
    pool: &State<SqlitePool>,
) -> Result<(ContentType, Vec<u8>), Status> {
    let file = FileService::get_file(pool, file_id)
        .await
        .map_err(|_| Status::InternalServerError)?
        .ok_or(Status::NotFound)?;

    if !file.is_public {
        return Err(Status::Forbidden);
    }

    let data = FileService::get_file_data(file_id)
        .await
        .map_err(|_| Status::InternalServerError)?;

    let content_type = ContentType::parse_flexible(&file.mime_type).unwrap_or(ContentType::Binary);

    Ok((content_type, data))
}

/// Get private file with access code
#[post("/files/private/<file_id>", data = "<request>")]
pub async fn get_private_file(
    file_id: &str,
    request: Json<AccessCodeRequest>,
    pool: &State<SqlitePool>,
) -> Result<(ContentType, Vec<u8>), Status> {
    let file = FileService::get_file(pool, file_id)
        .await
        .map_err(|_| Status::InternalServerError)?
        .ok_or(Status::NotFound)?;

    // If file is public, serve it directly
    if file.is_public {
        let data = FileService::get_file_data(file_id)
            .await
            .map_err(|_| Status::InternalServerError)?;
        let content_type =
            ContentType::parse_flexible(&file.mime_type).unwrap_or(ContentType::Binary);
        return Ok((content_type, data));
    }

    // Check access code
    if let Some(stored_code) = &file.access_code {
        if !FileService::verify_access_code(stored_code, &request.code) {
            return Err(Status::Forbidden);
        }
    } else {
        // File is private but has no access code - shouldn't happen, deny access
        return Err(Status::Forbidden);
    }

    let data = FileService::get_file_data(file_id)
        .await
        .map_err(|_| Status::InternalServerError)?;

    let content_type = ContentType::parse_flexible(&file.mime_type).unwrap_or(ContentType::Binary);

    Ok((content_type, data))
}

/// Check if file exists and is public
#[get("/files/check/<file_id>")]
pub async fn check_file(
    file_id: &str,
    pool: &State<SqlitePool>,
) -> Json<ApiResponse<serde_json::Value>> {
    match FileService::get_file(pool, file_id).await {
        Ok(Some(file)) => Json(ApiResponse::success(serde_json::json!({
            "exists": true,
            "isPublic": file.is_public,
            "requiresCode": file.access_code.is_some() && !file.is_public,
            "name": file.name,
            "mimeType": file.mime_type,
            "size": file.size
        }))),
        Ok(None) => Json(ApiResponse::success(serde_json::json!({
            "exists": false
        }))),
        Err(e) => Json(ApiResponse::error(e)),
    }
}

/// Admin direct file access - serves any file without access code check
/// Accepts token via query parameter for img/video src use
#[get("/files/admin/<file_id>?<token>")]
pub async fn get_admin_file(
    file_id: &str,
    token: Option<String>,
    pool: &State<SqlitePool>,
) -> Result<(ContentType, Vec<u8>), Status> {
    // Get admin steam ID from env
    let admin_steam_id = env::var("ADMIN_STEAM_ID").unwrap_or_default();
    if admin_steam_id.is_empty() {
        return Err(Status::Forbidden);
    }

    // Validate token from query parameter
    let token = token.ok_or(Status::Unauthorized)?;

    // Validate session and check if admin
    let result: Option<(String,)> = sqlx::query_as(
        r#"
        SELECT u.steam_id
        FROM studio_sessions s
        JOIN studio_users u ON s.user_id = u.id
        WHERE s.token = ? AND s.expires_at > datetime('now')
        "#,
    )
    .bind(&token)
    .fetch_optional(pool.inner())
    .await
    .ok()
    .flatten();

    match result {
        Some((steam_id,)) if steam_id.trim() == admin_steam_id.trim() => {}
        _ => return Err(Status::Forbidden),
    }

    let file = FileService::get_file(pool, file_id)
        .await
        .map_err(|_| Status::InternalServerError)?
        .ok_or(Status::NotFound)?;

    let data = FileService::get_file_data(file_id)
        .await
        .map_err(|_| Status::InternalServerError)?;

    let content_type = ContentType::parse_flexible(&file.mime_type).unwrap_or(ContentType::Binary);

    Ok((content_type, data))
}
