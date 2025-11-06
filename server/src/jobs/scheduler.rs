use parking_lot::RwLock;
use std::sync::Arc;
use std::time::Duration;
use tokio::time::sleep;
use sqlx::PgPool;
use crate::jobs::{HHClient, AIClient};
use chrono::{Utc, Timelike, Datelike};

#[derive(Clone)]
pub struct JobScheduler {
    is_running: Arc<RwLock<bool>>,
    pool: PgPool,
}

impl JobScheduler {
    pub fn new(pool: PgPool) -> Self {
        Self {
            is_running: Arc::new(RwLock::new(false)),
            pool,
        }
    }

    pub fn start(&self) {
        let mut is_running = self.is_running.write();
        *is_running = true;
        println!("✅ Job scheduler started");
    }

    pub fn stop(&self) {
        let mut is_running = self.is_running.write();
        *is_running = false;
        println!("⏸️  Job scheduler stopped");
    }

    pub fn is_running(&self) -> bool {
        *self.is_running.read()
    }

    pub fn spawn_scheduler(self) {
        tokio::spawn(async move {
            println!("🔄 Job scheduler background task started");

            // Initial job search on startup
            if self.is_running() {
                println!("🔍 Running initial job search...");
                if let Err(e) = self.run_job_search().await {
                    eprintln!("❌ Initial job search error: {}", e);
                }
            }

            loop {
                if !self.is_running() {
                    sleep(Duration::from_secs(30)).await;
                    continue;
                }

                // Run job search based on interval from env
                let search_interval_hours: u64 = std::env::var("JOB_SEARCH_INTERVAL_HOURS")
                    .unwrap_or_else(|_| "4".to_string())
                    .parse()
                    .unwrap_or(4);

                // Check if it's time for daily anime sync (at 3 AM)
                let now = chrono::Local::now();
                if now.hour() == 3 && now.minute() < 10 {
                    if let Err(e) = self.sync_anime().await {
                        eprintln!("❌ Anime sync error: {}", e);
                    }
                }

                // Check responses every 10 minutes
                if let Err(e) = self.check_responses().await {
                    eprintln!("❌ Response check error: {}", e);
                }

                if let Err(e) = self.monitor_chats().await {
                    eprintln!("❌ Chat monitoring error: {}", e);
                }

                // Wait 10 minutes before next check
                for _ in 0..(6 * 10) {
                    if !self.is_running() {
                        break;
                    }
                    sleep(Duration::from_secs(10)).await;
                }

                // Check if it's time to search for new jobs
                if let Ok(Some(last_search)) = self.get_last_search_time().await {
                    let elapsed_hours = (Utc::now().timestamp() - last_search) / 3600;
                    if elapsed_hours >= search_interval_hours as i64 {
                        if let Err(e) = self.run_job_search().await {
                            eprintln!("❌ Job search error: {}", e);
                        }
                    }
                }
            }
        });
    }

    async fn get_last_search_time(&self) -> Result<Option<i64>, String> {
        let result: Option<(String,)> = sqlx::query_as(
            "SELECT found_at FROM job_vacancies ORDER BY found_at DESC LIMIT 1"
        )
        .fetch_optional(&self.pool)
        .await
        .map_err(|e| e.to_string())?;

        if let Some((timestamp,)) = result {
            if let Ok(dt) = chrono::DateTime::parse_from_rfc3339(&timestamp) {
                return Ok(Some(dt.timestamp()));
            }
        }

        Ok(None)
    }

    async fn run_job_search(&self) -> Result<(), String> {
        println!("🔍 Starting job search cycle...");

        // Get settings
        let settings: Option<(String, String, Option<i64>)> = sqlx::query_as(
            "SELECT search_text, area_ids, salary_from FROM job_search_settings WHERE id = 1"
        )
        .fetch_optional(&self.pool)
        .await
        .map_err(|e| e.to_string())?;

        let (search_text, area_ids_json, salary_from) = match settings {
            Some(s) => s,
            None => {
                println!("⚠️  No search settings configured");
                return Ok(());
            }
        };

        // Get HH token
        let token: Option<(String,)> = sqlx::query_as(
            "SELECT access_token FROM hh_tokens ORDER BY id DESC LIMIT 1"
        )
        .fetch_optional(&self.pool)
        .await
        .map_err(|e| e.to_string())?;

        let access_token = match token {
            Some((t,)) => t,
            None => {
                println!("⚠️  No HH.ru token found. Please authorize first.");
                return Ok(());
            }
        };

        // Check if we have resume data
        let has_resume: bool = sqlx::query_scalar(
            "SELECT COUNT(*) > 0 FROM portfolio_about"
        )
        .fetch_one(&self.pool)
        .await
        .unwrap_or(false);

        if !has_resume {
            println!("⚠️  No portfolio/resume data found. Please add resume first.");
            return Ok(());
        }

        // Parse area IDs
        let area_ids: Vec<String> = serde_json::from_str(&area_ids_json).unwrap_or_default();
        let area_param = if !area_ids.is_empty() {
            Some(area_ids.join(","))
        } else {
            None
        };

        // Create HH client
        let mut hh_client = HHClient::new();
        hh_client.set_token(access_token.clone());

        // Search vacancies
        let vacancies = hh_client
            .search_vacancies(&search_text, area_param.as_deref(), salary_from)
            .await
            .map_err(|e| e.to_string())?;

        println!("📋 Found {} vacancies", vacancies.len());

        // Get AI client
        let api_key = std::env::var("OPENROUTER_API_KEY").unwrap_or_default();
        let model = std::env::var("AI_MODEL").unwrap_or_else(|_| "google/gemini-2.5-flash-lite".to_string());
        let ai_client = AIClient::new(api_key, model);

        // Get resume text
        let resume_text = self.get_resume_text().await?;
        let (telegram, email) = self.get_contacts().await?;

        // Get first resume ID from HH
        let resumes = hh_client.get_resumes().await.map_err(|e| e.to_string())?;
        let resume_id = resumes
            .first()
            .and_then(|r| r["id"].as_str())
            .ok_or("No resume found on HH.ru")?;

        let mut applied_count = 0;

        for vacancy in vacancies {
            let vacancy_id = match vacancy["id"].as_str() {
                Some(id) => id,
                None => continue,
            };

            // Check if already exists
            let exists: bool = sqlx::query_scalar(
                "SELECT COUNT(*) > 0 FROM job_vacancies WHERE hh_vacancy_id = ?"
            )
            .bind(vacancy_id)
            .fetch_one(&self.pool)
            .await
            .unwrap_or(true);

            if exists {
                continue;
            }

            let title = vacancy["name"].as_str().unwrap_or("Unknown");
            let company = vacancy["employer"]["name"].as_str().unwrap_or("Unknown");
            let url = vacancy["alternate_url"].as_str().unwrap_or("");
            let salary_from = vacancy["salary"]["from"].as_i64();
            let salary_to = vacancy["salary"]["to"].as_i64();
            let salary_currency = vacancy["salary"]["currency"].as_str().map(|s| s.to_string());

            // Get full vacancy details
            let vacancy_details = match hh_client.get_vacancy(vacancy_id).await {
                Ok(v) => v,
                Err(e) => {
                    eprintln!("⚠️  Failed to get vacancy details: {}", e);
                    continue;
                }
            };

            let description = vacancy_details["description"].as_str().unwrap_or("");

            // Save to DB first
            sqlx::query(
                "INSERT INTO job_vacancies (hh_vacancy_id, title, company, salary_from, salary_to, salary_currency, description, url, status)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'found')"
            )
            .bind(vacancy_id)
            .bind(title)
            .bind(company)
            .bind(salary_from)
            .bind(salary_to)
            .bind(&salary_currency)
            .bind(description)
            .bind(url)
            .execute(&self.pool)
            .await
            .ok();

            // Generate cover letter
            let cover_letter = match ai_client
                .generate_cover_letter(title, description, &resume_text, &telegram, &email)
                .await
            {
                Ok(letter) => letter,
                Err(e) => {
                    eprintln!("⚠️  Failed to generate cover letter: {}", e);
                    continue;
                }
            };

            // Apply to vacancy
            let negotiation_id = match hh_client
                .apply_to_vacancy(vacancy_id, &cover_letter, resume_id)
                .await
            {
                Ok(id) => id,
                Err(e) => {
                    eprintln!("⚠️  Failed to apply to vacancy {}: {}", title, e);
                    continue;
                }
            };

            println!("✅ Applied to: {}", title);

            // Update vacancy status
            sqlx::query(
                "UPDATE job_vacancies SET status = 'applied', applied_at = datetime('now')
                 WHERE hh_vacancy_id = ?"
            )
            .bind(vacancy_id)
            .execute(&self.pool)
            .await
            .ok();

            // Get vacancy DB id
            let vacancy_db_id: i64 = sqlx::query_scalar(
                "SELECT id FROM job_vacancies WHERE hh_vacancy_id = ?"
            )
            .bind(vacancy_id)
            .fetch_one(&self.pool)
            .await
            .unwrap_or(0);

            // Save response
            sqlx::query(
                "INSERT INTO job_responses (vacancy_id, hh_negotiation_id, cover_letter, status)
                 VALUES (?, ?, ?, 'sent')"
            )
            .bind(vacancy_db_id)
            .bind(&negotiation_id)
            .bind(&cover_letter)
            .execute(&self.pool)
            .await
            .ok();

            // Generate and send chat intro
            if let Ok(chat_intro) = ai_client.generate_chat_intro(&cover_letter, &telegram, &email).await {
                if let Err(e) = hh_client.send_message(&negotiation_id, &chat_intro).await {
                    eprintln!("⚠️  Failed to send chat intro: {}", e);
                }
            }

            applied_count += 1;

            // Rate limiting - wait between applications
            sleep(Duration::from_secs(5)).await;
        }

        println!("✅ Job search completed. Applied to {} new vacancies", applied_count);
        Ok(())
    }

    async fn check_responses(&self) -> Result<(), String> {
        // Get HH token
        let token: Option<(String,)> = sqlx::query_as(
            "SELECT access_token FROM hh_tokens ORDER BY id DESC LIMIT 1"
        )
        .fetch_optional(&self.pool)
        .await
        .map_err(|e| e.to_string())?;

        let access_token = match token {
            Some((t,)) => t,
            None => return Ok(()),
        };

        let mut hh_client = HHClient::new();
        hh_client.set_token(access_token);

        // Get all negotiations
        let negotiations = match hh_client.get_negotiations().await {
            Ok(n) => n,
            Err(_) => return Ok(()),
        };

        for negotiation in negotiations {
            let negotiation_id = match negotiation["id"].as_str() {
                Some(id) => id,
                None => continue,
            };

            let state = negotiation["state"]["id"].as_str().unwrap_or("");
            let vacancy_id = negotiation["vacancy"]["id"].as_str().unwrap_or("");

            // Map HH status to our status
            let new_status = match state {
                "invitation" => "invited",
                "discard" => "rejected",
                "response" => "viewed",
                _ => "applied",
            };

            // Update vacancy status if changed
            sqlx::query(
                "UPDATE job_vacancies SET status = ?, updated_at = datetime('now')
                 WHERE hh_vacancy_id = ? AND status != ?"
            )
            .bind(new_status)
            .bind(vacancy_id)
            .bind(new_status)
            .execute(&self.pool)
            .await
            .ok();

            // Update response status
            sqlx::query(
                "UPDATE job_responses SET status = ?, updated_at = datetime('now')
                 WHERE hh_negotiation_id = ?"
            )
            .bind(new_status)
            .bind(negotiation_id)
            .execute(&self.pool)
            .await
            .ok();
        }

        Ok(())
    }

    async fn monitor_chats(&self) -> Result<(), String> {
        // Get HH token
        let token: Option<(String,)> = sqlx::query_as(
            "SELECT access_token FROM hh_tokens ORDER BY id DESC LIMIT 1"
        )
        .fetch_optional(&self.pool)
        .await
        .map_err(|e| e.to_string())?;

        let access_token = match token {
            Some((t,)) => t,
            None => return Ok(()),
        };

        let mut hh_client = HHClient::new();
        hh_client.set_token(access_token);

        // Get AI client
        let api_key = std::env::var("OPENROUTER_API_KEY").unwrap_or_default();
        let model = std::env::var("AI_MODEL").unwrap_or_else(|_| "google/gemini-2.5-flash-lite".to_string());
        let ai_client = AIClient::new(api_key, model);

        // Get resume text
        let resume_text = self.get_resume_text().await?;

        // Get all applied vacancies
        let vacancies: Vec<(i64, String, String)> = sqlx::query_as(
            "SELECT id, hh_vacancy_id, title FROM job_vacancies WHERE status IN ('applied', 'viewed', 'invited')"
        )
        .fetch_all(&self.pool)
        .await
        .map_err(|e| e.to_string())?;

        for (vacancy_id, _hh_vacancy_id, title) in vacancies {
            // Get negotiation ID
            let negotiation: Option<(String,)> = sqlx::query_as(
                "SELECT hh_negotiation_id FROM job_responses WHERE vacancy_id = ? AND hh_negotiation_id IS NOT NULL"
            )
            .bind(vacancy_id)
            .fetch_optional(&self.pool)
            .await
            .ok()
            .flatten();

            let negotiation_id = match negotiation {
                Some((id,)) => id,
                None => continue,
            };

            // Get messages
            let messages = match hh_client.get_messages(&negotiation_id).await {
                Ok(m) => m,
                Err(_) => continue,
            };

            if messages.is_empty() {
                continue;
            }

            // Get last message from DB
            let last_saved_message: Option<(String,)> = sqlx::query_as(
                "SELECT last_message FROM job_chats WHERE hh_chat_id = ?"
            )
            .bind(&negotiation_id)
            .fetch_optional(&self.pool)
            .await
            .ok()
            .flatten();

            let last_message = messages.last().unwrap();
            let message_text = last_message["text"].as_str().unwrap_or("");
            let message_author = last_message["author"]["type"].as_str().unwrap_or("");

            // Skip if it's our own message
            if message_author == "applicant" {
                continue;
            }

            // Check if this is a new message
            let is_new = match last_saved_message {
                Some((saved,)) => saved != message_text,
                None => true,
            };

            if !is_new {
                continue;
            }

            println!("💬 New message in chat for: {}", title);

            // Detect if it's a bot
            let is_bot = AIClient::is_bot_message(message_text);

            // Save/update chat
            sqlx::query(
                "INSERT INTO job_chats (vacancy_id, hh_chat_id, last_message, last_message_at, has_bot)
                 VALUES (?, ?, ?, datetime('now'), ?)
                 ON CONFLICT(hh_chat_id) DO UPDATE SET
                 last_message = excluded.last_message,
                 last_message_at = excluded.last_message_at,
                 has_bot = excluded.has_bot"
            )
            .bind(vacancy_id)
            .bind(&negotiation_id)
            .bind(message_text)
            .bind(is_bot)
            .execute(&self.pool)
            .await
            .ok();

            // If it's a bot asking questions, respond automatically
            if is_bot {
                println!("🤖 Detected bot message, generating response...");

                if let Ok(response) = ai_client.generate_chat_response(message_text, &resume_text, &title).await {
                    if let Err(e) = hh_client.send_message(&negotiation_id, &response).await {
                        eprintln!("⚠️  Failed to send response: {}", e);
                    } else {
                        println!("✅ Sent auto-response to bot");
                    }
                }
            }

            // Rate limiting
            sleep(Duration::from_secs(2)).await;
        }

        Ok(())
    }

    async fn get_resume_text(&self) -> Result<String, String> {
        let about: Option<(String,)> = sqlx::query_as(
            "SELECT description FROM portfolio_about ORDER BY id DESC LIMIT 1"
        )
        .fetch_optional(&self.pool)
        .await
        .map_err(|e| e.to_string())?;

        let about_text = about.map(|(d,)| d).unwrap_or_default();

        let experiences: Vec<(String, String, String)> = sqlx::query_as(
            "SELECT title, company, description FROM portfolio_experience ORDER BY date_from DESC"
        )
        .fetch_all(&self.pool)
        .await
        .unwrap_or_default();

        let skills: Vec<(String,)> = sqlx::query_as(
            "SELECT name FROM portfolio_skills"
        )
        .fetch_all(&self.pool)
        .await
        .unwrap_or_default();

        let mut resume = format!("Обо мне:\n{}\n\n", about_text);

        if !experiences.is_empty() {
            resume.push_str("Опыт работы:\n");
            for (title, company, desc) in experiences {
                resume.push_str(&format!("- {} в {} ({})\n", title, company, desc));
            }
            resume.push('\n');
        }

        if !skills.is_empty() {
            resume.push_str("Навыки:\n");
            for (skill,) in skills {
                resume.push_str(&format!("- {}\n", skill));
            }
        }

        Ok(resume)
    }

    async fn get_contacts(&self) -> Result<(String, String), String> {
        let telegram: Option<(String,)> = sqlx::query_as(
            "SELECT value FROM portfolio_contacts WHERE type = 'telegram' LIMIT 1"
        )
        .fetch_optional(&self.pool)
        .await
        .unwrap_or(None);

        let email: Option<(String,)> = sqlx::query_as(
            "SELECT value FROM portfolio_contacts WHERE type = 'email' LIMIT 1"
        )
        .fetch_optional(&self.pool)
        .await
        .unwrap_or(None);

        let telegram = telegram.map(|(v,)| v).unwrap_or_else(|| "https://t.me/username".to_string());
        let email = email.map(|(v,)| v).unwrap_or_else(|| "email@example.com".to_string());

        Ok((telegram, email))
    }

    async fn sync_anime(&self) -> Result<(), String> {
        println!("🎬 Starting daily anime sync...");

        use crate::anime::{GoogleSheetsClient, ShikimoriClient};

        const SHEET_ID: &str = "1Dr02PNJp4W6lJnI31ohN-jkZWIL4Jylww6vVrPVrYfs";

        let sheets_client = GoogleSheetsClient::new(SHEET_ID.to_string());
        let shikimori_client = ShikimoriClient::new();

        let mut total_synced = 0;

        // Sync only current year after first sync
        let current_year = chrono::Utc::now().year() as i64;

        let rows = match sheets_client.fetch_sheet_data(current_year).await {
            Ok(r) => r,
            Err(e) => {
                eprintln!("Error fetching sheet for year {}: {}", current_year, e);
                return Err(e);
            }
        };

        for row in rows {
            let sheets_url = format!(
                "https://docs.google.com/spreadsheets/d/{}/edit#gid={}",
                SHEET_ID,
                match current_year {
                    2020 => "0", 2021 => "1", 2022 => "2",
                    2023 => "3", 2024 => "4", 2025 => "5",
                    _ => "0",
                }
            );

            // Check if exists
            let existing: Option<(i64,)> = sqlx::query_as(
                "SELECT id FROM anime_auction WHERE title = ? AND year = ?"
            )
            .bind(&row.title)
            .bind(current_year)
            .fetch_optional(&self.pool)
            .await
            .ok()
            .flatten();

            if existing.is_some() {
                // Update existing
                sqlx::query(
                    r#"UPDATE anime_auction
                    SET date = ?, watched = ?, season = ?, episodes = ?,
                        voice_acting = ?, buyer = ?, chat_rating = ?,
                        sheikh_rating = ?, streamer_rating = ?, vod_link = ?,
                        sheets_url = ?, updated_at = datetime('now')
                    WHERE title = ? AND year = ?"#
                )
                .bind(&row.date)
                .bind(if row.watched { 1 } else { 0 })
                .bind(&row.season)
                .bind(&row.episodes)
                .bind(&row.voice_acting)
                .bind(&row.buyer)
                .bind(row.chat_rating)
                .bind(row.sheikh_rating)
                .bind(row.streamer_rating)
                .bind(&row.vod_link)
                .bind(&sheets_url)
                .bind(&row.title)
                .bind(current_year)
                .execute(&self.pool)
                .await
                .ok();

                total_synced += 1;
            }
        }

        println!("✅ Anime sync completed. Updated {} entries", total_synced);
        Ok(())
    }
}
