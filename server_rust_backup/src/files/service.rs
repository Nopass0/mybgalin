use crate::files::models::*;
use sha2::{Digest, Sha256};
use sqlx::SqlitePool;
use std::path::PathBuf;
use tokio::fs;
use uuid::Uuid;

const FILES_DIR: &str = "uploads/files";

pub struct FileService;

impl FileService {
    /// Initialize the file storage directory
    pub async fn init() -> Result<(), String> {
        fs::create_dir_all(FILES_DIR).await.map_err(|e| e.to_string())?;
        Ok(())
    }

    /// Get storage path for a file
    fn get_storage_path(file_id: &str) -> PathBuf {
        PathBuf::from(FILES_DIR).join(file_id)
    }

    /// Create a new folder
    pub async fn create_folder(
        pool: &SqlitePool,
        name: &str,
        parent_id: Option<&str>,
    ) -> Result<Folder, String> {
        let id = Uuid::new_v4().to_string();
        let now = chrono::Utc::now().to_rfc3339();

        sqlx::query(
            r#"
            INSERT INTO file_folders (id, name, parent_id, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?)
            "#,
        )
        .bind(&id)
        .bind(name)
        .bind(parent_id)
        .bind(&now)
        .bind(&now)
        .execute(pool)
        .await
        .map_err(|e| e.to_string())?;

        Ok(Folder {
            id,
            name: name.to_string(),
            parent_id: parent_id.map(String::from),
            created_at: now.clone(),
            updated_at: now,
        })
    }

    /// Get folder by ID
    pub async fn get_folder(pool: &SqlitePool, folder_id: &str) -> Result<Option<Folder>, String> {
        let folder: Option<Folder> = sqlx::query_as(
            "SELECT * FROM file_folders WHERE id = ?"
        )
        .bind(folder_id)
        .fetch_optional(pool)
        .await
        .map_err(|e| e.to_string())?;

        Ok(folder)
    }

    /// Get folder contents
    pub async fn get_folder_contents(
        pool: &SqlitePool,
        folder_id: Option<&str>,
    ) -> Result<FolderContents, String> {
        // Get current folder
        let folder = if let Some(id) = folder_id {
            Self::get_folder(pool, id).await?.map(FolderResponse::from)
        } else {
            None
        };

        // Get subfolders
        let folders: Vec<Folder> = if let Some(id) = folder_id {
            sqlx::query_as("SELECT * FROM file_folders WHERE parent_id = ? ORDER BY name")
                .bind(id)
                .fetch_all(pool)
                .await
                .map_err(|e| e.to_string())?
        } else {
            sqlx::query_as("SELECT * FROM file_folders WHERE parent_id IS NULL ORDER BY name")
                .fetch_all(pool)
                .await
                .map_err(|e| e.to_string())?
        };

        // Get files
        let files: Vec<StoredFile> = if let Some(id) = folder_id {
            sqlx::query_as("SELECT * FROM stored_files WHERE folder_id = ? ORDER BY name")
                .bind(id)
                .fetch_all(pool)
                .await
                .map_err(|e| e.to_string())?
        } else {
            sqlx::query_as("SELECT * FROM stored_files WHERE folder_id IS NULL ORDER BY name")
                .fetch_all(pool)
                .await
                .map_err(|e| e.to_string())?
        };

        // Build breadcrumbs
        let mut breadcrumbs = Vec::new();
        let mut current_id = folder_id.map(String::from);

        while let Some(id) = current_id {
            if let Some(f) = Self::get_folder(pool, &id).await? {
                current_id = f.parent_id.clone();
                breadcrumbs.push(FolderResponse::from(f));
            } else {
                break;
            }
        }
        breadcrumbs.reverse();

        Ok(FolderContents {
            folder,
            folders: folders.into_iter().map(FolderResponse::from).collect(),
            files: files.into_iter().map(FileResponse::from).collect(),
            breadcrumbs,
        })
    }

    /// Upload a file
    pub async fn upload_file(
        pool: &SqlitePool,
        name: &str,
        data: &[u8],
        mime_type: &str,
        folder_id: Option<&str>,
        is_public: bool,
        access_code: Option<&str>,
    ) -> Result<StoredFile, String> {
        let id = Uuid::new_v4().to_string();
        let now = chrono::Utc::now().to_rfc3339();

        // Hash access code if provided
        let hashed_code = access_code.map(|code| {
            let mut hasher = Sha256::new();
            hasher.update(code.as_bytes());
            hex::encode(hasher.finalize())
        });

        // Save file to disk
        let file_path = Self::get_storage_path(&id);
        fs::write(&file_path, data).await.map_err(|e| e.to_string())?;

        let size = data.len() as i64;

        sqlx::query(
            r#"
            INSERT INTO stored_files (id, name, path, folder_id, mime_type, size, is_public, access_code, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            "#,
        )
        .bind(&id)
        .bind(name)
        .bind(file_path.to_string_lossy().to_string())
        .bind(folder_id)
        .bind(mime_type)
        .bind(size)
        .bind(is_public)
        .bind(&hashed_code)
        .bind(&now)
        .bind(&now)
        .execute(pool)
        .await
        .map_err(|e| e.to_string())?;

        Ok(StoredFile {
            id,
            name: name.to_string(),
            path: file_path.to_string_lossy().to_string(),
            folder_id: folder_id.map(String::from),
            mime_type: mime_type.to_string(),
            size,
            is_public,
            access_code: hashed_code,
            created_at: now.clone(),
            updated_at: now,
        })
    }

    /// Get file by ID
    pub async fn get_file(pool: &SqlitePool, file_id: &str) -> Result<Option<StoredFile>, String> {
        let file: Option<StoredFile> = sqlx::query_as(
            "SELECT * FROM stored_files WHERE id = ?"
        )
        .bind(file_id)
        .fetch_optional(pool)
        .await
        .map_err(|e| e.to_string())?;

        Ok(file)
    }

    /// Verify access code
    pub fn verify_access_code(stored_hash: &str, provided_code: &str) -> bool {
        let mut hasher = Sha256::new();
        hasher.update(provided_code.as_bytes());
        let provided_hash = hex::encode(hasher.finalize());
        stored_hash == provided_hash
    }

    /// Get file data
    pub async fn get_file_data(file_id: &str) -> Result<Vec<u8>, String> {
        let path = Self::get_storage_path(file_id);
        fs::read(&path).await.map_err(|e| e.to_string())
    }

    /// Update file
    pub async fn update_file(
        pool: &SqlitePool,
        file_id: &str,
        name: Option<&str>,
        is_public: Option<bool>,
        access_code: Option<&str>,
        folder_id: Option<Option<&str>>,
    ) -> Result<Option<StoredFile>, String> {
        let now = chrono::Utc::now().to_rfc3339();

        // Build update query dynamically
        let mut updates = vec!["updated_at = ?"];
        let mut has_name = false;
        let mut has_public = false;
        let mut has_code = false;
        let mut has_folder = false;

        if name.is_some() {
            updates.push("name = ?");
            has_name = true;
        }
        if is_public.is_some() {
            updates.push("is_public = ?");
            has_public = true;
        }
        if access_code.is_some() {
            updates.push("access_code = ?");
            has_code = true;
        }
        if folder_id.is_some() {
            updates.push("folder_id = ?");
            has_folder = true;
        }

        let query = format!(
            "UPDATE stored_files SET {} WHERE id = ?",
            updates.join(", ")
        );

        let hashed_code = access_code.map(|code| {
            let mut hasher = Sha256::new();
            hasher.update(code.as_bytes());
            hex::encode(hasher.finalize())
        });

        let mut q = sqlx::query(&query).bind(&now);

        if has_name {
            q = q.bind(name.unwrap());
        }
        if has_public {
            q = q.bind(is_public.unwrap());
        }
        if has_code {
            q = q.bind(&hashed_code);
        }
        if has_folder {
            q = q.bind(folder_id.unwrap());
        }

        q = q.bind(file_id);
        q.execute(pool).await.map_err(|e| e.to_string())?;

        Self::get_file(pool, file_id).await
    }

    /// Delete file
    pub async fn delete_file(pool: &SqlitePool, file_id: &str) -> Result<bool, String> {
        // Delete from disk
        let path = Self::get_storage_path(file_id);
        if path.exists() {
            fs::remove_file(&path).await.ok();
        }

        // Delete from database
        let result = sqlx::query("DELETE FROM stored_files WHERE id = ?")
            .bind(file_id)
            .execute(pool)
            .await
            .map_err(|e| e.to_string())?;

        Ok(result.rows_affected() > 0)
    }

    /// Delete folder and all contents
    pub fn delete_folder<'a>(
        pool: &'a SqlitePool,
        folder_id: &'a str,
    ) -> std::pin::Pin<Box<dyn std::future::Future<Output = Result<bool, String>> + Send + 'a>> {
        let folder_id = folder_id.to_string();
        Box::pin(async move {
            // Get all files in folder
            let files: Vec<StoredFile> = sqlx::query_as(
                "SELECT * FROM stored_files WHERE folder_id = ?"
            )
            .bind(&folder_id)
            .fetch_all(pool)
            .await
            .map_err(|e| e.to_string())?;

            // Delete all files
            for file in files {
                Self::delete_file(pool, &file.id).await?;
            }

            // Get all subfolders
            let subfolders: Vec<Folder> = sqlx::query_as(
                "SELECT * FROM file_folders WHERE parent_id = ?"
            )
            .bind(&folder_id)
            .fetch_all(pool)
            .await
            .map_err(|e| e.to_string())?;

            // Recursively delete subfolders
            for subfolder in subfolders {
                Self::delete_folder(pool, &subfolder.id).await?;
            }

            // Delete the folder itself
            let result = sqlx::query("DELETE FROM file_folders WHERE id = ?")
                .bind(&folder_id)
                .execute(pool)
                .await
                .map_err(|e| e.to_string())?;

            Ok(result.rows_affected() > 0)
        })
    }

    /// Rename folder
    pub async fn rename_folder(
        pool: &SqlitePool,
        folder_id: &str,
        new_name: &str,
    ) -> Result<Option<Folder>, String> {
        let now = chrono::Utc::now().to_rfc3339();

        sqlx::query("UPDATE file_folders SET name = ?, updated_at = ? WHERE id = ?")
            .bind(new_name)
            .bind(&now)
            .bind(folder_id)
            .execute(pool)
            .await
            .map_err(|e| e.to_string())?;

        Self::get_folder(pool, folder_id).await
    }

    /// Get all public files
    #[allow(dead_code)]
    pub async fn get_public_files(pool: &SqlitePool) -> Result<Vec<StoredFile>, String> {
        let files: Vec<StoredFile> = sqlx::query_as(
            "SELECT * FROM stored_files WHERE is_public = 1 ORDER BY created_at DESC"
        )
        .fetch_all(pool)
        .await
        .map_err(|e| e.to_string())?;

        Ok(files)
    }
}
