use rocket::http::Status;
use rocket::request::{FromRequest, Outcome, Request};
use sqlx::SqlitePool;

use super::models::T2EmployeeWithStores;

pub struct T2AuthGuard {
    pub employee: T2EmployeeWithStores,
    pub current_store_id: i32,
}

#[rocket::async_trait]
impl<'r> FromRequest<'r> for T2AuthGuard {
    type Error = &'static str;

    async fn from_request(request: &'r Request<'_>) -> Outcome<Self, Self::Error> {
        // Get authorization header
        let auth_header = request.headers().get_one("Authorization");
        let token = match auth_header {
            Some(header) if header.starts_with("Bearer ") => &header[7..],
            _ => return Outcome::Error((Status::Unauthorized, "Missing or invalid Authorization header")),
        };

        // Get store ID from header (optional, defaults to employee's primary store)
        let store_id_header = request.headers().get_one("X-Store-Id");

        // Get database pool
        let pool = match request.rocket().state::<SqlitePool>() {
            Some(pool) => pool,
            None => return Outcome::Error((Status::InternalServerError, "Database not available")),
        };

        // Validate token and get employee
        let session = match sqlx::query_as::<_, (i32, String)>(
            r#"
            SELECT employee_id, expires_at FROM t2_sessions
            WHERE token = ? AND expires_at > datetime('now')
            "#,
        )
        .bind(token)
        .fetch_optional(pool)
        .await
        {
            Ok(Some(session)) => session,
            Ok(None) => return Outcome::Error((Status::Unauthorized, "Invalid or expired token")),
            Err(_) => return Outcome::Error((Status::InternalServerError, "Database error")),
        };

        let employee_id = session.0;

        // Get employee details
        let employee = match sqlx::query_as::<_, super::models::T2Employee>(
            r#"SELECT id, store_id, name, code, is_admin, created_at FROM t2_employees WHERE id = ?"#,
        )
        .bind(employee_id)
        .fetch_optional(pool)
        .await
        {
            Ok(Some(emp)) => emp,
            Ok(None) => return Outcome::Error((Status::Unauthorized, "Employee not found")),
            Err(_) => return Outcome::Error((Status::InternalServerError, "Database error")),
        };

        // Get all stores employee has access to
        let mut stores = Vec::new();

        // Primary store
        if let Ok(Some(primary_store)) = sqlx::query_as::<_, super::models::T2Store>(
            r#"SELECT id, name, address, admin_code, created_at, updated_at FROM t2_stores WHERE id = ?"#,
        )
        .bind(employee.store_id)
        .fetch_optional(pool)
        .await
        {
            stores.push(primary_store);
        }

        // Additional stores (if admin, get all stores; otherwise get assigned stores)
        if employee.is_admin {
            if let Ok(all_stores) = sqlx::query_as::<_, super::models::T2Store>(
                r#"SELECT id, name, address, admin_code, created_at, updated_at FROM t2_stores WHERE id != ?"#,
            )
            .bind(employee.store_id)
            .fetch_all(pool)
            .await
            {
                stores.extend(all_stores);
            }
        } else {
            if let Ok(additional_stores) = sqlx::query_as::<_, super::models::T2Store>(
                r#"
                SELECT s.id, s.name, s.address, s.admin_code, s.created_at, s.updated_at
                FROM t2_stores s
                INNER JOIN t2_employee_stores es ON s.id = es.store_id
                WHERE es.employee_id = ?
                "#,
            )
            .bind(employee_id)
            .fetch_all(pool)
            .await
            {
                stores.extend(additional_stores);
            }
        }

        // Determine current store ID
        let current_store_id = if let Some(id_str) = store_id_header {
            if let Ok(id) = id_str.parse::<i32>() {
                // Check if employee has access to this store
                if stores.iter().any(|s| s.id == id) {
                    id
                } else {
                    employee.store_id
                }
            } else {
                employee.store_id
            }
        } else {
            employee.store_id
        };

        let employee_with_stores = T2EmployeeWithStores {
            id: employee.id,
            store_id: employee.store_id,
            name: employee.name,
            code: employee.code,
            is_admin: employee.is_admin,
            created_at: employee.created_at,
            stores,
        };

        Outcome::Success(T2AuthGuard {
            employee: employee_with_stores,
            current_store_id,
        })
    }
}

// Admin-only guard
pub struct T2AdminGuard {
    pub employee: T2EmployeeWithStores,
}

#[rocket::async_trait]
impl<'r> FromRequest<'r> for T2AdminGuard {
    type Error = &'static str;

    async fn from_request(request: &'r Request<'_>) -> Outcome<Self, Self::Error> {
        match T2AuthGuard::from_request(request).await {
            Outcome::Success(guard) if guard.employee.is_admin => {
                Outcome::Success(T2AdminGuard { employee: guard.employee })
            }
            Outcome::Success(_) => Outcome::Error((Status::Forbidden, "Admin access required")),
            Outcome::Error(e) => Outcome::Error(e),
            Outcome::Forward(f) => Outcome::Forward(f),
        }
    }
}
