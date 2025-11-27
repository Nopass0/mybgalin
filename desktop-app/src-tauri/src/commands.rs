use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tauri::{AppHandle, Manager, Window};
use tauri::path::BaseDirectory;

// ==================== Window Controls ====================

#[tauri::command]
pub fn minimize_window(window: Window) {
    window.minimize().unwrap();
}

#[tauri::command]
pub fn maximize_window(window: Window) {
    if window.is_maximized().unwrap() {
        window.unmaximize().unwrap();
    } else {
        window.maximize().unwrap();
    }
}

#[tauri::command]
pub fn close_window(window: Window) {
    window.close().unwrap();
}

#[tauri::command]
pub fn toggle_fullscreen(window: Window) {
    let is_fullscreen = window.is_fullscreen().unwrap();
    window.set_fullscreen(!is_fullscreen).unwrap();
}

// ==================== File System ====================

#[derive(Serialize, Deserialize)]
pub struct FileInfo {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    pub size: u64,
    pub modified: Option<u64>,
}

#[tauri::command]
pub async fn read_file(path: String) -> Result<Vec<u8>, String> {
    fs::read(&path).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn write_file(path: String, contents: Vec<u8>) -> Result<(), String> {
    // Create parent directories if they don't exist
    if let Some(parent) = PathBuf::from(&path).parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    fs::write(&path, contents).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn list_directory(path: String) -> Result<Vec<FileInfo>, String> {
    let mut files = Vec::new();

    let entries = fs::read_dir(&path).map_err(|e| e.to_string())?;

    for entry in entries {
        let entry = entry.map_err(|e| e.to_string())?;
        let metadata = entry.metadata().map_err(|e| e.to_string())?;

        let modified = metadata.modified().ok().and_then(|t| {
            t.duration_since(std::time::UNIX_EPOCH).ok().map(|d| d.as_secs())
        });

        files.push(FileInfo {
            name: entry.file_name().to_string_lossy().to_string(),
            path: entry.path().to_string_lossy().to_string(),
            is_dir: metadata.is_dir(),
            size: metadata.len(),
            modified,
        });
    }

    Ok(files)
}

#[tauri::command]
pub async fn create_directory(path: String) -> Result<(), String> {
    fs::create_dir_all(&path).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn delete_file(path: String) -> Result<(), String> {
    let path = PathBuf::from(&path);
    if path.is_dir() {
        fs::remove_dir_all(&path).map_err(|e| e.to_string())
    } else {
        fs::remove_file(&path).map_err(|e| e.to_string())
    }
}

#[tauri::command]
pub async fn file_exists(path: String) -> bool {
    PathBuf::from(&path).exists()
}

#[tauri::command]
pub async fn get_file_info(path: String) -> Result<FileInfo, String> {
    let path_buf = PathBuf::from(&path);
    let metadata = fs::metadata(&path).map_err(|e| e.to_string())?;

    let modified = metadata.modified().ok().and_then(|t| {
        t.duration_since(std::time::UNIX_EPOCH).ok().map(|d| d.as_secs())
    });

    Ok(FileInfo {
        name: path_buf.file_name().unwrap_or_default().to_string_lossy().to_string(),
        path,
        is_dir: metadata.is_dir(),
        size: metadata.len(),
        modified,
    })
}

// ==================== Project Management ====================

#[derive(Serialize, Deserialize)]
pub struct ProjectInfo {
    pub id: String,
    pub name: String,
    pub path: String,
    pub created_at: u64,
    pub modified_at: u64,
    pub thumbnail: Option<String>,
}

fn get_projects_dir(app_handle: &AppHandle) -> Result<PathBuf, String> {
    let app_data = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?;
    let projects_dir = app_data.join("projects");
    fs::create_dir_all(&projects_dir).map_err(|e| e.to_string())?;
    Ok(projects_dir)
}

#[tauri::command]
pub async fn save_project(
    app_handle: AppHandle,
    id: String,
    name: String,
    data: String,
    thumbnail: Option<String>,
) -> Result<ProjectInfo, String> {
    let projects_dir = get_projects_dir(&app_handle)?;
    let project_dir = projects_dir.join(&id);
    fs::create_dir_all(&project_dir).map_err(|e| e.to_string())?;

    // Save project data
    let data_path = project_dir.join("project.json");
    fs::write(&data_path, &data).map_err(|e| e.to_string())?;

    // Save thumbnail if provided
    if let Some(thumb) = &thumbnail {
        let thumb_path = project_dir.join("thumbnail.png");
        // Assume base64 encoded PNG
        if let Some(data) = thumb.strip_prefix("data:image/png;base64,") {
            if let Ok(decoded) = base64_decode(data) {
                fs::write(&thumb_path, decoded).ok();
            }
        }
    }

    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_secs();

    // Save metadata
    let meta = serde_json::json!({
        "id": id,
        "name": name,
        "created_at": now,
        "modified_at": now,
    });
    let meta_path = project_dir.join("meta.json");
    fs::write(&meta_path, meta.to_string()).map_err(|e| e.to_string())?;

    Ok(ProjectInfo {
        id,
        name,
        path: project_dir.to_string_lossy().to_string(),
        created_at: now,
        modified_at: now,
        thumbnail,
    })
}

#[tauri::command]
pub async fn load_project(app_handle: AppHandle, id: String) -> Result<String, String> {
    let projects_dir = get_projects_dir(&app_handle)?;
    let data_path = projects_dir.join(&id).join("project.json");
    fs::read_to_string(&data_path).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn list_projects(app_handle: AppHandle) -> Result<Vec<ProjectInfo>, String> {
    let projects_dir = get_projects_dir(&app_handle)?;
    let mut projects = Vec::new();

    if let Ok(entries) = fs::read_dir(&projects_dir) {
        for entry in entries.flatten() {
            if entry.path().is_dir() {
                let meta_path = entry.path().join("meta.json");
                if let Ok(meta_str) = fs::read_to_string(&meta_path) {
                    if let Ok(meta) = serde_json::from_str::<serde_json::Value>(&meta_str) {
                        let thumb_path = entry.path().join("thumbnail.png");
                        let thumbnail = if thumb_path.exists() {
                            fs::read(&thumb_path).ok().map(|data| {
                                format!("data:image/png;base64,{}", base64_encode(&data))
                            })
                        } else {
                            None
                        };

                        projects.push(ProjectInfo {
                            id: meta["id"].as_str().unwrap_or_default().to_string(),
                            name: meta["name"].as_str().unwrap_or_default().to_string(),
                            path: entry.path().to_string_lossy().to_string(),
                            created_at: meta["created_at"].as_u64().unwrap_or(0),
                            modified_at: meta["modified_at"].as_u64().unwrap_or(0),
                            thumbnail,
                        });
                    }
                }
            }
        }
    }

    // Sort by modified date, newest first
    projects.sort_by(|a, b| b.modified_at.cmp(&a.modified_at));

    Ok(projects)
}

#[tauri::command]
pub async fn delete_project(app_handle: AppHandle, id: String) -> Result<(), String> {
    let projects_dir = get_projects_dir(&app_handle)?;
    let project_dir = projects_dir.join(&id);
    if project_dir.exists() {
        fs::remove_dir_all(&project_dir).map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub async fn export_image(path: String, data: String, format: String) -> Result<(), String> {
    // Decode base64 image data
    let prefix = format!("data:image/{};base64,", format);
    let data = data.strip_prefix(&prefix).unwrap_or(&data);
    let decoded = base64_decode(data)?;

    // Create parent directories
    if let Some(parent) = PathBuf::from(&path).parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }

    fs::write(&path, decoded).map_err(|e| e.to_string())
}

// ==================== Auth ====================

#[tauri::command]
pub async fn get_steam_auth_url(app_handle: AppHandle) -> Result<String, String> {
    // This would generate a Steam OpenID auth URL
    // The actual URL depends on your backend configuration
    let callback_url = "http://localhost:3000/studio/auth/callback";
    let steam_url = format!(
        "https://steamcommunity.com/openid/login?\
        openid.ns=http://specs.openid.net/auth/2.0&\
        openid.mode=checkid_setup&\
        openid.return_to={}&\
        openid.realm=http://localhost:3000&\
        openid.identity=http://specs.openid.net/auth/2.0/identifier_select&\
        openid.claimed_id=http://specs.openid.net/auth/2.0/identifier_select",
        callback_url
    );
    Ok(steam_url)
}

#[tauri::command]
pub async fn handle_steam_callback(app_handle: AppHandle, params: String) -> Result<String, String> {
    // Handle the Steam callback and store the auth token
    // This would normally validate with your backend
    Ok("{}".to_string())
}

#[tauri::command]
pub async fn get_user_info(app_handle: AppHandle) -> Result<Option<String>, String> {
    // Get stored user info from local database
    crate::database::get_user_info(&app_handle)
}

#[tauri::command]
pub async fn logout(app_handle: AppHandle) -> Result<(), String> {
    crate::database::clear_auth(&app_handle)
}

#[tauri::command]
pub async fn is_authenticated(app_handle: AppHandle) -> Result<bool, String> {
    crate::database::is_authenticated(&app_handle)
}

// ==================== Settings ====================

#[derive(Serialize, Deserialize, Default)]
pub struct AppSettings {
    pub theme: String,
    pub auto_save: bool,
    pub auto_save_interval: u32,
    pub default_canvas_size: u32,
    pub show_grid: bool,
    pub snap_to_grid: bool,
    pub hardware_acceleration: bool,
    pub recent_projects: Vec<String>,
}

#[tauri::command]
pub async fn get_settings(app_handle: AppHandle) -> Result<AppSettings, String> {
    crate::database::get_settings(&app_handle)
}

#[tauri::command]
pub async fn save_settings(app_handle: AppHandle, settings: AppSettings) -> Result<(), String> {
    crate::database::save_settings(&app_handle, &settings)
}

// ==================== System Info ====================

#[derive(Serialize)]
pub struct SystemInfo {
    pub os: String,
    pub arch: String,
    pub cpu_cores: usize,
    pub memory_gb: f64,
    pub gpu_available: bool,
}

#[tauri::command]
pub async fn check_gpu_support() -> Result<bool, String> {
    // Check if GPU acceleration is available
    // This is a simplified check
    Ok(true)
}

#[tauri::command]
pub async fn get_system_info() -> Result<SystemInfo, String> {
    Ok(SystemInfo {
        os: std::env::consts::OS.to_string(),
        arch: std::env::consts::ARCH.to_string(),
        cpu_cores: num_cpus(),
        memory_gb: get_system_memory(),
        gpu_available: true,
    })
}

// ==================== Helpers ====================

fn base64_encode(data: &[u8]) -> String {
    const ALPHABET: &[u8] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let mut result = String::new();

    for chunk in data.chunks(3) {
        let b0 = chunk[0] as usize;
        let b1 = chunk.get(1).copied().unwrap_or(0) as usize;
        let b2 = chunk.get(2).copied().unwrap_or(0) as usize;

        result.push(ALPHABET[b0 >> 2] as char);
        result.push(ALPHABET[((b0 & 0x03) << 4) | (b1 >> 4)] as char);

        if chunk.len() > 1 {
            result.push(ALPHABET[((b1 & 0x0f) << 2) | (b2 >> 6)] as char);
        } else {
            result.push('=');
        }

        if chunk.len() > 2 {
            result.push(ALPHABET[b2 & 0x3f] as char);
        } else {
            result.push('=');
        }
    }

    result
}

fn base64_decode(data: &str) -> Result<Vec<u8>, String> {
    const DECODE: [i8; 128] = [
        -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
        -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
        -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, 62, -1, -1, -1, 63,
        52, 53, 54, 55, 56, 57, 58, 59, 60, 61, -1, -1, -1, -1, -1, -1,
        -1,  0,  1,  2,  3,  4,  5,  6,  7,  8,  9, 10, 11, 12, 13, 14,
        15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, -1, -1, -1, -1, -1,
        -1, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40,
        41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, -1, -1, -1, -1, -1,
    ];

    let data = data.trim_end_matches('=');
    let mut result = Vec::with_capacity(data.len() * 3 / 4);

    for chunk in data.as_bytes().chunks(4) {
        let mut buf = [0u8; 4];
        for (i, &c) in chunk.iter().enumerate() {
            if c as usize >= 128 {
                return Err("Invalid base64 character".to_string());
            }
            let val = DECODE[c as usize];
            if val < 0 {
                return Err("Invalid base64 character".to_string());
            }
            buf[i] = val as u8;
        }

        result.push((buf[0] << 2) | (buf[1] >> 4));
        if chunk.len() > 2 {
            result.push((buf[1] << 4) | (buf[2] >> 2));
        }
        if chunk.len() > 3 {
            result.push((buf[2] << 6) | buf[3]);
        }
    }

    Ok(result)
}

fn num_cpus() -> usize {
    std::thread::available_parallelism()
        .map(|p| p.get())
        .unwrap_or(1)
}

fn get_system_memory() -> f64 {
    // This is a simplified memory check
    // In production, you'd use a crate like sysinfo
    8.0 // Default to 8GB
}
