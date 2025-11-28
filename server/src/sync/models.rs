use serde::{Deserialize, Serialize};
use sqlx::FromRow;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct SyncFolder {
    pub id: String,
    pub name: String,
    pub api_key: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct SyncFile {
    pub id: String,
    pub folder_id: String,
    pub path: String,
    pub name: String,
    pub mime_type: String,
    pub size: i64,
    pub checksum: String,
    pub version: i64,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct SyncClient {
    pub id: String,
    pub folder_id: String,
    pub device_name: String,
    pub last_sync_at: Option<String>,
    pub created_at: String,
}

// API Response types
#[derive(Debug, Serialize)]
pub struct SyncFolderResponse {
    pub id: String,
    pub name: String,
    #[serde(rename = "apiKey")]
    pub api_key: String,
    #[serde(rename = "apiUrl")]
    pub api_url: String,
    #[serde(rename = "fileCount")]
    pub file_count: i64,
    #[serde(rename = "totalSize")]
    pub total_size: i64,
    #[serde(rename = "clientCount")]
    pub client_count: i64,
    #[serde(rename = "createdAt")]
    pub created_at: String,
    #[serde(rename = "updatedAt")]
    pub updated_at: String,
    pub clients: Vec<SyncClientResponse>,
}

#[derive(Debug, Serialize)]
pub struct SyncFileResponse {
    pub id: String,
    pub path: String,
    pub name: String,
    #[serde(rename = "mimeType")]
    pub mime_type: String,
    pub size: i64,
    pub checksum: String,
    pub version: i64,
    #[serde(rename = "updatedAt")]
    pub updated_at: String,
}

impl From<SyncFile> for SyncFileResponse {
    fn from(f: SyncFile) -> Self {
        Self {
            id: f.id,
            path: f.path,
            name: f.name,
            mime_type: f.mime_type,
            size: f.size,
            checksum: f.checksum,
            version: f.version,
            updated_at: f.updated_at,
        }
    }
}

#[derive(Debug, Serialize)]
pub struct SyncClientResponse {
    pub id: String,
    #[serde(rename = "deviceName")]
    pub device_name: String,
    #[serde(rename = "lastSyncAt")]
    pub last_sync_at: Option<String>,
    #[serde(rename = "createdAt")]
    pub created_at: String,
}

impl From<SyncClient> for SyncClientResponse {
    fn from(c: SyncClient) -> Self {
        Self {
            id: c.id,
            device_name: c.device_name,
            last_sync_at: c.last_sync_at,
            created_at: c.created_at,
        }
    }
}

// Request types
#[derive(Debug, Deserialize)]
pub struct CreateSyncFolderRequest {
    pub name: String,
}

#[derive(Debug, Deserialize)]
pub struct RenameSyncFolderRequest {
    pub name: String,
}

#[derive(Debug, Deserialize)]
pub struct RegisterClientRequest {
    #[serde(rename = "deviceName")]
    pub device_name: String,
}

#[derive(Debug, Deserialize)]
pub struct SyncStatusRequest {
    #[serde(rename = "clientId")]
    pub client_id: String,
    pub files: Vec<FileStatus>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct FileStatus {
    pub path: String,
    pub checksum: String,
    pub size: i64,
    #[serde(rename = "modifiedAt")]
    pub modified_at: String,
}

#[derive(Debug, Serialize)]
pub struct SyncDiff {
    pub upload: Vec<String>,   // Paths that need to be uploaded to server
    pub download: Vec<SyncFileResponse>, // Files that need to be downloaded from server
    pub delete: Vec<String>,   // Paths that should be deleted locally
}
