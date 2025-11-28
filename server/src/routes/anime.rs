use crate::anime::models::{AnimeAuction, AnimeAuctionResponse};
use crate::anime::{GoogleSheetsClient, ShikimoriClient};
use crate::guards::AuthGuard;
use crate::models::ApiResponse;
use rocket::serde::json::Json;
use rocket::{get, post, State};
use serde::{Deserialize, Serialize};

use chrono::Datelike;
use sqlx::SqlitePool;

const SHEET_ID: &str = "1Dr02PNJp4W6lJnI31ohN-jkZWIL4Jylww6vVrPVrYfs";

#[get("/anime/upcoming")]
pub async fn get_upcoming_anime(
    _auth: AuthGuard,
    pool: &State<SqlitePool>,
) -> Json<ApiResponse<Vec<AnimeAuctionResponse>>> {
    let animes: Vec<AnimeAuction> = match sqlx::query_as::<_, AnimeAuction>(
        "SELECT * FROM anime_auction WHERE watched = 0 ORDER BY
         CASE WHEN date IS NULL THEN 1 ELSE 0 END,
         date ASC"
    )
    .fetch_all(pool.inner())
    .await
    {
        Ok(a) => {
            println!("📺 Found {} upcoming anime", a.len());
            a
        },
        Err(e) => {
            eprintln!("❌ Database error getting upcoming anime: {}", e);
            return Json(ApiResponse::error(format!("Database error: {}", e)));
        }
    };

    let response: Vec<AnimeAuctionResponse> = animes
        .into_iter()
        .map(|anime| AnimeAuctionResponse {
            has_date: anime.date.is_some(),
            is_upcoming: true,
            anime,
        })
        .collect();

    Json(ApiResponse::success(response))
}

#[get("/anime/watched")]
pub async fn get_watched_anime(
    _auth: AuthGuard,
    pool: &State<SqlitePool>,
) -> Json<ApiResponse<Vec<AnimeAuctionResponse>>> {
    let animes: Vec<AnimeAuction> = match sqlx::query_as::<_, AnimeAuction>(
        "SELECT * FROM anime_auction WHERE watched = 1 ORDER BY date DESC"
    )
    .fetch_all(pool.inner())
    .await
    {
        Ok(a) => {
            println!("📺 Found {} watched anime", a.len());
            a
        },
        Err(e) => {
            eprintln!("❌ Database error getting watched anime: {}", e);
            return Json(ApiResponse::error(format!("Database error: {}", e)));
        }
    };

    let response: Vec<AnimeAuctionResponse> = animes
        .into_iter()
        .map(|anime| AnimeAuctionResponse {
            has_date: anime.date.is_some(),
            is_upcoming: false,
            anime,
        })
        .collect();

    Json(ApiResponse::success(response))
}

#[allow(dead_code)]
#[derive(Serialize)]
pub struct SyncResponse {
    pub synced: usize,
    pub errors: usize,
}

#[derive(Serialize, Deserialize, sqlx::FromRow)]
pub struct SyncProgress {
    pub id: i64,
    pub status: String,
    pub current: i64,
    pub total: i64,
    pub message: Option<String>,
    pub started_at: String,
    pub finished_at: Option<String>,
}

#[get("/anime/sync/progress")]
pub async fn get_sync_progress(
    _auth: AuthGuard,
    pool: &State<SqlitePool>,
) -> Json<ApiResponse<Option<SyncProgress>>> {
    let progress: Option<SyncProgress> = sqlx::query_as::<sqlx::Sqlite, SyncProgress>(
        "SELECT * FROM anime_sync_progress ORDER BY id DESC LIMIT 1"
    )
    .fetch_optional(pool.inner())
    .await
    .ok()
    .flatten();

    Json(ApiResponse::success(progress))
}

#[post("/anime/sync")]
pub async fn sync_anime_data(
    _auth: AuthGuard,
    pool: &State<SqlitePool>,
) -> Json<ApiResponse<String>> {
    // Check if sync is already running
    let existing: Option<(i64,)> = sqlx::query_as::<sqlx::Sqlite, (i64,)>(
        "SELECT id FROM anime_sync_progress WHERE status = 'running' LIMIT 1"
    )
    .fetch_optional(pool.inner())
    .await
    .ok()
    .flatten();

    if existing.is_some() {
        return Json(ApiResponse::error("Синхронизация уже выполняется".to_string()));
    }

    // Create new progress record
    let progress_id: i64 = sqlx::query_scalar::<sqlx::Sqlite, i64>(
        "INSERT INTO anime_sync_progress (status, message) VALUES ('running', 'Начало синхронизации...') RETURNING id"
    )
    .fetch_one(pool.inner())
    .await
    .unwrap_or(0);

    // Spawn background task
    let pool_clone = pool.inner().clone();
    tokio::spawn(async move {
        run_sync_task(pool_clone, progress_id).await;
    });

    Json(ApiResponse::success("Синхронизация запущена".to_string()))
}

async fn run_sync_task(pool: SqlitePool, progress_id: i64) {
    println!("🎬 Starting anime sync task (progress_id: {})", progress_id);

    let sheets_client = GoogleSheetsClient::new(SHEET_ID.to_string());
    let shikimori_client = ShikimoriClient::new();

    let mut total_synced = 0;
    let mut total_errors = 0;

    // Try to sync all years from 2020 to current year + 1
    let current_year = chrono::Utc::now().year() as i64;
    let years: Vec<i64> = (2020..=current_year + 1).collect();

    println!("📅 Will sync years: {:?}", years);

    // Update total count
    let _: Result<sqlx::sqlite::SqliteQueryResult, sqlx::Error> = sqlx::query::<sqlx::Sqlite>(
        "UPDATE anime_sync_progress SET total = $1, message = $2 WHERE id = $3"
    )
    .bind(years.len() as i64)
    .bind("Загрузка данных...")
    .bind(progress_id)
    .execute(&pool)
    .await;

    for (idx, &year) in years.iter().enumerate() {
        // Update progress
        println!("📊 Processing year {} ({}/{})", year, idx + 1, years.len());

        let _: Result<sqlx::sqlite::SqliteQueryResult, sqlx::Error> = sqlx::query::<sqlx::Sqlite>(
            "UPDATE anime_sync_progress SET current = $1, message = $2 WHERE id = $3"
        )
        .bind((idx + 1) as i64)
        .bind(format!("Обработка {} года... ({}/{})", year, idx + 1, years.len()))
        .bind(progress_id)
        .execute(&pool)
        .await;

        let rows = match sheets_client.fetch_sheet_data(year).await {
            Ok(r) => {
                println!("✅ Fetched {} rows for year {}", r.len(), year);
                r
            },
            Err(e) => {
                eprintln!("❌ Error fetching sheet for year {}: {}", year, e);
                total_errors += 1;
                continue;
            }
        };

        for row in rows {
            // Check if anime already exists
            let existing: Option<(i64,)> = sqlx::query_as::<sqlx::Sqlite, (i64,)>(
                "SELECT id FROM anime_auction WHERE title = $1 AND year = $2"
            )
            .bind(&row.title)
            .bind(year)
            .fetch_optional(&pool)
            .await
            .ok()
            .flatten();

            let sheets_url = format!(
                "https://docs.google.com/spreadsheets/d/{}/edit#gid={}",
                SHEET_ID,
                match year {
                    2020 => "0",
                    2021 => "1",
                    2022 => "2",
                    2023 => "3",
                    2024 => "4",
                    2025 => "5",
                    _ => "0",
                }
            );

            if existing.is_some() {
                // Update existing record
                let result: Result<sqlx::sqlite::SqliteQueryResult, sqlx::Error> = sqlx::query(
                    r#"
                    UPDATE anime_auction
                    SET date = $1, watched = $2, season = $3, episodes = $4,
                        voice_acting = $5, buyer = $6, chat_rating = $7,
                        sheikh_rating = $8, streamer_rating = $9, vod_link = $10,
                        sheets_url = $11, updated_at = datetime('now')
                    WHERE title = $12 AND year = $13
                    "#
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
                .bind(year)
                .execute(&pool)
                .await;

                if result.is_ok() {
                    total_synced += 1;
                } else {
                    total_errors += 1;
                }
            } else {
                // Fetch Shikimori data
                let search_title = ShikimoriClient::prepare_title_for_search(&row.title);
                let shikimori_data = shikimori_client.search_anime(&search_title).await.ok()
                    .and_then(|results| results.into_iter().next());

                let (shikimori_id, shikimori_name, shikimori_score, shikimori_cover) =
                    if let Some(anime) = shikimori_data {
                        let cover = shikimori_client.get_cover_url(anime.id);
                        let score = anime.score.and_then(|s| s.parse::<f64>().ok());
                        (Some(anime.id), anime.russian.or(Some(anime.name)), score, Some(cover))
                    } else {
                        (None, None, None, None)
                    };

                // Get detailed description and genres if we have ID
                let (shikimori_description, shikimori_genres) = if let Some(id) = shikimori_id {
                    if let Ok(details) = shikimori_client.get_anime_details(id).await {
                        let genres = details.genres
                            .map(|g| g.iter().map(|genre| genre.russian.clone()).collect::<Vec<_>>().join(", "));
                        (details.description, genres)
                    } else {
                        (None, None)
                    }
                } else {
                    (None, None)
                };

                // Insert new record
                let result: Result<sqlx::sqlite::SqliteQueryResult, sqlx::Error> = sqlx::query(
                    r#"
                    INSERT INTO anime_auction
                    (date, title, watched, season, episodes, voice_acting, buyer,
                     chat_rating, sheikh_rating, streamer_rating, vod_link, sheets_url, year,
                     shikimori_id, shikimori_name, shikimori_description,
                     shikimori_cover, shikimori_score, shikimori_genres)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
                    "#
                )
                .bind(&row.date)
                .bind(&row.title)
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
                .bind(year)
                .bind(shikimori_id)
                .bind(&shikimori_name)
                .bind(&shikimori_description)
                .bind(&shikimori_cover)
                .bind(shikimori_score)
                .bind(&shikimori_genres)
                .execute(&pool)
                .await;

                if result.is_ok() {
                    total_synced += 1;
                    // Rate limiting for Shikimori API
                    tokio::time::sleep(tokio::time::Duration::from_millis(500)).await;
                } else {
                    total_errors += 1;
                }
            }
        }
    }

    // Mark as completed
    let final_message = format!("✅ Завершено! Синхронизировано: {}, ошибок: {}", total_synced, total_errors);
    println!("{}", final_message);

    let _: Result<sqlx::sqlite::SqliteQueryResult, sqlx::Error> = sqlx::query(
        "UPDATE anime_sync_progress SET status = 'completed', current = total, message = $1, finished_at = datetime('now') WHERE id = $2"
    )
    .bind(&final_message)
    .bind(progress_id)
    .execute(&pool)
    .await;

    println!("🎬 Anime sync task completed (progress_id: {})", progress_id);
}
