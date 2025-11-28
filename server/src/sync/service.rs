use crate::sync::{
    FileStatus, SyncClient, SyncDiff, SyncFile, SyncFileResponse, SyncFolder, SyncFolderResponse,
};
use sha2::{Digest, Sha256};
use sqlx::SqlitePool;
use std::collections::HashMap;
use std::path::PathBuf;
use uuid::Uuid;

const SYNC_STORAGE_DIR: &str = "sync_storage";

pub struct SyncService;

impl SyncService {
    fn get_storage_dir() -> PathBuf {
        PathBuf::from(SYNC_STORAGE_DIR)
    }

    fn get_folder_dir(folder_id: &str) -> PathBuf {
        Self::get_storage_dir().join(folder_id)
    }

    fn get_file_path(folder_id: &str, file_id: &str) -> PathBuf {
        Self::get_folder_dir(folder_id).join(file_id)
    }

    fn generate_api_key() -> String {
        let key = Uuid::new_v4().to_string().replace("-", "");
        format!("sync_{}", key)
    }

    pub fn compute_checksum(data: &[u8]) -> String {
        let mut hasher = Sha256::new();
        hasher.update(data);
        format!("{:x}", hasher.finalize())
    }

    // ===== Folder operations =====

    pub async fn create_folder(pool: &SqlitePool, name: &str) -> Result<SyncFolder, String> {
        let id = Uuid::new_v4().to_string();
        let api_key = Self::generate_api_key();

        // Create storage directory
        let folder_dir = Self::get_folder_dir(&id);
        std::fs::create_dir_all(&folder_dir).map_err(|e| e.to_string())?;

        sqlx::query(
            r#"
            INSERT INTO sync_folders (id, name, api_key)
            VALUES (?, ?, ?)
            "#,
        )
        .bind(&id)
        .bind(name)
        .bind(&api_key)
        .execute(pool)
        .await
        .map_err(|e| e.to_string())?;

        Self::get_folder(pool, &id)
            .await?
            .ok_or_else(|| "Failed to create folder".to_string())
    }

    pub async fn get_folder(pool: &SqlitePool, folder_id: &str) -> Result<Option<SyncFolder>, String> {
        sqlx::query_as::<_, SyncFolder>("SELECT * FROM sync_folders WHERE id = ?")
            .bind(folder_id)
            .fetch_optional(pool)
            .await
            .map_err(|e| e.to_string())
    }

    pub async fn get_folder_by_key(pool: &SqlitePool, api_key: &str) -> Result<Option<SyncFolder>, String> {
        sqlx::query_as::<_, SyncFolder>("SELECT * FROM sync_folders WHERE api_key = ?")
            .bind(api_key)
            .fetch_optional(pool)
            .await
            .map_err(|e| e.to_string())
    }

    pub async fn list_folders(pool: &SqlitePool) -> Result<Vec<SyncFolderResponse>, String> {
        use crate::sync::SyncClientResponse;

        let folders: Vec<SyncFolder> =
            sqlx::query_as("SELECT * FROM sync_folders ORDER BY created_at DESC")
                .fetch_all(pool)
                .await
                .map_err(|e| e.to_string())?;

        let mut result = Vec::new();
        for folder in folders {
            let stats = Self::get_folder_stats(pool, &folder.id).await?;
            let clients = Self::list_clients(pool, &folder.id)
                .await
                .unwrap_or_default()
                .into_iter()
                .map(SyncClientResponse::from)
                .collect();
            let api_url = format!("/api/sync/{}", &folder.id);
            result.push(SyncFolderResponse {
                id: folder.id,
                name: folder.name,
                api_key: folder.api_key,
                api_url,
                file_count: stats.0,
                total_size: stats.1,
                client_count: stats.2,
                created_at: folder.created_at,
                updated_at: folder.updated_at,
                clients,
            });
        }

        Ok(result)
    }

    pub async fn get_folder_stats(pool: &SqlitePool, folder_id: &str) -> Result<(i64, i64, i64), String> {
        let file_stats: (i64, i64) = sqlx::query_as(
            "SELECT COUNT(*), COALESCE(SUM(size), 0) FROM sync_files WHERE folder_id = ?",
        )
        .bind(folder_id)
        .fetch_one(pool)
        .await
        .map_err(|e| e.to_string())?;

        let client_count: (i64,) =
            sqlx::query_as("SELECT COUNT(*) FROM sync_clients WHERE folder_id = ?")
                .bind(folder_id)
                .fetch_one(pool)
                .await
                .map_err(|e| e.to_string())?;

        Ok((file_stats.0, file_stats.1, client_count.0))
    }

    pub async fn rename_folder(pool: &SqlitePool, folder_id: &str, name: &str) -> Result<bool, String> {
        let result = sqlx::query(
            "UPDATE sync_folders SET name = ?, updated_at = datetime('now') WHERE id = ?",
        )
        .bind(name)
        .bind(folder_id)
        .execute(pool)
        .await
        .map_err(|e| e.to_string())?;

        Ok(result.rows_affected() > 0)
    }

    pub async fn regenerate_api_key(pool: &SqlitePool, folder_id: &str) -> Result<Option<String>, String> {
        let new_key = Self::generate_api_key();

        let result = sqlx::query(
            "UPDATE sync_folders SET api_key = ?, updated_at = datetime('now') WHERE id = ?",
        )
        .bind(&new_key)
        .bind(folder_id)
        .execute(pool)
        .await
        .map_err(|e| e.to_string())?;

        if result.rows_affected() > 0 {
            Ok(Some(new_key))
        } else {
            Ok(None)
        }
    }

    pub async fn delete_folder(pool: &SqlitePool, folder_id: &str) -> Result<bool, String> {
        // Delete storage directory
        let folder_dir = Self::get_folder_dir(folder_id);
        if folder_dir.exists() {
            std::fs::remove_dir_all(&folder_dir).ok();
        }

        let result = sqlx::query("DELETE FROM sync_folders WHERE id = ?")
            .bind(folder_id)
            .execute(pool)
            .await
            .map_err(|e| e.to_string())?;

        Ok(result.rows_affected() > 0)
    }

    // ===== Client operations =====

    pub async fn register_client(
        pool: &SqlitePool,
        folder_id: &str,
        device_name: &str,
    ) -> Result<SyncClient, String> {
        let id = Uuid::new_v4().to_string();

        sqlx::query(
            r#"
            INSERT INTO sync_clients (id, folder_id, device_name)
            VALUES (?, ?, ?)
            "#,
        )
        .bind(&id)
        .bind(folder_id)
        .bind(device_name)
        .execute(pool)
        .await
        .map_err(|e| e.to_string())?;

        Self::get_client(pool, &id)
            .await?
            .ok_or_else(|| "Failed to register client".to_string())
    }

    pub async fn get_client(pool: &SqlitePool, client_id: &str) -> Result<Option<SyncClient>, String> {
        sqlx::query_as::<_, SyncClient>("SELECT * FROM sync_clients WHERE id = ?")
            .bind(client_id)
            .fetch_optional(pool)
            .await
            .map_err(|e| e.to_string())
    }

    pub async fn list_clients(pool: &SqlitePool, folder_id: &str) -> Result<Vec<SyncClient>, String> {
        sqlx::query_as("SELECT * FROM sync_clients WHERE folder_id = ? ORDER BY created_at DESC")
            .bind(folder_id)
            .fetch_all(pool)
            .await
            .map_err(|e| e.to_string())
    }

    pub async fn update_client_sync_time(pool: &SqlitePool, client_id: &str) -> Result<(), String> {
        sqlx::query("UPDATE sync_clients SET last_sync_at = datetime('now') WHERE id = ?")
            .bind(client_id)
            .execute(pool)
            .await
            .map_err(|e| e.to_string())?;
        Ok(())
    }

    pub async fn delete_client(pool: &SqlitePool, client_id: &str) -> Result<bool, String> {
        let result = sqlx::query("DELETE FROM sync_clients WHERE id = ?")
            .bind(client_id)
            .execute(pool)
            .await
            .map_err(|e| e.to_string())?;

        Ok(result.rows_affected() > 0)
    }

    // ===== File operations =====

    pub async fn list_files(pool: &SqlitePool, folder_id: &str) -> Result<Vec<SyncFile>, String> {
        sqlx::query_as("SELECT * FROM sync_files WHERE folder_id = ? ORDER BY path")
            .bind(folder_id)
            .fetch_all(pool)
            .await
            .map_err(|e| e.to_string())
    }

    pub async fn get_file(pool: &SqlitePool, folder_id: &str, path: &str) -> Result<Option<SyncFile>, String> {
        sqlx::query_as("SELECT * FROM sync_files WHERE folder_id = ? AND path = ?")
            .bind(folder_id)
            .bind(path)
            .fetch_optional(pool)
            .await
            .map_err(|e| e.to_string())
    }

    pub async fn get_file_by_id(pool: &SqlitePool, file_id: &str) -> Result<Option<SyncFile>, String> {
        sqlx::query_as("SELECT * FROM sync_files WHERE id = ?")
            .bind(file_id)
            .fetch_optional(pool)
            .await
            .map_err(|e| e.to_string())
    }

    pub async fn upload_file(
        pool: &SqlitePool,
        folder_id: &str,
        path: &str,
        name: &str,
        data: &[u8],
        mime_type: &str,
    ) -> Result<SyncFile, String> {
        let checksum = Self::compute_checksum(data);
        let size = data.len() as i64;

        // Check if file exists
        let existing = Self::get_file(pool, folder_id, path).await?;

        let file_id = if let Some(existing) = existing {
            // Update existing file
            if existing.checksum != checksum {
                // Content changed, increment version
                sqlx::query(
                    r#"
                    UPDATE sync_files
                    SET checksum = ?, size = ?, version = version + 1, updated_at = datetime('now')
                    WHERE id = ?
                    "#,
                )
                .bind(&checksum)
                .bind(size)
                .bind(&existing.id)
                .execute(pool)
                .await
                .map_err(|e| e.to_string())?;
            }
            existing.id
        } else {
            // Create new file
            let id = Uuid::new_v4().to_string();

            sqlx::query(
                r#"
                INSERT INTO sync_files (id, folder_id, path, name, mime_type, size, checksum)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                "#,
            )
            .bind(&id)
            .bind(folder_id)
            .bind(path)
            .bind(name)
            .bind(mime_type)
            .bind(size)
            .bind(&checksum)
            .execute(pool)
            .await
            .map_err(|e| e.to_string())?;

            id
        };

        // Save file data
        let file_path = Self::get_file_path(folder_id, &file_id);
        std::fs::create_dir_all(file_path.parent().unwrap()).map_err(|e| e.to_string())?;
        std::fs::write(&file_path, data).map_err(|e| e.to_string())?;

        Self::get_file_by_id(pool, &file_id)
            .await?
            .ok_or_else(|| "Failed to save file".to_string())
    }

    pub async fn get_file_data(folder_id: &str, file_id: &str) -> Result<Vec<u8>, String> {
        let file_path = Self::get_file_path(folder_id, file_id);
        std::fs::read(&file_path).map_err(|e| e.to_string())
    }

    pub async fn delete_file(pool: &SqlitePool, folder_id: &str, path: &str) -> Result<bool, String> {
        let file = Self::get_file(pool, folder_id, path).await?;

        if let Some(file) = file {
            // Delete file from storage
            let file_path = Self::get_file_path(folder_id, &file.id);
            std::fs::remove_file(&file_path).ok();

            // Delete from database
            sqlx::query("DELETE FROM sync_files WHERE id = ?")
                .bind(&file.id)
                .execute(pool)
                .await
                .map_err(|e| e.to_string())?;

            Ok(true)
        } else {
            Ok(false)
        }
    }

    // ===== Sync operations =====

    pub async fn compute_sync_diff(
        pool: &SqlitePool,
        folder_id: &str,
        client_files: &[FileStatus],
    ) -> Result<SyncDiff, String> {
        let server_files = Self::list_files(pool, folder_id).await?;

        // Create maps for easier lookup
        let server_map: HashMap<String, &SyncFile> =
            server_files.iter().map(|f| (f.path.clone(), f)).collect();

        let client_map: HashMap<String, &FileStatus> =
            client_files.iter().map(|f| (f.path.clone(), f)).collect();

        let mut upload = Vec::new();
        let mut download = Vec::new();
        let mut delete = Vec::new();

        // Check client files
        for client_file in client_files {
            match server_map.get(&client_file.path) {
                Some(server_file) => {
                    // File exists on both - check checksum
                    if server_file.checksum != client_file.checksum {
                        // Conflict - server wins (newer version)
                        download.push(SyncFileResponse::from((*server_file).clone()));
                    }
                }
                None => {
                    // File only on client - needs upload
                    upload.push(client_file.path.clone());
                }
            }
        }

        // Check for files only on server
        for server_file in &server_files {
            if !client_map.contains_key(&server_file.path) {
                // File only on server - needs download
                download.push(SyncFileResponse::from(server_file.clone()));
            }
        }

        Ok(SyncDiff {
            upload,
            download,
            delete,
        })
    }
}
