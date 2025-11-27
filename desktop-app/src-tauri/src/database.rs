use rusqlite::{Connection, params};
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::AppHandle;
use crate::commands::AppSettings;

static DB_CONNECTION: Mutex<Option<Connection>> = Mutex::new(None);

fn get_db_path(app_handle: &AppHandle) -> Result<PathBuf, String> {
    let app_data = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?;
    std::fs::create_dir_all(&app_data).map_err(|e| e.to_string())?;
    Ok(app_data.join("studio.db"))
}

pub fn init_database(app_handle: &AppHandle) -> Result<(), String> {
    let db_path = get_db_path(app_handle)?;
    let conn = Connection::open(&db_path).map_err(|e| e.to_string())?;

    // Create tables
    conn.execute(
        "CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        )",
        [],
    ).map_err(|e| e.to_string())?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS auth (
            id INTEGER PRIMARY KEY,
            steam_id TEXT,
            username TEXT,
            avatar_url TEXT,
            access_token TEXT,
            refresh_token TEXT,
            expires_at INTEGER,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL
        )",
        [],
    ).map_err(|e| e.to_string())?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS recent_projects (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            project_id TEXT NOT NULL UNIQUE,
            opened_at INTEGER NOT NULL
        )",
        [],
    ).map_err(|e| e.to_string())?;

    // Store connection
    let mut guard = DB_CONNECTION.lock().map_err(|e| e.to_string())?;
    *guard = Some(conn);

    // Initialize default settings if not exists
    drop(guard);
    init_default_settings(app_handle)?;

    Ok(())
}

fn get_connection(app_handle: &AppHandle) -> Result<Connection, String> {
    let db_path = get_db_path(app_handle)?;
    Connection::open(&db_path).map_err(|e| e.to_string())
}

fn init_default_settings(app_handle: &AppHandle) -> Result<(), String> {
    let conn = get_connection(app_handle)?;

    let default_settings = serde_json::json!({
        "theme": "dark",
        "auto_save": true,
        "auto_save_interval": 60,
        "default_canvas_size": 1024,
        "show_grid": true,
        "snap_to_grid": false,
        "hardware_acceleration": true,
        "recent_projects": []
    });

    conn.execute(
        "INSERT OR IGNORE INTO settings (key, value) VALUES (?1, ?2)",
        params!["app_settings", default_settings.to_string()],
    ).map_err(|e| e.to_string())?;

    Ok(())
}

// ==================== Settings ====================

pub fn get_settings(app_handle: &AppHandle) -> Result<AppSettings, String> {
    let conn = get_connection(app_handle)?;

    let result: Result<String, _> = conn.query_row(
        "SELECT value FROM settings WHERE key = ?1",
        params!["app_settings"],
        |row| row.get(0),
    );

    match result {
        Ok(json_str) => {
            serde_json::from_str(&json_str).map_err(|e| e.to_string())
        }
        Err(_) => {
            Ok(AppSettings {
                theme: "dark".to_string(),
                auto_save: true,
                auto_save_interval: 60,
                default_canvas_size: 1024,
                show_grid: true,
                snap_to_grid: false,
                hardware_acceleration: true,
                recent_projects: vec![],
            })
        }
    }
}

pub fn save_settings(app_handle: &AppHandle, settings: &AppSettings) -> Result<(), String> {
    let conn = get_connection(app_handle)?;
    let json_str = serde_json::to_string(settings).map_err(|e| e.to_string())?;

    conn.execute(
        "INSERT OR REPLACE INTO settings (key, value) VALUES (?1, ?2)",
        params!["app_settings", json_str],
    ).map_err(|e| e.to_string())?;

    Ok(())
}

// ==================== Authentication ====================

#[derive(serde::Serialize, serde::Deserialize)]
pub struct UserInfo {
    pub steam_id: String,
    pub username: String,
    pub avatar_url: Option<String>,
}

pub fn save_auth(
    app_handle: &AppHandle,
    steam_id: &str,
    username: &str,
    avatar_url: Option<&str>,
    access_token: Option<&str>,
    refresh_token: Option<&str>,
    expires_at: Option<i64>,
) -> Result<(), String> {
    let conn = get_connection(app_handle)?;
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_secs() as i64;

    conn.execute(
        "DELETE FROM auth WHERE id = 1",
        [],
    ).map_err(|e| e.to_string())?;

    conn.execute(
        "INSERT INTO auth (id, steam_id, username, avatar_url, access_token, refresh_token, expires_at, created_at, updated_at)
         VALUES (1, ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?7)",
        params![
            steam_id,
            username,
            avatar_url,
            access_token,
            refresh_token,
            expires_at,
            now
        ],
    ).map_err(|e| e.to_string())?;

    Ok(())
}

pub fn get_user_info(app_handle: &AppHandle) -> Result<Option<String>, String> {
    let conn = get_connection(app_handle)?;

    let result: Result<(String, String, Option<String>), _> = conn.query_row(
        "SELECT steam_id, username, avatar_url FROM auth WHERE id = 1",
        [],
        |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
    );

    match result {
        Ok((steam_id, username, avatar_url)) => {
            let user_info = UserInfo {
                steam_id,
                username,
                avatar_url,
            };
            Ok(Some(serde_json::to_string(&user_info).map_err(|e| e.to_string())?))
        }
        Err(_) => Ok(None),
    }
}

pub fn clear_auth(app_handle: &AppHandle) -> Result<(), String> {
    let conn = get_connection(app_handle)?;

    conn.execute("DELETE FROM auth", []).map_err(|e| e.to_string())?;

    Ok(())
}

pub fn is_authenticated(app_handle: &AppHandle) -> Result<bool, String> {
    let conn = get_connection(app_handle)?;

    let count: i64 = conn.query_row(
        "SELECT COUNT(*) FROM auth WHERE id = 1",
        [],
        |row| row.get(0),
    ).map_err(|e| e.to_string())?;

    Ok(count > 0)
}

pub fn get_access_token(app_handle: &AppHandle) -> Result<Option<String>, String> {
    let conn = get_connection(app_handle)?;

    let result: Result<Option<String>, _> = conn.query_row(
        "SELECT access_token FROM auth WHERE id = 1",
        [],
        |row| row.get(0),
    );

    match result {
        Ok(token) => Ok(token),
        Err(_) => Ok(None),
    }
}

// ==================== Recent Projects ====================

pub fn add_recent_project(app_handle: &AppHandle, project_id: &str) -> Result<(), String> {
    let conn = get_connection(app_handle)?;
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_secs() as i64;

    conn.execute(
        "INSERT OR REPLACE INTO recent_projects (project_id, opened_at) VALUES (?1, ?2)",
        params![project_id, now],
    ).map_err(|e| e.to_string())?;

    // Keep only last 20 recent projects
    conn.execute(
        "DELETE FROM recent_projects WHERE id NOT IN (
            SELECT id FROM recent_projects ORDER BY opened_at DESC LIMIT 20
        )",
        [],
    ).map_err(|e| e.to_string())?;

    Ok(())
}

pub fn get_recent_projects(app_handle: &AppHandle) -> Result<Vec<String>, String> {
    let conn = get_connection(app_handle)?;

    let mut stmt = conn.prepare(
        "SELECT project_id FROM recent_projects ORDER BY opened_at DESC LIMIT 20"
    ).map_err(|e| e.to_string())?;

    let project_ids: Vec<String> = stmt
        .query_map([], |row| row.get(0))
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    Ok(project_ids)
}

pub fn remove_recent_project(app_handle: &AppHandle, project_id: &str) -> Result<(), String> {
    let conn = get_connection(app_handle)?;

    conn.execute(
        "DELETE FROM recent_projects WHERE project_id = ?1",
        params![project_id],
    ).map_err(|e| e.to_string())?;

    Ok(())
}
