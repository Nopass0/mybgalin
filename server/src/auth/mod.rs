use crate::models::{OtpCode, Session, User};
use rand::Rng;
use sha2::{Digest, Sha256};
use sqlx::SqlitePool;
use uuid::Uuid;

pub struct AuthService;

impl AuthService {
    // Generate a 6-digit OTP code
    pub fn generate_otp() -> String {
        let mut rng = rand::thread_rng();
        format!("{:06}", rng.gen_range(0..=999999))
    }

    // Generate a secure session token
    pub fn generate_token() -> String {
        let uuid = Uuid::new_v4();
        let mut hasher = Sha256::new();
        hasher.update(uuid.as_bytes());
        hasher.update(std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs()
            .to_string()
            .as_bytes());
        hex::encode(hasher.finalize())
    }

    // Get or create user by telegram_id
    pub async fn get_or_create_user(
        pool: &SqlitePool,
        telegram_id: i64,
    ) -> Result<User, sqlx::Error> {
        // Try to find existing user
        let user = sqlx::query_as::<_, User>(
            "SELECT id, telegram_id, username, created_at FROM users WHERE telegram_id = $1",
        )
        .bind(telegram_id)
        .fetch_optional(pool)
        .await?;

        if let Some(user) = user {
            return Ok(user);
        }

        // Create new user
        let user = sqlx::query_as::<_, User>(
            "INSERT INTO users (telegram_id, created_at) VALUES ($1, datetime('now')) RETURNING id, telegram_id, username, created_at",
        )
        .bind(telegram_id)
        .fetch_one(pool)
        .await?;

        Ok(user)
    }

    // Create OTP code for user
    pub async fn create_otp(
        pool: &SqlitePool,
        user_id: i64,
        code: &str,
    ) -> Result<OtpCode, sqlx::Error> {
        // Invalidate all previous unused codes
        sqlx::query("UPDATE otp_codes SET used = TRUE WHERE user_id = $1 AND used = FALSE")
            .bind(user_id)
            .execute(pool)
            .await?;

        // Insert new code (expires in 5 minutes)
        let otp = sqlx::query_as::<_, OtpCode>(
            "INSERT INTO otp_codes (user_id, code, expires_at, created_at)
             VALUES ($1, $2, datetime('now', '+5 minutes'), datetime('now'))
             RETURNING id, user_id, code, expires_at, used, created_at",
        )
        .bind(user_id)
        .bind(code)
        .fetch_one(pool)
        .await?;

        Ok(otp)
    }

    // Verify OTP and create session
    pub async fn verify_otp(
        pool: &SqlitePool,
        telegram_id: i64,
        code: &str,
    ) -> Result<Option<String>, sqlx::Error> {
        // Find user
        let user = sqlx::query_as::<_, User>(
            "SELECT id, telegram_id, username, created_at FROM users WHERE telegram_id = $1",
        )
        .bind(telegram_id)
        .fetch_optional(pool)
        .await?;

        let user = match user {
            Some(u) => u,
            None => return Ok(None),
        };

        // Find valid OTP
        let otp = sqlx::query_as::<_, OtpCode>(
            "SELECT id, user_id, code, expires_at, used, created_at
             FROM otp_codes
             WHERE user_id = $1 AND code = $2 AND used = FALSE AND expires_at > datetime('now')
             ORDER BY created_at DESC
             LIMIT 1",
        )
        .bind(user.id)
        .bind(code)
        .fetch_optional(pool)
        .await?;

        let otp = match otp {
            Some(o) => o,
            None => return Ok(None),
        };

        // Mark OTP as used
        sqlx::query("UPDATE otp_codes SET used = TRUE WHERE id = $1")
            .bind(otp.id)
            .execute(pool)
            .await?;

        // Create session (expires in 30 days)
        let token = Self::generate_token();

        sqlx::query(
            "INSERT INTO sessions (user_id, token, expires_at, created_at)
             VALUES ($1, $2, datetime('now', '+30 days'), datetime('now'))",
        )
        .bind(user.id)
        .bind(&token)
        .execute(pool)
        .await?;

        Ok(Some(token))
    }

    // Validate session token
    pub async fn validate_token(
        pool: &SqlitePool,
        token: &str,
    ) -> Result<Option<User>, sqlx::Error> {
        let session = sqlx::query_as::<_, Session>(
            "SELECT id, user_id, token, expires_at, created_at
             FROM sessions
             WHERE token = $1 AND expires_at > datetime('now')",
        )
        .bind(token)
        .fetch_optional(pool)
        .await?;

        let session = match session {
            Some(s) => s,
            None => return Ok(None),
        };

        let user = sqlx::query_as::<_, User>(
            "SELECT id, telegram_id, username, created_at FROM users WHERE id = $1",
        )
        .bind(session.user_id)
        .fetch_one(pool)
        .await?;

        Ok(Some(user))
    }
}
