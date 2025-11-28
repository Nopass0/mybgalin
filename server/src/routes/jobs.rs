use crate::guards::AuthGuard;
use crate::jobs::*;
use crate::models::ApiResponse;
use rocket::serde::json::Json;
use rocket::{get, post, put, State};
use rocket::response::Redirect;
use sqlx::SqlitePool;

// ==================
// SEARCH CONTROL
// ==================

#[post("/jobs/search/start")]
pub async fn start_job_search(
    _auth: AuthGuard,
    scheduler: &State<JobScheduler>,
) -> Json<ApiResponse<String>> {
    scheduler.start();
    Json(ApiResponse::success("Job search started".to_string()))
}

#[post("/jobs/search/stop")]
pub async fn stop_job_search(
    _auth: AuthGuard,
    scheduler: &State<JobScheduler>,
) -> Json<ApiResponse<String>> {
    scheduler.stop();
    Json(ApiResponse::success("Job search stopped".to_string()))
}

#[get("/jobs/search/status")]
pub async fn get_search_status(
    _auth: AuthGuard,
    scheduler: &State<JobScheduler>,
    pool: &State<SqlitePool>,
) -> Json<ApiResponse<SearchStatus>> {
    let is_active = scheduler.is_running();

    // Check if HH token exists
    let has_token: bool = sqlx::query_scalar("SELECT COUNT(*) > 0 FROM hh_tokens")
        .fetch_one(pool.inner())
        .await
        .unwrap_or(false);

    // Get settings
    let settings: Option<JobSearchSettings> = sqlx::query_as(
        "SELECT id, is_active, search_text, area_ids, experience, schedule, employment, salary_from, only_with_salary, updated_at
         FROM job_search_settings ORDER BY id DESC LIMIT 1"
    )
    .fetch_optional(pool.inner())
    .await
    .unwrap_or(None);

    Json(ApiResponse::success(SearchStatus {
        is_active,
        is_authorized: has_token,
        last_search: None,
        settings,
    }))
}

#[put("/jobs/search/settings", data = "<request>")]
pub async fn update_search_settings(
    _auth: AuthGuard,
    request: Json<UpdateSearchSettingsRequest>,
    pool: &State<SqlitePool>,
) -> Json<ApiResponse<JobSearchSettings>> {
    let area_ids_json = request.area_ids.as_ref().map(|ids| serde_json::to_string(ids).unwrap());

    // Upsert settings
    sqlx::query(
        "INSERT INTO job_search_settings (id, is_active, search_text, area_ids, experience, schedule, employment, salary_from, only_with_salary, updated_at)
         VALUES (1, FALSE, $1, $2, $3, $4, $5, $6, $7, datetime('now'))
         ON CONFLICT(id) DO UPDATE SET
         search_text = excluded.search_text,
         area_ids = excluded.area_ids,
         experience = excluded.experience,
         schedule = excluded.schedule,
         employment = excluded.employment,
         salary_from = excluded.salary_from,
         only_with_salary = excluded.only_with_salary,
         updated_at = datetime('now')"
    )
    .bind(&request.search_text)
    .bind(&area_ids_json)
    .bind(&request.experience)
    .bind(&request.schedule)
    .bind(&request.employment)
    .bind(&request.salary_from)
    .bind(request.only_with_salary.unwrap_or(false))
    .execute(pool.inner())
    .await
    .ok();

    let settings: JobSearchSettings = sqlx::query_as(
        "SELECT id, is_active, search_text, area_ids, experience, schedule, employment, salary_from, only_with_salary, updated_at
         FROM job_search_settings WHERE id = 1"
    )
    .fetch_one(pool.inner())
    .await
    .unwrap();

    Json(ApiResponse::success(settings))
}

// ==================
// VACANCIES
// ==================

#[get("/jobs/vacancies")]
pub async fn get_vacancies(
    _auth: AuthGuard,
    pool: &State<SqlitePool>,
) -> Json<ApiResponse<Vec<VacancyWithResponse>>> {
    let vacancies: Vec<JobVacancy> = sqlx::query_as(
        "SELECT id, hh_vacancy_id, title, company, salary_from, salary_to, salary_currency, description, url, status, found_at, applied_at, updated_at
         FROM job_vacancies ORDER BY found_at DESC"
    )
    .fetch_all(pool.inner())
    .await
    .unwrap_or_default();

    let mut result = Vec::new();
    for vacancy in vacancies {
        let response: Option<JobResponse> = sqlx::query_as(
            "SELECT id, vacancy_id, hh_negotiation_id, cover_letter, status, created_at, updated_at
             FROM job_responses WHERE vacancy_id = $1 LIMIT 1"
        )
        .bind(vacancy.id)
        .fetch_optional(pool.inner())
        .await
        .unwrap_or(None);

        result.push(VacancyWithResponse { vacancy, response });
    }

    Json(ApiResponse::success(result))
}

#[get("/jobs/vacancies/<id>")]
pub async fn get_vacancy_details(
    _auth: AuthGuard,
    id: i64,
    pool: &State<SqlitePool>,
) -> Json<ApiResponse<VacancyWithResponse>> {
    let vacancy: Option<JobVacancy> = sqlx::query_as(
        "SELECT id, hh_vacancy_id, title, company, salary_from, salary_to, salary_currency, description, url, status, found_at, applied_at, updated_at
         FROM job_vacancies WHERE id = $1"
    )
    .bind(id)
    .fetch_optional(pool.inner())
    .await
    .unwrap_or(None);

    let vacancy = match vacancy {
        Some(v) => v,
        None => return Json(ApiResponse::error("Vacancy not found".to_string())),
    };

    let response: Option<JobResponse> = sqlx::query_as(
        "SELECT id, vacancy_id, hh_negotiation_id, cover_letter, status, created_at, updated_at
         FROM job_responses WHERE vacancy_id = $1 LIMIT 1"
    )
    .bind(id)
    .fetch_optional(pool.inner())
    .await
    .unwrap_or(None);

    Json(ApiResponse::success(VacancyWithResponse { vacancy, response }))
}

#[get("/jobs/vacancies/status/<status>")]
pub async fn get_vacancies_by_status(
    _auth: AuthGuard,
    status: &str,
    pool: &State<SqlitePool>,
) -> Json<ApiResponse<Vec<VacancyWithResponse>>> {
    let vacancies: Vec<JobVacancy> = sqlx::query_as(
        "SELECT id, hh_vacancy_id, title, company, salary_from, salary_to, salary_currency, description, url, status, found_at, applied_at, updated_at
         FROM job_vacancies WHERE status = $1 ORDER BY found_at DESC"
    )
    .bind(status)
    .fetch_all(pool.inner())
    .await
    .unwrap_or_default();

    let mut result = Vec::new();
    for vacancy in vacancies {
        let response: Option<JobResponse> = sqlx::query_as(
            "SELECT id, vacancy_id, hh_negotiation_id, cover_letter, status, created_at, updated_at
             FROM job_responses WHERE vacancy_id = $1 LIMIT 1"
        )
        .bind(vacancy.id)
        .fetch_optional(pool.inner())
        .await
        .unwrap_or(None);

        result.push(VacancyWithResponse { vacancy, response });
    }

    Json(ApiResponse::success(result))
}

#[get("/jobs/stats")]
pub async fn get_job_stats(
    _auth: AuthGuard,
    pool: &State<SqlitePool>,
) -> Json<ApiResponse<JobStats>> {
    let total_found: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM job_vacancies")
        .fetch_one(pool.inner())
        .await
        .unwrap_or(0);

    let total_applied: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM job_vacancies WHERE status IN ('applied', 'viewed', 'invited', 'rejected')")
        .fetch_one(pool.inner())
        .await
        .unwrap_or(0);

    let invited: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM job_vacancies WHERE status = 'invited'")
        .fetch_one(pool.inner())
        .await
        .unwrap_or(0);

    let rejected: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM job_vacancies WHERE status = 'rejected'")
        .fetch_one(pool.inner())
        .await
        .unwrap_or(0);

    let in_progress: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM job_vacancies WHERE status IN ('applied', 'viewed')")
        .fetch_one(pool.inner())
        .await
        .unwrap_or(0);

    Json(ApiResponse::success(JobStats {
        total_found,
        total_applied,
        invited,
        rejected,
        in_progress,
    }))
}

#[post("/jobs/vacancies/<id>/ignore")]
pub async fn ignore_vacancy(
    _auth: AuthGuard,
    id: i64,
    pool: &State<SqlitePool>,
) -> Json<ApiResponse<String>> {
    sqlx::query("UPDATE job_vacancies SET status = 'ignored' WHERE id = $1")
        .bind(id)
        .execute(pool.inner())
        .await
        .ok();

    Json(ApiResponse::success("Vacancy ignored".to_string()))
}

// HH OAuth callback endpoint - redirects to frontend after processing
#[get("/auth/hh/callback?<code>&<error>&<error_description>")]
pub async fn hh_oauth_callback(
    code: Option<String>,
    error: Option<String>,
    error_description: Option<String>,
    pool: &State<SqlitePool>,
) -> Redirect {
    // If there's an error from HH, redirect to frontend with error
    if let Some(err) = error {
        let description = error_description.unwrap_or_else(|| "Unknown error".to_string());
        return Redirect::to(format!("/auth/hh/callback?error={}&error_description={}", err, description));
    }

    // If no code, redirect with error
    let Some(code) = code else {
        return Redirect::to("/auth/hh/callback?error=no_code&error_description=Authorization code not received");
    };

    let client_id = std::env::var("HH_CLIENT_ID").unwrap_or_default();
    let client_secret = std::env::var("HH_CLIENT_SECRET").unwrap_or_default();
    let redirect_uri = std::env::var("HH_REDIRECT_URI").unwrap_or_default();

    match HHClient::exchange_code(&client_id, &client_secret, &code, &redirect_uri).await {
        Ok((access_token, refresh_token, expires_in)) => {
            let expires_at = chrono::Utc::now() + chrono::Duration::seconds(expires_in);

            match sqlx::query(
                "INSERT INTO hh_tokens (access_token, refresh_token, expires_at) VALUES (?, ?, ?)"
            )
            .bind(&access_token)
            .bind(&refresh_token)
            .bind(expires_at.to_rfc3339())
            .execute(pool.inner())
            .await {
                Ok(_) => Redirect::to("/auth/hh/callback?success=true"),
                Err(e) => Redirect::to(format!("/auth/hh/callback?error=db_error&error_description={}", e)),
            }
        }
        Err(e) => Redirect::to(format!("/auth/hh/callback?error=token_exchange&error_description={}", e)),
    }
}

#[get("/jobs/auth/hh")]
pub async fn start_hh_auth(_auth: AuthGuard) -> Json<ApiResponse<String>> {
    let client_id = std::env::var("HH_CLIENT_ID").unwrap_or_default();
    let redirect_uri = std::env::var("HH_REDIRECT_URI").unwrap_or_default();

    let url = HHClient::get_auth_url(&client_id, &redirect_uri);
    Json(ApiResponse::success(url))
}
