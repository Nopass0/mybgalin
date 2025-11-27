// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod database;
mod auth;

use tauri::Manager;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .setup(|app| {
            // Initialize database
            let app_handle = app.handle().clone();
            std::thread::spawn(move || {
                if let Err(e) = database::init_database(&app_handle) {
                    eprintln!("Failed to initialize database: {}", e);
                }
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // Window controls
            commands::minimize_window,
            commands::maximize_window,
            commands::close_window,
            commands::toggle_fullscreen,

            // File system
            commands::read_file,
            commands::write_file,
            commands::list_directory,
            commands::create_directory,
            commands::delete_file,
            commands::file_exists,
            commands::get_file_info,

            // Project management
            commands::save_project,
            commands::load_project,
            commands::list_projects,
            commands::delete_project,
            commands::export_image,

            // Auth
            commands::get_steam_auth_url,
            commands::handle_steam_callback,
            commands::get_user_info,
            commands::logout,
            commands::is_authenticated,

            // Settings
            commands::get_settings,
            commands::save_settings,

            // GPU rendering
            commands::check_gpu_support,
            commands::get_system_info,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
