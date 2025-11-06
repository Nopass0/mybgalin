mod anime;
mod auth;
mod cs2;
mod db;
mod guards;
mod jobs;
mod models;
mod portfolio;
mod routes;
mod steam;
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

    // Initialize job search system
    let job_scheduler = jobs::JobScheduler::new(pool.clone());

    // Spawn background job scheduler task
    job_scheduler.clone().spawn_scheduler();

    println!("🚀 Server starting...");
    println!("📊 Database: {}", database_url);
    println!("👤 Admin Telegram ID: {}", admin_telegram_id);
    println!("🎮 Steam ID: {}", steam_id);
    println!("🎯 Faceit API: {}", if faceit_api_key.is_some() { "enabled" } else { "disabled" });
    println!("💼 Job search system: ready");
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
}
