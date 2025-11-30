use serde::{Deserialize, Serialize};

// Database models
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct PortfolioAbout {
    pub id: i64,
    pub description: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct PortfolioExperience {
    pub id: i64,
    pub title: String,
    pub company: String,
    pub date_from: String,
    pub date_to: Option<String>,
    pub description: String,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct PortfolioSkill {
    pub id: i64,
    pub name: String,
    pub category: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct PortfolioContact {
    pub id: i64,
    #[serde(rename = "type")]
    pub contact_type: String,
    pub value: String,
    pub label: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct PortfolioCase {
    pub id: i64,
    pub title: String,
    pub description: String,
    pub main_image: String,
    pub website_url: Option<String>,
    pub created_at: String,
}

#[allow(dead_code)]
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct PortfolioCaseImage {
    pub id: i64,
    pub case_id: i64,
    pub image_url: String,
    pub order_index: i64,
}

// Request DTOs
#[derive(Debug, Deserialize)]
pub struct CreateAboutRequest {
    pub description: String,
}

#[derive(Debug, Deserialize)]
pub struct UpdateAboutRequest {
    pub description: String,
}

#[derive(Debug, Deserialize)]
pub struct CreateExperienceRequest {
    pub title: String,
    pub company: String,
    pub date_from: String,
    pub date_to: Option<String>,
    pub description: String,
}

#[derive(Debug, Deserialize)]
pub struct UpdateExperienceRequest {
    pub title: String,
    pub company: String,
    pub date_from: String,
    pub date_to: Option<String>,
    pub description: String,
}

#[derive(Debug, Deserialize)]
pub struct CreateSkillRequest {
    pub name: String,
    pub category: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateSkillRequest {
    pub name: String,
    pub category: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateContactRequest {
    #[serde(rename = "type")]
    pub contact_type: String,
    pub value: String,
    pub label: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateContactRequest {
    #[serde(rename = "type")]
    pub contact_type: String,
    pub value: String,
    pub label: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateCaseRequest {
    pub title: String,
    pub description: String,
    pub main_image: String,
    pub website_url: Option<String>,
    pub images: Vec<String>,
}

#[allow(dead_code)]
#[derive(Debug, Deserialize)]
pub struct UpdateCaseRequest {
    pub title: String,
    pub description: String,
    pub main_image: String,
    pub website_url: Option<String>,
    pub images: Vec<String>,
}

// Response DTOs
#[derive(Debug, Serialize)]
pub struct PortfolioCaseWithImages {
    pub id: i64,
    pub title: String,
    pub description: String,
    pub main_image: String,
    pub website_url: Option<String>,
    pub images: Vec<String>,
    pub created_at: String,
}

#[derive(Debug, Serialize)]
pub struct FullPortfolio {
    pub about: Option<String>,
    pub experience: Vec<PortfolioExperience>,
    pub skills: Vec<PortfolioSkill>,
    pub contacts: Vec<PortfolioContact>,
    pub cases: Vec<PortfolioCaseWithImages>,
}
