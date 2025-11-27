use crate::guards::AuthGuard;
use crate::jobs::ai::AIClient;
use crate::jobs::hh_api::HHClient;
use crate::models::ApiResponse;
use crate::portfolio::*;
use rocket::serde::json::Json;
use rocket::{delete, get, post, put, State};
use serde::{Deserialize, Serialize};
use sqlx::SqlitePool;

// ===================
// ABOUT/DESCRIPTION
// ===================

#[post("/portfolio/about", data = "<request>")]
pub async fn create_about(
    _auth: AuthGuard,
    request: Json<CreateAboutRequest>,
    pool: &State<SqlitePool>,
) -> Json<ApiResponse<PortfolioAbout>> {
    // Delete existing about
    let _ = sqlx::query("DELETE FROM portfolio_about")
        .execute(pool.inner())
        .await;

    match sqlx::query_as::<_, PortfolioAbout>(
        "INSERT INTO portfolio_about (description, updated_at) VALUES ($1, datetime('now')) RETURNING id, description, updated_at",
    )
    .bind(&request.description)
    .fetch_one(pool.inner())
    .await
    {
        Ok(about) => Json(ApiResponse::success(about)),
        Err(e) => Json(ApiResponse::error(format!("Error: {}", e))),
    }
}

#[put("/portfolio/about/<id>", data = "<request>")]
pub async fn update_about(
    _auth: AuthGuard,
    id: i64,
    request: Json<UpdateAboutRequest>,
    pool: &State<SqlitePool>,
) -> Json<ApiResponse<PortfolioAbout>> {
    match sqlx::query(
        "UPDATE portfolio_about SET description = $1, updated_at = datetime('now') WHERE id = $2",
    )
    .bind(&request.description)
    .bind(id)
    .execute(pool.inner())
    .await
    {
        Ok(_) => {
            let about = sqlx::query_as::<_, PortfolioAbout>(
                "SELECT id, description, updated_at FROM portfolio_about WHERE id = $1",
            )
            .bind(id)
            .fetch_one(pool.inner())
            .await;

            match about {
                Ok(about) => Json(ApiResponse::success(about)),
                Err(e) => Json(ApiResponse::error(format!("Error: {}", e))),
            }
        }
        Err(e) => Json(ApiResponse::error(format!("Error: {}", e))),
    }
}

#[delete("/portfolio/about")]
pub async fn delete_about(_auth: AuthGuard, pool: &State<SqlitePool>) -> Json<ApiResponse<String>> {
    match sqlx::query("DELETE FROM portfolio_about")
        .execute(pool.inner())
        .await
    {
        Ok(_) => Json(ApiResponse::success("About deleted".to_string())),
        Err(e) => Json(ApiResponse::error(format!("Error: {}", e))),
    }
}

// ===================
// EXPERIENCE
// ===================

#[post("/portfolio/experience", data = "<request>")]
pub async fn create_experience(
    _auth: AuthGuard,
    request: Json<CreateExperienceRequest>,
    pool: &State<SqlitePool>,
) -> Json<ApiResponse<PortfolioExperience>> {
    match sqlx::query_as::<_, PortfolioExperience>(
        "INSERT INTO portfolio_experience (title, company, date_from, date_to, description, created_at)
         VALUES ($1, $2, $3, $4, $5, datetime('now')) RETURNING id, title, company, date_from, date_to, description, created_at",
    )
    .bind(&request.title)
    .bind(&request.company)
    .bind(&request.date_from)
    .bind(&request.date_to)
    .bind(&request.description)
    .fetch_one(pool.inner())
    .await
    {
        Ok(exp) => Json(ApiResponse::success(exp)),
        Err(e) => Json(ApiResponse::error(format!("Error: {}", e))),
    }
}

#[put("/portfolio/experience/<id>", data = "<request>")]
pub async fn update_experience(
    _auth: AuthGuard,
    id: i64,
    request: Json<UpdateExperienceRequest>,
    pool: &State<SqlitePool>,
) -> Json<ApiResponse<PortfolioExperience>> {
    match sqlx::query(
        "UPDATE portfolio_experience
         SET title = $1, company = $2, date_from = $3, date_to = $4, description = $5
         WHERE id = $6",
    )
    .bind(&request.title)
    .bind(&request.company)
    .bind(&request.date_from)
    .bind(&request.date_to)
    .bind(&request.description)
    .bind(id)
    .execute(pool.inner())
    .await
    {
        Ok(_) => {
            let experience = sqlx::query_as::<_, PortfolioExperience>(
                "SELECT id, title, company, date_from, date_to, description, created_at
                 FROM portfolio_experience WHERE id = $1",
            )
            .bind(id)
            .fetch_one(pool.inner())
            .await;

            match experience {
                Ok(exp) => Json(ApiResponse::success(exp)),
                Err(e) => Json(ApiResponse::error(format!("Error: {}", e))),
            }
        }
        Err(e) => Json(ApiResponse::error(format!("Error: {}", e))),
    }
}

#[delete("/portfolio/experience/<id>")]
pub async fn delete_experience(
    _auth: AuthGuard,
    id: i64,
    pool: &State<SqlitePool>,
) -> Json<ApiResponse<String>> {
    match sqlx::query("DELETE FROM portfolio_experience WHERE id = $1")
        .bind(id)
        .execute(pool.inner())
        .await
    {
        Ok(_) => Json(ApiResponse::success("Experience deleted".to_string())),
        Err(e) => Json(ApiResponse::error(format!("Error: {}", e))),
    }
}

// ===================
// SKILLS
// ===================

#[post("/portfolio/skills", data = "<request>")]
pub async fn create_skill(
    _auth: AuthGuard,
    request: Json<CreateSkillRequest>,
    pool: &State<SqlitePool>,
) -> Json<ApiResponse<PortfolioSkill>> {
    match sqlx::query_as::<_, PortfolioSkill>(
        "INSERT INTO portfolio_skills (name, category, created_at) VALUES ($1, $2, datetime('now')) RETURNING id, name, category, created_at",
    )
    .bind(&request.name)
    .bind(&request.category)
    .fetch_one(pool.inner())
    .await
    {
        Ok(skill) => Json(ApiResponse::success(skill)),
        Err(e) => Json(ApiResponse::error(format!("Error: {}", e))),
    }
}

#[put("/portfolio/skills/<id>", data = "<request>")]
pub async fn update_skill(
    _auth: AuthGuard,
    id: i64,
    request: Json<UpdateSkillRequest>,
    pool: &State<SqlitePool>,
) -> Json<ApiResponse<PortfolioSkill>> {
    match sqlx::query("UPDATE portfolio_skills SET name = $1, category = $2 WHERE id = $3")
        .bind(&request.name)
        .bind(&request.category)
        .bind(id)
        .execute(pool.inner())
        .await
    {
        Ok(_) => {
            let skill = sqlx::query_as::<_, PortfolioSkill>(
                "SELECT id, name, category, created_at FROM portfolio_skills WHERE id = $1",
            )
            .bind(id)
            .fetch_one(pool.inner())
            .await;

            match skill {
                Ok(skill) => Json(ApiResponse::success(skill)),
                Err(e) => Json(ApiResponse::error(format!("Error: {}", e))),
            }
        }
        Err(e) => Json(ApiResponse::error(format!("Error: {}", e))),
    }
}

#[delete("/portfolio/skills/<id>")]
pub async fn delete_skill(_auth: AuthGuard, id: i64, pool: &State<SqlitePool>) -> Json<ApiResponse<String>> {
    match sqlx::query("DELETE FROM portfolio_skills WHERE id = $1")
        .bind(id)
        .execute(pool.inner())
        .await
    {
        Ok(_) => Json(ApiResponse::success("Skill deleted".to_string())),
        Err(e) => Json(ApiResponse::error(format!("Error: {}", e))),
    }
}

// ===================
// CONTACTS
// ===================

#[post("/portfolio/contacts", data = "<request>")]
pub async fn create_contact(
    _auth: AuthGuard,
    request: Json<CreateContactRequest>,
    pool: &State<SqlitePool>,
) -> Json<ApiResponse<PortfolioContact>> {
    match sqlx::query_as::<_, PortfolioContact>(
        "INSERT INTO portfolio_contacts (type, value, label, created_at) VALUES ($1, $2, $3, datetime('now')) RETURNING id, type as contact_type, value, label, created_at",
    )
    .bind(&request.contact_type)
    .bind(&request.value)
    .bind(&request.label)
    .fetch_one(pool.inner())
    .await
    {
        Ok(contact) => Json(ApiResponse::success(contact)),
        Err(e) => Json(ApiResponse::error(format!("Error: {}", e))),
    }
}

#[put("/portfolio/contacts/<id>", data = "<request>")]
pub async fn update_contact(
    _auth: AuthGuard,
    id: i64,
    request: Json<UpdateContactRequest>,
    pool: &State<SqlitePool>,
) -> Json<ApiResponse<PortfolioContact>> {
    match sqlx::query("UPDATE portfolio_contacts SET type = $1, value = $2, label = $3 WHERE id = $4")
        .bind(&request.contact_type)
        .bind(&request.value)
        .bind(&request.label)
        .bind(id)
        .execute(pool.inner())
        .await
    {
        Ok(_) => {
            let contact = sqlx::query_as::<_, PortfolioContact>(
                "SELECT id, type as contact_type, value, label, created_at FROM portfolio_contacts WHERE id = $1",
            )
            .bind(id)
            .fetch_one(pool.inner())
            .await;

            match contact {
                Ok(contact) => Json(ApiResponse::success(contact)),
                Err(e) => Json(ApiResponse::error(format!("Error: {}", e))),
            }
        }
        Err(e) => Json(ApiResponse::error(format!("Error: {}", e))),
    }
}

#[delete("/portfolio/contacts/<id>")]
pub async fn delete_contact(_auth: AuthGuard, id: i64, pool: &State<SqlitePool>) -> Json<ApiResponse<String>> {
    match sqlx::query("DELETE FROM portfolio_contacts WHERE id = $1")
        .bind(id)
        .execute(pool.inner())
        .await
    {
        Ok(_) => Json(ApiResponse::success("Contact deleted".to_string())),
        Err(e) => Json(ApiResponse::error(format!("Error: {}", e))),
    }
}

// ===================
// CASES (with images)
// ===================

#[post("/portfolio/cases", data = "<request>")]
pub async fn create_case(
    _auth: AuthGuard,
    request: Json<CreateCaseRequest>,
    pool: &State<SqlitePool>,
) -> Json<ApiResponse<PortfolioCaseWithImages>> {
    // Start transaction
    let mut tx = match pool.begin().await {
        Ok(tx) => tx,
        Err(e) => return Json(ApiResponse::error(format!("Transaction error: {}", e))),
    };

    // Insert case with RETURNING clause
    let result = sqlx::query_as::<_, PortfolioCase>(
        "INSERT INTO portfolio_cases (title, description, main_image, website_url, created_at)
         VALUES ($1, $2, $3, $4, datetime('now')) RETURNING id, title, description, main_image, website_url, created_at",
    )
    .bind(&request.title)
    .bind(&request.description)
    .bind(&request.main_image)
    .bind(&request.website_url)
    .fetch_one(&mut *tx)
    .await;

    let case_data = match result {
        Ok(data) => data,
        Err(e) => return Json(ApiResponse::error(format!("Error: {}", e))),
    };

    let case_id = case_data.id;

    // Insert images
    for (index, image_url) in request.images.iter().enumerate() {
        if let Err(e) = sqlx::query(
            "INSERT INTO portfolio_case_images (case_id, image_url, order_index) VALUES ($1, $2, $3)",
        )
        .bind(case_id)
        .bind(image_url)
        .bind(index as i32)
        .execute(&mut *tx)
        .await
        {
            return Json(ApiResponse::error(format!("Error inserting image: {}", e)));
        }
    }

    // Commit transaction
    if let Err(e) = tx.commit().await {
        return Json(ApiResponse::error(format!("Commit error: {}", e)));
    }

    // Fetch images
    let images: Vec<String> = sqlx::query_scalar(
        "SELECT image_url FROM portfolio_case_images WHERE case_id = $1 ORDER BY order_index",
    )
    .bind(case_id)
    .fetch_all(pool.inner())
    .await
    .unwrap_or_default();

    Json(ApiResponse::success(PortfolioCaseWithImages {
        id: case_data.id,
        title: case_data.title,
        description: case_data.description,
        main_image: case_data.main_image,
        website_url: case_data.website_url,
        images,
        created_at: case_data.created_at,
    }))
}

#[delete("/portfolio/cases/<id>")]
pub async fn delete_case(_auth: AuthGuard, id: i64, pool: &State<SqlitePool>) -> Json<ApiResponse<String>> {
    // Images will be deleted automatically due to ON DELETE CASCADE
    match sqlx::query("DELETE FROM portfolio_cases WHERE id = $1")
        .bind(id)
        .execute(pool.inner())
        .await
    {
        Ok(_) => Json(ApiResponse::success("Case deleted".to_string())),
        Err(e) => Json(ApiResponse::error(format!("Error: {}", e))),
    }
}

// ===================
// PUBLIC ENDPOINT
// ===================

#[get("/portfolio")]
pub async fn get_portfolio(pool: &State<SqlitePool>) -> Json<ApiResponse<FullPortfolio>> {
    // Get about
    let about: Option<String> = sqlx::query_scalar("SELECT description FROM portfolio_about ORDER BY id DESC LIMIT 1")
        .fetch_optional(pool.inner())
        .await
        .unwrap_or(None);

    // Get experience
    let experience: Vec<PortfolioExperience> = sqlx::query_as(
        "SELECT id, title, company, date_from, date_to, description, created_at
         FROM portfolio_experience ORDER BY date_from DESC",
    )
    .fetch_all(pool.inner())
    .await
    .unwrap_or_default();

    // Get skills
    let skills: Vec<PortfolioSkill> = sqlx::query_as(
        "SELECT id, name, category, created_at FROM portfolio_skills ORDER BY name",
    )
    .fetch_all(pool.inner())
    .await
    .unwrap_or_default();

    // Get contacts
    let contacts: Vec<PortfolioContact> = sqlx::query_as(
        "SELECT id, type as contact_type, value, label, created_at FROM portfolio_contacts",
    )
    .fetch_all(pool.inner())
    .await
    .unwrap_or_default();

    // Get cases with images
    let cases_data: Vec<PortfolioCase> = sqlx::query_as(
        "SELECT id, title, description, main_image, website_url, created_at
         FROM portfolio_cases ORDER BY created_at DESC",
    )
    .fetch_all(pool.inner())
    .await
    .unwrap_or_default();

    let mut cases = Vec::new();
    for case_data in cases_data {
        let images: Vec<String> = sqlx::query_scalar(
            "SELECT image_url FROM portfolio_case_images WHERE case_id = $1 ORDER BY order_index",
        )
        .bind(case_data.id)
        .fetch_all(pool.inner())
        .await
        .unwrap_or_default();

        cases.push(PortfolioCaseWithImages {
            id: case_data.id,
            title: case_data.title,
            description: case_data.description,
            main_image: case_data.main_image,
            website_url: case_data.website_url,
            images,
            created_at: case_data.created_at,
        });
    }

    Json(ApiResponse::success(FullPortfolio {
        about,
        experience,
        skills,
        contacts,
        cases,
    }))
}


#[derive(Deserialize)]
pub struct ImproveTextRequest {
    pub text: String,
}

#[derive(Serialize)]
pub struct ImproveTextResponse {
    pub improved_text: String,
}

#[post("/portfolio/improve-about", data = "<request>")]
pub async fn improve_about_text(
    _auth: AuthGuard,
    request: Json<ImproveTextRequest>,
) -> Json<ApiResponse<ImproveTextResponse>> {
    let api_key = std::env::var("OPENROUTER_API_KEY").unwrap_or_default();
    let model = std::env::var("AI_MODEL").unwrap_or_else(|_| "google/gemini-2.0-flash-exp:free".to_string());
    let ai_client = AIClient::new(api_key, model);

    match ai_client.improve_about_text(&request.text).await {
        Ok(improved_text) => Json(ApiResponse::success(ImproveTextResponse { improved_text })),
        Err(e) => Json(ApiResponse::error(format!("AI error: {}", e))),
    }
}

#[derive(Serialize)]
pub struct HHResumeListItem {
    pub id: String,
    pub title: String,
    pub updated: String,
}

#[get("/portfolio/hh-resumes")]
pub async fn get_hh_resumes(
    _auth: AuthGuard,
    pool: &State<SqlitePool>,
) -> Json<ApiResponse<Vec<HHResumeListItem>>> {
    // Get HH token from database
    let token_result = sqlx::query_scalar::<_, String>(
        "SELECT access_token FROM hh_tokens ORDER BY created_at DESC LIMIT 1"
    )
    .fetch_optional(pool.inner())
    .await;

    let token = match token_result {
        Ok(Some(t)) => t,
        Ok(None) => return Json(ApiResponse::error("HH.ru не подключен. Авторизуйтесь через настройки.".to_string())),
        Err(e) => return Json(ApiResponse::error(format!("Database error: {}", e))),
    };

    let mut hh_client = HHClient::new();
    hh_client.set_token(token);

    match hh_client.get_resumes().await {
        Ok(resumes) => {
            let resume_list: Vec<HHResumeListItem> = resumes.iter().filter_map(|r| {
                Some(HHResumeListItem {
                    id: r.get("id")?.as_str()?.to_string(),
                    title: r.get("title")?.as_str()?.to_string(),
                    updated: r.get("updated_at")?.as_str()?.to_string(),
                })
            }).collect();

            Json(ApiResponse::success(resume_list))
        },
        Err(e) => Json(ApiResponse::error(format!("HH.ru API error: {}", e))),
    }
}
