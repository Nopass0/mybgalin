use serde::{Deserialize, Serialize};
use sqlx::FromRow;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct StoredFile {
    pub id: String,
    pub name: String,
    pub path: String,
    pub folder_id: Option<String>,
    pub mime_type: String,
    pub size: i64,
    pub is_public: bool,
    pub access_code: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Folder {
    pub id: String,
    pub name: String,
    pub parent_id: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize)]
pub struct FileResponse {
    pub id: String,
    pub name: String,
    pub path: String,
    #[serde(rename = "folderId")]
    pub folder_id: Option<String>,
    #[serde(rename = "mimeType")]
    pub mime_type: String,
    pub size: i64,
    #[serde(rename = "isPublic")]
    pub is_public: bool,
    #[serde(rename = "hasAccessCode")]
    pub has_access_code: bool,
    pub url: Option<String>,
    #[serde(rename = "createdAt")]
    pub created_at: String,
    #[serde(rename = "updatedAt")]
    pub updated_at: String,
}

impl From<StoredFile> for FileResponse {
    fn from(f: StoredFile) -> Self {
        Self {
            id: f.id.clone(),
            name: f.name,
            path: f.path,
            folder_id: f.folder_id,
            mime_type: f.mime_type,
            size: f.size,
            is_public: f.is_public,
            has_access_code: f.access_code.is_some(),
            url: if f.is_public {
                Some(format!("/api/files/public/{}", f.id))
            } else {
                Some(format!("/api/files/private/{}", f.id))
            },
            created_at: f.created_at,
            updated_at: f.updated_at,
        }
    }
}

#[derive(Debug, Serialize)]
pub struct FolderResponse {
    pub id: String,
    pub name: String,
    #[serde(rename = "parentId")]
    pub parent_id: Option<String>,
    #[serde(rename = "createdAt")]
    pub created_at: String,
    #[serde(rename = "updatedAt")]
    pub updated_at: String,
}

impl From<Folder> for FolderResponse {
    fn from(f: Folder) -> Self {
        Self {
            id: f.id,
            name: f.name,
            parent_id: f.parent_id,
            created_at: f.created_at,
            updated_at: f.updated_at,
        }
    }
}

#[derive(Debug, Serialize)]
pub struct FolderContents {
    pub folder: Option<FolderResponse>,
    pub folders: Vec<FolderResponse>,
    pub files: Vec<FileResponse>,
    pub breadcrumbs: Vec<FolderResponse>,
}

#[derive(Debug, Deserialize)]
pub struct CreateFolderRequest {
    pub name: String,
    #[serde(rename = "parentId")]
    pub parent_id: Option<String>,
}

#[allow(dead_code)]
#[derive(Debug, Deserialize)]
pub struct UploadFileRequest {
    #[serde(rename = "folderId")]
    pub folder_id: Option<String>,
    #[serde(rename = "isPublic")]
    pub is_public: bool,
    #[serde(rename = "accessCode")]
    pub access_code: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct AccessCodeRequest {
    pub code: String,
}

#[derive(Debug, Deserialize)]
pub struct UpdateFileRequest {
    pub name: Option<String>,
    #[serde(rename = "isPublic")]
    pub is_public: Option<bool>,
    #[serde(rename = "accessCode")]
    pub access_code: Option<String>,
    #[serde(rename = "folderId")]
    pub folder_id: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct RenameFolderRequest {
    pub name: String,
}
