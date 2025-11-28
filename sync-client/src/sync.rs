use anyhow::{anyhow, Result};
use reqwest::header::{HeaderMap, HeaderValue, CONTENT_TYPE};
use reqwest::Client;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::collections::HashMap;
use std::path::{Path, PathBuf};
use tokio::fs;

#[derive(Debug, Clone)]
pub struct SyncClient {
    client: Client,
    api_url: String,
    api_key: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ApiResponse<T> {
    pub success: bool,
    pub data: Option<T>,
    pub error: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SyncFile {
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

#[derive(Debug, Serialize, Deserialize)]
struct RegisterResponse {
    #[serde(rename = "clientId")]
    client_id: String,
    #[serde(rename = "folderId")]
    folder_id: String,
}

#[derive(Debug, Serialize, Deserialize)]
struct FilesResponse {
    files: Vec<SyncFile>,
}

#[derive(Debug, Serialize)]
struct FileStatus {
    path: String,
    checksum: String,
    size: i64,
    #[serde(rename = "modifiedAt")]
    modified_at: String,
}

#[derive(Debug, Serialize)]
struct SyncStatusRequest {
    #[serde(rename = "clientId")]
    client_id: String,
    files: Vec<FileStatus>,
}

#[derive(Debug, Deserialize)]
struct SyncDiff {
    upload: Vec<String>,
    download: Vec<SyncFile>,
    delete: Vec<String>,
}

impl SyncClient {
    pub fn new(api_url: &str, api_key: &str) -> Self {
        let mut headers = HeaderMap::new();
        headers.insert(
            "X-API-Key",
            HeaderValue::from_str(api_key).unwrap_or_else(|_| HeaderValue::from_static("")),
        );

        let client = Client::builder()
            .default_headers(headers)
            .build()
            .expect("Failed to create HTTP client");

        Self {
            client,
            api_url: api_url.trim_end_matches('/').to_string(),
            api_key: api_key.to_string(),
        }
    }

    pub async fn test_connection(&self) -> Result<String> {
        // Try to list files to test connection
        let url = format!("{}/files", self.api_url);
        let response = self.client.get(&url).send().await?;

        if response.status().is_success() {
            // Get device name from hostname
            let device_name = hostname::get()
                .map(|h| h.to_string_lossy().to_string())
                .unwrap_or_else(|_| "Unknown Device".to_string());
            Ok(device_name)
        } else {
            Err(anyhow!("Connection failed: {}", response.status()))
        }
    }

    pub async fn register_device(&self, device_name: &str) -> Result<String> {
        let url = format!("{}/register", self.api_url);

        let response = self
            .client
            .post(&url)
            .json(&serde_json::json!({ "deviceName": device_name }))
            .send()
            .await?;

        if response.status().is_success() {
            let api_response: ApiResponse<RegisterResponse> = response.json().await?;
            if let Some(data) = api_response.data {
                Ok(data.client_id)
            } else {
                Err(anyhow!(
                    api_response.error.unwrap_or_else(|| "Unknown error".to_string())
                ))
            }
        } else {
            Err(anyhow!("Registration failed: {}", response.status()))
        }
    }

    pub async fn list_files(&self) -> Result<Vec<SyncFile>> {
        let url = format!("{}/files", self.api_url);
        let response = self.client.get(&url).send().await?;

        if response.status().is_success() {
            let api_response: ApiResponse<FilesResponse> = response.json().await?;
            if let Some(data) = api_response.data {
                Ok(data.files)
            } else {
                Ok(vec![])
            }
        } else {
            Err(anyhow!("Failed to list files: {}", response.status()))
        }
    }

    pub async fn sync(&self, local_path: &Path, client_id: &str) -> Result<(usize, usize)> {
        // Collect local file status
        let local_files = self.scan_local_files(local_path).await?;

        // Get sync diff from server
        let diff = self.get_sync_diff(client_id, &local_files).await?;

        let mut uploaded = 0;
        let mut downloaded = 0;

        // Upload files that server doesn't have
        for path in &diff.upload {
            let file_path = local_path.join(path);
            if file_path.exists() {
                match self.upload_file(&file_path, path).await {
                    Ok(_) => uploaded += 1,
                    Err(e) => eprintln!("Failed to upload {}: {}", path, e),
                }
            }
        }

        // Download files from server
        for file in &diff.download {
            let file_path = local_path.join(&file.path);
            match self.download_file(&file.id, &file_path).await {
                Ok(_) => downloaded += 1,
                Err(e) => eprintln!("Failed to download {}: {}", file.path, e),
            }
        }

        // Delete local files that don't exist on server
        for path in &diff.delete {
            let file_path = local_path.join(path);
            if file_path.exists() {
                fs::remove_file(&file_path).await.ok();
            }
        }

        Ok((uploaded, downloaded))
    }

    async fn scan_local_files(&self, local_path: &Path) -> Result<Vec<FileStatus>> {
        let mut files = Vec::new();
        self.scan_directory(local_path, local_path, &mut files).await?;
        Ok(files)
    }

    fn scan_directory<'a>(
        &'a self,
        base_path: &'a Path,
        current_path: &'a Path,
        files: &'a mut Vec<FileStatus>,
    ) -> std::pin::Pin<Box<dyn std::future::Future<Output = Result<()>> + Send + 'a>> {
        Box::pin(async move {
            let mut entries = fs::read_dir(current_path).await?;

            while let Some(entry) = entries.next_entry().await? {
                let path = entry.path();
                let metadata = entry.metadata().await?;

                if metadata.is_file() {
                    let relative_path = path
                        .strip_prefix(base_path)
                        .map_err(|e| anyhow!("{}", e))?
                        .to_string_lossy()
                        .replace('\\', "/");

                    let content = fs::read(&path).await?;
                    let checksum = compute_checksum(&content);

                    let modified = metadata
                        .modified()
                        .map(|t| {
                            chrono::DateTime::<chrono::Utc>::from(t)
                                .format("%Y-%m-%dT%H:%M:%SZ")
                                .to_string()
                        })
                        .unwrap_or_default();

                    files.push(FileStatus {
                        path: relative_path,
                        checksum,
                        size: metadata.len() as i64,
                        modified_at: modified,
                    });
                } else if metadata.is_dir() {
                    self.scan_directory(base_path, &path, files).await?;
                }
            }

            Ok(())
        })
    }

    async fn get_sync_diff(&self, client_id: &str, files: &[FileStatus]) -> Result<SyncDiff> {
        let url = format!("{}/status", self.api_url);

        let request = SyncStatusRequest {
            client_id: client_id.to_string(),
            files: files.to_vec(),
        };

        let response = self.client.post(&url).json(&request).send().await?;

        if response.status().is_success() {
            let api_response: ApiResponse<SyncDiff> = response.json().await?;
            api_response
                .data
                .ok_or_else(|| anyhow!(api_response.error.unwrap_or_else(|| "Unknown error".to_string())))
        } else {
            Err(anyhow!("Failed to get sync status: {}", response.status()))
        }
    }

    pub async fn upload_file(&self, local_path: &Path, relative_path: &str) -> Result<()> {
        let url = format!("{}/upload?path={}", self.api_url, urlencoding::encode(relative_path));
        let content = fs::read(local_path).await?;

        let mime_type = mime_guess::from_path(local_path)
            .first_or_octet_stream()
            .to_string();

        let response = self
            .client
            .post(&url)
            .header(CONTENT_TYPE, &mime_type)
            .body(content)
            .send()
            .await?;

        if response.status().is_success() {
            Ok(())
        } else {
            Err(anyhow!("Upload failed: {}", response.status()))
        }
    }

    pub async fn download_file(&self, file_id: &str, local_path: &Path) -> Result<()> {
        let url = format!("{}/download/{}", self.api_url, file_id);
        let response = self.client.get(&url).send().await?;

        if response.status().is_success() {
            let content = response.bytes().await?;

            // Create parent directories
            if let Some(parent) = local_path.parent() {
                fs::create_dir_all(parent).await?;
            }

            fs::write(local_path, content).await?;
            Ok(())
        } else {
            Err(anyhow!("Download failed: {}", response.status()))
        }
    }

    pub async fn delete_file(&self, relative_path: &str) -> Result<()> {
        let url = format!("{}/files?path={}", self.api_url, urlencoding::encode(relative_path));
        let response = self.client.delete(&url).send().await?;

        if response.status().is_success() {
            Ok(())
        } else {
            Err(anyhow!("Delete failed: {}", response.status()))
        }
    }
}

fn compute_checksum(data: &[u8]) -> String {
    let mut hasher = Sha256::new();
    hasher.update(data);
    format!("{:x}", hasher.finalize())
}

impl Clone for FileStatus {
    fn clone(&self) -> Self {
        Self {
            path: self.path.clone(),
            checksum: self.checksum.clone(),
            size: self.size,
            modified_at: self.modified_at.clone(),
        }
    }
}
