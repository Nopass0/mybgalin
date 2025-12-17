use crate::db::DbPool;
use crate::guards::AuthGuard;
use crate::jobs::*;
use crate::models::ApiResponse;
use rocket::serde::json::Json;
use rocket::{get, post, put, State};
use rocket::response::Redirect;

// Helper to get SQLite pool from DbPool (jobs is SQLite-only feature)
fn get_sqlite_pool(pool: &DbPool) -> Option<&sqlx::SqlitePool> {
    match pool {
        DbPool::Sqlite(p) => Some(p),
        DbPool::Postgres(_) => None,
    }
}

// ==================
// SEARCH CONTROL
// ==================

#[post("/jobs/search/start")]
pub async fn start_job_search(
    _auth: AuthGuard,
    scheduler: &State<MaybeJobScheduler>,
) -> Json<ApiResponse<String>> {
    match scheduler.get() {
        Some(s) => {
            s.start();
            Json(ApiResponse::success("Job search started".to_string()))
        }
        None => Json(ApiResponse::error("Job search not available (PostgreSQL mode)".to_string())),
    }
}

#[post("/jobs/search/stop")]
pub async fn stop_job_search(
    _auth: AuthGuard,
    scheduler: &State<MaybeJobScheduler>,
) -> Json<ApiResponse<String>> {
    match scheduler.get() {
        Some(s) => {
            s.stop();
            Json(ApiResponse::success("Job search stopped".to_string()))
        }
        None => Json(ApiResponse::error("Job search not available (PostgreSQL mode)".to_string())),
    }
}

#[get("/jobs/search/status")]
pub async fn get_search_status(
    _auth: AuthGuard,
    scheduler: &State<MaybeJobScheduler>,
    pool: &State<DbPool>,
) -> Json<ApiResponse<SearchStatus>> {
    let sqlite_pool = match get_sqlite_pool(pool.inner()) {
        Some(p) => p,
        None => return Json(ApiResponse::error("Job search not available (PostgreSQL mode)".to_string())),
    };
    let is_active = scheduler.get().map(|s| s.is_running()).unwrap_or(false);

    // Check if HH token exists
    let has_token: bool = sqlx::query_scalar("SELECT COUNT(*) > 0 FROM hh_tokens")
        .fetch_one(sqlite_pool)
        .await
        .unwrap_or(false);

    // Get settings
    let settings: Option<JobSearchSettings> = sqlx::query_as(
        "SELECT id, is_active, search_text, area_ids, experience, schedule, employment, salary_from, only_with_salary, updated_at, auto_tags_enabled, search_tags_json, min_ai_score, auto_apply_enabled, search_interval_minutes
         FROM job_search_settings ORDER BY id DESC LIMIT 1"
    )
    .fetch_optional(sqlite_pool)
    .await
    .unwrap_or(None);

    // Get active search tags
    let search_tags: Vec<JobSearchTag> = sqlx::query_as(
        "SELECT id, tag_type, value, is_active, search_count, found_count, applied_count, created_at
         FROM job_search_tags WHERE is_active = 1 ORDER BY applied_count DESC"
    )
    .fetch_all(sqlite_pool)
    .await
    .unwrap_or_default();

    // Calculate next search time
    let interval_minutes = settings.as_ref()
        .and_then(|s| s.search_interval_minutes)
        .unwrap_or(60);

    let last_search: Option<(String,)> = sqlx::query_as(
        "SELECT found_at FROM job_vacancies ORDER BY found_at DESC LIMIT 1"
    )
    .fetch_optional(sqlite_pool)
    .await
    .unwrap_or(None);

    let next_search_at = last_search.as_ref().map(|(ts,)| {
        chrono::DateTime::parse_from_rfc3339(ts)
            .ok()
            .map(|dt| (dt + chrono::Duration::minutes(interval_minutes as i64)).to_rfc3339())
    }).flatten();

    Json(ApiResponse::success(SearchStatus {
        is_active,
        is_authorized: has_token,
        last_search: last_search.map(|(s,)| s),
        settings,
        search_tags,
        next_search_at,
    }))
}

#[put("/jobs/search/settings", data = "<request>")]
pub async fn update_search_settings(
    _auth: AuthGuard,
    request: Json<UpdateSearchSettingsRequest>,
    pool: &State<DbPool>,
) -> Json<ApiResponse<JobSearchSettings>> {
    let sqlite_pool = match get_sqlite_pool(pool.inner()) {
        Some(p) => p,
        None => return Json(ApiResponse::error("Job search not available (PostgreSQL mode)".to_string())),
    };
    let area_ids_json = request.area_ids.as_ref().map(|ids| serde_json::to_string(ids).unwrap());

    // Upsert settings with new AI fields
    sqlx::query(
        "INSERT INTO job_search_settings (id, is_active, search_text, area_ids, experience, schedule, employment, salary_from, only_with_salary, auto_tags_enabled, min_ai_score, auto_apply_enabled, search_interval_minutes, updated_at)
         VALUES (1, FALSE, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, datetime('now'))
         ON CONFLICT(id) DO UPDATE SET
         search_text = excluded.search_text,
         area_ids = excluded.area_ids,
         experience = excluded.experience,
         schedule = excluded.schedule,
         employment = excluded.employment,
         salary_from = excluded.salary_from,
         only_with_salary = excluded.only_with_salary,
         auto_tags_enabled = excluded.auto_tags_enabled,
         min_ai_score = excluded.min_ai_score,
         auto_apply_enabled = excluded.auto_apply_enabled,
         search_interval_minutes = excluded.search_interval_minutes,
         updated_at = datetime('now')"
    )
    .bind(&request.search_text)
    .bind(&area_ids_json)
    .bind(&request.experience)
    .bind(&request.schedule)
    .bind(&request.employment)
    .bind(&request.salary_from)
    .bind(request.only_with_salary.unwrap_or(false))
    .bind(request.auto_tags_enabled.unwrap_or(true))
    .bind(request.min_ai_score.unwrap_or(50))
    .bind(request.auto_apply_enabled.unwrap_or(true))
    .bind(request.search_interval_minutes.unwrap_or(60))
    .execute(sqlite_pool)
    .await
    .ok();

    let settings: JobSearchSettings = sqlx::query_as(
        "SELECT id, is_active, search_text, area_ids, experience, schedule, employment, salary_from, only_with_salary, updated_at, auto_tags_enabled, search_tags_json, min_ai_score, auto_apply_enabled, search_interval_minutes
         FROM job_search_settings WHERE id = 1"
    )
    .fetch_one(sqlite_pool)
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
    pool: &State<DbPool>,
) -> Json<ApiResponse<Vec<VacancyWithResponse>>> {
    let sqlite_pool = match get_sqlite_pool(pool.inner()) {
        Some(p) => p,
        None => return Json(ApiResponse::error("Job search not available (PostgreSQL mode)".to_string())),
    };
    let vacancies: Vec<JobVacancy> = sqlx::query_as(
        "SELECT id, hh_vacancy_id, title, company, salary_from, salary_to, salary_currency, description, url, status, found_at, applied_at, updated_at, ai_score, ai_recommendation, ai_priority, ai_match_reasons, ai_concerns, ai_salary_assessment
         FROM job_vacancies ORDER BY COALESCE(ai_priority, 0) DESC, found_at DESC LIMIT 200"
    )
    .fetch_all(sqlite_pool)
    .await
    .unwrap_or_default();

    let mut result = Vec::new();
    for vacancy in vacancies {
        let response: Option<JobResponse> = sqlx::query_as(
            "SELECT id, vacancy_id, hh_negotiation_id, cover_letter, status, created_at, updated_at
             FROM job_responses WHERE vacancy_id = $1 LIMIT 1"
        )
        .bind(vacancy.id)
        .fetch_optional(sqlite_pool)
        .await
        .unwrap_or(None);

        let chat: Option<JobChat> = sqlx::query_as(
            "SELECT id, vacancy_id, hh_chat_id, employer_name, is_bot, is_human_confirmed, telegram_invited, last_message_at, unread_count, created_at, updated_at
             FROM job_chats_v2 WHERE vacancy_id = $1 LIMIT 1"
        )
        .bind(vacancy.id)
        .fetch_optional(sqlite_pool)
        .await
        .unwrap_or(None);

        result.push(VacancyWithResponse { vacancy, response, chat });
    }

    Json(ApiResponse::success(result))
}

#[get("/jobs/vacancies/<id>")]
pub async fn get_vacancy_details(
    _auth: AuthGuard,
    id: i32,
    pool: &State<DbPool>,
) -> Json<ApiResponse<VacancyWithResponse>> {
    let sqlite_pool = match get_sqlite_pool(pool.inner()) {
        Some(p) => p,
        None => return Json(ApiResponse::error("Job search not available (PostgreSQL mode)".to_string())),
    };
    let vacancy: Option<JobVacancy> = sqlx::query_as(
        "SELECT id, hh_vacancy_id, title, company, salary_from, salary_to, salary_currency, description, url, status, found_at, applied_at, updated_at, ai_score, ai_recommendation, ai_priority, ai_match_reasons, ai_concerns, ai_salary_assessment
         FROM job_vacancies WHERE id = $1"
    )
    .bind(id)
    .fetch_optional(sqlite_pool)
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
    .fetch_optional(sqlite_pool)
    .await
    .unwrap_or(None);

    let chat: Option<JobChat> = sqlx::query_as(
        "SELECT id, vacancy_id, hh_chat_id, employer_name, is_bot, is_human_confirmed, telegram_invited, last_message_at, unread_count, created_at, updated_at
         FROM job_chats_v2 WHERE vacancy_id = $1 LIMIT 1"
    )
    .bind(id)
    .fetch_optional(sqlite_pool)
    .await
    .unwrap_or(None);

    Json(ApiResponse::success(VacancyWithResponse { vacancy, response, chat }))
}

#[get("/jobs/vacancies/status/<status>")]
pub async fn get_vacancies_by_status(
    _auth: AuthGuard,
    status: &str,
    pool: &State<DbPool>,
) -> Json<ApiResponse<Vec<VacancyWithResponse>>> {
    let sqlite_pool = match get_sqlite_pool(pool.inner()) {
        Some(p) => p,
        None => return Json(ApiResponse::error("Job search not available (PostgreSQL mode)".to_string())),
    };
    let vacancies: Vec<JobVacancy> = sqlx::query_as(
        "SELECT id, hh_vacancy_id, title, company, salary_from, salary_to, salary_currency, description, url, status, found_at, applied_at, updated_at, ai_score, ai_recommendation, ai_priority, ai_match_reasons, ai_concerns, ai_salary_assessment
         FROM job_vacancies WHERE status = $1 ORDER BY COALESCE(ai_priority, 0) DESC, found_at DESC"
    )
    .bind(status)
    .fetch_all(sqlite_pool)
    .await
    .unwrap_or_default();

    let mut result = Vec::new();
    for vacancy in vacancies {
        let response: Option<JobResponse> = sqlx::query_as(
            "SELECT id, vacancy_id, hh_negotiation_id, cover_letter, status, created_at, updated_at
             FROM job_responses WHERE vacancy_id = $1 LIMIT 1"
        )
        .bind(vacancy.id)
        .fetch_optional(sqlite_pool)
        .await
        .unwrap_or(None);

        let chat: Option<JobChat> = sqlx::query_as(
            "SELECT id, vacancy_id, hh_chat_id, employer_name, is_bot, is_human_confirmed, telegram_invited, last_message_at, unread_count, created_at, updated_at
             FROM job_chats_v2 WHERE vacancy_id = $1 LIMIT 1"
        )
        .bind(vacancy.id)
        .fetch_optional(sqlite_pool)
        .await
        .unwrap_or(None);

        result.push(VacancyWithResponse { vacancy, response, chat });
    }

    Json(ApiResponse::success(result))
}

#[get("/jobs/stats")]
pub async fn get_job_stats(
    _auth: AuthGuard,
    pool: &State<DbPool>,
) -> Json<ApiResponse<JobStats>> {
    let sqlite_pool = match get_sqlite_pool(pool.inner()) {
        Some(p) => p,
        None => return Json(ApiResponse::error("Job search not available (PostgreSQL mode)".to_string())),
    };
    let total_found: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM job_vacancies")
        .fetch_one(sqlite_pool)
        .await
        .unwrap_or(0);

    let total_applied: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM job_vacancies WHERE status IN ('applied', 'viewed', 'invited', 'rejected')")
        .fetch_one(sqlite_pool)
        .await
        .unwrap_or(0);

    let invited: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM job_vacancies WHERE status = 'invited'")
        .fetch_one(sqlite_pool)
        .await
        .unwrap_or(0);

    let rejected: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM job_vacancies WHERE status = 'rejected'")
        .fetch_one(sqlite_pool)
        .await
        .unwrap_or(0);

    let in_progress: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM job_vacancies WHERE status IN ('applied', 'viewed')")
        .fetch_one(sqlite_pool)
        .await
        .unwrap_or(0);

    // Extended stats
    let avg_ai_score: Option<f64> = sqlx::query_scalar("SELECT AVG(ai_score) FROM job_vacancies WHERE ai_score IS NOT NULL")
        .fetch_one(sqlite_pool)
        .await
        .unwrap_or(None);

    let response_rate: Option<f64> = if total_applied > 0 {
        Some(((invited + rejected) as f64 / total_applied as f64) * 100.0)
    } else {
        None
    };

    let active_chats: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM job_chats_v2 c JOIN job_vacancies v ON c.vacancy_id = v.id WHERE v.status IN ('applied', 'viewed', 'invited')")
        .fetch_one(sqlite_pool)
        .await
        .unwrap_or(0);

    let telegram_invites_sent: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM job_chats_v2 WHERE telegram_invited = 1")
        .fetch_one(sqlite_pool)
        .await
        .unwrap_or(0);

    let today = chrono::Local::now().format("%Y-%m-%d").to_string();
    let today_applications: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM job_vacancies WHERE date(applied_at) = ?")
        .bind(&today)
        .fetch_one(sqlite_pool)
        .await
        .unwrap_or(0);

    let week_ago = (chrono::Local::now() - chrono::Duration::days(7)).format("%Y-%m-%d").to_string();
    let this_week_applications: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM job_vacancies WHERE date(applied_at) >= ?")
        .bind(&week_ago)
        .fetch_one(sqlite_pool)
        .await
        .unwrap_or(0);

    Json(ApiResponse::success(JobStats {
        total_found,
        total_applied,
        invited,
        rejected,
        in_progress,
        avg_ai_score,
        response_rate,
        active_chats,
        telegram_invites_sent,
        today_applications,
        this_week_applications,
    }))
}

#[post("/jobs/vacancies/<id>/ignore")]
pub async fn ignore_vacancy(
    _auth: AuthGuard,
    id: i32,
    pool: &State<DbPool>,
) -> Json<ApiResponse<String>> {
    let sqlite_pool = match get_sqlite_pool(pool.inner()) {
        Some(p) => p,
        None => return Json(ApiResponse::error("Job search not available (PostgreSQL mode)".to_string())),
    };
    sqlx::query("UPDATE job_vacancies SET status = 'ignored' WHERE id = $1")
        .bind(id)
        .execute(sqlite_pool)
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
    pool: &State<DbPool>,
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

    let sqlite_pool = match get_sqlite_pool(pool.inner()) {
        Some(p) => p,
        None => return Redirect::to("/auth/hh/callback?error=db_error&error_description=Job search not available (PostgreSQL mode)"),
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
            .execute(sqlite_pool)
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

// ==================
// CHATS & MESSAGES
// ==================

#[get("/jobs/chats")]
pub async fn get_chats(
    _auth: AuthGuard,
    pool: &State<DbPool>,
) -> Json<ApiResponse<Vec<ChatWithMessages>>> {
    let sqlite_pool = match get_sqlite_pool(pool.inner()) {
        Some(p) => p,
        None => return Json(ApiResponse::error("Job search not available (PostgreSQL mode)".to_string())),
    };
    let chats: Vec<(i32, i32, String, Option<String>, bool, bool, bool, Option<String>, i32, String, String, String, String)> = sqlx::query_as(
        r#"SELECT c.id, c.vacancy_id, c.hh_chat_id, c.employer_name, c.is_bot, c.is_human_confirmed, c.telegram_invited, c.last_message_at, c.unread_count, c.created_at, c.updated_at, v.title, v.company
           FROM job_chats_v2 c
           JOIN job_vacancies v ON c.vacancy_id = v.id
           ORDER BY c.last_message_at DESC NULLS LAST"#
    )
    .fetch_all(sqlite_pool)
    .await
    .unwrap_or_default();

    let mut result = Vec::new();
    for (id, vacancy_id, hh_chat_id, employer_name, is_bot, is_human_confirmed, telegram_invited, last_message_at, unread_count, created_at, updated_at, vacancy_title, company) in chats {
        let messages: Vec<JobChatMessage> = sqlx::query_as(
            "SELECT id, chat_id, hh_message_id, author_type, text, is_auto_response, ai_sentiment, ai_intent, created_at
             FROM job_chat_messages WHERE chat_id = $1 ORDER BY created_at ASC"
        )
        .bind(id)
        .fetch_all(sqlite_pool)
        .await
        .unwrap_or_default();

        result.push(ChatWithMessages {
            chat: JobChat {
                id,
                vacancy_id,
                hh_chat_id,
                employer_name,
                is_bot,
                is_human_confirmed,
                telegram_invited,
                last_message_at,
                unread_count,
                created_at,
                updated_at,
            },
            messages,
            vacancy_title,
            company,
        });
    }

    Json(ApiResponse::success(result))
}

#[get("/jobs/chats/<id>/messages")]
pub async fn get_chat_messages(
    _auth: AuthGuard,
    id: i32,
    pool: &State<DbPool>,
) -> Json<ApiResponse<Vec<JobChatMessage>>> {
    let sqlite_pool = match get_sqlite_pool(pool.inner()) {
        Some(p) => p,
        None => return Json(ApiResponse::error("Job search not available (PostgreSQL mode)".to_string())),
    };
    let messages: Vec<JobChatMessage> = sqlx::query_as(
        "SELECT id, chat_id, hh_message_id, author_type, text, is_auto_response, ai_sentiment, ai_intent, created_at
         FROM job_chat_messages WHERE chat_id = $1 ORDER BY created_at ASC"
    )
    .bind(id)
    .fetch_all(sqlite_pool)
    .await
    .unwrap_or_default();

    // Mark as read
    sqlx::query("UPDATE job_chats_v2 SET unread_count = 0 WHERE id = $1")
        .bind(id)
        .execute(sqlite_pool)
        .await
        .ok();

    Json(ApiResponse::success(messages))
}

// ==================
// SEARCH TAGS
// ==================

#[get("/jobs/tags")]
pub async fn get_tags(
    _auth: AuthGuard,
    pool: &State<DbPool>,
) -> Json<ApiResponse<Vec<JobSearchTag>>> {
    let sqlite_pool = match get_sqlite_pool(pool.inner()) {
        Some(p) => p,
        None => return Json(ApiResponse::error("Job search not available (PostgreSQL mode)".to_string())),
    };
    let tags: Vec<JobSearchTag> = sqlx::query_as(
        "SELECT id, tag_type, value, is_active, search_count, found_count, applied_count, created_at
         FROM job_search_tags ORDER BY applied_count DESC, found_count DESC"
    )
    .fetch_all(sqlite_pool)
    .await
    .unwrap_or_default();

    Json(ApiResponse::success(tags))
}

#[post("/jobs/tags/generate")]
pub async fn generate_tags(
    _auth: AuthGuard,
    pool: &State<DbPool>,
) -> Json<ApiResponse<AITagsResponse>> {
    let sqlite_pool = match get_sqlite_pool(pool.inner()) {
        Some(p) => p,
        None => return Json(ApiResponse::error("Job search not available (PostgreSQL mode)".to_string())),
    };
    // Get resume text
    let about: Option<(String,)> = sqlx::query_as(
        "SELECT description FROM portfolio_about ORDER BY id DESC LIMIT 1"
    )
    .fetch_optional(sqlite_pool)
    .await
    .unwrap_or(None);

    let resume_text = match about {
        Some((desc,)) => desc,
        None => return Json(ApiResponse::error("No resume found".to_string())),
    };

    // Get AI client
    let api_key = std::env::var("OPENROUTER_API_KEY").unwrap_or_default();
    let model = std::env::var("AI_MODEL").unwrap_or_else(|_| "google/gemini-2.0-flash-001".to_string());
    let ai_client = AIClient::new(api_key, model);

    match ai_client.generate_search_tags(&resume_text).await {
        Ok(tags) => {
            // Save tags to DB
            for tag in &tags.primary_tags {
                sqlx::query("INSERT OR IGNORE INTO job_search_tags (tag_type, value) VALUES ('primary', ?)")
                    .bind(tag)
                    .execute(sqlite_pool)
                    .await
                    .ok();
            }
            for tag in &tags.skill_tags {
                sqlx::query("INSERT OR IGNORE INTO job_search_tags (tag_type, value) VALUES ('skill', ?)")
                    .bind(tag)
                    .execute(sqlite_pool)
                    .await
                    .ok();
            }
            for tag in &tags.industry_tags {
                sqlx::query("INSERT OR IGNORE INTO job_search_tags (tag_type, value) VALUES ('industry', ?)")
                    .bind(tag)
                    .execute(sqlite_pool)
                    .await
                    .ok();
            }
            for tag in &tags.suggested_queries {
                sqlx::query("INSERT OR IGNORE INTO job_search_tags (tag_type, value) VALUES ('query', ?)")
                    .bind(tag)
                    .execute(sqlite_pool)
                    .await
                    .ok();
            }

            Json(ApiResponse::success(AITagsResponse {
                primary_tags: tags.primary_tags,
                skill_tags: tags.skill_tags,
                industry_tags: tags.industry_tags,
                suggested_queries: tags.suggested_queries,
            }))
        }
        Err(e) => Json(ApiResponse::error(e)),
    }
}

#[post("/jobs/tags/<id>/toggle")]
pub async fn toggle_tag(
    _auth: AuthGuard,
    id: i32,
    pool: &State<DbPool>,
) -> Json<ApiResponse<String>> {
    let sqlite_pool = match get_sqlite_pool(pool.inner()) {
        Some(p) => p,
        None => return Json(ApiResponse::error("Job search not available (PostgreSQL mode)".to_string())),
    };
    sqlx::query("UPDATE job_search_tags SET is_active = NOT is_active WHERE id = $1")
        .bind(id)
        .execute(sqlite_pool)
        .await
        .ok();

    Json(ApiResponse::success("Tag toggled".to_string()))
}

#[rocket::delete("/jobs/tags/<id>")]
pub async fn delete_tag(
    _auth: AuthGuard,
    id: i32,
    pool: &State<DbPool>,
) -> Json<ApiResponse<String>> {
    let sqlite_pool = match get_sqlite_pool(pool.inner()) {
        Some(p) => p,
        None => return Json(ApiResponse::error("Job search not available (PostgreSQL mode)".to_string())),
    };
    sqlx::query("DELETE FROM job_search_tags WHERE id = $1")
        .bind(id)
        .execute(sqlite_pool)
        .await
        .ok();

    Json(ApiResponse::success("Tag deleted".to_string()))
}

// ==================
// ACTIVITY LOG
// ==================

#[get("/jobs/activity?<limit>")]
pub async fn get_activity_log(
    _auth: AuthGuard,
    limit: Option<i32>,
    pool: &State<DbPool>,
) -> Json<ApiResponse<Vec<ActivityLogEntry>>> {
    let sqlite_pool = match get_sqlite_pool(pool.inner()) {
        Some(p) => p,
        None => return Json(ApiResponse::error("Job search not available (PostgreSQL mode)".to_string())),
    };
    let limit = limit.unwrap_or(50);

    let activities: Vec<(i32, String, String, Option<String>, String, Option<i32>)> = sqlx::query_as(
        r#"SELECT a.id, a.event_type, a.description, a.metadata, a.created_at, a.vacancy_id
           FROM job_activity_log a
           ORDER BY a.created_at DESC
           LIMIT ?"#
    )
    .bind(limit)
    .fetch_all(sqlite_pool)
    .await
    .unwrap_or_default();

    let mut result = Vec::new();
    for (id, event_type, description, _metadata, created_at, vacancy_id) in activities {
        let (vacancy_title, company) = if let Some(vid) = vacancy_id {
            let v: Option<(String, String)> = sqlx::query_as(
                "SELECT title, company FROM job_vacancies WHERE id = ?"
            )
            .bind(vid)
            .fetch_optional(sqlite_pool)
            .await
            .unwrap_or(None);
            v.map(|(t, c)| (Some(t), Some(c))).unwrap_or((None, None))
        } else {
            (None, None)
        };

        result.push(ActivityLogEntry {
            id,
            event_type,
            description,
            vacancy_title,
            company,
            created_at,
        });
    }

    Json(ApiResponse::success(result))
}

// ==================
// DAILY STATS
// ==================

#[derive(serde::Serialize, sqlx::FromRow)]
pub struct DailyStats {
    pub date: String,
    pub searches_count: i32,
    pub vacancies_found: i32,
    pub applications_sent: i32,
    pub invitations_received: i32,
    pub rejections_received: i32,
    pub messages_sent: i32,
    pub messages_received: i32,
    pub telegram_invites_sent: i32,
    pub avg_ai_score: Option<f64>,
}

#[get("/jobs/stats/daily?<days>")]
pub async fn get_daily_stats(
    _auth: AuthGuard,
    days: Option<i32>,
    pool: &State<DbPool>,
) -> Json<ApiResponse<Vec<DailyStats>>> {
    let sqlite_pool = match get_sqlite_pool(pool.inner()) {
        Some(p) => p,
        None => return Json(ApiResponse::error("Job search not available (PostgreSQL mode)".to_string())),
    };
    let days = days.unwrap_or(30);
    let start_date = (chrono::Local::now() - chrono::Duration::days(days as i64)).format("%Y-%m-%d").to_string();

    let stats: Vec<DailyStats> = sqlx::query_as(
        r#"SELECT date, searches_count, vacancies_found, applications_sent, invitations_received, rejections_received, messages_sent, messages_received, telegram_invites_sent, avg_ai_score
           FROM job_search_stats
           WHERE date >= ?
           ORDER BY date ASC"#
    )
    .bind(&start_date)
    .fetch_all(sqlite_pool)
    .await
    .unwrap_or_default();

    Json(ApiResponse::success(stats))
}
