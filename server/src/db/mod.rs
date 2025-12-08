use sqlx::{sqlite::SqlitePoolOptions, SqlitePool};
use std::time::Duration;

pub async fn create_pool(database_url: &str) -> Result<SqlitePool, sqlx::Error> {
    let pool = SqlitePoolOptions::new()
        .max_connections(10)
        .acquire_timeout(Duration::from_secs(30))
        .connect(database_url)
        .await?;

    // Enable WAL mode for better concurrency
    sqlx::query("PRAGMA journal_mode = WAL;")
        .execute(&pool)
        .await?;

    // Set busy timeout to wait for locks instead of failing immediately
    sqlx::query("PRAGMA busy_timeout = 30000;")
        .execute(&pool)
        .await?;

    // Enable foreign keys
    sqlx::query("PRAGMA foreign_keys = ON;")
        .execute(&pool)
        .await?;

    // Run migrations
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            telegram_id INTEGER UNIQUE NOT NULL,
            username TEXT,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
        "#,
    )
    .execute(&pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS otp_codes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            code TEXT NOT NULL,
            expires_at DATETIME NOT NULL,
            used BOOLEAN NOT NULL DEFAULT FALSE,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
        "#,
    )
    .execute(&pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            token TEXT UNIQUE NOT NULL,
            expires_at DATETIME NOT NULL,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
        "#,
    )
    .execute(&pool)
    .await?;

    // Create index for faster lookups
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token)")
        .execute(&pool)
        .await?;

    sqlx::query("CREATE INDEX IF NOT EXISTS idx_otp_codes_user_id ON otp_codes(user_id)")
        .execute(&pool)
        .await?;

    // Portfolio tables
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS portfolio_about (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            description TEXT NOT NULL,
            updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
        "#,
    )
    .execute(&pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS portfolio_experience (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            company TEXT NOT NULL,
            date_from TEXT NOT NULL,
            date_to TEXT,
            description TEXT NOT NULL,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
        "#,
    )
    .execute(&pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS portfolio_skills (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            category TEXT,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
        "#,
    )
    .execute(&pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS portfolio_contacts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            type TEXT NOT NULL,
            value TEXT NOT NULL,
            label TEXT,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
        "#,
    )
    .execute(&pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS portfolio_cases (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            description TEXT NOT NULL,
            main_image TEXT NOT NULL,
            website_url TEXT,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
        "#,
    )
    .execute(&pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS portfolio_case_images (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            case_id INTEGER NOT NULL,
            image_url TEXT NOT NULL,
            order_index INTEGER NOT NULL DEFAULT 0,
            FOREIGN KEY (case_id) REFERENCES portfolio_cases(id) ON DELETE CASCADE
        )
        "#,
    )
    .execute(&pool)
    .await?;

    sqlx::query("CREATE INDEX IF NOT EXISTS idx_case_images_case_id ON portfolio_case_images(case_id)")
        .execute(&pool)
        .await?;

    // Job search tables
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS job_vacancies (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            hh_vacancy_id TEXT UNIQUE NOT NULL,
            title TEXT NOT NULL,
            company TEXT NOT NULL,
            salary_from INTEGER,
            salary_to INTEGER,
            salary_currency TEXT,
            description TEXT,
            url TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'found',
            found_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            applied_at DATETIME,
            updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
        "#,
    )
    .execute(&pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS job_responses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            vacancy_id INTEGER NOT NULL,
            hh_negotiation_id TEXT,
            cover_letter TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'sent',
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (vacancy_id) REFERENCES job_vacancies(id) ON DELETE CASCADE
        )
        "#,
    )
    .execute(&pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS job_chats (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            vacancy_id INTEGER NOT NULL,
            hh_chat_id TEXT UNIQUE NOT NULL,
            last_message TEXT,
            last_message_at DATETIME,
            has_bot BOOLEAN DEFAULT FALSE,
            FOREIGN KEY (vacancy_id) REFERENCES job_vacancies(id) ON DELETE CASCADE
        )
        "#,
    )
    .execute(&pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS hh_tokens (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            access_token TEXT NOT NULL,
            refresh_token TEXT NOT NULL,
            expires_at DATETIME NOT NULL,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
        "#,
    )
    .execute(&pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS job_search_settings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            is_active BOOLEAN NOT NULL DEFAULT FALSE,
            search_text TEXT,
            area_ids TEXT,
            experience TEXT,
            schedule TEXT,
            employment TEXT,
            salary_from INTEGER,
            only_with_salary BOOLEAN DEFAULT FALSE,
            updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
        "#,
    )
    .execute(&pool)
    .await?;

    sqlx::query("CREATE INDEX IF NOT EXISTS idx_vacancies_status ON job_vacancies(status)")
        .execute(&pool)
        .await?;

    sqlx::query("CREATE INDEX IF NOT EXISTS idx_vacancies_hh_id ON job_vacancies(hh_vacancy_id)")
        .execute(&pool)
        .await?;

    sqlx::query("CREATE INDEX IF NOT EXISTS idx_responses_vacancy ON job_responses(vacancy_id)")
        .execute(&pool)
        .await?;

    // Create anime auction table
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS anime_auction (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            date TEXT,
            title TEXT NOT NULL,
            watched BOOLEAN DEFAULT FALSE,
            season TEXT,
            episodes TEXT,
            voice_acting TEXT,
            buyer TEXT,
            chat_rating REAL,
            sheikh_rating REAL,
            streamer_rating REAL,
            vod_link TEXT,
            sheets_url TEXT,
            year INTEGER NOT NULL,
            shikimori_id INTEGER,
            shikimori_name TEXT,
            shikimori_description TEXT,
            shikimori_cover TEXT,
            shikimori_score REAL,
            shikimori_genres TEXT,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
        "#,
    )
    .execute(&pool)
    .await?;

    sqlx::query("CREATE INDEX IF NOT EXISTS idx_anime_date ON anime_auction(date)")
        .execute(&pool)
        .await?;

    sqlx::query("CREATE INDEX IF NOT EXISTS idx_anime_year ON anime_auction(year)")
        .execute(&pool)
        .await?;

    sqlx::query("CREATE INDEX IF NOT EXISTS idx_anime_watched ON anime_auction(watched)")
        .execute(&pool)
        .await?;

    // Anime sync progress tracking
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS anime_sync_progress (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            status TEXT NOT NULL,
            current INTEGER DEFAULT 0,
            total INTEGER DEFAULT 0,
            message TEXT,
            started_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            finished_at DATETIME
        )
        "#,
    )
    .execute(&pool)
    .await?;

    // CS2 Skin Studio tables
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS studio_users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            steam_id TEXT UNIQUE NOT NULL,
            persona_name TEXT NOT NULL,
            avatar_url TEXT NOT NULL,
            profile_url TEXT NOT NULL,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
        "#,
    )
    .execute(&pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS studio_sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            token TEXT UNIQUE NOT NULL,
            expires_at DATETIME NOT NULL,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES studio_users(id) ON DELETE CASCADE
        )
        "#,
    )
    .execute(&pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS studio_projects (
            id TEXT PRIMARY KEY,
            user_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            type TEXT NOT NULL DEFAULT 'sticker',
            sticker_type TEXT NOT NULL DEFAULT 'paper',
            thumbnail TEXT,
            data TEXT,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES studio_users(id) ON DELETE CASCADE
        )
        "#,
    )
    .execute(&pool)
    .await?;

    sqlx::query("CREATE INDEX IF NOT EXISTS idx_studio_sessions_token ON studio_sessions(token)")
        .execute(&pool)
        .await?;

    sqlx::query("CREATE INDEX IF NOT EXISTS idx_studio_projects_user ON studio_projects(user_id)")
        .execute(&pool)
        .await?;

    // File manager tables
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS file_folders (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            parent_id TEXT,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (parent_id) REFERENCES file_folders(id) ON DELETE CASCADE
        )
        "#,
    )
    .execute(&pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS stored_files (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            path TEXT NOT NULL,
            folder_id TEXT,
            mime_type TEXT NOT NULL,
            size INTEGER NOT NULL,
            is_public BOOLEAN NOT NULL DEFAULT FALSE,
            access_code TEXT,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (folder_id) REFERENCES file_folders(id) ON DELETE SET NULL
        )
        "#,
    )
    .execute(&pool)
    .await?;

    sqlx::query("CREATE INDEX IF NOT EXISTS idx_file_folders_parent ON file_folders(parent_id)")
        .execute(&pool)
        .await?;

    sqlx::query("CREATE INDEX IF NOT EXISTS idx_stored_files_folder ON stored_files(folder_id)")
        .execute(&pool)
        .await?;

    sqlx::query("CREATE INDEX IF NOT EXISTS idx_stored_files_public ON stored_files(is_public)")
        .execute(&pool)
        .await?;

    // Cloud Sync tables
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS sync_folders (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            api_key TEXT UNIQUE NOT NULL,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
        "#,
    )
    .execute(&pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS sync_files (
            id TEXT PRIMARY KEY,
            folder_id TEXT NOT NULL,
            path TEXT NOT NULL,
            name TEXT NOT NULL,
            mime_type TEXT NOT NULL,
            size INTEGER NOT NULL,
            checksum TEXT NOT NULL,
            version INTEGER NOT NULL DEFAULT 1,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (folder_id) REFERENCES sync_folders(id) ON DELETE CASCADE,
            UNIQUE(folder_id, path)
        )
        "#,
    )
    .execute(&pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS sync_clients (
            id TEXT PRIMARY KEY,
            folder_id TEXT NOT NULL,
            device_name TEXT NOT NULL,
            last_sync_at DATETIME,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (folder_id) REFERENCES sync_folders(id) ON DELETE CASCADE
        )
        "#,
    )
    .execute(&pool)
    .await?;

    sqlx::query("CREATE INDEX IF NOT EXISTS idx_sync_files_folder ON sync_files(folder_id)")
        .execute(&pool)
        .await?;

    sqlx::query("CREATE INDEX IF NOT EXISTS idx_sync_files_path ON sync_files(folder_id, path)")
        .execute(&pool)
        .await?;

    sqlx::query("CREATE INDEX IF NOT EXISTS idx_sync_clients_folder ON sync_clients(folder_id)")
        .execute(&pool)
        .await?;

    // Link shortener tables
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS short_links (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            original_url TEXT NOT NULL,
            short_code TEXT UNIQUE NOT NULL,
            external_short_url TEXT,
            is_active BOOLEAN NOT NULL DEFAULT TRUE,
            redirect_to_studio BOOLEAN NOT NULL DEFAULT FALSE,
            set_studio_flag BOOLEAN NOT NULL DEFAULT FALSE,
            custom_js TEXT,
            expires_at DATETIME,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
        "#,
    )
    .execute(&pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS link_clicks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            link_id TEXT NOT NULL,
            ip_address TEXT,
            user_agent TEXT,
            referer TEXT,
            country TEXT,
            city TEXT,
            device_type TEXT,
            browser TEXT,
            os TEXT,
            is_bot BOOLEAN DEFAULT FALSE,
            screen_width INTEGER,
            screen_height INTEGER,
            language TEXT,
            timezone TEXT,
            clicked_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (link_id) REFERENCES short_links(id) ON DELETE CASCADE
        )
        "#,
    )
    .execute(&pool)
    .await?;

    sqlx::query("CREATE INDEX IF NOT EXISTS idx_short_links_code ON short_links(short_code)")
        .execute(&pool)
        .await?;

    sqlx::query("CREATE INDEX IF NOT EXISTS idx_link_clicks_link ON link_clicks(link_id)")
        .execute(&pool)
        .await?;

    sqlx::query("CREATE INDEX IF NOT EXISTS idx_link_clicks_date ON link_clicks(clicked_at)")
        .execute(&pool)
        .await?;

    // === AI Job Search Enhancement Tables ===

    // Add AI scoring columns to job_vacancies
    sqlx::query("ALTER TABLE job_vacancies ADD COLUMN ai_score INTEGER")
        .execute(&pool)
        .await
        .ok();
    sqlx::query("ALTER TABLE job_vacancies ADD COLUMN ai_recommendation TEXT")
        .execute(&pool)
        .await
        .ok();
    sqlx::query("ALTER TABLE job_vacancies ADD COLUMN ai_priority INTEGER")
        .execute(&pool)
        .await
        .ok();
    sqlx::query("ALTER TABLE job_vacancies ADD COLUMN ai_match_reasons TEXT")
        .execute(&pool)
        .await
        .ok();
    sqlx::query("ALTER TABLE job_vacancies ADD COLUMN ai_concerns TEXT")
        .execute(&pool)
        .await
        .ok();
    sqlx::query("ALTER TABLE job_vacancies ADD COLUMN ai_salary_assessment TEXT")
        .execute(&pool)
        .await
        .ok();

    // Add new columns to job_search_settings
    sqlx::query("ALTER TABLE job_search_settings ADD COLUMN auto_tags_enabled BOOLEAN DEFAULT TRUE")
        .execute(&pool)
        .await
        .ok();
    sqlx::query("ALTER TABLE job_search_settings ADD COLUMN search_tags_json TEXT")
        .execute(&pool)
        .await
        .ok();
    sqlx::query("ALTER TABLE job_search_settings ADD COLUMN min_ai_score INTEGER DEFAULT 50")
        .execute(&pool)
        .await
        .ok();
    sqlx::query("ALTER TABLE job_search_settings ADD COLUMN auto_apply_enabled BOOLEAN DEFAULT TRUE")
        .execute(&pool)
        .await
        .ok();
    sqlx::query("ALTER TABLE job_search_settings ADD COLUMN search_interval_minutes INTEGER DEFAULT 60")
        .execute(&pool)
        .await
        .ok();

    // Enhanced job_chats table (recreate with new columns)
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS job_chats_v2 (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            vacancy_id INTEGER NOT NULL,
            hh_chat_id TEXT UNIQUE NOT NULL,
            employer_name TEXT,
            is_bot BOOLEAN DEFAULT FALSE,
            is_human_confirmed BOOLEAN DEFAULT FALSE,
            telegram_invited BOOLEAN DEFAULT FALSE,
            last_message_at DATETIME,
            unread_count INTEGER DEFAULT 0,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (vacancy_id) REFERENCES job_vacancies(id) ON DELETE CASCADE
        )
        "#,
    )
    .execute(&pool)
    .await?;

    // Migrate data from old job_chats if exists
    sqlx::query(
        r#"
        INSERT OR IGNORE INTO job_chats_v2 (vacancy_id, hh_chat_id, is_bot, last_message_at)
        SELECT vacancy_id, hh_chat_id, has_bot, last_message_at FROM job_chats
        "#,
    )
    .execute(&pool)
    .await
    .ok();

    // Chat messages table
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS job_chat_messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            chat_id INTEGER NOT NULL,
            hh_message_id TEXT,
            author_type TEXT NOT NULL,
            text TEXT NOT NULL,
            is_auto_response BOOLEAN DEFAULT FALSE,
            ai_sentiment TEXT,
            ai_intent TEXT,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (chat_id) REFERENCES job_chats_v2(id) ON DELETE CASCADE
        )
        "#,
    )
    .execute(&pool)
    .await?;

    sqlx::query("CREATE INDEX IF NOT EXISTS idx_chat_messages_chat ON job_chat_messages(chat_id)")
        .execute(&pool)
        .await?;

    // Job search tags table
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS job_search_tags (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tag_type TEXT NOT NULL,
            value TEXT NOT NULL,
            is_active BOOLEAN DEFAULT TRUE,
            search_count INTEGER DEFAULT 0,
            found_count INTEGER DEFAULT 0,
            applied_count INTEGER DEFAULT 0,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(tag_type, value)
        )
        "#,
    )
    .execute(&pool)
    .await?;

    sqlx::query("CREATE INDEX IF NOT EXISTS idx_search_tags_type ON job_search_tags(tag_type)")
        .execute(&pool)
        .await?;

    // Activity log table
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS job_activity_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            event_type TEXT NOT NULL,
            vacancy_id INTEGER,
            description TEXT NOT NULL,
            metadata TEXT,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (vacancy_id) REFERENCES job_vacancies(id) ON DELETE SET NULL
        )
        "#,
    )
    .execute(&pool)
    .await?;

    sqlx::query("CREATE INDEX IF NOT EXISTS idx_activity_log_type ON job_activity_log(event_type)")
        .execute(&pool)
        .await?;

    sqlx::query("CREATE INDEX IF NOT EXISTS idx_activity_log_date ON job_activity_log(created_at)")
        .execute(&pool)
        .await?;

    // Job search statistics table for analytics
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS job_search_stats (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            date TEXT NOT NULL UNIQUE,
            searches_count INTEGER DEFAULT 0,
            vacancies_found INTEGER DEFAULT 0,
            applications_sent INTEGER DEFAULT 0,
            invitations_received INTEGER DEFAULT 0,
            rejections_received INTEGER DEFAULT 0,
            messages_sent INTEGER DEFAULT 0,
            messages_received INTEGER DEFAULT 0,
            telegram_invites_sent INTEGER DEFAULT 0,
            avg_ai_score REAL,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
        "#,
    )
    .execute(&pool)
    .await?;

    sqlx::query("CREATE INDEX IF NOT EXISTS idx_search_stats_date ON job_search_stats(date)")
        .execute(&pool)
        .await?;

    // === T2 Sales System Tables ===

    // T2 Stores (точки продаж)
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS t2_stores (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            address TEXT NOT NULL,
            admin_code TEXT UNIQUE NOT NULL,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
        "#,
    )
    .execute(&pool)
    .await?;

    // T2 Employees (сотрудники)
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS t2_employees (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            store_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            code TEXT UNIQUE NOT NULL,
            is_admin BOOLEAN NOT NULL DEFAULT FALSE,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (store_id) REFERENCES t2_stores(id) ON DELETE CASCADE
        )
        "#,
    )
    .execute(&pool)
    .await?;

    // Employee additional stores access
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS t2_employee_stores (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            employee_id INTEGER NOT NULL,
            store_id INTEGER NOT NULL,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (employee_id) REFERENCES t2_employees(id) ON DELETE CASCADE,
            FOREIGN KEY (store_id) REFERENCES t2_stores(id) ON DELETE CASCADE,
            UNIQUE(employee_id, store_id)
        )
        "#,
    )
    .execute(&pool)
    .await?;

    // T2 Product Categories
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS t2_categories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            icon TEXT,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
        "#,
    )
    .execute(&pool)
    .await?;

    // Insert default categories
    sqlx::query(
        r#"
        INSERT OR IGNORE INTO t2_categories (id, name, icon) VALUES
        (1, 'Смартфоны', 'smartphone'),
        (2, 'Аксессуары', 'headphones'),
        (3, 'SIM-карты', 'sim-card'),
        (4, 'Услуги', 'wrench')
        "#,
    )
    .execute(&pool)
    .await?;

    // T2 Tags (ярлыки)
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS t2_tags (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            store_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            color TEXT NOT NULL DEFAULT '#00bcd4',
            description TEXT,
            priority INTEGER NOT NULL DEFAULT 0,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (store_id) REFERENCES t2_stores(id) ON DELETE CASCADE
        )
        "#,
    )
    .execute(&pool)
    .await?;

    // T2 Products (товары)
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS t2_products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            store_id INTEGER NOT NULL,
            category_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            brand TEXT,
            model TEXT,
            price REAL NOT NULL,
            quantity INTEGER NOT NULL DEFAULT 1,
            image_url TEXT,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (store_id) REFERENCES t2_stores(id) ON DELETE CASCADE,
            FOREIGN KEY (category_id) REFERENCES t2_categories(id)
        )
        "#,
    )
    .execute(&pool)
    .await?;

    // T2 Product Specifications (характеристики товаров)
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS t2_product_specs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            product_id INTEGER NOT NULL,
            spec_name TEXT NOT NULL,
            spec_value TEXT NOT NULL,
            FOREIGN KEY (product_id) REFERENCES t2_products(id) ON DELETE CASCADE
        )
        "#,
    )
    .execute(&pool)
    .await?;

    // T2 Product Tags (связь товаров и ярлыков)
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS t2_product_tags (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            product_id INTEGER NOT NULL,
            tag_id INTEGER NOT NULL,
            FOREIGN KEY (product_id) REFERENCES t2_products(id) ON DELETE CASCADE,
            FOREIGN KEY (tag_id) REFERENCES t2_tags(id) ON DELETE CASCADE,
            UNIQUE(product_id, tag_id)
        )
        "#,
    )
    .execute(&pool)
    .await?;

    // T2 Tariffs (тарифы Tele2)
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS t2_tariffs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            store_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            price REAL NOT NULL,
            minutes INTEGER,
            sms INTEGER,
            gb INTEGER,
            unlimited_t2 BOOLEAN NOT NULL DEFAULT FALSE,
            unlimited_internet BOOLEAN NOT NULL DEFAULT FALSE,
            unlimited_sms BOOLEAN NOT NULL DEFAULT FALSE,
            unlimited_calls BOOLEAN NOT NULL DEFAULT FALSE,
            unlimited_apps TEXT,
            description TEXT,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (store_id) REFERENCES t2_stores(id) ON DELETE CASCADE
        )
        "#,
    )
    .execute(&pool)
    .await?;

    // T2 Services (услуги)
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS t2_services (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            store_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            price REAL NOT NULL,
            description TEXT,
            for_smartphones_only BOOLEAN NOT NULL DEFAULT FALSE,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (store_id) REFERENCES t2_stores(id) ON DELETE CASCADE
        )
        "#,
    )
    .execute(&pool)
    .await?;

    // T2 Sales (история продаж)
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS t2_sales (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            store_id INTEGER NOT NULL,
            employee_id INTEGER NOT NULL,
            customer_request TEXT,
            customer_audio_url TEXT,
            total_amount REAL NOT NULL DEFAULT 0,
            status TEXT NOT NULL DEFAULT 'completed',
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (store_id) REFERENCES t2_stores(id) ON DELETE CASCADE,
            FOREIGN KEY (employee_id) REFERENCES t2_employees(id) ON DELETE CASCADE
        )
        "#,
    )
    .execute(&pool)
    .await?;

    // T2 Sale Items (товары в продаже)
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS t2_sale_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            sale_id INTEGER NOT NULL,
            item_type TEXT NOT NULL,
            item_id INTEGER NOT NULL,
            item_name TEXT NOT NULL,
            item_details TEXT,
            price REAL NOT NULL,
            quantity INTEGER NOT NULL DEFAULT 1,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (sale_id) REFERENCES t2_sales(id) ON DELETE CASCADE
        )
        "#,
    )
    .execute(&pool)
    .await?;

    // T2 Sessions (сессии авторизации)
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS t2_sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            employee_id INTEGER NOT NULL,
            token TEXT UNIQUE NOT NULL,
            expires_at DATETIME NOT NULL,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (employee_id) REFERENCES t2_employees(id) ON DELETE CASCADE
        )
        "#,
    )
    .execute(&pool)
    .await?;

    // Create indexes for T2 tables
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_t2_employees_store ON t2_employees(store_id)")
        .execute(&pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_t2_employees_code ON t2_employees(code)")
        .execute(&pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_t2_products_store ON t2_products(store_id)")
        .execute(&pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_t2_products_category ON t2_products(category_id)")
        .execute(&pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_t2_sales_store ON t2_sales(store_id)")
        .execute(&pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_t2_sales_employee ON t2_sales(employee_id)")
        .execute(&pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_t2_sessions_token ON t2_sessions(token)")
        .execute(&pool)
        .await?;

    // Menu visibility settings table
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS menu_settings (
            id TEXT PRIMARY KEY,
            label TEXT NOT NULL,
            is_visible BOOLEAN NOT NULL DEFAULT TRUE,
            display_order INTEGER NOT NULL DEFAULT 0,
            updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
        "#,
    )
    .execute(&pool)
    .await?;

    // Insert default menu items
    sqlx::query(
        r#"
        INSERT OR IGNORE INTO menu_settings (id, label, is_visible, display_order) VALUES
        ('home', 'Главная', TRUE, 0),
        ('resume', 'Резюме', TRUE, 1),
        ('workshop', 'Steam Workshop', TRUE, 2),
        ('studio', 'CS2 Skin Studio', TRUE, 3),
        ('t2', 'T2 Sales', TRUE, 4)
        "#,
    )
    .execute(&pool)
    .await?;

    // Create global admin for T2 section
    sqlx::query(
        r#"
        INSERT OR IGNORE INTO t2_stores (id, name, address, admin_code)
        VALUES (1, 'Главный офис', 'Администрация', '00000')
        "#,
    )
    .execute(&pool)
    .await?;

    sqlx::query(
        r#"
        INSERT OR IGNORE INTO t2_employees (id, store_id, name, code, is_admin)
        VALUES (1, 1, 'Администратор', '12345', TRUE)
        "#,
    )
    .execute(&pool)
    .await?;

    // === English Learning System Tables ===

    // Word categories/topics
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS english_categories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            name_ru TEXT NOT NULL,
            description TEXT,
            icon TEXT,
            color TEXT DEFAULT '#3b82f6',
            word_count INTEGER DEFAULT 0,
            display_order INTEGER DEFAULT 0,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
        "#,
    )
    .execute(&pool)
    .await?;

    // Insert default categories
    sqlx::query(
        r#"
        INSERT OR IGNORE INTO english_categories (id, name, name_ru, icon, color, display_order) VALUES
        (1, 'Basic Vocabulary', 'Базовый словарь', 'book', '#3b82f6', 1),
        (2, 'Travel', 'Путешествия', 'plane', '#10b981', 2),
        (3, 'Business', 'Бизнес', 'briefcase', '#8b5cf6', 3),
        (4, 'Technology', 'Технологии', 'cpu', '#f59e0b', 4),
        (5, 'Food & Cooking', 'Еда и кулинария', 'utensils', '#ef4444', 5),
        (6, 'Health & Body', 'Здоровье и тело', 'heart', '#ec4899', 6),
        (7, 'Nature', 'Природа', 'leaf', '#22c55e', 7),
        (8, 'Emotions', 'Эмоции', 'smile', '#f97316', 8),
        (9, 'Phrasal Verbs', 'Фразовые глаголы', 'zap', '#6366f1', 9),
        (10, 'Idioms', 'Идиомы', 'message-circle', '#14b8a6', 10)
        "#,
    )
    .execute(&pool)
    .await?;

    // Words table with comprehensive data
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS english_words (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            category_id INTEGER,
            word TEXT NOT NULL,
            transcription TEXT,
            translation TEXT NOT NULL,
            definition TEXT,
            part_of_speech TEXT,
            examples TEXT,
            synonyms TEXT,
            antonyms TEXT,
            audio_url TEXT,
            image_url TEXT,
            difficulty INTEGER DEFAULT 1,
            frequency INTEGER DEFAULT 0,
            cefr_level TEXT,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (category_id) REFERENCES english_categories(id) ON DELETE SET NULL
        )
        "#,
    )
    .execute(&pool)
    .await?;

    // SRS (Spaced Repetition System) progress for each word
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS english_word_progress (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            word_id INTEGER NOT NULL,
            ease_factor REAL DEFAULT 2.5,
            interval_days INTEGER DEFAULT 0,
            repetitions INTEGER DEFAULT 0,
            next_review DATETIME,
            last_review DATETIME,
            correct_count INTEGER DEFAULT 0,
            incorrect_count INTEGER DEFAULT 0,
            status TEXT DEFAULT 'new',
            mastery_level INTEGER DEFAULT 0,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (word_id) REFERENCES english_words(id) ON DELETE CASCADE,
            UNIQUE(word_id)
        )
        "#,
    )
    .execute(&pool)
    .await?;

    // Grammar rules and lessons
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS english_grammar (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            title_ru TEXT NOT NULL,
            category TEXT NOT NULL,
            difficulty INTEGER DEFAULT 1,
            cefr_level TEXT,
            explanation TEXT NOT NULL,
            explanation_ru TEXT NOT NULL,
            examples TEXT,
            common_mistakes TEXT,
            tips TEXT,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
        "#,
    )
    .execute(&pool)
    .await?;

    // Grammar progress
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS english_grammar_progress (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            grammar_id INTEGER NOT NULL,
            studied BOOLEAN DEFAULT FALSE,
            mastery_level INTEGER DEFAULT 0,
            quiz_score INTEGER,
            last_studied DATETIME,
            next_review DATETIME,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (grammar_id) REFERENCES english_grammar(id) ON DELETE CASCADE,
            UNIQUE(grammar_id)
        )
        "#,
    )
    .execute(&pool)
    .await?;

    // Sentences for practice (reading, listening, translation)
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS english_sentences (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            sentence TEXT NOT NULL,
            translation TEXT NOT NULL,
            audio_url TEXT,
            difficulty INTEGER DEFAULT 1,
            category TEXT,
            grammar_focus TEXT,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
        "#,
    )
    .execute(&pool)
    .await?;

    // Quiz/test results
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS english_quiz_results (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            quiz_type TEXT NOT NULL,
            category_id INTEGER,
            score INTEGER NOT NULL,
            total_questions INTEGER NOT NULL,
            correct_answers INTEGER NOT NULL,
            time_spent_seconds INTEGER,
            details TEXT,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (category_id) REFERENCES english_categories(id) ON DELETE SET NULL
        )
        "#,
    )
    .execute(&pool)
    .await?;

    // Daily learning statistics
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS english_daily_stats (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            date TEXT NOT NULL UNIQUE,
            words_learned INTEGER DEFAULT 0,
            words_reviewed INTEGER DEFAULT 0,
            new_words_added INTEGER DEFAULT 0,
            quizzes_completed INTEGER DEFAULT 0,
            correct_answers INTEGER DEFAULT 0,
            incorrect_answers INTEGER DEFAULT 0,
            time_spent_minutes INTEGER DEFAULT 0,
            streak_days INTEGER DEFAULT 0,
            xp_earned INTEGER DEFAULT 0,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
        "#,
    )
    .execute(&pool)
    .await?;

    // Learning settings and goals
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS english_settings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            daily_goal_words INTEGER DEFAULT 10,
            daily_goal_minutes INTEGER DEFAULT 15,
            preferred_difficulty INTEGER DEFAULT 2,
            show_transcription BOOLEAN DEFAULT TRUE,
            show_examples BOOLEAN DEFAULT TRUE,
            auto_play_audio BOOLEAN DEFAULT TRUE,
            review_notification BOOLEAN DEFAULT TRUE,
            current_streak INTEGER DEFAULT 0,
            longest_streak INTEGER DEFAULT 0,
            total_xp INTEGER DEFAULT 0,
            level INTEGER DEFAULT 1,
            updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
        "#,
    )
    .execute(&pool)
    .await?;

    // Insert default settings
    sqlx::query(
        r#"
        INSERT OR IGNORE INTO english_settings (id) VALUES (1)
        "#,
    )
    .execute(&pool)
    .await?;

    // Achievements/badges
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS english_achievements (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            achievement_type TEXT NOT NULL UNIQUE,
            title TEXT NOT NULL,
            description TEXT NOT NULL,
            icon TEXT,
            xp_reward INTEGER DEFAULT 0,
            unlocked_at DATETIME,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
        "#,
    )
    .execute(&pool)
    .await?;

    // Insert default achievements
    sqlx::query(
        r#"
        INSERT OR IGNORE INTO english_achievements (achievement_type, title, description, icon, xp_reward) VALUES
        ('first_word', 'First Steps', 'Learn your first word', 'star', 10),
        ('words_10', 'Vocabulary Builder', 'Learn 10 words', 'book-open', 50),
        ('words_50', 'Word Collector', 'Learn 50 words', 'library', 100),
        ('words_100', 'Lexicon Master', 'Learn 100 words', 'graduation-cap', 200),
        ('words_500', 'Dictionary', 'Learn 500 words', 'book', 500),
        ('streak_3', 'Consistent', '3 day streak', 'flame', 30),
        ('streak_7', 'Week Warrior', '7 day streak', 'zap', 70),
        ('streak_30', 'Monthly Master', '30 day streak', 'trophy', 300),
        ('perfect_quiz', 'Perfect Score', 'Get 100% on a quiz', 'award', 50),
        ('grammar_5', 'Grammar Guru', 'Master 5 grammar rules', 'check-circle', 100),
        ('speed_demon', 'Speed Demon', 'Answer 10 questions in under 30 seconds', 'clock', 75)
        "#,
    )
    .execute(&pool)
    .await?;

    // Word lists (custom collections)
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS english_word_lists (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT,
            is_public BOOLEAN DEFAULT FALSE,
            word_ids TEXT,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
        "#,
    )
    .execute(&pool)
    .await?;

    // Learning sessions log
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS english_sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_type TEXT NOT NULL,
            started_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            ended_at DATETIME,
            words_practiced INTEGER DEFAULT 0,
            correct_count INTEGER DEFAULT 0,
            incorrect_count INTEGER DEFAULT 0,
            xp_earned INTEGER DEFAULT 0
        )
        "#,
    )
    .execute(&pool)
    .await?;

    // Create indexes for English learning tables
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_english_words_category ON english_words(category_id)")
        .execute(&pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_english_words_difficulty ON english_words(difficulty)")
        .execute(&pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_english_progress_next ON english_word_progress(next_review)")
        .execute(&pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_english_progress_status ON english_word_progress(status)")
        .execute(&pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_english_quiz_date ON english_quiz_results(created_at)")
        .execute(&pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_english_daily_date ON english_daily_stats(date)")
        .execute(&pool)
        .await?;

    Ok(pool)
}
