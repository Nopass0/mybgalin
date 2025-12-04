use serde::{Deserialize, Serialize};

// Database models
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct JobVacancy {
    pub id: i32,
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
    // AI оценка вакансии
    pub ai_score: Option<i32>,
    pub ai_recommendation: Option<String>,
    pub ai_priority: Option<i32>,
    pub ai_match_reasons: Option<String>,  // JSON array
    pub ai_concerns: Option<String>,       // JSON array
    pub ai_salary_assessment: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct JobResponse {
    pub id: i32,
    pub vacancy_id: i32,
    pub hh_negotiation_id: Option<String>,
    pub cover_letter: String,
    pub status: String,
    pub created_at: String,
    pub updated_at: String,
}

/// Чат с работодателем
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct JobChat {
    pub id: i32,
    pub vacancy_id: i32,
    pub hh_chat_id: String,
    pub employer_name: Option<String>,
    pub is_bot: bool,
    pub is_human_confirmed: bool,
    pub telegram_invited: bool,
    pub last_message_at: Option<String>,
    pub unread_count: i32,
    pub created_at: String,
    pub updated_at: String,
}

/// Сообщение в чате
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct JobChatMessage {
    pub id: i32,
    pub chat_id: i32,
    pub hh_message_id: Option<String>,
    pub author_type: String,  // applicant / employer
    pub text: String,
    pub is_auto_response: bool,
    pub ai_sentiment: Option<String>,
    pub ai_intent: Option<String>,
    pub created_at: String,
}

/// Поисковые теги (генерируются AI)
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct JobSearchTag {
    pub id: i32,
    pub tag_type: String,   // primary / skill / industry / query
    pub value: String,
    pub is_active: bool,
    pub search_count: i32,
    pub found_count: i32,
    pub applied_count: i32,
    pub created_at: String,
}

/// Лог событий поиска работы
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct JobActivityLog {
    pub id: i32,
    pub event_type: String,  // search / apply / response / chat / invite
    pub vacancy_id: Option<i32>,
    pub description: String,
    pub metadata: Option<String>,  // JSON
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct JobSearchSettings {
    pub id: i32,
    pub is_active: bool,
    pub search_text: Option<String>,
    pub area_ids: Option<String>,
    pub experience: Option<String>,
    pub schedule: Option<String>,
    pub employment: Option<String>,
    pub salary_from: Option<i64>,
    pub only_with_salary: bool,
    pub updated_at: String,
    // Новые поля для автоподбора тегов
    pub auto_tags_enabled: Option<bool>,
    pub search_tags_json: Option<String>,
    pub min_ai_score: Option<i32>,
    pub auto_apply_enabled: Option<bool>,
    pub search_interval_minutes: Option<i32>,
}

#[allow(dead_code)]
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct HHToken {
    pub id: i32,
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
    pub auto_tags_enabled: Option<bool>,
    pub min_ai_score: Option<i32>,
    pub auto_apply_enabled: Option<bool>,
    pub search_interval_minutes: Option<i32>,
}

#[derive(Debug, Deserialize)]
pub struct GenerateTagsRequest {
    pub resume_text: Option<String>,  // if None - use from portfolio
}

#[derive(Debug, Deserialize)]
pub struct SendMessageRequest {
    pub chat_id: i32,
    pub text: String,
}

// Response DTOs
#[derive(Debug, Serialize)]
pub struct VacancyWithResponse {
    #[serde(flatten)]
    pub vacancy: JobVacancy,
    pub response: Option<JobResponse>,
    pub chat: Option<JobChat>,
}

#[derive(Debug, Serialize)]
pub struct JobStats {
    pub total_found: i64,
    pub total_applied: i64,
    pub invited: i64,
    pub rejected: i64,
    pub in_progress: i64,
    // Расширенная статистика
    pub avg_ai_score: Option<f64>,
    pub response_rate: Option<f64>,
    pub active_chats: i64,
    pub telegram_invites_sent: i64,
    pub today_applications: i64,
    pub this_week_applications: i64,
}

#[derive(Debug, Serialize)]
pub struct SearchStatus {
    pub is_active: bool,
    pub is_authorized: bool,
    pub last_search: Option<String>,
    pub settings: Option<JobSearchSettings>,
    pub search_tags: Vec<JobSearchTag>,
    pub next_search_at: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct ChatWithMessages {
    pub chat: JobChat,
    pub messages: Vec<JobChatMessage>,
    pub vacancy_title: String,
    pub company: String,
}

#[derive(Debug, Serialize)]
pub struct ActivityLogEntry {
    pub id: i32,
    pub event_type: String,
    pub description: String,
    pub vacancy_title: Option<String>,
    pub company: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Serialize)]
pub struct AITagsResponse {
    pub primary_tags: Vec<String>,
    pub skill_tags: Vec<String>,
    pub industry_tags: Vec<String>,
    pub suggested_queries: Vec<String>,
}
