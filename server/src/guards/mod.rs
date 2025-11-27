use crate::auth::AuthService;
use crate::models::User;
use rocket::http::Status;
use rocket::request::{self, FromRequest, Request};
use rocket::outcome::Outcome;
use rocket::State;
use sqlx::SqlitePool;

// Authenticated user guard for admin routes
pub struct AuthGuard {
    pub user: User,
}

#[rocket::async_trait]
impl<'r> FromRequest<'r> for AuthGuard {
    type Error = ();

    async fn from_request(req: &'r Request<'_>) -> request::Outcome<Self, Self::Error> {
        // Get Authorization header
        let auth_header = req.headers().get_one("Authorization");

        let token = match auth_header {
            Some(header) => {
                // Support both "Bearer TOKEN" and just "TOKEN" formats
                if header.starts_with("Bearer ") {
                    header.trim_start_matches("Bearer ")
                } else {
                    header
                }
            }
            None => return Outcome::Error((Status::Unauthorized, ())),
        };

        // Get database pool from state
        let pool = match req.guard::<&State<SqlitePool>>().await {
            Outcome::Success(pool) => pool,
            _ => return Outcome::Error((Status::InternalServerError, ())),
        };

        // Validate token
        match AuthService::validate_token(pool, token).await {
            Ok(Some(user)) => Outcome::Success(AuthGuard { user }),
            Ok(None) => Outcome::Error((Status::Unauthorized, ())),
            Err(_) => Outcome::Error((Status::InternalServerError, ())),
        }
    }
}
