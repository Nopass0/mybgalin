use sqlx::{sqlite::SqlitePoolOptions, postgres::PgPoolOptions, SqlitePool, PgPool, Pool, Sqlite, Postgres};
use std::time::Duration;

/// Database type enum for selecting backend
#[derive(Debug, Clone)]
pub enum DatabaseType {
    Sqlite,
    Postgres,
}

/// Unified database pool that can work with SQLite or PostgreSQL
#[derive(Clone)]
pub enum DbPool {
    Sqlite(SqlitePool),
    Postgres(PgPool),
}

impl DbPool {
    pub fn as_sqlite(&self) -> Option<&SqlitePool> {
        match self {
            DbPool::Sqlite(pool) => Some(pool),
            _ => None,
        }
    }

    pub fn as_postgres(&self) -> Option<&PgPool> {
        match self {
            DbPool::Postgres(pool) => Some(pool),
            _ => None,
        }
    }

    pub fn db_type(&self) -> DatabaseType {
        match self {
            DbPool::Sqlite(_) => DatabaseType::Sqlite,
            DbPool::Postgres(_) => DatabaseType::Postgres,
        }
    }
}

/// Determine database type from URL
pub fn get_db_type(database_url: &str) -> DatabaseType {
    if database_url.starts_with("postgres://") || database_url.starts_with("postgresql://") {
        DatabaseType::Postgres
    } else {
        DatabaseType::Sqlite
    }
}

/// Create database pool based on URL
pub async fn create_pool(database_url: &str) -> Result<DbPool, sqlx::Error> {
    let db_type = get_db_type(database_url);

    match db_type {
        DatabaseType::Sqlite => {
            let pool = create_sqlite_pool(database_url).await?;
            Ok(DbPool::Sqlite(pool))
        }
        DatabaseType::Postgres => {
            let pool = create_postgres_pool(database_url).await?;
            Ok(DbPool::Postgres(pool))
        }
    }
}

/// Create SQLite pool
async fn create_sqlite_pool(database_url: &str) -> Result<SqlitePool, sqlx::Error> {
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

    // Run SQLite migrations
    run_sqlite_migrations(&pool).await?;

    Ok(pool)
}

/// Create PostgreSQL (Neon) pool
async fn create_postgres_pool(database_url: &str) -> Result<PgPool, sqlx::Error> {
    let pool = PgPoolOptions::new()
        .max_connections(10)
        .acquire_timeout(Duration::from_secs(30))
        .connect(database_url)
        .await?;

    // Run PostgreSQL migrations
    run_postgres_migrations(&pool).await?;

    Ok(pool)
}

/// Run SQLite-specific migrations
async fn run_sqlite_migrations(pool: &SqlitePool) -> Result<(), sqlx::Error> {
    // Users table
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
    .execute(pool)
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
    .execute(pool)
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
    .execute(pool)
    .await?;

    // Create index for faster lookups
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token)")
        .execute(pool)
        .await?;

    sqlx::query("CREATE INDEX IF NOT EXISTS idx_otp_codes_user_id ON otp_codes(user_id)")
        .execute(pool)
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
    .execute(pool)
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
    .execute(pool)
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
    .execute(pool)
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
    .execute(pool)
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
    .execute(pool)
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
    .execute(pool)
    .await?;

    sqlx::query("CREATE INDEX IF NOT EXISTS idx_case_images_case_id ON portfolio_case_images(case_id)")
        .execute(pool)
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
    .execute(pool)
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
    .execute(pool)
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
    .execute(pool)
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
    .execute(pool)
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
    .execute(pool)
    .await?;

    sqlx::query("CREATE INDEX IF NOT EXISTS idx_vacancies_status ON job_vacancies(status)")
        .execute(pool)
        .await?;

    sqlx::query("CREATE INDEX IF NOT EXISTS idx_vacancies_hh_id ON job_vacancies(hh_vacancy_id)")
        .execute(pool)
        .await?;

    sqlx::query("CREATE INDEX IF NOT EXISTS idx_responses_vacancy ON job_responses(vacancy_id)")
        .execute(pool)
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
    .execute(pool)
    .await?;

    sqlx::query("CREATE INDEX IF NOT EXISTS idx_anime_date ON anime_auction(date)")
        .execute(pool)
        .await?;

    sqlx::query("CREATE INDEX IF NOT EXISTS idx_anime_year ON anime_auction(year)")
        .execute(pool)
        .await?;

    sqlx::query("CREATE INDEX IF NOT EXISTS idx_anime_watched ON anime_auction(watched)")
        .execute(pool)
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
    .execute(pool)
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
    .execute(pool)
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
    .execute(pool)
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
    .execute(pool)
    .await?;

    sqlx::query("CREATE INDEX IF NOT EXISTS idx_studio_sessions_token ON studio_sessions(token)")
        .execute(pool)
        .await?;

    sqlx::query("CREATE INDEX IF NOT EXISTS idx_studio_projects_user ON studio_projects(user_id)")
        .execute(pool)
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
    .execute(pool)
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
    .execute(pool)
    .await?;

    sqlx::query("CREATE INDEX IF NOT EXISTS idx_file_folders_parent ON file_folders(parent_id)")
        .execute(pool)
        .await?;

    sqlx::query("CREATE INDEX IF NOT EXISTS idx_stored_files_folder ON stored_files(folder_id)")
        .execute(pool)
        .await?;

    sqlx::query("CREATE INDEX IF NOT EXISTS idx_stored_files_public ON stored_files(is_public)")
        .execute(pool)
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
    .execute(pool)
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
    .execute(pool)
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
    .execute(pool)
    .await?;

    sqlx::query("CREATE INDEX IF NOT EXISTS idx_sync_files_folder ON sync_files(folder_id)")
        .execute(pool)
        .await?;

    sqlx::query("CREATE INDEX IF NOT EXISTS idx_sync_files_path ON sync_files(folder_id, path)")
        .execute(pool)
        .await?;

    sqlx::query("CREATE INDEX IF NOT EXISTS idx_sync_clients_folder ON sync_clients(folder_id)")
        .execute(pool)
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
    .execute(pool)
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
    .execute(pool)
    .await?;

    sqlx::query("CREATE INDEX IF NOT EXISTS idx_short_links_code ON short_links(short_code)")
        .execute(pool)
        .await?;

    sqlx::query("CREATE INDEX IF NOT EXISTS idx_link_clicks_link ON link_clicks(link_id)")
        .execute(pool)
        .await?;

    sqlx::query("CREATE INDEX IF NOT EXISTS idx_link_clicks_date ON link_clicks(clicked_at)")
        .execute(pool)
        .await?;

    // === AI Job Search Enhancement Tables ===
    sqlx::query("ALTER TABLE job_vacancies ADD COLUMN ai_score INTEGER")
        .execute(pool)
        .await
        .ok();
    sqlx::query("ALTER TABLE job_vacancies ADD COLUMN ai_recommendation TEXT")
        .execute(pool)
        .await
        .ok();
    sqlx::query("ALTER TABLE job_vacancies ADD COLUMN ai_priority INTEGER")
        .execute(pool)
        .await
        .ok();
    sqlx::query("ALTER TABLE job_vacancies ADD COLUMN ai_match_reasons TEXT")
        .execute(pool)
        .await
        .ok();
    sqlx::query("ALTER TABLE job_vacancies ADD COLUMN ai_concerns TEXT")
        .execute(pool)
        .await
        .ok();
    sqlx::query("ALTER TABLE job_vacancies ADD COLUMN ai_salary_assessment TEXT")
        .execute(pool)
        .await
        .ok();

    sqlx::query("ALTER TABLE job_search_settings ADD COLUMN auto_tags_enabled BOOLEAN DEFAULT TRUE")
        .execute(pool)
        .await
        .ok();
    sqlx::query("ALTER TABLE job_search_settings ADD COLUMN search_tags_json TEXT")
        .execute(pool)
        .await
        .ok();
    sqlx::query("ALTER TABLE job_search_settings ADD COLUMN min_ai_score INTEGER DEFAULT 50")
        .execute(pool)
        .await
        .ok();
    sqlx::query("ALTER TABLE job_search_settings ADD COLUMN auto_apply_enabled BOOLEAN DEFAULT TRUE")
        .execute(pool)
        .await
        .ok();
    sqlx::query("ALTER TABLE job_search_settings ADD COLUMN search_interval_minutes INTEGER DEFAULT 60")
        .execute(pool)
        .await
        .ok();

    // Enhanced job_chats table
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
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        INSERT OR IGNORE INTO job_chats_v2 (vacancy_id, hh_chat_id, is_bot, last_message_at)
        SELECT vacancy_id, hh_chat_id, has_bot, last_message_at FROM job_chats
        "#,
    )
    .execute(pool)
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
    .execute(pool)
    .await?;

    sqlx::query("CREATE INDEX IF NOT EXISTS idx_chat_messages_chat ON job_chat_messages(chat_id)")
        .execute(pool)
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
    .execute(pool)
    .await?;

    sqlx::query("CREATE INDEX IF NOT EXISTS idx_search_tags_type ON job_search_tags(tag_type)")
        .execute(pool)
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
    .execute(pool)
    .await?;

    sqlx::query("CREATE INDEX IF NOT EXISTS idx_activity_log_type ON job_activity_log(event_type)")
        .execute(pool)
        .await?;

    sqlx::query("CREATE INDEX IF NOT EXISTS idx_activity_log_date ON job_activity_log(created_at)")
        .execute(pool)
        .await?;

    // Job search statistics table
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
    .execute(pool)
    .await?;

    sqlx::query("CREATE INDEX IF NOT EXISTS idx_search_stats_date ON job_search_stats(date)")
        .execute(pool)
        .await?;

    // === T2 Sales System Tables ===
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
    .execute(pool)
    .await?;

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
    .execute(pool)
    .await?;

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
    .execute(pool)
    .await?;

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
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        INSERT OR IGNORE INTO t2_categories (id, name, icon) VALUES
        (1, 'Смартфоны', 'smartphone'),
        (2, 'Аксессуары', 'headphones'),
        (3, 'SIM-карты', 'sim-card'),
        (4, 'Услуги', 'wrench')
        "#,
    )
    .execute(pool)
    .await?;

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
    .execute(pool)
    .await?;

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
    .execute(pool)
    .await?;

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
    .execute(pool)
    .await?;

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
    .execute(pool)
    .await?;

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
    .execute(pool)
    .await?;

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
    .execute(pool)
    .await?;

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
    .execute(pool)
    .await?;

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
    .execute(pool)
    .await?;

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
    .execute(pool)
    .await?;

    sqlx::query("CREATE INDEX IF NOT EXISTS idx_t2_employees_store ON t2_employees(store_id)")
        .execute(pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_t2_employees_code ON t2_employees(code)")
        .execute(pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_t2_products_store ON t2_products(store_id)")
        .execute(pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_t2_products_category ON t2_products(category_id)")
        .execute(pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_t2_sales_store ON t2_sales(store_id)")
        .execute(pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_t2_sales_employee ON t2_sales(employee_id)")
        .execute(pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_t2_sessions_token ON t2_sessions(token)")
        .execute(pool)
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
    .execute(pool)
    .await?;

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
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        INSERT OR IGNORE INTO t2_stores (id, name, address, admin_code)
        VALUES (1, 'Главный офис', 'Администрация', '00000')
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        INSERT OR IGNORE INTO t2_employees (id, store_id, name, code, is_admin)
        VALUES (1, 1, 'Администратор', '12345', TRUE)
        "#,
    )
    .execute(pool)
    .await?;

    // === English Learning System Tables ===
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
    .execute(pool)
    .await?;

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
    .execute(pool)
    .await?;

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
    .execute(pool)
    .await?;

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
    .execute(pool)
    .await?;

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
    .execute(pool)
    .await?;

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
    .execute(pool)
    .await?;

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
    .execute(pool)
    .await?;

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
    .execute(pool)
    .await?;

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
    .execute(pool)
    .await?;

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
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        INSERT OR IGNORE INTO english_settings (id) VALUES (1)
        "#,
    )
    .execute(pool)
    .await?;

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
    .execute(pool)
    .await?;

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
    .execute(pool)
    .await?;

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
    .execute(pool)
    .await?;

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
    .execute(pool)
    .await?;

    sqlx::query("CREATE INDEX IF NOT EXISTS idx_english_words_category ON english_words(category_id)")
        .execute(pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_english_words_difficulty ON english_words(difficulty)")
        .execute(pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_english_progress_next ON english_word_progress(next_review)")
        .execute(pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_english_progress_status ON english_word_progress(status)")
        .execute(pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_english_quiz_date ON english_quiz_results(created_at)")
        .execute(pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_english_daily_date ON english_daily_stats(date)")
        .execute(pool)
        .await?;

    // === Alice Smart Home Tables ===
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS alice_users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS alice_tokens (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            access_token TEXT UNIQUE NOT NULL,
            refresh_token TEXT UNIQUE NOT NULL,
            expires_at DATETIME NOT NULL,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES alice_users(id) ON DELETE CASCADE
        )
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS alice_devices (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT,
            room TEXT,
            device_type TEXT NOT NULL,
            capabilities TEXT NOT NULL,
            properties TEXT,
            custom_data TEXT,
            is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS alice_device_states (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            device_id TEXT NOT NULL,
            state_key TEXT NOT NULL,
            state_value TEXT NOT NULL,
            updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (device_id) REFERENCES alice_devices(id) ON DELETE CASCADE,
            UNIQUE(device_id, state_key)
        )
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS alice_command_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            device_id TEXT NOT NULL,
            command_type TEXT NOT NULL,
            command_data TEXT,
            result TEXT,
            success BOOLEAN NOT NULL DEFAULT TRUE,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (device_id) REFERENCES alice_devices(id) ON DELETE CASCADE
        )
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query("CREATE INDEX IF NOT EXISTS idx_alice_tokens_access ON alice_tokens(access_token)")
        .execute(pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_alice_tokens_refresh ON alice_tokens(refresh_token)")
        .execute(pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_alice_device_states ON alice_device_states(device_id)")
        .execute(pool)
        .await?;

    // Insert default Alice devices
    sqlx::query(
        r#"
        INSERT OR IGNORE INTO alice_devices (id, name, description, room, device_type, capabilities, properties, custom_data, is_enabled) VALUES
        ('pc-control', 'Компьютер', 'Управление домашним ПК', 'Кабинет', 'devices.types.switch',
         '["on_off"]', '["power"]', '{"mac": "", "ip": "", "ssh_user": "", "ssh_key": ""}', TRUE),
        ('telegram-bot', 'Телеграм бот', 'Отправка сообщений через Telegram', 'Везде', 'devices.types.other',
         '["custom_button"]', NULL, '{"chat_id": ""}', TRUE),
        ('website-notify', 'Уведомление на сайт', 'Отправка уведомлений на сайт', 'Везде', 'devices.types.other',
         '["custom_button"]', NULL, '{}', TRUE)
        "#,
    )
    .execute(pool)
    .await?;

    // Insert default Alice user (admin:admin)
    sqlx::query(
        r#"
        INSERT OR IGNORE INTO alice_users (id, username, password_hash) VALUES
        (1, 'admin', '$argon2id$v=19$m=19456,t=2,p=1$YWRtaW5zYWx0$YWRtaW4xMjM0NTY=')
        "#,
    )
    .execute(pool)
    .await?;

    Ok(())
}

/// Run PostgreSQL-specific migrations
async fn run_postgres_migrations(pool: &PgPool) -> Result<(), sqlx::Error> {
    // Users table
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            telegram_id BIGINT UNIQUE NOT NULL,
            username TEXT,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS otp_codes (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id),
            code TEXT NOT NULL,
            expires_at TIMESTAMPTZ NOT NULL,
            used BOOLEAN NOT NULL DEFAULT FALSE,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS sessions (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id),
            token TEXT UNIQUE NOT NULL,
            expires_at TIMESTAMPTZ NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query("CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token)")
        .execute(pool)
        .await?;

    sqlx::query("CREATE INDEX IF NOT EXISTS idx_otp_codes_user_id ON otp_codes(user_id)")
        .execute(pool)
        .await?;

    // Portfolio tables
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS portfolio_about (
            id SERIAL PRIMARY KEY,
            description TEXT NOT NULL,
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS portfolio_experience (
            id SERIAL PRIMARY KEY,
            title TEXT NOT NULL,
            company TEXT NOT NULL,
            date_from TEXT NOT NULL,
            date_to TEXT,
            description TEXT NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS portfolio_skills (
            id SERIAL PRIMARY KEY,
            name TEXT NOT NULL,
            category TEXT,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS portfolio_contacts (
            id SERIAL PRIMARY KEY,
            type TEXT NOT NULL,
            value TEXT NOT NULL,
            label TEXT,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS portfolio_cases (
            id SERIAL PRIMARY KEY,
            title TEXT NOT NULL,
            description TEXT NOT NULL,
            main_image TEXT NOT NULL,
            website_url TEXT,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS portfolio_case_images (
            id SERIAL PRIMARY KEY,
            case_id INTEGER NOT NULL REFERENCES portfolio_cases(id) ON DELETE CASCADE,
            image_url TEXT NOT NULL,
            order_index INTEGER NOT NULL DEFAULT 0
        )
        "#,
    )
    .execute(pool)
    .await?;

    // Job search tables for Postgres
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS job_vacancies (
            id SERIAL PRIMARY KEY,
            hh_vacancy_id TEXT UNIQUE NOT NULL,
            title TEXT NOT NULL,
            company TEXT NOT NULL,
            salary_from INTEGER,
            salary_to INTEGER,
            salary_currency TEXT,
            description TEXT,
            url TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'found',
            found_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            applied_at TIMESTAMPTZ,
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            ai_score INTEGER,
            ai_recommendation TEXT,
            ai_priority INTEGER,
            ai_match_reasons TEXT,
            ai_concerns TEXT,
            ai_salary_assessment TEXT
        )
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS job_search_settings (
            id SERIAL PRIMARY KEY,
            is_active BOOLEAN NOT NULL DEFAULT FALSE,
            search_text TEXT,
            area_ids TEXT,
            experience TEXT,
            schedule TEXT,
            employment TEXT,
            salary_from INTEGER,
            only_with_salary BOOLEAN DEFAULT FALSE,
            auto_tags_enabled BOOLEAN DEFAULT TRUE,
            search_tags_json TEXT,
            min_ai_score INTEGER DEFAULT 50,
            auto_apply_enabled BOOLEAN DEFAULT TRUE,
            search_interval_minutes INTEGER DEFAULT 60,
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS hh_tokens (
            id SERIAL PRIMARY KEY,
            access_token TEXT NOT NULL,
            refresh_token TEXT NOT NULL,
            expires_at TIMESTAMPTZ NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    // === Alice Smart Home Tables for Postgres ===
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS alice_users (
            id SERIAL PRIMARY KEY,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS alice_tokens (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES alice_users(id) ON DELETE CASCADE,
            access_token TEXT UNIQUE NOT NULL,
            refresh_token TEXT UNIQUE NOT NULL,
            expires_at TIMESTAMPTZ NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS alice_devices (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT,
            room TEXT,
            device_type TEXT NOT NULL,
            capabilities TEXT NOT NULL,
            properties TEXT,
            custom_data TEXT,
            is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS alice_device_states (
            id SERIAL PRIMARY KEY,
            device_id TEXT NOT NULL REFERENCES alice_devices(id) ON DELETE CASCADE,
            state_key TEXT NOT NULL,
            state_value TEXT NOT NULL,
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            UNIQUE(device_id, state_key)
        )
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS alice_command_log (
            id SERIAL PRIMARY KEY,
            device_id TEXT NOT NULL REFERENCES alice_devices(id) ON DELETE CASCADE,
            command_type TEXT NOT NULL,
            command_data TEXT,
            result TEXT,
            success BOOLEAN NOT NULL DEFAULT TRUE,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    // Insert default Alice devices for Postgres
    sqlx::query(
        r#"
        INSERT INTO alice_devices (id, name, description, room, device_type, capabilities, properties, custom_data, is_enabled)
        VALUES
        ('pc-control', 'Компьютер', 'Управление домашним ПК', 'Кабинет', 'devices.types.switch',
         '["on_off"]', '["power"]', '{"mac": "", "ip": "", "ssh_user": "", "ssh_key": ""}', TRUE),
        ('telegram-bot', 'Телеграм бот', 'Отправка сообщений через Telegram', 'Везде', 'devices.types.other',
         '["custom_button"]', NULL, '{"chat_id": ""}', TRUE),
        ('website-notify', 'Уведомление на сайт', 'Отправка уведомлений на сайт', 'Везде', 'devices.types.other',
         '["custom_button"]', NULL, '{}', TRUE)
        ON CONFLICT (id) DO NOTHING
        "#,
    )
    .execute(pool)
    .await?;

    // Insert default Alice user
    sqlx::query(
        r#"
        INSERT INTO alice_users (id, username, password_hash)
        VALUES (1, 'admin', '$argon2id$v=19$m=19456,t=2,p=1$YWRtaW5zYWx0$YWRtaW4xMjM0NTY=')
        ON CONFLICT (id) DO NOTHING
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query("CREATE INDEX IF NOT EXISTS idx_alice_tokens_access ON alice_tokens(access_token)")
        .execute(pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_alice_tokens_refresh ON alice_tokens(refresh_token)")
        .execute(pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_alice_device_states ON alice_device_states(device_id)")
        .execute(pool)
        .await?;

    // === Alice Command Queue for PC Client ===
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS alice_command_queue (
            id SERIAL PRIMARY KEY,
            command_type TEXT NOT NULL,
            command_data JSONB NOT NULL,
            priority INTEGER NOT NULL DEFAULT 0,
            status TEXT NOT NULL DEFAULT 'pending',
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            processed_at TIMESTAMPTZ,
            result TEXT,
            error TEXT
        )
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query("CREATE INDEX IF NOT EXISTS idx_alice_queue_status ON alice_command_queue(status)")
        .execute(pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_alice_queue_priority ON alice_command_queue(priority DESC, created_at ASC)")
        .execute(pool)
        .await?;

    // === Alice PC Client Registration ===
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS alice_pc_clients (
            id SERIAL PRIMARY KEY,
            client_id TEXT UNIQUE NOT NULL,
            client_name TEXT NOT NULL,
            api_key TEXT UNIQUE NOT NULL,
            is_online BOOLEAN NOT NULL DEFAULT FALSE,
            last_seen TIMESTAMPTZ,
            mac_address TEXT,
            ip_address TEXT,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query("CREATE INDEX IF NOT EXISTS idx_alice_pc_clients_key ON alice_pc_clients(api_key)")
        .execute(pool)
        .await?;

    // === Job Search System (Remaining Tables) ===
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS job_chats_v2 (
            id SERIAL PRIMARY KEY,
            vacancy_id INTEGER NOT NULL REFERENCES job_vacancies(id) ON DELETE CASCADE,
            hh_chat_id TEXT UNIQUE NOT NULL,
            employer_name TEXT,
            is_bot BOOLEAN DEFAULT FALSE,
            is_human_confirmed BOOLEAN DEFAULT FALSE,
            telegram_invited BOOLEAN DEFAULT FALSE,
            last_message_at TIMESTAMPTZ,
            unread_count INTEGER DEFAULT 0,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS job_chat_messages (
            id SERIAL PRIMARY KEY,
            chat_id INTEGER NOT NULL REFERENCES job_chats_v2(id) ON DELETE CASCADE,
            hh_message_id TEXT,
            author_type TEXT NOT NULL,
            text TEXT NOT NULL,
            is_auto_response BOOLEAN DEFAULT FALSE,
            ai_sentiment TEXT,
            ai_intent TEXT,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query("CREATE INDEX IF NOT EXISTS idx_chat_messages_chat ON job_chat_messages(chat_id)")
        .execute(pool)
        .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS job_responses (
            id SERIAL PRIMARY KEY,
            vacancy_id INTEGER NOT NULL REFERENCES job_vacancies(id) ON DELETE CASCADE,
            hh_negotiation_id TEXT,
            cover_letter TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'sent',
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query("CREATE INDEX IF NOT EXISTS idx_responses_vacancy ON job_responses(vacancy_id)")
        .execute(pool)
        .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS job_search_tags (
            id SERIAL PRIMARY KEY,
            tag_type TEXT NOT NULL,
            value TEXT NOT NULL,
            is_active BOOLEAN DEFAULT TRUE,
            search_count INTEGER DEFAULT 0,
            found_count INTEGER DEFAULT 0,
            applied_count INTEGER DEFAULT 0,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            UNIQUE(tag_type, value)
        )
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS job_activity_log (
            id SERIAL PRIMARY KEY,
            event_type TEXT NOT NULL,
            vacancy_id INTEGER REFERENCES job_vacancies(id) ON DELETE SET NULL,
            description TEXT NOT NULL,
            metadata TEXT,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS job_search_stats (
            id SERIAL PRIMARY KEY,
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
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    // === Anime Auction System ===
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS anime_auction (
            id SERIAL PRIMARY KEY,
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
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS anime_sync_progress (
            id SERIAL PRIMARY KEY,
            status TEXT NOT NULL,
            current INTEGER DEFAULT 0,
            total INTEGER DEFAULT 0,
            message TEXT,
            started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            finished_at TIMESTAMPTZ
        )
        "#,
    )
    .execute(pool)
    .await?;

    // === CS2 Skin Studio ===
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS studio_users (
            id SERIAL PRIMARY KEY,
            steam_id TEXT UNIQUE NOT NULL,
            persona_name TEXT NOT NULL,
            avatar_url TEXT NOT NULL,
            profile_url TEXT NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS studio_sessions (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES studio_users(id) ON DELETE CASCADE,
            token TEXT UNIQUE NOT NULL,
            expires_at TIMESTAMPTZ NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS studio_projects (
            id TEXT PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES studio_users(id) ON DELETE CASCADE,
            name TEXT NOT NULL,
            type TEXT NOT NULL DEFAULT 'sticker',
            sticker_type TEXT NOT NULL DEFAULT 'paper',
            thumbnail TEXT,
            data TEXT,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    // === File Manager ===
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS file_folders (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            parent_id TEXT REFERENCES file_folders(id) ON DELETE CASCADE,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS stored_files (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            path TEXT NOT NULL,
            folder_id TEXT REFERENCES file_folders(id) ON DELETE SET NULL,
            mime_type TEXT NOT NULL,
            size BIGINT NOT NULL,
            is_public BOOLEAN NOT NULL DEFAULT FALSE,
            access_code TEXT,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    // === Cloud Sync ===
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS sync_folders (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            api_key TEXT UNIQUE NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS sync_files (
            id TEXT PRIMARY KEY,
            folder_id TEXT NOT NULL REFERENCES sync_folders(id) ON DELETE CASCADE,
            path TEXT NOT NULL,
            name TEXT NOT NULL,
            mime_type TEXT NOT NULL,
            size BIGINT NOT NULL,
            checksum TEXT NOT NULL,
            version INTEGER NOT NULL DEFAULT 1,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            UNIQUE(folder_id, path)
        )
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS sync_clients (
            id TEXT PRIMARY KEY,
            folder_id TEXT NOT NULL REFERENCES sync_folders(id) ON DELETE CASCADE,
            device_name TEXT NOT NULL,
            last_sync_at TIMESTAMPTZ,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    // === Link Shortener ===
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
            expires_at TIMESTAMPTZ,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS link_clicks (
            id SERIAL PRIMARY KEY,
            link_id TEXT NOT NULL REFERENCES short_links(id) ON DELETE CASCADE,
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
            clicked_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    // === T2 Sales System ===
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS t2_stores (
            id SERIAL PRIMARY KEY,
            name TEXT NOT NULL,
            address TEXT NOT NULL,
            admin_code TEXT UNIQUE NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS t2_employees (
            id SERIAL PRIMARY KEY,
            store_id INTEGER NOT NULL REFERENCES t2_stores(id) ON DELETE CASCADE,
            name TEXT NOT NULL,
            code TEXT UNIQUE NOT NULL,
            is_admin BOOLEAN NOT NULL DEFAULT FALSE,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS t2_employee_stores (
            id SERIAL PRIMARY KEY,
            employee_id INTEGER NOT NULL REFERENCES t2_employees(id) ON DELETE CASCADE,
            store_id INTEGER NOT NULL REFERENCES t2_stores(id) ON DELETE CASCADE,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            UNIQUE(employee_id, store_id)
        )
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS t2_categories (
            id SERIAL PRIMARY KEY,
            name TEXT NOT NULL,
            icon TEXT,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    // Initial Data: T2 Categories
    sqlx::query(
        r#"
        INSERT INTO t2_categories (id, name, icon) VALUES
        (1, 'Смартфоны', 'smartphone'),
        (2, 'Аксессуары', 'headphones'),
        (3, 'SIM-карты', 'sim-card'),
        (4, 'Услуги', 'wrench')
        ON CONFLICT (id) DO NOTHING
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS t2_tags (
            id SERIAL PRIMARY KEY,
            store_id INTEGER NOT NULL REFERENCES t2_stores(id) ON DELETE CASCADE,
            name TEXT NOT NULL,
            color TEXT NOT NULL DEFAULT '#00bcd4',
            description TEXT,
            priority INTEGER NOT NULL DEFAULT 0,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS t2_products (
            id SERIAL PRIMARY KEY,
            store_id INTEGER NOT NULL REFERENCES t2_stores(id) ON DELETE CASCADE,
            category_id INTEGER NOT NULL REFERENCES t2_categories(id),
            name TEXT NOT NULL,
            brand TEXT,
            model TEXT,
            price REAL NOT NULL,
            quantity INTEGER NOT NULL DEFAULT 1,
            image_url TEXT,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS t2_product_specs (
            id SERIAL PRIMARY KEY,
            product_id INTEGER NOT NULL REFERENCES t2_products(id) ON DELETE CASCADE,
            spec_name TEXT NOT NULL,
            spec_value TEXT NOT NULL
        )
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS t2_product_tags (
            id SERIAL PRIMARY KEY,
            product_id INTEGER NOT NULL REFERENCES t2_products(id) ON DELETE CASCADE,
            tag_id INTEGER NOT NULL REFERENCES t2_tags(id) ON DELETE CASCADE,
            UNIQUE(product_id, tag_id)
        )
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS t2_tariffs (
            id SERIAL PRIMARY KEY,
            store_id INTEGER NOT NULL REFERENCES t2_stores(id) ON DELETE CASCADE,
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
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS t2_services (
            id SERIAL PRIMARY KEY,
            store_id INTEGER NOT NULL REFERENCES t2_stores(id) ON DELETE CASCADE,
            name TEXT NOT NULL,
            price REAL NOT NULL,
            description TEXT,
            for_smartphones_only BOOLEAN NOT NULL DEFAULT FALSE,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS t2_sales (
            id SERIAL PRIMARY KEY,
            store_id INTEGER NOT NULL REFERENCES t2_stores(id) ON DELETE CASCADE,
            employee_id INTEGER NOT NULL REFERENCES t2_employees(id) ON DELETE CASCADE,
            customer_request TEXT,
            customer_audio_url TEXT,
            total_amount REAL NOT NULL DEFAULT 0,
            status TEXT NOT NULL DEFAULT 'completed',
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS t2_sale_items (
            id SERIAL PRIMARY KEY,
            sale_id INTEGER NOT NULL REFERENCES t2_sales(id) ON DELETE CASCADE,
            item_type TEXT NOT NULL,
            item_id INTEGER NOT NULL,
            item_name TEXT NOT NULL,
            item_details TEXT,
            price REAL NOT NULL,
            quantity INTEGER NOT NULL DEFAULT 1,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS t2_sessions (
            id SERIAL PRIMARY KEY,
            employee_id INTEGER NOT NULL REFERENCES t2_employees(id) ON DELETE CASCADE,
            token TEXT UNIQUE NOT NULL,
            expires_at TIMESTAMPTZ NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    // Initial Data: T2 Store & Employee
    sqlx::query(
        r#"
        INSERT INTO t2_stores (id, name, address, admin_code)
        VALUES (1, 'Главный офис', 'Администрация', '00000')
        ON CONFLICT (id) DO NOTHING
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        INSERT INTO t2_employees (id, store_id, name, code, is_admin)
        VALUES (1, 1, 'Администратор', '12345', TRUE)
        ON CONFLICT (id) DO NOTHING
        "#,
    )
    .execute(pool)
    .await?;

    // === English Learning System ===
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS english_categories (
            id SERIAL PRIMARY KEY,
            name TEXT NOT NULL,
            name_ru TEXT NOT NULL,
            description TEXT,
            icon TEXT,
            color TEXT DEFAULT '#3b82f6',
            word_count INTEGER DEFAULT 0,
            display_order INTEGER DEFAULT 0,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    // Initial Data: English Categories
    sqlx::query(
        r#"
        INSERT INTO english_categories (id, name, name_ru, icon, color, display_order) VALUES
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
        ON CONFLICT (id) DO NOTHING
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS english_words (
            id SERIAL PRIMARY KEY,
            category_id INTEGER REFERENCES english_categories(id) ON DELETE SET NULL,
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
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS english_word_progress (
            id SERIAL PRIMARY KEY,
            word_id INTEGER NOT NULL REFERENCES english_words(id) ON DELETE CASCADE,
            ease_factor REAL DEFAULT 2.5,
            interval_days INTEGER DEFAULT 0,
            repetitions INTEGER DEFAULT 0,
            next_review TIMESTAMPTZ,
            last_review TIMESTAMPTZ,
            correct_count INTEGER DEFAULT 0,
            incorrect_count INTEGER DEFAULT 0,
            status TEXT DEFAULT 'new',
            mastery_level INTEGER DEFAULT 0,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            UNIQUE(word_id)
        )
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS english_grammar (
            id SERIAL PRIMARY KEY,
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
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS english_grammar_progress (
            id SERIAL PRIMARY KEY,
            grammar_id INTEGER NOT NULL REFERENCES english_grammar(id) ON DELETE CASCADE,
            studied BOOLEAN DEFAULT FALSE,
            mastery_level INTEGER DEFAULT 0,
            quiz_score INTEGER,
            last_studied TIMESTAMPTZ,
            next_review TIMESTAMPTZ,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            UNIQUE(grammar_id)
        )
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS english_sentences (
            id SERIAL PRIMARY KEY,
            sentence TEXT NOT NULL,
            translation TEXT NOT NULL,
            audio_url TEXT,
            difficulty INTEGER DEFAULT 1,
            category TEXT,
            grammar_focus TEXT,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS english_quiz_results (
            id SERIAL PRIMARY KEY,
            quiz_type TEXT NOT NULL,
            category_id INTEGER REFERENCES english_categories(id) ON DELETE SET NULL,
            score INTEGER NOT NULL,
            total_questions INTEGER NOT NULL,
            correct_answers INTEGER NOT NULL,
            time_spent_seconds INTEGER,
            details TEXT,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS english_daily_stats (
            id SERIAL PRIMARY KEY,
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
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS english_settings (
            id SERIAL PRIMARY KEY,
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
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        INSERT INTO english_settings (id) VALUES (1)
        ON CONFLICT (id) DO NOTHING
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS english_achievements (
            id SERIAL PRIMARY KEY,
            achievement_type TEXT NOT NULL UNIQUE,
            title TEXT NOT NULL,
            description TEXT NOT NULL,
            icon TEXT,
            xp_reward INTEGER DEFAULT 0,
            unlocked_at TIMESTAMPTZ,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    // Initial Data: English Achievements
    sqlx::query(
        r#"
        INSERT INTO english_achievements (achievement_type, title, description, icon, xp_reward) VALUES
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
        ON CONFLICT (achievement_type) DO NOTHING
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS english_word_lists (
            id SERIAL PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT,
            is_public BOOLEAN DEFAULT FALSE,
            word_ids TEXT,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS english_sessions (
            id SERIAL PRIMARY KEY,
            session_type TEXT NOT NULL,
            started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            ended_at TIMESTAMPTZ,
            words_practiced INTEGER DEFAULT 0,
            correct_count INTEGER DEFAULT 0,
            incorrect_count INTEGER DEFAULT 0,
            xp_earned INTEGER DEFAULT 0
        )
        "#,
    )
    .execute(pool)
    .await?;

    // === Menu Settings ===
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS menu_settings (
            id TEXT PRIMARY KEY,
            label TEXT NOT NULL,
            is_visible BOOLEAN NOT NULL DEFAULT TRUE,
            display_order INTEGER NOT NULL DEFAULT 0,
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        INSERT INTO menu_settings (id, label, is_visible, display_order) VALUES
        ('home', 'Главная', TRUE, 0),
        ('resume', 'Резюме', TRUE, 1),
        ('workshop', 'Steam Workshop', TRUE, 2),
        ('studio', 'CS2 Skin Studio', TRUE, 3),
        ('t2', 'T2 Sales', TRUE, 4)
        ON CONFLICT (id) DO NOTHING
        "#,
    )
    .execute(pool)
    .await?;

    Ok(())
}
