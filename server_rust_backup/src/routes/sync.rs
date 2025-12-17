use crate::models::ApiResponse;
use crate::routes::files::AdminAuth;
use crate::sync::{
    CreateSyncFolderRequest, RegisterClientRequest, RenameSyncFolderRequest, SyncClientResponse,
    SyncDiff, SyncFileResponse, SyncService, SyncStatusRequest,
};
use rocket::data::{Data, ToByteUnit};
use rocket::http::{ContentType, Status};
use rocket::request::{FromRequest, Outcome, Request};
use rocket::serde::json::Json;
use rocket::{delete, get, post, put, State};
use sqlx::SqlitePool;

// API Key auth guard for sync clients
pub struct SyncAuth {
    pub folder_id: String,
}

#[rocket::async_trait]
impl<'r> FromRequest<'r> for SyncAuth {
    type Error = &'static str;

    async fn from_request(request: &'r Request<'_>) -> Outcome<Self, Self::Error> {
        // Get API key from X-API-Key header
        let api_key = match request.headers().get_one("X-API-Key") {
            Some(key) => key,
            None => {
                return Outcome::Error((Status::Unauthorized, "Missing X-API-Key header"));
            }
        };

        // Get database pool
        let pool = match request.guard::<&State<SqlitePool>>().await {
            Outcome::Success(pool) => pool,
            _ => return Outcome::Error((Status::InternalServerError, "Database error")),
        };

        // Validate API key
        match SyncService::get_folder_by_key(pool.inner(), api_key).await {
            Ok(Some(folder)) => Outcome::Success(SyncAuth {
                folder_id: folder.id,
            }),
            Ok(None) => Outcome::Error((Status::Unauthorized, "Invalid API key")),
            Err(_) => Outcome::Error((Status::InternalServerError, "Database error")),
        }
    }
}

// ===== Admin routes (manage sync folders) =====

/// List all sync folders (admin)
#[get("/sync/folders")]
pub async fn list_folders(
    _auth: AdminAuth,
    pool: &State<SqlitePool>,
) -> Json<ApiResponse<serde_json::Value>> {
    match SyncService::list_folders(pool.inner()).await {
        Ok(folders) => Json(ApiResponse::success(serde_json::json!({ "folders": folders }))),
        Err(e) => Json(ApiResponse::error(e)),
    }
}

/// Create sync folder (admin)
#[post("/sync/folders", data = "<request>")]
pub async fn create_folder(
    _auth: AdminAuth,
    request: Json<CreateSyncFolderRequest>,
    pool: &State<SqlitePool>,
) -> Json<ApiResponse<serde_json::Value>> {
    match SyncService::create_folder(pool.inner(), &request.name).await {
        Ok(folder) => {
            let stats = SyncService::get_folder_stats(pool.inner(), &folder.id)
                .await
                .unwrap_or((0, 0, 0));
            Json(ApiResponse::success(serde_json::json!({
                "folder": {
                    "id": folder.id,
                    "name": folder.name,
                    "apiKey": folder.api_key,
                    "apiUrl": "/api/sync",
                    "fileCount": stats.0,
                    "totalSize": stats.1,
                    "clientCount": stats.2,
                    "createdAt": folder.created_at
                }
            })))
        }
        Err(e) => Json(ApiResponse::error(e)),
    }
}

/// Get sync folder details (admin)
#[get("/sync/folders/<folder_id>")]
pub async fn get_folder(
    _auth: AdminAuth,
    folder_id: &str,
    pool: &State<SqlitePool>,
) -> Json<ApiResponse<serde_json::Value>> {
    match SyncService::get_folder(pool.inner(), folder_id).await {
        Ok(Some(folder)) => {
            let stats = SyncService::get_folder_stats(pool.inner(), &folder.id)
                .await
                .unwrap_or((0, 0, 0));
            let clients = SyncService::list_clients(pool.inner(), folder_id)
                .await
                .unwrap_or_default();
            let files = SyncService::list_files(pool.inner(), folder_id)
                .await
                .unwrap_or_default();

            Json(ApiResponse::success(serde_json::json!({
                "folder": {
                    "id": folder.id,
                    "name": folder.name,
                    "apiKey": folder.api_key,
                    "apiUrl": "/api/sync",
                    "fileCount": stats.0,
                    "totalSize": stats.1,
                    "clientCount": stats.2,
                    "createdAt": folder.created_at
                },
                "clients": clients.into_iter().map(SyncClientResponse::from).collect::<Vec<_>>(),
                "files": files.into_iter().map(SyncFileResponse::from).collect::<Vec<_>>()
            })))
        }
        Ok(None) => Json(ApiResponse::error("Folder not found".to_string())),
        Err(e) => Json(ApiResponse::error(e)),
    }
}

/// Rename sync folder (admin)
#[put("/sync/folders/<folder_id>", data = "<request>")]
pub async fn rename_folder(
    _auth: AdminAuth,
    folder_id: &str,
    request: Json<RenameSyncFolderRequest>,
    pool: &State<SqlitePool>,
) -> Json<ApiResponse<serde_json::Value>> {
    match SyncService::rename_folder(pool.inner(), folder_id, &request.name).await {
        Ok(true) => Json(ApiResponse::success(serde_json::json!({ "renamed": true }))),
        Ok(false) => Json(ApiResponse::error("Folder not found".to_string())),
        Err(e) => Json(ApiResponse::error(e)),
    }
}

/// Regenerate API key (admin)
#[post("/sync/folders/<folder_id>/regenerate-key")]
pub async fn regenerate_key(
    _auth: AdminAuth,
    folder_id: &str,
    pool: &State<SqlitePool>,
) -> Json<ApiResponse<serde_json::Value>> {
    match SyncService::regenerate_api_key(pool.inner(), folder_id).await {
        Ok(Some(new_key)) => Json(ApiResponse::success(serde_json::json!({ "apiKey": new_key }))),
        Ok(None) => Json(ApiResponse::error("Folder not found".to_string())),
        Err(e) => Json(ApiResponse::error(e)),
    }
}

/// Delete sync folder (admin)
#[delete("/sync/folders/<folder_id>")]
pub async fn delete_folder(
    _auth: AdminAuth,
    folder_id: &str,
    pool: &State<SqlitePool>,
) -> Json<ApiResponse<serde_json::Value>> {
    match SyncService::delete_folder(pool.inner(), folder_id).await {
        Ok(true) => Json(ApiResponse::success(serde_json::json!({ "deleted": true }))),
        Ok(false) => Json(ApiResponse::error("Folder not found".to_string())),
        Err(e) => Json(ApiResponse::error(e)),
    }
}

/// Delete client (admin)
#[delete("/sync/clients/<client_id>")]
pub async fn delete_client(
    _auth: AdminAuth,
    client_id: &str,
    pool: &State<SqlitePool>,
) -> Json<ApiResponse<serde_json::Value>> {
    match SyncService::delete_client(pool.inner(), client_id).await {
        Ok(true) => Json(ApiResponse::success(serde_json::json!({ "deleted": true }))),
        Ok(false) => Json(ApiResponse::error("Client not found".to_string())),
        Err(e) => Json(ApiResponse::error(e)),
    }
}

// ===== Client sync routes (API key auth) =====

/// Register client
#[post("/sync/register", data = "<request>")]
pub async fn register_client(
    auth: SyncAuth,
    request: Json<RegisterClientRequest>,
    pool: &State<SqlitePool>,
) -> Json<ApiResponse<serde_json::Value>> {
    match SyncService::register_client(pool.inner(), &auth.folder_id, &request.device_name).await {
        Ok(client) => Json(ApiResponse::success(serde_json::json!({
            "clientId": client.id,
            "folderId": auth.folder_id
        }))),
        Err(e) => Json(ApiResponse::error(e)),
    }
}

/// Get sync status (what needs to be synced)
#[post("/sync/status", data = "<request>")]
pub async fn get_sync_status(
    auth: SyncAuth,
    request: Json<SyncStatusRequest>,
    pool: &State<SqlitePool>,
) -> Json<ApiResponse<SyncDiff>> {
    // Update client sync time
    SyncService::update_client_sync_time(pool.inner(), &request.client_id)
        .await
        .ok();

    match SyncService::compute_sync_diff(pool.inner(), &auth.folder_id, &request.files).await {
        Ok(diff) => Json(ApiResponse::success(diff)),
        Err(e) => Json(ApiResponse::error(e)),
    }
}

/// List all files in folder
#[get("/sync/files")]
pub async fn list_files(
    auth: SyncAuth,
    pool: &State<SqlitePool>,
) -> Json<ApiResponse<serde_json::Value>> {
    match SyncService::list_files(pool.inner(), &auth.folder_id).await {
        Ok(files) => Json(ApiResponse::success(serde_json::json!({
            "files": files.into_iter().map(SyncFileResponse::from).collect::<Vec<_>>()
        }))),
        Err(e) => Json(ApiResponse::error(e)),
    }
}

/// Upload file
#[post("/sync/upload?<path>", data = "<data>")]
pub async fn upload_file(
    auth: SyncAuth,
    path: String,
    data: Data<'_>,
    content_type: Option<&ContentType>,
    pool: &State<SqlitePool>,
) -> Json<ApiResponse<serde_json::Value>> {
    // URL decode the path (handles special characters like spaces, cyrillic, etc.)
    let decoded_path = urlencoding::decode(&path)
        .map(|s| s.into_owned())
        .unwrap_or(path);

    println!("📤 Upload request: folder={}, path={}", auth.folder_id, decoded_path);

    // Read file data (limit to 100MB)
    let bytes = match data.open(100.mebibytes()).into_bytes().await {
        Ok(b) if b.is_complete() => b.into_inner(),
        Ok(_) => return Json(ApiResponse::error("File too large (max 100MB)".to_string())),
        Err(e) => {
            println!("❌ Failed to read file data: {}", e);
            return Json(ApiResponse::error(format!("Failed to read file: {}", e)));
        }
    };

    println!("📦 Received {} bytes", bytes.len());

    // Extract filename from path
    let name = decoded_path
        .rsplit('/')
        .next()
        .unwrap_or(&decoded_path)
        .to_string();

    let mime_type = content_type
        .map(|ct| ct.to_string())
        .unwrap_or_else(|| "application/octet-stream".to_string());

    match SyncService::upload_file(
        pool.inner(),
        &auth.folder_id,
        &decoded_path,
        &name,
        &bytes,
        &mime_type,
    )
    .await
    {
        Ok(file) => {
            println!("✅ File uploaded successfully: {}", decoded_path);
            Json(ApiResponse::success(serde_json::json!({
                "file": SyncFileResponse::from(file)
            })))
        }
        Err(e) => {
            println!("❌ Upload failed for {}: {}", decoded_path, e);
            Json(ApiResponse::error(e))
        }
    }
}

/// Download file
#[get("/sync/download/<file_id>")]
pub async fn download_file(
    auth: SyncAuth,
    file_id: &str,
    pool: &State<SqlitePool>,
) -> Result<(ContentType, Vec<u8>), Status> {
    let file = SyncService::get_file_by_id(pool.inner(), file_id)
        .await
        .map_err(|_| Status::InternalServerError)?
        .ok_or(Status::NotFound)?;

    // Verify file belongs to folder
    if file.folder_id != auth.folder_id {
        return Err(Status::Forbidden);
    }

    let data = SyncService::get_file_data(&auth.folder_id, file_id)
        .await
        .map_err(|_| Status::InternalServerError)?;

    let content_type = ContentType::parse_flexible(&file.mime_type).unwrap_or(ContentType::Binary);

    Ok((content_type, data))
}

/// Delete file
#[delete("/sync/files?<path>")]
pub async fn delete_file(
    auth: SyncAuth,
    path: String,
    pool: &State<SqlitePool>,
) -> Json<ApiResponse<serde_json::Value>> {
    match SyncService::delete_file(pool.inner(), &auth.folder_id, &path).await {
        Ok(true) => Json(ApiResponse::success(serde_json::json!({ "deleted": true }))),
        Ok(false) => Json(ApiResponse::error("File not found".to_string())),
        Err(e) => Json(ApiResponse::error(e)),
    }
}
