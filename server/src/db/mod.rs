use sqlx::{PgPool, postgres::PgPoolOptions};
use std::time::Duration;

pub async fn create_pool(database_url: &str) -> Result<PgPool, sqlx::Error> {
    let pool = PgPoolOptions::new()
        .max_connections(5)
        .acquire_timeout(Duration::from_secs(3))
        .connect(database_url)
        .await?;

    // Run migrations
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            telegram_id BIGINT UNIQUE NOT NULL,
            username TEXT,
            created_at TIMESTAMP NOT NULL DEFAULT NOW()
        )
        "#,
    )
    .execute(&pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS otp_codes (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL,
            code TEXT NOT NULL,
            expires_at TIMESTAMP NOT NULL,
            used BOOLEAN NOT NULL DEFAULT FALSE,
            created_at TIMESTAMP NOT NULL DEFAULT NOW(),
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
        "#,
    )
    .execute(&pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS sessions (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL,
            token TEXT UNIQUE NOT NULL,
            expires_at TIMESTAMP NOT NULL,
            created_at TIMESTAMP NOT NULL DEFAULT NOW(),
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
            id SERIAL PRIMARY KEY,
            description TEXT NOT NULL,
            updated_at TIMESTAMP NOT NULL DEFAULT NOW()
        )
        "#,
    )
    .execute(&pool)
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
            created_at TIMESTAMP NOT NULL DEFAULT NOW()
        )
        "#,
    )
    .execute(&pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS portfolio_skills (
            id SERIAL PRIMARY KEY,
            name TEXT NOT NULL,
            category TEXT,
            created_at TIMESTAMP NOT NULL DEFAULT NOW()
        )
        "#,
    )
    .execute(&pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS portfolio_contacts (
            id SERIAL PRIMARY KEY,
            type TEXT NOT NULL,
            value TEXT NOT NULL,
            label TEXT,
            created_at TIMESTAMP NOT NULL DEFAULT NOW()
        )
        "#,
    )
    .execute(&pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS portfolio_cases (
            id SERIAL PRIMARY KEY,
            title TEXT NOT NULL,
            description TEXT NOT NULL,
            main_image TEXT NOT NULL,
            website_url TEXT,
            created_at TIMESTAMP NOT NULL DEFAULT NOW()
        )
        "#,
    )
    .execute(&pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS portfolio_case_images (
            id SERIAL PRIMARY KEY,
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
            found_at TIMESTAMP NOT NULL DEFAULT NOW(),
            applied_at TIMESTAMP,
            updated_at TIMESTAMP NOT NULL DEFAULT NOW()
        )
        "#,
    )
    .execute(&pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS job_responses (
            id SERIAL PRIMARY KEY,
            vacancy_id INTEGER NOT NULL,
            hh_negotiation_id TEXT,
            cover_letter TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'sent',
            created_at TIMESTAMP NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
            FOREIGN KEY (vacancy_id) REFERENCES job_vacancies(id) ON DELETE CASCADE
        )
        "#,
    )
    .execute(&pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS job_chats (
            id SERIAL PRIMARY KEY,
            vacancy_id INTEGER NOT NULL,
            hh_chat_id TEXT UNIQUE NOT NULL,
            last_message TEXT,
            last_message_at TIMESTAMP,
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
            id SERIAL PRIMARY KEY,
            access_token TEXT NOT NULL,
            refresh_token TEXT NOT NULL,
            expires_at TIMESTAMP NOT NULL,
            created_at TIMESTAMP NOT NULL DEFAULT NOW()
        )
        "#,
    )
    .execute(&pool)
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
            updated_at TIMESTAMP NOT NULL DEFAULT NOW()
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
            created_at TIMESTAMP NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMP NOT NULL DEFAULT NOW()
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
            id SERIAL PRIMARY KEY,
            status TEXT NOT NULL,
            current INTEGER DEFAULT 0,
            total INTEGER DEFAULT 0,
            message TEXT,
            started_at TIMESTAMP NOT NULL DEFAULT NOW(),
            finished_at TIMESTAMP
        )
        "#,
    )
    .execute(&pool)
    .await?;

    Ok(pool)
}
