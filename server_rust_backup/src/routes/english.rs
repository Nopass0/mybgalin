use crate::guards::AuthGuard;
use crate::models::ApiResponse;
use rocket::serde::json::Json;
use rocket::{delete, get, post, put, State};
use serde::{Deserialize, Serialize};
use sqlx::SqlitePool;
use chrono::{Utc, Duration, NaiveDateTime};

// ============ Models ============

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct EnglishCategory {
    pub id: i32,
    pub name: String,
    pub name_ru: String,
    pub description: Option<String>,
    pub icon: Option<String>,
    pub color: Option<String>,
    pub word_count: i32,
    pub display_order: i32,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct EnglishWord {
    pub id: i32,
    pub category_id: Option<i32>,
    pub word: String,
    pub transcription: Option<String>,
    pub translation: String,
    pub definition: Option<String>,
    pub part_of_speech: Option<String>,
    pub examples: Option<String>,
    pub synonyms: Option<String>,
    pub antonyms: Option<String>,
    pub audio_url: Option<String>,
    pub image_url: Option<String>,
    pub difficulty: i32,
    pub frequency: i32,
    pub cefr_level: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct WordProgress {
    pub id: i32,
    pub word_id: i32,
    pub ease_factor: f64,
    pub interval_days: i32,
    pub repetitions: i32,
    pub next_review: Option<String>,
    pub last_review: Option<String>,
    pub correct_count: i32,
    pub incorrect_count: i32,
    pub status: String,
    pub mastery_level: i32,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct WordWithProgress {
    #[serde(flatten)]
    pub word: EnglishWord,
    pub progress: Option<WordProgress>,
    pub category_name: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct EnglishGrammar {
    pub id: i32,
    pub title: String,
    pub title_ru: String,
    pub category: String,
    pub difficulty: i32,
    pub cefr_level: Option<String>,
    pub explanation: String,
    pub explanation_ru: String,
    pub examples: Option<String>,
    pub common_mistakes: Option<String>,
    pub tips: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct EnglishSettings {
    pub id: i32,
    pub daily_goal_words: i32,
    pub daily_goal_minutes: i32,
    pub preferred_difficulty: i32,
    pub show_transcription: bool,
    pub show_examples: bool,
    pub auto_play_audio: bool,
    pub review_notification: bool,
    pub current_streak: i32,
    pub longest_streak: i32,
    pub total_xp: i32,
    pub level: i32,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct EnglishDailyStats {
    pub id: i32,
    pub date: String,
    pub words_learned: i32,
    pub words_reviewed: i32,
    pub new_words_added: i32,
    pub quizzes_completed: i32,
    pub correct_answers: i32,
    pub incorrect_answers: i32,
    pub time_spent_minutes: i32,
    pub streak_days: i32,
    pub xp_earned: i32,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct EnglishAchievement {
    pub id: i32,
    pub achievement_type: String,
    pub title: String,
    pub description: String,
    pub icon: Option<String>,
    pub xp_reward: i32,
    pub unlocked_at: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct QuizResult {
    pub id: i32,
    pub quiz_type: String,
    pub category_id: Option<i32>,
    pub score: i32,
    pub total_questions: i32,
    pub correct_answers: i32,
    pub time_spent_seconds: Option<i32>,
    pub details: Option<String>,
    pub created_at: String,
}

// ============ Request/Response Types ============

#[derive(Debug, Deserialize)]
pub struct AddWordRequest {
    pub word: String,
    pub translation: String,
    pub category_id: Option<i32>,
    pub transcription: Option<String>,
    pub definition: Option<String>,
    pub part_of_speech: Option<String>,
    pub examples: Option<String>,
    pub synonyms: Option<String>,
    pub antonyms: Option<String>,
    pub difficulty: Option<i32>,
    pub cefr_level: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct ReviewWordRequest {
    pub word_id: i32,
    pub quality: i32, // 0-5 based on SM-2 algorithm
}

#[derive(Debug, Deserialize)]
pub struct SaveQuizResultRequest {
    pub quiz_type: String,
    pub category_id: Option<i32>,
    pub score: i32,
    pub total_questions: i32,
    pub correct_answers: i32,
    pub time_spent_seconds: Option<i32>,
    pub details: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateSettingsRequest {
    pub daily_goal_words: Option<i32>,
    pub daily_goal_minutes: Option<i32>,
    pub preferred_difficulty: Option<i32>,
    pub show_transcription: Option<bool>,
    pub show_examples: Option<bool>,
    pub auto_play_audio: Option<bool>,
    pub review_notification: Option<bool>,
}

#[derive(Debug, Deserialize)]
pub struct ImportWordsRequest {
    pub source: String, // "frequency_list", "category", "custom"
    pub category_id: Option<i32>,
    pub words: Option<Vec<AddWordRequest>>,
    pub count: Option<i32>,
}

#[derive(Debug, Serialize)]
pub struct DashboardStats {
    pub total_words: i32,
    pub words_learned: i32,
    pub words_to_review: i32,
    pub current_streak: i32,
    pub total_xp: i32,
    pub level: i32,
    pub today_words_learned: i32,
    pub today_goal: i32,
    pub weekly_progress: Vec<DayProgress>,
    pub category_progress: Vec<CategoryProgress>,
}

#[derive(Debug, Serialize)]
pub struct DayProgress {
    pub date: String,
    pub words_learned: i32,
    pub words_reviewed: i32,
    pub xp_earned: i32,
}

#[derive(Debug, Serialize)]
pub struct CategoryProgress {
    pub category_id: i32,
    pub category_name: String,
    pub total_words: i32,
    pub learned_words: i32,
    pub mastery_percent: f64,
}

#[derive(Debug, Serialize)]
pub struct FlashcardSession {
    pub words: Vec<WordWithProgress>,
    pub session_id: i64,
}

#[derive(Debug, Serialize)]
pub struct QuizQuestion {
    pub id: i32,
    pub question_type: String,
    pub word: EnglishWord,
    pub options: Vec<String>,
    pub correct_answer: String,
}

// ============ Categories Routes ============

#[get("/english/categories")]
pub async fn get_categories(
    _auth: AuthGuard,
    pool: &State<SqlitePool>,
) -> Json<ApiResponse<Vec<EnglishCategory>>> {
    let categories = sqlx::query_as::<_, EnglishCategory>(
        r#"
        SELECT c.*,
               COALESCE((SELECT COUNT(*) FROM english_words WHERE category_id = c.id), 0) as word_count
        FROM english_categories c
        ORDER BY display_order
        "#
    )
    .fetch_all(pool.inner())
    .await
    .unwrap_or_default();

    Json(ApiResponse::success(categories))
}

#[post("/english/categories", data = "<category>")]
pub async fn create_category(
    _auth: AuthGuard,
    pool: &State<SqlitePool>,
    category: Json<EnglishCategory>,
) -> Json<ApiResponse<EnglishCategory>> {
    let result = sqlx::query_as::<_, EnglishCategory>(
        r#"
        INSERT INTO english_categories (name, name_ru, description, icon, color, display_order)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
        "#
    )
    .bind(&category.name)
    .bind(&category.name_ru)
    .bind(&category.description)
    .bind(&category.icon)
    .bind(&category.color)
    .bind(category.display_order)
    .fetch_one(pool.inner())
    .await;

    match result {
        Ok(cat) => Json(ApiResponse::success(cat)),
        Err(e) => Json(ApiResponse::error(format!("Failed to create category: {}", e))),
    }
}

// ============ Words Routes ============

#[get("/english/words?<category_id>&<search>&<status>&<limit>&<offset>")]
pub async fn get_words(
    _auth: AuthGuard,
    pool: &State<SqlitePool>,
    category_id: Option<i32>,
    search: Option<String>,
    status: Option<String>,
    limit: Option<i32>,
    offset: Option<i32>,
) -> Json<ApiResponse<Vec<WordWithProgress>>> {
    let limit = limit.unwrap_or(50);
    let offset = offset.unwrap_or(0);

    let mut query = String::from(
        r#"
        SELECT w.*, p.id as progress_id, p.ease_factor, p.interval_days, p.repetitions,
               p.next_review, p.last_review, p.correct_count, p.incorrect_count,
               p.status, p.mastery_level, p.created_at as progress_created_at, p.updated_at,
               c.name as category_name
        FROM english_words w
        LEFT JOIN english_word_progress p ON w.id = p.word_id
        LEFT JOIN english_categories c ON w.category_id = c.id
        WHERE 1=1
        "#
    );

    if let Some(cat_id) = category_id {
        query.push_str(&format!(" AND w.category_id = {}", cat_id));
    }

    if let Some(ref s) = search {
        query.push_str(&format!(" AND (w.word LIKE '%{}%' OR w.translation LIKE '%{}%')", s, s));
    }

    if let Some(ref st) = status {
        query.push_str(&format!(" AND COALESCE(p.status, 'new') = '{}'", st));
    }

    query.push_str(&format!(" ORDER BY w.created_at DESC LIMIT {} OFFSET {}", limit, offset));

    let rows = sqlx::query(&query)
        .fetch_all(pool.inner())
        .await
        .unwrap_or_default();

    let words: Vec<WordWithProgress> = rows.iter().map(|row| {
        use sqlx::Row;
        WordWithProgress {
            word: EnglishWord {
                id: row.get("id"),
                category_id: row.get("category_id"),
                word: row.get("word"),
                transcription: row.get("transcription"),
                translation: row.get("translation"),
                definition: row.get("definition"),
                part_of_speech: row.get("part_of_speech"),
                examples: row.get("examples"),
                synonyms: row.get("synonyms"),
                antonyms: row.get("antonyms"),
                audio_url: row.get("audio_url"),
                image_url: row.get("image_url"),
                difficulty: row.get("difficulty"),
                frequency: row.get("frequency"),
                cefr_level: row.get("cefr_level"),
                created_at: row.get("created_at"),
            },
            progress: row.get::<Option<i32>, _>("progress_id").map(|_| WordProgress {
                id: row.get("progress_id"),
                word_id: row.get("id"),
                ease_factor: row.get("ease_factor"),
                interval_days: row.get("interval_days"),
                repetitions: row.get("repetitions"),
                next_review: row.get("next_review"),
                last_review: row.get("last_review"),
                correct_count: row.get("correct_count"),
                incorrect_count: row.get("incorrect_count"),
                status: row.get("status"),
                mastery_level: row.get("mastery_level"),
                created_at: row.get("progress_created_at"),
                updated_at: row.get("updated_at"),
            }),
            category_name: row.get("category_name"),
        }
    }).collect();

    Json(ApiResponse::success(words))
}

#[post("/english/words", data = "<word>")]
pub async fn add_word(
    _auth: AuthGuard,
    pool: &State<SqlitePool>,
    word: Json<AddWordRequest>,
) -> Json<ApiResponse<EnglishWord>> {
    let result = sqlx::query_as::<_, EnglishWord>(
        r#"
        INSERT INTO english_words
        (word, translation, category_id, transcription, definition, part_of_speech,
         examples, synonyms, antonyms, difficulty, cefr_level)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *
        "#
    )
    .bind(&word.word)
    .bind(&word.translation)
    .bind(word.category_id)
    .bind(&word.transcription)
    .bind(&word.definition)
    .bind(&word.part_of_speech)
    .bind(&word.examples)
    .bind(&word.synonyms)
    .bind(&word.antonyms)
    .bind(word.difficulty.unwrap_or(1))
    .bind(&word.cefr_level)
    .fetch_one(pool.inner())
    .await;

    match result {
        Ok(w) => {
            // Update daily stats
            update_daily_stat(pool.inner(), "new_words_added", 1).await;
            // Award XP
            add_xp(pool.inner(), 5).await;
            Json(ApiResponse::success(w))
        }
        Err(e) => Json(ApiResponse::error(format!("Failed to add word: {}", e))),
    }
}

#[delete("/english/words/<id>")]
pub async fn delete_word(
    _auth: AuthGuard,
    pool: &State<SqlitePool>,
    id: i32,
) -> Json<ApiResponse<()>> {
    let result = sqlx::query("DELETE FROM english_words WHERE id = $1")
        .bind(id)
        .execute(pool.inner())
        .await;

    match result {
        Ok(_) => Json(ApiResponse::success(())),
        Err(e) => Json(ApiResponse::error(format!("Failed to delete word: {}", e))),
    }
}

// ============ SRS Review Routes ============

#[get("/english/review/due?<limit>")]
pub async fn get_due_words(
    _auth: AuthGuard,
    pool: &State<SqlitePool>,
    limit: Option<i32>,
) -> Json<ApiResponse<Vec<WordWithProgress>>> {
    let limit = limit.unwrap_or(20);
    let now = Utc::now().format("%Y-%m-%d %H:%M:%S").to_string();

    let rows = sqlx::query(&format!(
        r#"
        SELECT w.*, p.id as progress_id, p.ease_factor, p.interval_days, p.repetitions,
               p.next_review, p.last_review, p.correct_count, p.incorrect_count,
               p.status, p.mastery_level, p.created_at as progress_created_at, p.updated_at,
               c.name as category_name
        FROM english_words w
        LEFT JOIN english_word_progress p ON w.id = p.word_id
        LEFT JOIN english_categories c ON w.category_id = c.id
        WHERE p.next_review IS NULL OR p.next_review <= '{}'
        ORDER BY
            CASE WHEN p.next_review IS NULL THEN 0 ELSE 1 END,
            p.next_review ASC
        LIMIT {}
        "#,
        now, limit
    ))
    .fetch_all(pool.inner())
    .await
    .unwrap_or_default();

    let words: Vec<WordWithProgress> = rows.iter().map(|row| {
        use sqlx::Row;
        WordWithProgress {
            word: EnglishWord {
                id: row.get("id"),
                category_id: row.get("category_id"),
                word: row.get("word"),
                transcription: row.get("transcription"),
                translation: row.get("translation"),
                definition: row.get("definition"),
                part_of_speech: row.get("part_of_speech"),
                examples: row.get("examples"),
                synonyms: row.get("synonyms"),
                antonyms: row.get("antonyms"),
                audio_url: row.get("audio_url"),
                image_url: row.get("image_url"),
                difficulty: row.get("difficulty"),
                frequency: row.get("frequency"),
                cefr_level: row.get("cefr_level"),
                created_at: row.get("created_at"),
            },
            progress: row.get::<Option<i32>, _>("progress_id").map(|_| WordProgress {
                id: row.get("progress_id"),
                word_id: row.get("id"),
                ease_factor: row.get("ease_factor"),
                interval_days: row.get("interval_days"),
                repetitions: row.get("repetitions"),
                next_review: row.get("next_review"),
                last_review: row.get("last_review"),
                correct_count: row.get("correct_count"),
                incorrect_count: row.get("incorrect_count"),
                status: row.get("status"),
                mastery_level: row.get("mastery_level"),
                created_at: row.get("progress_created_at"),
                updated_at: row.get("updated_at"),
            }),
            category_name: row.get("category_name"),
        }
    }).collect();

    Json(ApiResponse::success(words))
}

#[post("/english/review", data = "<review>")]
pub async fn submit_review(
    _auth: AuthGuard,
    pool: &State<SqlitePool>,
    review: Json<ReviewWordRequest>,
) -> Json<ApiResponse<WordProgress>> {
    // Get current progress or create new
    let existing: Option<WordProgress> = sqlx::query_as(
        "SELECT * FROM english_word_progress WHERE word_id = $1"
    )
    .bind(review.word_id)
    .fetch_optional(pool.inner())
    .await
    .ok()
    .flatten();

    let quality = review.quality.clamp(0, 5);
    let now = Utc::now();
    let now_str = now.format("%Y-%m-%d %H:%M:%S").to_string();

    // SM-2 Algorithm implementation
    let (new_ef, new_interval, new_reps, status) = if let Some(ref prog) = existing {
        let mut ef = prog.ease_factor;
        let mut interval = prog.interval_days;
        let mut reps = prog.repetitions;

        if quality >= 3 {
            // Correct response
            if reps == 0 {
                interval = 1;
            } else if reps == 1 {
                interval = 6;
            } else {
                interval = (interval as f64 * ef).round() as i32;
            }
            reps += 1;
            ef = ef + (0.1 - (5 - quality) as f64 * (0.08 + (5 - quality) as f64 * 0.02));
            if ef < 1.3 {
                ef = 1.3;
            }
        } else {
            // Incorrect response - reset
            reps = 0;
            interval = 1;
        }

        let status = if reps >= 5 && ef >= 2.5 {
            "mastered"
        } else if reps >= 1 {
            "learning"
        } else {
            "new"
        };

        (ef, interval, reps, status.to_string())
    } else {
        // New word
        let interval = if quality >= 3 { 1 } else { 0 };
        let status = if quality >= 3 { "learning" } else { "new" };
        (2.5, interval, if quality >= 3 { 1 } else { 0 }, status.to_string())
    };

    let next_review = (now + Duration::days(new_interval as i64))
        .format("%Y-%m-%d %H:%M:%S")
        .to_string();

    let mastery_level = ((new_reps as f64 / 10.0) * 100.0).min(100.0) as i32;

    let result = if existing.is_some() {
        sqlx::query_as::<_, WordProgress>(
            r#"
            UPDATE english_word_progress
            SET ease_factor = $1, interval_days = $2, repetitions = $3,
                next_review = $4, last_review = $5, status = $6,
                mastery_level = $7, updated_at = $8,
                correct_count = correct_count + $9,
                incorrect_count = incorrect_count + $10
            WHERE word_id = $11
            RETURNING *
            "#
        )
        .bind(new_ef)
        .bind(new_interval)
        .bind(new_reps)
        .bind(&next_review)
        .bind(&now_str)
        .bind(&status)
        .bind(mastery_level)
        .bind(&now_str)
        .bind(if quality >= 3 { 1 } else { 0 })
        .bind(if quality < 3 { 1 } else { 0 })
        .bind(review.word_id)
        .fetch_one(pool.inner())
        .await
    } else {
        sqlx::query_as::<_, WordProgress>(
            r#"
            INSERT INTO english_word_progress
            (word_id, ease_factor, interval_days, repetitions, next_review, last_review,
             status, mastery_level, correct_count, incorrect_count)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING *
            "#
        )
        .bind(review.word_id)
        .bind(new_ef)
        .bind(new_interval)
        .bind(new_reps)
        .bind(&next_review)
        .bind(&now_str)
        .bind(&status)
        .bind(mastery_level)
        .bind(if quality >= 3 { 1 } else { 0 })
        .bind(if quality < 3 { 1 } else { 0 })
        .fetch_one(pool.inner())
        .await
    };

    // Update daily stats
    if quality >= 3 {
        update_daily_stat(pool.inner(), "words_reviewed", 1).await;
        update_daily_stat(pool.inner(), "correct_answers", 1).await;
        add_xp(pool.inner(), 10).await;
    } else {
        update_daily_stat(pool.inner(), "incorrect_answers", 1).await;
    }

    // Check for first word achievement
    if existing.is_none() {
        update_daily_stat(pool.inner(), "words_learned", 1).await;
        check_achievements(pool.inner()).await;
    }

    match result {
        Ok(progress) => Json(ApiResponse::success(progress)),
        Err(e) => Json(ApiResponse::error(format!("Failed to save review: {}", e))),
    }
}

// ============ Flashcards Routes ============

#[get("/english/flashcards?<category_id>&<count>&<mode>")]
pub async fn get_flashcards(
    _auth: AuthGuard,
    pool: &State<SqlitePool>,
    category_id: Option<i32>,
    count: Option<i32>,
    mode: Option<String>, // "new", "review", "mixed"
) -> Json<ApiResponse<FlashcardSession>> {
    let count = count.unwrap_or(10);
    let mode = mode.unwrap_or_else(|| "mixed".to_string());
    let now = Utc::now().format("%Y-%m-%d %H:%M:%S").to_string();

    let query = match mode.as_str() {
        "new" => format!(
            r#"
            SELECT w.*, c.name as category_name
            FROM english_words w
            LEFT JOIN english_categories c ON w.category_id = c.id
            LEFT JOIN english_word_progress p ON w.id = p.word_id
            WHERE p.id IS NULL {}
            ORDER BY RANDOM()
            LIMIT {}
            "#,
            category_id.map(|id| format!("AND w.category_id = {}", id)).unwrap_or_default(),
            count
        ),
        "review" => format!(
            r#"
            SELECT w.*, c.name as category_name
            FROM english_words w
            LEFT JOIN english_categories c ON w.category_id = c.id
            JOIN english_word_progress p ON w.id = p.word_id
            WHERE p.next_review <= '{}' {}
            ORDER BY p.next_review ASC
            LIMIT {}
            "#,
            now,
            category_id.map(|id| format!("AND w.category_id = {}", id)).unwrap_or_default(),
            count
        ),
        _ => format!(
            r#"
            SELECT w.*, c.name as category_name
            FROM english_words w
            LEFT JOIN english_categories c ON w.category_id = c.id
            LEFT JOIN english_word_progress p ON w.id = p.word_id
            WHERE (p.id IS NULL OR p.next_review <= '{}') {}
            ORDER BY
                CASE WHEN p.id IS NULL THEN 0 ELSE 1 END,
                RANDOM()
            LIMIT {}
            "#,
            now,
            category_id.map(|id| format!("AND w.category_id = {}", id)).unwrap_or_default(),
            count
        ),
    };

    let rows = sqlx::query(&query)
        .fetch_all(pool.inner())
        .await
        .unwrap_or_default();

    let words: Vec<WordWithProgress> = rows.iter().map(|row| {
        use sqlx::Row;
        WordWithProgress {
            word: EnglishWord {
                id: row.get("id"),
                category_id: row.get("category_id"),
                word: row.get("word"),
                transcription: row.get("transcription"),
                translation: row.get("translation"),
                definition: row.get("definition"),
                part_of_speech: row.get("part_of_speech"),
                examples: row.get("examples"),
                synonyms: row.get("synonyms"),
                antonyms: row.get("antonyms"),
                audio_url: row.get("audio_url"),
                image_url: row.get("image_url"),
                difficulty: row.get("difficulty"),
                frequency: row.get("frequency"),
                cefr_level: row.get("cefr_level"),
                created_at: row.get("created_at"),
            },
            progress: None,
            category_name: row.get("category_name"),
        }
    }).collect();

    // Create session
    let session_id = Utc::now().timestamp();
    let _ = sqlx::query(
        "INSERT INTO english_sessions (session_type, started_at) VALUES ('flashcards', datetime('now'))"
    )
    .execute(pool.inner())
    .await;

    Json(ApiResponse::success(FlashcardSession { words, session_id }))
}

// ============ Quiz Routes ============

#[get("/english/quiz?<category_id>&<count>&<quiz_type>")]
pub async fn get_quiz(
    _auth: AuthGuard,
    pool: &State<SqlitePool>,
    category_id: Option<i32>,
    count: Option<i32>,
    quiz_type: Option<String>, // "translation", "word", "mixed", "spelling"
) -> Json<ApiResponse<Vec<QuizQuestion>>> {
    let count = count.unwrap_or(10);
    let quiz_type = quiz_type.unwrap_or_else(|| "mixed".to_string());

    let category_filter = category_id
        .map(|id| format!("WHERE category_id = {}", id))
        .unwrap_or_default();

    // Get random words for quiz
    let words: Vec<EnglishWord> = sqlx::query_as(&format!(
        "SELECT * FROM english_words {} ORDER BY RANDOM() LIMIT {}",
        category_filter, count
    ))
    .fetch_all(pool.inner())
    .await
    .unwrap_or_default();

    // Get all translations for wrong options
    let all_translations: Vec<String> = sqlx::query_scalar(
        "SELECT DISTINCT translation FROM english_words"
    )
    .fetch_all(pool.inner())
    .await
    .unwrap_or_default();

    let all_words: Vec<String> = sqlx::query_scalar(
        "SELECT DISTINCT word FROM english_words"
    )
    .fetch_all(pool.inner())
    .await
    .unwrap_or_default();

    let mut questions: Vec<QuizQuestion> = Vec::new();

    for (idx, word) in words.iter().enumerate() {
        let question_type = match quiz_type.as_str() {
            "translation" => "translation",
            "word" => "word",
            "spelling" => "spelling",
            _ => if idx % 2 == 0 { "translation" } else { "word" },
        };

        let (options, correct) = match question_type {
            "translation" => {
                let mut opts: Vec<String> = all_translations.iter()
                    .filter(|t| *t != &word.translation)
                    .take(3)
                    .cloned()
                    .collect();
                opts.push(word.translation.clone());
                use rand::seq::SliceRandom;
                let mut rng = rand::thread_rng();
                opts.shuffle(&mut rng);
                (opts, word.translation.clone())
            }
            "word" => {
                let mut opts: Vec<String> = all_words.iter()
                    .filter(|w| *w != &word.word)
                    .take(3)
                    .cloned()
                    .collect();
                opts.push(word.word.clone());
                use rand::seq::SliceRandom;
                let mut rng = rand::thread_rng();
                opts.shuffle(&mut rng);
                (opts, word.word.clone())
            }
            _ => {
                (vec![], word.word.clone())
            }
        };

        questions.push(QuizQuestion {
            id: idx as i32 + 1,
            question_type: question_type.to_string(),
            word: word.clone(),
            options,
            correct_answer: correct,
        });
    }

    Json(ApiResponse::success(questions))
}

#[post("/english/quiz/result", data = "<result>")]
pub async fn save_quiz_result(
    _auth: AuthGuard,
    pool: &State<SqlitePool>,
    result: Json<SaveQuizResultRequest>,
) -> Json<ApiResponse<QuizResult>> {
    let saved = sqlx::query_as::<_, QuizResult>(
        r#"
        INSERT INTO english_quiz_results
        (quiz_type, category_id, score, total_questions, correct_answers, time_spent_seconds, details)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
        "#
    )
    .bind(&result.quiz_type)
    .bind(result.category_id)
    .bind(result.score)
    .bind(result.total_questions)
    .bind(result.correct_answers)
    .bind(result.time_spent_seconds)
    .bind(&result.details)
    .fetch_one(pool.inner())
    .await;

    // Update daily stats
    update_daily_stat(pool.inner(), "quizzes_completed", 1).await;

    // Award XP based on score
    let xp = (result.score as f64 * 0.5) as i32;
    add_xp(pool.inner(), xp).await;

    // Check for perfect score achievement
    if result.correct_answers == result.total_questions {
        unlock_achievement(pool.inner(), "perfect_quiz").await;
    }

    match saved {
        Ok(r) => Json(ApiResponse::success(r)),
        Err(e) => Json(ApiResponse::error(format!("Failed to save quiz result: {}", e))),
    }
}

// ============ Grammar Routes ============

#[get("/english/grammar?<category>&<difficulty>")]
pub async fn get_grammar(
    _auth: AuthGuard,
    pool: &State<SqlitePool>,
    category: Option<String>,
    difficulty: Option<i32>,
) -> Json<ApiResponse<Vec<EnglishGrammar>>> {
    let mut query = String::from("SELECT * FROM english_grammar WHERE 1=1");

    if let Some(cat) = category {
        query.push_str(&format!(" AND category = '{}'", cat));
    }
    if let Some(diff) = difficulty {
        query.push_str(&format!(" AND difficulty = {}", diff));
    }

    query.push_str(" ORDER BY difficulty, title");

    let grammar = sqlx::query_as::<_, EnglishGrammar>(&query)
        .fetch_all(pool.inner())
        .await
        .unwrap_or_default();

    Json(ApiResponse::success(grammar))
}

#[post("/english/grammar", data = "<grammar>")]
pub async fn add_grammar(
    _auth: AuthGuard,
    pool: &State<SqlitePool>,
    grammar: Json<EnglishGrammar>,
) -> Json<ApiResponse<EnglishGrammar>> {
    let result = sqlx::query_as::<_, EnglishGrammar>(
        r#"
        INSERT INTO english_grammar
        (title, title_ru, category, difficulty, cefr_level, explanation, explanation_ru, examples, common_mistakes, tips)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
        "#
    )
    .bind(&grammar.title)
    .bind(&grammar.title_ru)
    .bind(&grammar.category)
    .bind(grammar.difficulty)
    .bind(&grammar.cefr_level)
    .bind(&grammar.explanation)
    .bind(&grammar.explanation_ru)
    .bind(&grammar.examples)
    .bind(&grammar.common_mistakes)
    .bind(&grammar.tips)
    .fetch_one(pool.inner())
    .await;

    match result {
        Ok(g) => Json(ApiResponse::success(g)),
        Err(e) => Json(ApiResponse::error(format!("Failed to add grammar: {}", e))),
    }
}

// ============ Dashboard & Stats Routes ============

#[get("/english/dashboard")]
pub async fn get_dashboard(
    _auth: AuthGuard,
    pool: &State<SqlitePool>,
) -> Json<ApiResponse<DashboardStats>> {
    let now = Utc::now().format("%Y-%m-%d %H:%M:%S").to_string();
    let today = Utc::now().format("%Y-%m-%d").to_string();

    // Get total words
    let total_words: i32 = sqlx::query_scalar("SELECT COUNT(*) FROM english_words")
        .fetch_one(pool.inner())
        .await
        .unwrap_or(0);

    // Get words learned (have progress)
    let words_learned: i32 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM english_word_progress WHERE status != 'new'"
    )
    .fetch_one(pool.inner())
    .await
    .unwrap_or(0);

    // Get words to review
    let words_to_review: i32 = sqlx::query_scalar(&format!(
        "SELECT COUNT(*) FROM english_word_progress WHERE next_review <= '{}'",
        now
    ))
    .fetch_one(pool.inner())
    .await
    .unwrap_or(0);

    // Get settings
    let settings: Option<EnglishSettings> = sqlx::query_as(
        "SELECT * FROM english_settings WHERE id = 1"
    )
    .fetch_optional(pool.inner())
    .await
    .ok()
    .flatten();

    let (current_streak, total_xp, level, daily_goal) = settings
        .map(|s| (s.current_streak, s.total_xp, s.level, s.daily_goal_words))
        .unwrap_or((0, 0, 1, 10));

    // Get today's progress
    let today_stats: Option<EnglishDailyStats> = sqlx::query_as(&format!(
        "SELECT * FROM english_daily_stats WHERE date = '{}'",
        today
    ))
    .fetch_optional(pool.inner())
    .await
    .ok()
    .flatten();

    let today_words_learned = today_stats.map(|s| s.words_learned).unwrap_or(0);

    // Get weekly progress
    let week_ago = (Utc::now() - Duration::days(7)).format("%Y-%m-%d").to_string();
    let weekly_stats: Vec<EnglishDailyStats> = sqlx::query_as(&format!(
        "SELECT * FROM english_daily_stats WHERE date >= '{}' ORDER BY date",
        week_ago
    ))
    .fetch_all(pool.inner())
    .await
    .unwrap_or_default();

    let weekly_progress: Vec<DayProgress> = weekly_stats.iter().map(|s| DayProgress {
        date: s.date.clone(),
        words_learned: s.words_learned,
        words_reviewed: s.words_reviewed,
        xp_earned: s.xp_earned,
    }).collect();

    // Get category progress
    let categories: Vec<EnglishCategory> = sqlx::query_as(
        "SELECT * FROM english_categories ORDER BY display_order"
    )
    .fetch_all(pool.inner())
    .await
    .unwrap_or_default();

    let mut category_progress: Vec<CategoryProgress> = Vec::new();
    for cat in categories {
        let total: i32 = sqlx::query_scalar(&format!(
            "SELECT COUNT(*) FROM english_words WHERE category_id = {}",
            cat.id
        ))
        .fetch_one(pool.inner())
        .await
        .unwrap_or(0);

        let learned: i32 = sqlx::query_scalar(&format!(
            r#"
            SELECT COUNT(*) FROM english_word_progress p
            JOIN english_words w ON p.word_id = w.id
            WHERE w.category_id = {} AND p.status = 'mastered'
            "#,
            cat.id
        ))
        .fetch_one(pool.inner())
        .await
        .unwrap_or(0);

        let mastery = if total > 0 {
            (learned as f64 / total as f64) * 100.0
        } else {
            0.0
        };

        category_progress.push(CategoryProgress {
            category_id: cat.id,
            category_name: cat.name,
            total_words: total,
            learned_words: learned,
            mastery_percent: mastery,
        });
    }

    Json(ApiResponse::success(DashboardStats {
        total_words,
        words_learned,
        words_to_review,
        current_streak,
        total_xp,
        level,
        today_words_learned,
        today_goal: daily_goal,
        weekly_progress,
        category_progress,
    }))
}

#[get("/english/settings")]
pub async fn get_settings(
    _auth: AuthGuard,
    pool: &State<SqlitePool>,
) -> Json<ApiResponse<EnglishSettings>> {
    let settings = sqlx::query_as::<_, EnglishSettings>(
        "SELECT * FROM english_settings WHERE id = 1"
    )
    .fetch_one(pool.inner())
    .await;

    match settings {
        Ok(s) => Json(ApiResponse::success(s)),
        Err(e) => Json(ApiResponse::error(format!("Failed to get settings: {}", e))),
    }
}

#[put("/english/settings", data = "<settings>")]
pub async fn update_settings(
    _auth: AuthGuard,
    pool: &State<SqlitePool>,
    settings: Json<UpdateSettingsRequest>,
) -> Json<ApiResponse<EnglishSettings>> {
    let mut updates: Vec<String> = Vec::new();

    if let Some(v) = settings.daily_goal_words {
        updates.push(format!("daily_goal_words = {}", v));
    }
    if let Some(v) = settings.daily_goal_minutes {
        updates.push(format!("daily_goal_minutes = {}", v));
    }
    if let Some(v) = settings.preferred_difficulty {
        updates.push(format!("preferred_difficulty = {}", v));
    }
    if let Some(v) = settings.show_transcription {
        updates.push(format!("show_transcription = {}", v));
    }
    if let Some(v) = settings.show_examples {
        updates.push(format!("show_examples = {}", v));
    }
    if let Some(v) = settings.auto_play_audio {
        updates.push(format!("auto_play_audio = {}", v));
    }
    if let Some(v) = settings.review_notification {
        updates.push(format!("review_notification = {}", v));
    }

    updates.push("updated_at = datetime('now')".to_string());

    let query = format!(
        "UPDATE english_settings SET {} WHERE id = 1 RETURNING *",
        updates.join(", ")
    );

    let result = sqlx::query_as::<_, EnglishSettings>(&query)
        .fetch_one(pool.inner())
        .await;

    match result {
        Ok(s) => Json(ApiResponse::success(s)),
        Err(e) => Json(ApiResponse::error(format!("Failed to update settings: {}", e))),
    }
}

#[get("/english/achievements")]
pub async fn get_achievements(
    _auth: AuthGuard,
    pool: &State<SqlitePool>,
) -> Json<ApiResponse<Vec<EnglishAchievement>>> {
    let achievements = sqlx::query_as::<_, EnglishAchievement>(
        "SELECT * FROM english_achievements ORDER BY xp_reward"
    )
    .fetch_all(pool.inner())
    .await
    .unwrap_or_default();

    Json(ApiResponse::success(achievements))
}

// ============ Import Routes ============

#[post("/english/import", data = "<request>")]
pub async fn import_words(
    _auth: AuthGuard,
    pool: &State<SqlitePool>,
    request: Json<ImportWordsRequest>,
) -> Json<ApiResponse<i32>> {
    let mut imported = 0;

    match request.source.as_str() {
        "custom" => {
            if let Some(words) = &request.words {
                for word in words {
                    let result = sqlx::query(
                        r#"
                        INSERT OR IGNORE INTO english_words
                        (word, translation, category_id, transcription, definition,
                         part_of_speech, examples, difficulty, cefr_level)
                        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                        "#
                    )
                    .bind(&word.word)
                    .bind(&word.translation)
                    .bind(word.category_id.or(request.category_id))
                    .bind(&word.transcription)
                    .bind(&word.definition)
                    .bind(&word.part_of_speech)
                    .bind(&word.examples)
                    .bind(word.difficulty.unwrap_or(1))
                    .bind(&word.cefr_level)
                    .execute(pool.inner())
                    .await;

                    if result.is_ok() {
                        imported += 1;
                    }
                }
            }
        }
        "frequency_list" => {
            // Import most common English words
            let common_words = get_common_words();
            let count = request.count.unwrap_or(100).min(common_words.len() as i32) as usize;

            for (word, translation) in common_words.into_iter().take(count) {
                let result = sqlx::query(
                    r#"
                    INSERT OR IGNORE INTO english_words
                    (word, translation, category_id, difficulty)
                    VALUES ($1, $2, $3, 1)
                    "#
                )
                .bind(word)
                .bind(translation)
                .bind(request.category_id.unwrap_or(1))
                .execute(pool.inner())
                .await;

                if result.is_ok() {
                    imported += 1;
                }
            }
        }
        _ => {}
    }

    update_daily_stat(pool.inner(), "new_words_added", imported).await;

    Json(ApiResponse::success(imported))
}

// ============ Helper Functions ============

async fn update_daily_stat(pool: &SqlitePool, field: &str, value: i32) {
    let today = Utc::now().format("%Y-%m-%d").to_string();

    // Try to update existing record
    let updated = sqlx::query(&format!(
        "UPDATE english_daily_stats SET {} = {} + {} WHERE date = '{}'",
        field, field, value, today
    ))
    .execute(pool)
    .await
    .map(|r| r.rows_affected())
    .unwrap_or(0);

    // If no record exists, create one
    if updated == 0 {
        let _ = sqlx::query(&format!(
            "INSERT INTO english_daily_stats (date, {}) VALUES ('{}', {})",
            field, today, value
        ))
        .execute(pool)
        .await;
    }
}

async fn add_xp(pool: &SqlitePool, xp: i32) {
    // Update total XP
    let _ = sqlx::query(&format!(
        "UPDATE english_settings SET total_xp = total_xp + {}, updated_at = datetime('now') WHERE id = 1",
        xp
    ))
    .execute(pool)
    .await;

    // Update daily XP
    let today = Utc::now().format("%Y-%m-%d").to_string();
    let _ = sqlx::query(&format!(
        "UPDATE english_daily_stats SET xp_earned = xp_earned + {} WHERE date = '{}'",
        xp, today
    ))
    .execute(pool)
    .await;

    // Check for level up
    let settings: Option<EnglishSettings> = sqlx::query_as(
        "SELECT * FROM english_settings WHERE id = 1"
    )
    .fetch_optional(pool)
    .await
    .ok()
    .flatten();

    if let Some(s) = settings {
        let xp_per_level = 100;
        let new_level = (s.total_xp / xp_per_level) + 1;
        if new_level > s.level {
            let _ = sqlx::query(&format!(
                "UPDATE english_settings SET level = {} WHERE id = 1",
                new_level
            ))
            .execute(pool)
            .await;
        }
    }
}

async fn check_achievements(pool: &SqlitePool) {
    // Check word count achievements
    let word_count: i32 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM english_word_progress WHERE status != 'new'"
    )
    .fetch_one(pool)
    .await
    .unwrap_or(0);

    if word_count >= 1 {
        unlock_achievement(pool, "first_word").await;
    }
    if word_count >= 10 {
        unlock_achievement(pool, "words_10").await;
    }
    if word_count >= 50 {
        unlock_achievement(pool, "words_50").await;
    }
    if word_count >= 100 {
        unlock_achievement(pool, "words_100").await;
    }
    if word_count >= 500 {
        unlock_achievement(pool, "words_500").await;
    }

    // Check streak achievements
    let settings: Option<EnglishSettings> = sqlx::query_as(
        "SELECT * FROM english_settings WHERE id = 1"
    )
    .fetch_optional(pool)
    .await
    .ok()
    .flatten();

    if let Some(s) = settings {
        if s.current_streak >= 3 {
            unlock_achievement(pool, "streak_3").await;
        }
        if s.current_streak >= 7 {
            unlock_achievement(pool, "streak_7").await;
        }
        if s.current_streak >= 30 {
            unlock_achievement(pool, "streak_30").await;
        }
    }
}

async fn unlock_achievement(pool: &SqlitePool, achievement_type: &str) {
    let _ = sqlx::query(
        "UPDATE english_achievements SET unlocked_at = datetime('now') WHERE achievement_type = $1 AND unlocked_at IS NULL"
    )
    .bind(achievement_type)
    .execute(pool)
    .await;
}

fn get_common_words() -> Vec<(&'static str, &'static str)> {
    vec![
        ("the", "определенный артикль"),
        ("be", "быть"),
        ("to", "к, в, до"),
        ("of", "из, от"),
        ("and", "и"),
        ("a", "неопределенный артикль"),
        ("in", "в"),
        ("that", "тот, что"),
        ("have", "иметь"),
        ("I", "я"),
        ("it", "это, оно"),
        ("for", "для"),
        ("not", "не"),
        ("on", "на"),
        ("with", "с"),
        ("he", "он"),
        ("as", "как"),
        ("you", "ты, вы"),
        ("do", "делать"),
        ("at", "у, при"),
        ("this", "этот"),
        ("but", "но"),
        ("his", "его"),
        ("by", "по, около"),
        ("from", "от, из"),
        ("they", "они"),
        ("we", "мы"),
        ("say", "говорить"),
        ("her", "её"),
        ("she", "она"),
        ("or", "или"),
        ("an", "неопределенный артикль"),
        ("will", "будет"),
        ("my", "мой"),
        ("one", "один"),
        ("all", "все, всё"),
        ("would", "бы"),
        ("there", "там"),
        ("their", "их"),
        ("what", "что"),
        ("so", "так"),
        ("up", "вверх"),
        ("out", "вне, наружу"),
        ("if", "если"),
        ("about", "о, около"),
        ("who", "кто"),
        ("get", "получать"),
        ("which", "который"),
        ("go", "идти"),
        ("me", "мне, меня"),
        ("when", "когда"),
        ("make", "делать"),
        ("can", "мочь"),
        ("like", "любить, как"),
        ("time", "время"),
        ("no", "нет"),
        ("just", "просто"),
        ("him", "ему, его"),
        ("know", "знать"),
        ("take", "брать"),
        ("people", "люди"),
        ("into", "в"),
        ("year", "год"),
        ("your", "твой, ваш"),
        ("good", "хороший"),
        ("some", "некоторый"),
        ("could", "мог бы"),
        ("them", "их, им"),
        ("see", "видеть"),
        ("other", "другой"),
        ("than", "чем"),
        ("then", "тогда"),
        ("now", "сейчас"),
        ("look", "смотреть"),
        ("only", "только"),
        ("come", "приходить"),
        ("its", "его (неодуш.)"),
        ("over", "над, через"),
        ("think", "думать"),
        ("also", "также"),
        ("back", "назад"),
        ("after", "после"),
        ("use", "использовать"),
        ("two", "два"),
        ("how", "как"),
        ("our", "наш"),
        ("work", "работа"),
        ("first", "первый"),
        ("well", "хорошо"),
        ("way", "путь, способ"),
        ("even", "даже"),
        ("new", "новый"),
        ("want", "хотеть"),
        ("because", "потому что"),
        ("any", "любой"),
        ("these", "эти"),
        ("give", "давать"),
        ("day", "день"),
        ("most", "большинство"),
        ("us", "нас, нам"),
        ("love", "любовь"),
        ("life", "жизнь"),
        ("world", "мир"),
        ("very", "очень"),
        ("still", "всё ещё"),
        ("never", "никогда"),
        ("always", "всегда"),
        ("more", "больше"),
        ("find", "находить"),
        ("here", "здесь"),
        ("thing", "вещь"),
        ("place", "место"),
        ("great", "великий"),
        ("where", "где"),
        ("through", "через"),
        ("long", "длинный"),
        ("little", "маленький"),
        ("own", "собственный"),
        ("before", "до, перед"),
        ("right", "правильный"),
        ("too", "тоже, слишком"),
        ("mean", "значить"),
        ("old", "старый"),
        ("same", "тот же"),
        ("tell", "рассказывать"),
        ("boy", "мальчик"),
        ("girl", "девочка"),
        ("man", "мужчина"),
        ("woman", "женщина"),
        ("child", "ребенок"),
        ("friend", "друг"),
        ("house", "дом"),
        ("hand", "рука"),
        ("eye", "глаз"),
        ("head", "голова"),
        ("face", "лицо"),
        ("mother", "мать"),
        ("father", "отец"),
        ("school", "школа"),
        ("book", "книга"),
        ("water", "вода"),
        ("food", "еда"),
        ("money", "деньги"),
        ("morning", "утро"),
        ("night", "ночь"),
        ("today", "сегодня"),
        ("tomorrow", "завтра"),
        ("yesterday", "вчера"),
        ("week", "неделя"),
        ("month", "месяц"),
        ("happy", "счастливый"),
        ("sad", "грустный"),
        ("beautiful", "красивый"),
        ("big", "большой"),
        ("small", "маленький"),
        ("hot", "горячий"),
        ("cold", "холодный"),
        ("fast", "быстрый"),
        ("slow", "медленный"),
        ("easy", "легкий"),
        ("hard", "трудный"),
        ("eat", "есть"),
        ("drink", "пить"),
        ("sleep", "спать"),
        ("walk", "ходить"),
        ("run", "бегать"),
        ("read", "читать"),
        ("write", "писать"),
        ("speak", "говорить"),
        ("listen", "слушать"),
        ("understand", "понимать"),
        ("learn", "учить"),
        ("teach", "преподавать"),
        ("help", "помогать"),
        ("try", "пробовать"),
        ("start", "начинать"),
        ("stop", "останавливать"),
        ("open", "открывать"),
        ("close", "закрывать"),
        ("wait", "ждать"),
        ("feel", "чувствовать"),
        ("believe", "верить"),
        ("remember", "помнить"),
        ("forget", "забывать"),
        ("dream", "мечтать"),
        ("hope", "надеяться"),
    ]
}
