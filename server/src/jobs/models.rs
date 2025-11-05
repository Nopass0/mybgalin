use serde::{Deserialize, Serialize};

// Database models
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct JobVacancy {
    pub id: i64,
    pub hh_vacancy_id: String,
    pub title: String,
    pub company: String,
    pub salary_from: Option<i64>,
    pub salary_to: Option<i64>,
    pub salary_currency: Option<String>,
    pub description: Option<String>,
    pub url: String,
    pub status: String,
    pub found_at: String,
    pub applied_at: Option<String>,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct JobResponse {
    pub id: i64,
    pub vacancy_id: i64,
    pub hh_negotiation_id: Option<String>,
    pub cover_letter: String,
    pub status: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct JobSearchSettings {
    pub id: i64,
    pub is_active: bool,
    pub search_text: Option<String>,
    pub area_ids: Option<String>,
    pub experience: Option<String>,
    pub schedule: Option<String>,
    pub employment: Option<String>,
    pub salary_from: Option<i64>,
    pub only_with_salary: bool,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct HHToken {
    pub id: i64,
    pub access_token: String,
    pub refresh_token: String,
    pub expires_at: String,
    pub created_at: String,
}

// Request DTOs
#[derive(Debug, Deserialize)]
pub struct UpdateSearchSettingsRequest {
    pub search_text: Option<String>,
    pub area_ids: Option<Vec<String>>,
    pub experience: Option<String>,
    pub schedule: Option<String>,
    pub employment: Option<String>,
    pub salary_from: Option<i64>,
    pub only_with_salary: Option<bool>,
}

// Response DTOs
#[derive(Debug, Serialize)]
pub struct VacancyWithResponse {
    #[serde(flatten)]
    pub vacancy: JobVacancy,
    pub response: Option<JobResponse>,
}

#[derive(Debug, Serialize)]
pub struct JobStats {
    pub total_found: i64,
    pub total_applied: i64,
    pub invited: i64,
    pub rejected: i64,
    pub in_progress: i64,
}

#[derive(Debug, Serialize)]
pub struct SearchStatus {
    pub is_active: bool,
    pub is_authorized: bool,
    pub last_search: Option<String>,
    pub settings: Option<JobSearchSettings>,
}
