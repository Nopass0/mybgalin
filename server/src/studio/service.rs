use crate::studio::models::*;
use rand::Rng;
use reqwest::Client;
use sha2::{Digest, Sha256};
use sqlx::SqlitePool;
use std::time::{SystemTime, UNIX_EPOCH};

pub struct StudioService;

impl StudioService {
    /// Generate a unique project ID
    pub fn generate_project_id() -> String {
        let timestamp = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_millis();
        let random: u32 = rand::thread_rng().gen();
        format!("{:x}{:08x}", timestamp, random)
    }

    /// Generate a secure session token
    pub fn generate_token() -> String {
        let timestamp = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        let random: [u8; 32] = rand::thread_rng().gen();
        let mut hasher = Sha256::new();
        hasher.update(timestamp.to_le_bytes());
        hasher.update(&random);
        let result = hasher.finalize();
        hex::encode(result)
    }

    /// Extract Steam ID from OpenID claimed_id
    pub fn extract_steam_id(claimed_id: &str) -> Option<String> {
        // Format: https://steamcommunity.com/openid/id/76561198012345678
        claimed_id
            .strip_prefix("https://steamcommunity.com/openid/id/")
            .map(|s| s.to_string())
    }

    /// Fetch Steam player info
    pub async fn fetch_steam_player(
        api_key: &str,
        steam_id: &str,
    ) -> Result<SteamPlayer, Box<dyn std::error::Error + Send + Sync>> {
        let client = Client::new();
        let url = format!(
            "https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key={}&steamids={}",
            api_key, steam_id
        );

        let response: SteamPlayerSummariesResponse = client.get(&url).send().await?.json().await?;

        response
            .response
            .players
            .into_iter()
            .next()
            .ok_or_else(|| "Player not found".into())
    }

    /// Get or create studio user
    pub async fn get_or_create_user(
        pool: &SqlitePool,
        steam_id: &str,
        persona_name: &str,
        avatar_url: &str,
        profile_url: &str,
    ) -> Result<StudioUser, sqlx::Error> {
        // Try to find existing user
        let existing: Option<StudioUser> = sqlx::query_as(
            "SELECT * FROM studio_users WHERE steam_id = ?"
        )
        .bind(steam_id)
        .fetch_optional(pool)
        .await?;

        if let Some(mut user) = existing {
            // Update profile info
            sqlx::query(
                "UPDATE studio_users SET persona_name = ?, avatar_url = ?, profile_url = ? WHERE id = ?"
            )
            .bind(persona_name)
            .bind(avatar_url)
            .bind(profile_url)
            .bind(user.id)
            .execute(pool)
            .await?;

            user.persona_name = persona_name.to_string();
            user.avatar_url = avatar_url.to_string();
            user.profile_url = profile_url.to_string();

            Ok(user)
        } else {
            // Create new user
            sqlx::query(
                "INSERT INTO studio_users (steam_id, persona_name, avatar_url, profile_url) VALUES (?, ?, ?, ?)"
            )
            .bind(steam_id)
            .bind(persona_name)
            .bind(avatar_url)
            .bind(profile_url)
            .execute(pool)
            .await?;

            sqlx::query_as("SELECT * FROM studio_users WHERE steam_id = ?")
                .bind(steam_id)
                .fetch_one(pool)
                .await
        }
    }

    /// Create a session for user
    pub async fn create_session(
        pool: &SqlitePool,
        user_id: i32,
    ) -> Result<String, sqlx::Error> {
        let token = Self::generate_token();

        // Session expires in 30 days
        sqlx::query(
            "INSERT INTO studio_sessions (user_id, token, expires_at) VALUES (?, ?, datetime('now', '+30 days'))"
        )
        .bind(user_id)
        .bind(&token)
        .execute(pool)
        .await?;

        Ok(token)
    }

    /// Validate session token and get user
    pub async fn validate_session(
        pool: &SqlitePool,
        token: &str,
    ) -> Result<Option<StudioUser>, sqlx::Error> {
        let session: Option<StudioSession> = sqlx::query_as(
            "SELECT * FROM studio_sessions WHERE token = ? AND expires_at > datetime('now')"
        )
        .bind(token)
        .fetch_optional(pool)
        .await?;

        if let Some(session) = session {
            let user: StudioUser = sqlx::query_as(
                "SELECT * FROM studio_users WHERE id = ?"
            )
            .bind(session.user_id)
            .fetch_one(pool)
            .await?;

            Ok(Some(user))
        } else {
            Ok(None)
        }
    }

    /// Get all projects for a user
    pub async fn get_user_projects(
        pool: &SqlitePool,
        user_id: i64,
    ) -> Result<Vec<StudioProject>, sqlx::Error> {
        sqlx::query_as(
            "SELECT * FROM studio_projects WHERE user_id = ? ORDER BY updated_at DESC"
        )
        .bind(user_id)
        .fetch_all(pool)
        .await
    }

    /// Get a specific project
    pub async fn get_project(
        pool: &SqlitePool,
        project_id: &str,
        user_id: i64,
    ) -> Result<Option<StudioProject>, sqlx::Error> {
        sqlx::query_as(
            "SELECT * FROM studio_projects WHERE id = ? AND user_id = ?"
        )
        .bind(project_id)
        .bind(user_id)
        .fetch_optional(pool)
        .await
    }

    /// Create a new project
    pub async fn create_project(
        pool: &SqlitePool,
        user_id: i64,
        name: &str,
        project_type: &str,
        sticker_type: &str,
    ) -> Result<StudioProject, sqlx::Error> {
        let id = Self::generate_project_id();

        sqlx::query(
            r#"INSERT INTO studio_projects (id, user_id, name, type, sticker_type)
               VALUES (?, ?, ?, ?, ?)"#
        )
        .bind(&id)
        .bind(user_id)
        .bind(name)
        .bind(project_type)
        .bind(sticker_type)
        .execute(pool)
        .await?;

        sqlx::query_as("SELECT * FROM studio_projects WHERE id = ?")
            .bind(&id)
            .fetch_one(pool)
            .await
    }

    /// Update a project
    pub async fn update_project(
        pool: &SqlitePool,
        project_id: &str,
        user_id: i64,
        name: Option<&str>,
        thumbnail: Option<&str>,
        data: Option<&str>,
    ) -> Result<Option<StudioProject>, sqlx::Error> {
        // Build dynamic update query
        let mut updates = vec!["updated_at = datetime('now')".to_string()];

        if name.is_some() {
            updates.push("name = ?".to_string());
        }
        if thumbnail.is_some() {
            updates.push("thumbnail = ?".to_string());
        }
        if data.is_some() {
            updates.push("data = ?".to_string());
        }

        let query = format!(
            "UPDATE studio_projects SET {} WHERE id = ? AND user_id = ?",
            updates.join(", ")
        );

        let mut q = sqlx::query(&query);

        if let Some(n) = name {
            q = q.bind(n);
        }
        if let Some(t) = thumbnail {
            q = q.bind(t);
        }
        if let Some(d) = data {
            q = q.bind(d);
        }

        q = q.bind(project_id).bind(user_id);
        q.execute(pool).await?;

        Self::get_project(pool, project_id, user_id).await
    }

    /// Delete a project
    pub async fn delete_project(
        pool: &SqlitePool,
        project_id: &str,
        user_id: i64,
    ) -> Result<bool, sqlx::Error> {
        let result = sqlx::query(
            "DELETE FROM studio_projects WHERE id = ? AND user_id = ?"
        )
        .bind(project_id)
        .bind(user_id)
        .execute(pool)
        .await?;

        Ok(result.rows_affected() > 0)
    }
}
