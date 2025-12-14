mod alice;
mod anime;
mod auth;
mod cs2;
mod db;
mod files;
mod guards;
mod jobs;
mod models;
mod portfolio;
mod publish;
mod routes;
mod steam;
mod studio;
mod sync;
mod t2;
mod telegram;

use rocket::{launch, routes};
use rocket_cors::{AllowedOrigins, CorsOptions};
use std::env;

#[launch]
async fn rocket() -> _ {
    // Load environment variables from .env file
    dotenv::dotenv().ok();

    // Get configuration from environment
    let database_url = env::var("DATABASE_URL").expect("DATABASE_URL must be set");

    let telegram_bot_token = env::var("TELEGRAM_BOT_TOKEN").expect("TELEGRAM_BOT_TOKEN must be set");
    let admin_telegram_id: i64 = env::var("ADMIN_TELEGRAM_ID")
        .expect("ADMIN_TELEGRAM_ID must be set")
        .parse()
        .expect("ADMIN_TELEGRAM_ID must be a valid number");
    let steam_api_key = env::var("STEAM_API_KEY").expect("STEAM_API_KEY must be set");
    let steam_id = env::var("STEAM_ID").expect("STEAM_ID must be set");
    let faceit_api_key = env::var("FACEIT_API_KEY").ok();

    // Initialize database
    let pool = db::create_pool(&database_url)
        .await
        .expect("Failed to create database pool");

    // Initialize Telegram bot
    let telegram_bot = telegram::TelegramBot::new(telegram_bot_token);

    // Initialize Steam client
    let steam_client = steam::SteamClient::new(steam_api_key.clone(), steam_id.clone());

    // Initialize CS2 systems
    let player_stats_client = cs2::PlayerStatsClient::new(steam_api_key.clone(), faceit_api_key.clone());
    let match_state_manager = cs2::MatchStateManager::new();

    // Initialize job search system (SQLite only for now)
    let job_scheduler = jobs::MaybeJobScheduler::new(match &pool {
        db::DbPool::Sqlite(sqlite_pool) => {
            let scheduler = jobs::JobScheduler::new(sqlite_pool.clone());
            scheduler.clone().spawn_scheduler();
            Some(scheduler)
        }
        db::DbPool::Postgres(_) => {
            println!("⚠️  Job scheduler not available with PostgreSQL (SQLite-only feature)");
            None
        }
    });

    // Initialize publish service
    let publish_service = publish::PublishService::new();

    // Spawn cleanup task for expired publish jobs
    let publish_service_cleanup = publish_service.clone();
    tokio::spawn(async move {
        loop {
            tokio::time::sleep(tokio::time::Duration::from_secs(300)).await; // Every 5 minutes
            publish_service_cleanup.cleanup_expired().await;
        }
    });

    // Initialize file service
    files::FileService::init().await.expect("Failed to initialize file service");

    // Initialize sync service
    sync::SyncService::init().expect("Failed to initialize sync service");

    // Initialize Alice Smart Home state
    let alice_state = alice::AliceState::new();

    println!("🚀 Server starting...");
    println!("📊 Database: {}", database_url);
    println!("👤 Admin Telegram ID: {}", admin_telegram_id);
    println!("🎮 Steam ID: {}", steam_id);
    println!("🎯 Faceit API: {}", if faceit_api_key.is_some() { "enabled" } else { "disabled" });
    println!("💼 Job search system: ready");
    println!("🎨 CS2 Skin Studio: ready");
    println!("📹 Publishing Tools: ready");
    println!("📁 File Manager: ready");
    println!("☁️  Cloud Sync: ready");
    println!("🔗 Link Shortener: ready");
    println!("📱 T2 Sales System: ready");
    println!("🏠 Alice Smart Home: ready");
    println!("✅ All systems ready");

    // Configure CORS
    let cors = CorsOptions {
        allowed_origins: AllowedOrigins::all(),
        allowed_methods: vec![
            rocket::http::Method::Get,
            rocket::http::Method::Post,
            rocket::http::Method::Put,
            rocket::http::Method::Delete,
            rocket::http::Method::Options,
        ]
        .into_iter()
        .map(From::from)
        .collect(),
        allowed_headers: rocket_cors::AllowedHeaders::all(),
        allow_credentials: true,
        ..Default::default()
    }
    .to_cors()
    .expect("Failed to create CORS fairing");

    rocket::build()
        .attach(cors)
        .manage(pool)
        .manage(telegram_bot)
        .manage(steam_client)
        .manage(player_stats_client)
        .manage(match_state_manager)
        .manage(job_scheduler)
        .manage(admin_telegram_id)
        .manage(publish_service)
        .manage(alice_state)
        // Public routes
        .mount(
            "/",
            routes![
                routes::public_routes::index,
                routes::public_routes::health,
                routes::public_routes::server_time,
                routes::public_routes::steam_profile,
                routes::public_routes::workshop_all,
                routes::public_routes::workshop_by_game,
                routes::public_routes::workshop_items,
            ],
        )
        // Auth routes
        .mount(
            "/api",
            routes![
                routes::auth::request_otp,
                routes::auth::verify_otp,
            ],
        )
        // Public portfolio route
        .mount(
            "/api",
            routes![
                routes::portfolio::get_portfolio,
            ],
        )
        // CS2 routes
        .mount(
            "/api",
            routes![
                routes::cs2::receive_gsi,
                routes::cs2::get_current_match,
                routes::cs2::clear_match,
            ],
        )
        // Admin routes (protected)
        .mount(
            "/api",
            routes![
                routes::admin::admin_info,
                routes::admin::admin_dashboard,
                routes::admin::admin_stats,
            ],
        )
        // Admin portfolio routes (protected)
        .mount(
            "/api",
            routes![
                // About
                routes::portfolio::create_about,
                routes::portfolio::update_about,
                routes::portfolio::delete_about,
                routes::portfolio::improve_about_text,
                // HH.ru Import
                routes::portfolio::get_hh_resumes,
                // Experience
                routes::portfolio::create_experience,
                routes::portfolio::update_experience,
                routes::portfolio::delete_experience,
                // Skills
                routes::portfolio::create_skill,
                routes::portfolio::update_skill,
                routes::portfolio::delete_skill,
                // Contacts
                routes::portfolio::create_contact,
                routes::portfolio::update_contact,
                routes::portfolio::delete_contact,
                // Cases
                routes::portfolio::create_case,
                routes::portfolio::delete_case,
            ],
        )
        // Job search routes (protected)
        .mount(
            "/api",
            routes![
                routes::jobs::start_job_search,
                routes::jobs::stop_job_search,
                routes::jobs::get_search_status,
                routes::jobs::update_search_settings,
                routes::jobs::get_vacancies,
                routes::jobs::get_vacancy_details,
                routes::jobs::get_vacancies_by_status,
                routes::jobs::get_job_stats,
                routes::jobs::ignore_vacancy,
                routes::jobs::start_hh_auth,
                // Chats
                routes::jobs::get_chats,
                routes::jobs::get_chat_messages,
                // Tags
                routes::jobs::get_tags,
                routes::jobs::generate_tags,
                routes::jobs::toggle_tag,
                routes::jobs::delete_tag,
                // Activity
                routes::jobs::get_activity_log,
                routes::jobs::get_daily_stats,
            ],
        )
        // HH OAuth callback (public)
        .mount(
            "/",
            routes![
                routes::jobs::hh_oauth_callback,
            ],
        )
        // Anime auction routes (protected)
        .mount(
            "/api",
            routes![
                routes::anime::get_upcoming_anime,
                routes::anime::get_watched_anime,
                routes::anime::sync_anime_data,
                routes::anime::get_sync_progress,
            ],
        )
        // CS2 Skin Studio routes
        .mount(
            "/api",
            routes![
                routes::studio::steam_auth,
                routes::studio::steam_auth_callback,
                routes::studio::get_me,
                routes::studio::get_projects,
                routes::studio::create_project,
                routes::studio::get_project,
                routes::studio::update_project,
                routes::studio::delete_project,
            ],
        )
        // Publishing tools routes
        .mount(
            "/api",
            routes![
                routes::publish::convert_video,
                routes::publish::optimize_gif,
                routes::publish::get_status,
                routes::publish::get_result,
                routes::publish::download_result,
            ],
        )
        // File manager routes (admin protected)
        .mount(
            "/api",
            routes![
                routes::files::get_folder_contents,
                routes::files::create_folder,
                routes::files::rename_folder,
                routes::files::delete_folder,
                routes::files::upload_file,
                routes::files::update_file,
                routes::files::delete_file,
                routes::files::get_file_info,
                routes::files::get_admin_file,
            ],
        )
        // File manager public routes
        .mount(
            "/api",
            routes![
                routes::files::get_public_file,
                routes::files::get_private_file,
                routes::files::check_file,
            ],
        )
        // Sync routes (admin)
        .mount(
            "/api",
            routes![
                routes::sync::list_folders,
                routes::sync::create_folder,
                routes::sync::get_folder,
                routes::sync::rename_folder,
                routes::sync::regenerate_key,
                routes::sync::delete_folder,
                routes::sync::delete_client,
            ],
        )
        // Sync routes (client API)
        .mount(
            "/api",
            routes![
                routes::sync::register_client,
                routes::sync::get_sync_status,
                routes::sync::list_files,
                routes::sync::upload_file,
                routes::sync::download_file,
                routes::sync::delete_file,
            ],
        )
        // Link shortener routes (admin protected)
        .mount(
            "/api",
            routes![
                routes::links::list_links,
                routes::links::create_link,
                routes::links::update_link,
                routes::links::delete_link,
                routes::links::get_link_stats,
                routes::links::regenerate_external_url,
                routes::links::get_links_summary,
                routes::links::resolve_link,
                routes::links::track_click,
            ],
        )
        // Link shortener redirect (public)
        .mount(
            "/",
            routes![
                routes::links::redirect_link,
            ],
        )
        // Database viewer routes (admin protected)
        .mount(
            "/api",
            routes![
                routes::database::get_tables,
                routes::database::get_table_schema,
                routes::database::get_table_data,
                routes::database::execute_query,
                routes::database::get_database_stats,
            ],
        )
        // Server console routes (admin protected)
        .mount(
            "/api",
            routes![
                routes::console::execute_command,
                routes::console::get_system_info,
                routes::console::get_processes,
                routes::console::get_logs,
                routes::console::get_services,
            ],
        )
        // Menu settings (public - for sidebar visibility)
        .mount(
            "/api",
            routes![
                routes::menu::get_menu_settings,
            ],
        )
        // Menu settings (admin protected)
        .mount(
            "/api",
            routes![
                routes::menu::get_menu_items,
                routes::menu::update_menu_settings,
            ],
        )
        // T2 Sales System routes (public)
        .mount(
            "/api",
            routes![
                t2::routes::t2_health,
                t2::routes::t2_login,
            ],
        )
        // T2 Sales System routes (protected)
        .mount(
            "/api",
            routes![
                t2::routes::t2_logout,
                t2::routes::t2_me,
                t2::routes::t2_admin_info,
                t2::routes::t2_list_stores,
                t2::routes::t2_create_store,
                t2::routes::t2_delete_store,
                t2::routes::t2_list_employees,
                t2::routes::t2_create_employee,
                t2::routes::t2_delete_employee,
                t2::routes::t2_add_employee_store,
                t2::routes::t2_get_categories,
                t2::routes::t2_get_tags,
                t2::routes::t2_create_tag,
                t2::routes::t2_update_tag,
                t2::routes::t2_delete_tag,
                t2::routes::t2_get_products,
                t2::routes::t2_get_product,
                t2::routes::t2_create_product,
                t2::routes::t2_update_product,
                t2::routes::t2_delete_product,
                t2::routes::t2_get_tariffs,
                t2::routes::t2_create_tariff,
                t2::routes::t2_update_tariff,
                t2::routes::t2_delete_tariff,
                t2::routes::t2_get_services,
                t2::routes::t2_create_service,
                t2::routes::t2_update_service,
                t2::routes::t2_delete_service,
                t2::routes::t2_analyze_price_tag,
                t2::routes::t2_recommend_products,
                t2::routes::t2_recommend_accessories,
                t2::routes::t2_recommend_tariffs,
                t2::routes::t2_is_smartphone,
                t2::routes::t2_parse_tariffs_text,
                t2::routes::t2_parse_tariffs_image,
                t2::routes::t2_fetch_tariffs_from_website,
                t2::routes::t2_get_sales,
                t2::routes::t2_get_my_sales,
                t2::routes::t2_create_sale,
                t2::routes::t2_search,
                t2::routes::t2_get_stats,
            ],
        )
        // English Learning System routes (protected)
        .mount(
            "/api",
            routes![
                routes::english::get_categories,
                routes::english::create_category,
                routes::english::get_words,
                routes::english::add_word,
                routes::english::delete_word,
                routes::english::get_due_words,
                routes::english::submit_review,
                routes::english::get_flashcards,
                routes::english::get_quiz,
                routes::english::save_quiz_result,
                routes::english::get_grammar,
                routes::english::add_grammar,
                routes::english::get_dashboard,
                routes::english::get_settings,
                routes::english::update_settings,
                routes::english::get_achievements,
                routes::english::import_words,
            ],
        )
        // Alice Smart Home API routes (Yandex Alice integration)
        .mount(
            "/",
            routes![
                routes::alice::alice_health,
                routes::alice::alice_unlink,
                routes::alice::alice_get_devices,
                routes::alice::alice_query_devices,
                routes::alice::alice_action,
                routes::alice::alice_auth_page,
                routes::alice::alice_auth_login,
                routes::alice::alice_token,
            ],
        )
        // Alice Admin API routes (protected)
        .mount(
            "/api",
            routes![
                routes::alice::alice_admin_get_devices,
                routes::alice::alice_admin_update_config,
                routes::alice::alice_admin_get_commands,
                routes::alice::alice_get_notifications,
                routes::alice::alice_test_notification,
                routes::alice::alice_admin_telegram,
                routes::alice::alice_admin_wake_pc,
                // PC Client management (admin)
                routes::alice::alice_pc_register,
                routes::alice::alice_pc_list_clients,
                routes::alice::alice_pc_delete_client,
                routes::alice::alice_pc_queue_command,
                routes::alice::alice_pc_get_queue,
            ],
        )
        // PC Client API routes (authenticated by API key)
        .mount(
            "/api",
            routes![
                routes::alice::alice_pc_poll_commands,
                routes::alice::alice_pc_report_result,
                routes::alice::alice_pc_heartbeat,
            ],
        )
}
