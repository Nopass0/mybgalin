use parking_lot::RwLock;
use std::sync::Arc;
use std::time::Duration;
use tokio::time::sleep;
use sqlx::SqlitePool;
use crate::jobs::{HHClient, AIClient};
use chrono::{Utc, Timelike, Datelike};

#[derive(Clone)]
pub struct JobScheduler {
    is_running: Arc<RwLock<bool>>,
    pool: SqlitePool,
}

impl JobScheduler {
    pub fn new(pool: SqlitePool) -> Self {
        Self {
            is_running: Arc::new(RwLock::new(false)),
            pool,
        }
    }

    pub fn start(&self) {
        let mut is_running = self.is_running.write();
        *is_running = true;
        self.log_activity("system", None, "🚀 Автопоиск работы запущен").ok();
        println!("✅ Job scheduler started");
    }

    pub fn stop(&self) {
        let mut is_running = self.is_running.write();
        *is_running = false;
        self.log_activity_sync("system", None, "⏸️ Автопоиск работы остановлен");
        println!("⏸️  Job scheduler stopped");
    }

    pub fn is_running(&self) -> bool {
        *self.is_running.read()
    }

    fn log_activity_sync(&self, event_type: &str, vacancy_id: Option<i64>, description: &str) {
        let pool = self.pool.clone();
        let event_type = event_type.to_string();
        let description = description.to_string();
        tokio::spawn(async move {
            sqlx::query(
                "INSERT INTO job_activity_log (event_type, vacancy_id, description) VALUES (?, ?, ?)"
            )
            .bind(&event_type)
            .bind(vacancy_id)
            .bind(&description)
            .execute(&pool)
            .await
            .ok();
        });
    }

    async fn log_activity(&self, event_type: &str, vacancy_id: Option<i64>, description: &str) -> Result<(), String> {
        sqlx::query(
            "INSERT INTO job_activity_log (event_type, vacancy_id, description) VALUES (?, ?, ?)"
        )
        .bind(event_type)
        .bind(vacancy_id)
        .bind(description)
        .execute(&self.pool)
        .await
        .map_err(|e| e.to_string())?;
        Ok(())
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

                // Get search interval from settings (in minutes)
                let search_interval_minutes: i64 = self.get_search_interval().await.unwrap_or(60);

                // Check if it's time for daily anime sync (at 3 AM)
                let now = chrono::Local::now();
                if now.hour() == 3 && now.minute() < 10 {
                    if let Err(e) = self.sync_anime().await {
                        eprintln!("❌ Anime sync error: {}", e);
                    }
                }

                // Check responses every 5 minutes
                if let Err(e) = self.check_responses().await {
                    eprintln!("❌ Response check error: {}", e);
                }

                // Monitor chats for new messages
                if let Err(e) = self.monitor_chats_enhanced().await {
                    eprintln!("❌ Chat monitoring error: {}", e);
                }

                // Wait 5 minutes before next check
                for _ in 0..30 {
                    if !self.is_running() {
                        break;
                    }
                    sleep(Duration::from_secs(10)).await;
                }

                // Check if it's time to search for new jobs
                if let Ok(Some(last_search)) = self.get_last_search_time().await {
                    let elapsed_minutes = (Utc::now().timestamp() - last_search) / 60;
                    if elapsed_minutes >= search_interval_minutes {
                        if let Err(e) = self.run_job_search().await {
                            eprintln!("❌ Job search error: {}", e);
                            self.log_activity("error", None, &format!("Ошибка поиска: {}", e)).await.ok();
                        }
                    }
                } else {
                    // No previous search, run now
                    if let Err(e) = self.run_job_search().await {
                        eprintln!("❌ Job search error: {}", e);
                    }
                }
            }
        });
    }

    async fn get_search_interval(&self) -> Result<i64, String> {
        let interval: Option<(i32,)> = sqlx::query_as(
            "SELECT search_interval_minutes FROM job_search_settings WHERE id = 1"
        )
        .fetch_optional(&self.pool)
        .await
        .map_err(|e| e.to_string())?;

        Ok(interval.map(|(i,)| i as i64).unwrap_or(60))
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
        println!("🔍 Starting AI-powered job search cycle...");
        self.log_activity("search", None, "🔍 Начинаю поиск вакансий").await.ok();

        // Get all settings including new AI fields
        let settings: Option<(String, String, Option<i64>, Option<String>, Option<String>, Option<String>, bool, Option<bool>, Option<i32>, Option<bool>)> = sqlx::query_as(
            "SELECT search_text, area_ids, salary_from, experience, schedule, employment, only_with_salary, auto_tags_enabled, min_ai_score, auto_apply_enabled FROM job_search_settings WHERE id = 1"
        )
        .fetch_optional(&self.pool)
        .await
        .map_err(|e| e.to_string())?;

        let (search_text, area_ids_json, salary_from, experience, schedule, employment, only_with_salary, auto_tags_enabled, min_ai_score, auto_apply_enabled) = match settings {
            Some(s) => s,
            None => {
                println!("⚠️  No search settings configured");
                return Ok(());
            }
        };

        let min_ai_score = min_ai_score.unwrap_or(50);
        let auto_apply = auto_apply_enabled.unwrap_or(true);
        let use_auto_tags = auto_tags_enabled.unwrap_or(true);

        // Get HH token
        let access_token = match self.get_valid_token().await {
            Ok(t) => t,
            Err(e) => {
                println!("⚠️  {}", e);
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

        // Get AI client
        let api_key = std::env::var("OPENROUTER_API_KEY").unwrap_or_default();
        let model = std::env::var("AI_MODEL").unwrap_or_else(|_| "google/gemini-2.0-flash-001".to_string());
        let ai_client = AIClient::new(api_key, model);

        // Get resume text
        let resume_text = self.get_resume_text().await?;
        let (telegram, email) = self.get_contacts().await?;

        // Collect search queries
        let mut search_queries: Vec<String> = vec![];

        // Add main search text
        if !search_text.is_empty() {
            search_queries.push(search_text.clone());
        }

        // Get AI-generated tags if enabled
        if use_auto_tags {
            let active_tags: Vec<(String,)> = sqlx::query_as(
                "SELECT value FROM job_search_tags WHERE tag_type = 'query' AND is_active = 1"
            )
            .fetch_all(&self.pool)
            .await
            .unwrap_or_default();

            for (tag,) in active_tags {
                if !search_queries.contains(&tag) {
                    search_queries.push(tag);
                }
            }
        }

        // If no queries, generate tags from resume
        if search_queries.is_empty() {
            println!("🤖 No search queries, generating tags from resume...");
            if let Ok(tags) = ai_client.generate_search_tags(&resume_text).await {
                for query in tags.suggested_queries {
                    search_queries.push(query.clone());
                    // Save to DB
                    sqlx::query(
                        "INSERT OR IGNORE INTO job_search_tags (tag_type, value) VALUES ('query', ?)"
                    )
                    .bind(&query)
                    .execute(&self.pool)
                    .await
                    .ok();
                }
                self.log_activity("ai", None, &format!("🏷️ AI сгенерировал {} поисковых запросов", search_queries.len())).await.ok();
            }
        }

        if search_queries.is_empty() {
            println!("⚠️  No search queries available");
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

        // Get first resume ID from HH
        let resumes = hh_client.get_resumes().await.map_err(|e| e.to_string())?;
        let resume_id = resumes
            .first()
            .and_then(|r| r["id"].as_str())
            .ok_or("No resume found on HH.ru")?;

        let mut total_found = 0;
        let mut total_evaluated = 0;
        let mut total_applied = 0;

        // Search with each query
        for query in search_queries.iter().take(5) {
            println!("🔎 Searching: {}", query);

            // Update tag search count
            sqlx::query(
                "UPDATE job_search_tags SET search_count = search_count + 1 WHERE tag_type = 'query' AND value = ?"
            )
            .bind(query)
            .execute(&self.pool)
            .await
            .ok();

            // Search vacancies
            let vacancies = match hh_client
                .search_vacancies(
                    query,
                    area_param.as_deref(),
                    salary_from,
                    experience.as_deref(),
                    schedule.as_deref(),
                    employment.as_deref(),
                    only_with_salary,
                )
                .await
            {
                Ok(v) => v,
                Err(e) => {
                    eprintln!("⚠️  Search error for '{}': {}", query, e);
                    continue;
                }
            };

            let found_count = vacancies.len();
            total_found += found_count;

            // Update tag found count
            sqlx::query(
                "UPDATE job_search_tags SET found_count = found_count + ? WHERE tag_type = 'query' AND value = ?"
            )
            .bind(found_count as i32)
            .bind(query)
            .execute(&self.pool)
            .await
            .ok();

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
                let v_salary_from = vacancy["salary"]["from"].as_i64();
                let v_salary_to = vacancy["salary"]["to"].as_i64();
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

                // AI evaluation
                total_evaluated += 1;
                let evaluation = ai_client
                    .evaluate_vacancy(title, description, company, v_salary_from, v_salary_to, &resume_text)
                    .await;

                let (ai_score, ai_recommendation, ai_priority, ai_match_reasons, ai_concerns, ai_salary_assessment) =
                    match evaluation {
                        Ok(eval) => (
                            Some(eval.score),
                            Some(eval.recommendation.clone()),
                            Some(eval.priority),
                            Some(serde_json::to_string(&eval.match_reasons).unwrap_or_default()),
                            Some(serde_json::to_string(&eval.concerns).unwrap_or_default()),
                            Some(eval.salary_assessment.clone()),
                        ),
                        Err(e) => {
                            eprintln!("⚠️  AI evaluation failed: {}", e);
                            (None, None, None, None, None, None)
                        }
                    };

                // Determine status based on evaluation
                let should_apply = auto_apply &&
                    ai_score.unwrap_or(0) >= min_ai_score &&
                    ai_recommendation.as_deref() != Some("skip");

                let status = if should_apply { "found" } else { "skipped" };

                // Save to DB
                sqlx::query(
                    "INSERT INTO job_vacancies (hh_vacancy_id, title, company, salary_from, salary_to, salary_currency, description, url, status, ai_score, ai_recommendation, ai_priority, ai_match_reasons, ai_concerns, ai_salary_assessment)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
                )
                .bind(vacancy_id)
                .bind(title)
                .bind(company)
                .bind(v_salary_from)
                .bind(v_salary_to)
                .bind(&salary_currency)
                .bind(description)
                .bind(url)
                .bind(status)
                .bind(ai_score)
                .bind(&ai_recommendation)
                .bind(ai_priority)
                .bind(&ai_match_reasons)
                .bind(&ai_concerns)
                .bind(&ai_salary_assessment)
                .execute(&self.pool)
                .await
                .ok();

                if !should_apply {
                    println!("⏭️  Skipped {} (score: {}, rec: {:?})", title, ai_score.unwrap_or(0), ai_recommendation);
                    continue;
                }

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

                println!("✅ Applied to: {} (AI score: {})", title, ai_score.unwrap_or(0));

                // Get vacancy DB id
                let vacancy_db_id: i64 = sqlx::query_scalar(
                    "SELECT id FROM job_vacancies WHERE hh_vacancy_id = ?"
                )
                .bind(vacancy_id)
                .fetch_one(&self.pool)
                .await
                .unwrap_or(0);

                // Update vacancy status
                sqlx::query(
                    "UPDATE job_vacancies SET status = 'applied', applied_at = datetime('now')
                     WHERE id = ?"
                )
                .bind(vacancy_db_id)
                .execute(&self.pool)
                .await
                .ok();

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

                // Create chat record
                sqlx::query(
                    "INSERT INTO job_chats_v2 (vacancy_id, hh_chat_id, employer_name)
                     VALUES (?, ?, ?)"
                )
                .bind(vacancy_db_id)
                .bind(&negotiation_id)
                .bind(company)
                .execute(&self.pool)
                .await
                .ok();

                // Log activity
                self.log_activity(
                    "apply",
                    Some(vacancy_db_id),
                    &format!("✅ Отклик на {} в {} (AI: {}%)", title, company, ai_score.unwrap_or(0))
                ).await.ok();

                // Generate and send chat intro
                if let Ok(chat_intro) = ai_client.generate_chat_intro(&cover_letter, &telegram, &email).await {
                    if let Err(e) = hh_client.send_message(&negotiation_id, &chat_intro).await {
                        eprintln!("⚠️  Failed to send chat intro: {}", e);
                    } else {
                        // Save intro message
                        let chat_id: Option<(i64,)> = sqlx::query_as(
                            "SELECT id FROM job_chats_v2 WHERE hh_chat_id = ?"
                        )
                        .bind(&negotiation_id)
                        .fetch_optional(&self.pool)
                        .await
                        .ok()
                        .flatten();

                        if let Some((cid,)) = chat_id {
                            sqlx::query(
                                "INSERT INTO job_chat_messages (chat_id, author_type, text, is_auto_response)
                                 VALUES (?, 'applicant', ?, 1)"
                            )
                            .bind(cid)
                            .bind(&chat_intro)
                            .execute(&self.pool)
                            .await
                            .ok();
                        }
                    }
                }

                // Update tag applied count
                sqlx::query(
                    "UPDATE job_search_tags SET applied_count = applied_count + 1 WHERE tag_type = 'query' AND value = ?"
                )
                .bind(query)
                .execute(&self.pool)
                .await
                .ok();

                total_applied += 1;

                // Rate limiting - wait between applications
                sleep(Duration::from_secs(3)).await;
            }

            // Pause between queries
            sleep(Duration::from_secs(2)).await;
        }

        // Update daily stats
        let today = chrono::Local::now().format("%Y-%m-%d").to_string();
        sqlx::query(
            r#"INSERT INTO job_search_stats (date, searches_count, vacancies_found, applications_sent)
               VALUES (?, 1, ?, ?)
               ON CONFLICT(date) DO UPDATE SET
               searches_count = searches_count + 1,
               vacancies_found = vacancies_found + excluded.vacancies_found,
               applications_sent = applications_sent + excluded.applications_sent"#
        )
        .bind(&today)
        .bind(total_found as i32)
        .bind(total_applied)
        .execute(&self.pool)
        .await
        .ok();

        self.log_activity(
            "search",
            None,
            &format!("📊 Поиск завершен: найдено {}, оценено {}, откликов {}", total_found, total_evaluated, total_applied)
        ).await.ok();

        println!("✅ Job search completed. Found: {}, Evaluated: {}, Applied: {}", total_found, total_evaluated, total_applied);
        Ok(())
    }

    async fn check_responses(&self) -> Result<(), String> {
        // Get HH token
        let access_token = match self.get_valid_token().await {
            Ok(t) => t,
            Err(_) => return Ok(()),
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

            // Get current status
            let current: Option<(String, i64)> = sqlx::query_as(
                "SELECT status, id FROM job_vacancies WHERE hh_vacancy_id = ?"
            )
            .bind(vacancy_id)
            .fetch_optional(&self.pool)
            .await
            .ok()
            .flatten();

            if let Some((current_status, db_id)) = current {
                if current_status != new_status {
                    // Status changed - log it
                    let event = match new_status {
                        "invited" => "🎉 Приглашение на собеседование!",
                        "rejected" => "❌ Отказ получен",
                        "viewed" => "👁️ Отклик просмотрен",
                        _ => "📬 Статус обновлен",
                    };

                    self.log_activity("response", Some(db_id), event).await.ok();

                    // Update daily stats
                    let today = chrono::Local::now().format("%Y-%m-%d").to_string();
                    match new_status {
                        "invited" => {
                            sqlx::query(
                                "UPDATE job_search_stats SET invitations_received = invitations_received + 1 WHERE date = ?"
                            )
                            .bind(&today)
                            .execute(&self.pool)
                            .await
                            .ok();
                        }
                        "rejected" => {
                            sqlx::query(
                                "UPDATE job_search_stats SET rejections_received = rejections_received + 1 WHERE date = ?"
                            )
                            .bind(&today)
                            .execute(&self.pool)
                            .await
                            .ok();
                        }
                        _ => {}
                    }
                }
            }

            // Update vacancy status
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

    async fn monitor_chats_enhanced(&self) -> Result<(), String> {
        // Get HH token
        let access_token = match self.get_valid_token().await {
            Ok(t) => t,
            Err(_) => return Ok(()),
        };

        let mut hh_client = HHClient::new();
        hh_client.set_token(access_token);

        // Get AI client
        let api_key = std::env::var("OPENROUTER_API_KEY").unwrap_or_default();
        let model = std::env::var("AI_MODEL").unwrap_or_else(|_| "google/gemini-2.0-flash-001".to_string());
        let ai_client = AIClient::new(api_key, model);

        // Get resume and contacts
        let resume_text = self.get_resume_text().await?;
        let (telegram, _email) = self.get_contacts().await?;

        // Get all active chats
        let chats: Vec<(i64, String, String, i64, bool)> = sqlx::query_as(
            r#"SELECT c.id, c.hh_chat_id, v.title, v.id, c.telegram_invited
               FROM job_chats_v2 c
               JOIN job_vacancies v ON c.vacancy_id = v.id
               WHERE v.status IN ('applied', 'viewed', 'invited')"#
        )
        .fetch_all(&self.pool)
        .await
        .map_err(|e| e.to_string())?;

        for (chat_id, hh_chat_id, title, vacancy_db_id, telegram_invited) in chats {
            // Get messages from HH
            let messages = match hh_client.get_messages(&hh_chat_id).await {
                Ok(m) => m,
                Err(_) => continue,
            };

            if messages.is_empty() {
                continue;
            }

            // Get last saved message ID
            let last_saved: Option<(String,)> = sqlx::query_as(
                "SELECT hh_message_id FROM job_chat_messages WHERE chat_id = ? ORDER BY id DESC LIMIT 1"
            )
            .bind(chat_id)
            .fetch_optional(&self.pool)
            .await
            .ok()
            .flatten();

            // Build chat history for context
            let mut chat_history = String::new();
            let saved_messages: Vec<(String, String)> = sqlx::query_as(
                "SELECT author_type, text FROM job_chat_messages WHERE chat_id = ? ORDER BY id"
            )
            .bind(chat_id)
            .fetch_all(&self.pool)
            .await
            .unwrap_or_default();

            for (author, text) in &saved_messages {
                chat_history.push_str(&format!("{}: {}\n", author, text));
            }

            // Process new messages
            for message in messages.iter() {
                let hh_msg_id = message["id"].as_str().map(|s| s.to_string());
                let message_text = message["text"].as_str().unwrap_or("");
                let author_type = message["author"]["participant_type"].as_str().unwrap_or("employer");

                // Skip if already saved
                if let Some(msg_id) = &hh_msg_id {
                    if last_saved.as_ref().map(|(id,)| id == msg_id).unwrap_or(false) {
                        continue;
                    }
                    // Check if already exists
                    let exists: bool = sqlx::query_scalar(
                        "SELECT COUNT(*) > 0 FROM job_chat_messages WHERE hh_message_id = ?"
                    )
                    .bind(msg_id)
                    .fetch_one(&self.pool)
                    .await
                    .unwrap_or(true);

                    if exists {
                        continue;
                    }
                }

                // Skip our own messages
                if author_type == "applicant" {
                    // Still save it for history
                    sqlx::query(
                        "INSERT INTO job_chat_messages (chat_id, hh_message_id, author_type, text)
                         VALUES (?, ?, ?, ?)"
                    )
                    .bind(chat_id)
                    .bind(&hh_msg_id)
                    .bind(author_type)
                    .bind(message_text)
                    .execute(&self.pool)
                    .await
                    .ok();
                    continue;
                }

                println!("💬 New message in chat for: {}", title);

                // Use AI to analyze the message
                let analysis = ai_client.analyze_message(message_text, &chat_history).await;

                let (ai_sentiment, ai_intent, is_bot, should_invite_tg) = match analysis {
                    Ok(a) => (
                        Some(a.sentiment.clone()),
                        Some(a.intent.clone()),
                        a.is_bot,
                        a.should_invite_telegram && !telegram_invited,
                    ),
                    Err(e) => {
                        eprintln!("⚠️  Message analysis failed: {}", e);
                        (None, None, AIClient::is_bot_message(message_text), false)
                    }
                };

                // Save message
                sqlx::query(
                    "INSERT INTO job_chat_messages (chat_id, hh_message_id, author_type, text, ai_sentiment, ai_intent)
                     VALUES (?, ?, ?, ?, ?, ?)"
                )
                .bind(chat_id)
                .bind(&hh_msg_id)
                .bind(author_type)
                .bind(message_text)
                .bind(&ai_sentiment)
                .bind(&ai_intent)
                .execute(&self.pool)
                .await
                .ok();

                // Update chat
                sqlx::query(
                    "UPDATE job_chats_v2 SET last_message_at = datetime('now'), is_bot = ?, unread_count = unread_count + 1, updated_at = datetime('now')
                     WHERE id = ?"
                )
                .bind(is_bot)
                .bind(chat_id)
                .execute(&self.pool)
                .await
                .ok();

                // Log activity
                self.log_activity(
                    "chat",
                    Some(vacancy_db_id),
                    &format!("💬 Новое сообщение по {}: {} ({:?})", title, &message_text[..50.min(message_text.len())], ai_intent)
                ).await.ok();

                // If it's a bot, respond automatically
                if is_bot {
                    println!("🤖 Detected bot message, generating response...");

                    if let Ok(response) = ai_client.generate_chat_response(message_text, &resume_text, &title).await {
                        if let Err(e) = hh_client.send_message(&hh_chat_id, &response).await {
                            eprintln!("⚠️  Failed to send response: {}", e);
                        } else {
                            println!("✅ Sent auto-response to bot");

                            // Save our response
                            sqlx::query(
                                "INSERT INTO job_chat_messages (chat_id, author_type, text, is_auto_response)
                                 VALUES (?, 'applicant', ?, 1)"
                            )
                            .bind(chat_id)
                            .bind(&response)
                            .execute(&self.pool)
                            .await
                            .ok();

                            self.log_activity("chat", Some(vacancy_db_id), "🤖 Отправлен автоответ боту").await.ok();
                        }
                    }
                }
                // If human and should invite to Telegram
                else if should_invite_tg {
                    println!("👤 Human recruiter detected, inviting to Telegram...");

                    if let Ok(invite) = ai_client.generate_telegram_invite(message_text, &telegram).await {
                        // Don't send invite immediately with response - send response first
                        if let Ok(response) = ai_client.generate_chat_response(message_text, &resume_text, &title).await {
                            let full_response = format!("{}\n\n{}", response, invite);

                            if let Err(e) = hh_client.send_message(&hh_chat_id, &full_response).await {
                                eprintln!("⚠️  Failed to send response with Telegram invite: {}", e);
                            } else {
                                // Mark as invited
                                sqlx::query(
                                    "UPDATE job_chats_v2 SET telegram_invited = 1, is_human_confirmed = 1 WHERE id = ?"
                                )
                                .bind(chat_id)
                                .execute(&self.pool)
                                .await
                                .ok();

                                // Save message
                                sqlx::query(
                                    "INSERT INTO job_chat_messages (chat_id, author_type, text, is_auto_response)
                                     VALUES (?, 'applicant', ?, 1)"
                                )
                                .bind(chat_id)
                                .bind(&full_response)
                                .execute(&self.pool)
                                .await
                                .ok();

                                // Update daily stats
                                let today = chrono::Local::now().format("%Y-%m-%d").to_string();
                                sqlx::query(
                                    "UPDATE job_search_stats SET telegram_invites_sent = telegram_invites_sent + 1 WHERE date = ?"
                                )
                                .bind(&today)
                                .execute(&self.pool)
                                .await
                                .ok();

                                self.log_activity("invite", Some(vacancy_db_id), "📲 Приглашение в Telegram отправлено").await.ok();
                                println!("✅ Telegram invite sent");
                            }
                        }
                    }
                }

                // Update chat history for next iteration
                chat_history.push_str(&format!("employer: {}\n", message_text));
            }

            // Rate limiting
            sleep(Duration::from_secs(1)).await;
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

    async fn get_valid_token(&self) -> Result<String, String> {
        // Get latest token
        let token_row: Option<(i64, String, String, String)> = sqlx::query_as(
            "SELECT id, access_token, refresh_token, expires_at FROM hh_tokens ORDER BY id DESC LIMIT 1"
        )
        .fetch_optional(&self.pool)
        .await
        .map_err(|e| e.to_string())?;

        let (_id, access_token, refresh_token, expires_at) = match token_row {
            Some(row) => row,
            None => return Err("No HH.ru token found. Please authorize first.".to_string()),
        };

        // Check expiration (buffer 5 minutes)
        let expires_dt = chrono::DateTime::parse_from_rfc3339(&expires_at)
            .map_err(|e| format!("Failed to parse expiration date: {}", e))?
            .with_timezone(&Utc);
        
        if expires_dt > Utc::now() + chrono::Duration::minutes(5) {
            return Ok(access_token);
        }

        println!("🔄 HH token expired or expiring soon. Refreshing...");

        let client_id = std::env::var("HH_CLIENT_ID").map_err(|_| "HH_CLIENT_ID not set")?;
        let client_secret = std::env::var("HH_CLIENT_SECRET").map_err(|_| "HH_CLIENT_SECRET not set")?;

        let (new_access_token, new_refresh_token, expires_in) = 
            HHClient::refresh_token(&client_id, &client_secret, &refresh_token).await?;

        let new_expires_at = Utc::now() + chrono::Duration::seconds(expires_in);

        // Save new token
        sqlx::query(
            "INSERT INTO hh_tokens (access_token, refresh_token, expires_at) VALUES (?, ?, ?)"
        )
        .bind(&new_access_token)
        .bind(&new_refresh_token)
        .bind(new_expires_at.to_rfc3339())
        .execute(&self.pool)
        .await
        .map_err(|e| e.to_string())?;

        println!("✅ HH token refreshed successfully");
        Ok(new_access_token)
    }

    async fn sync_anime(&self) -> Result<(), String> {
        println!("🎬 Starting daily anime sync...");

        use crate::anime::{GoogleSheetsClient, ShikimoriClient};

        const SHEET_ID: &str = "1Dr02PNJp4W6lJnI31ohN-jkZWIL4Jylww6vVrPVrYfs";

        let sheets_client = GoogleSheetsClient::new(SHEET_ID.to_string());
        let _shikimori_client = ShikimoriClient::new();

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
