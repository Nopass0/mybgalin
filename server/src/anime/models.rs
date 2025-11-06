use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct AnimeAuction {
    pub id: i64,
    pub date: Option<String>,
    pub title: String,
    pub watched: i64, // SQLite uses INTEGER for boolean
    pub season: Option<String>,
    pub episodes: Option<String>,
    pub voice_acting: Option<String>,
    pub buyer: Option<String>,
    pub chat_rating: Option<f64>,
    pub sheikh_rating: Option<f64>,
    pub streamer_rating: Option<f64>,
    pub vod_link: Option<String>,
    pub sheets_url: Option<String>,
    pub year: i64,
    pub shikimori_id: Option<i64>,
    pub shikimori_name: Option<String>,
    pub shikimori_description: Option<String>,
    pub shikimori_cover: Option<String>,
    pub shikimori_score: Option<f64>,
    pub shikimori_genres: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize)]
pub struct AnimeAuctionResponse {
    #[serde(flatten)]
    pub anime: AnimeAuction,
    pub is_upcoming: bool,
    pub has_date: bool,
}

// Shikimori API models
#[derive(Debug, Deserialize)]
pub struct ShikimoriAnime {
    pub id: i64,
    pub name: String,
    pub russian: Option<String>,
    pub url: String,
    pub kind: Option<String>,
    pub score: Option<String>,
    pub status: Option<String>,
    pub episodes: Option<i64>,
    pub aired_on: Option<String>,
    pub released_on: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct ShikimoriGenre {
    pub id: i64,
    pub name: String,
    pub russian: String,
    pub kind: String,
}

#[derive(Debug, Deserialize)]
pub struct ShikimoriAnimeDetails {
    pub id: i64,
    pub name: String,
    pub russian: Option<String>,
    pub description: Option<String>,
    pub description_html: Option<String>,
    pub score: Option<String>,
    pub episodes: Option<i64>,
    pub status: Option<String>,
    pub kind: Option<String>,
    pub aired_on: Option<String>,
    pub released_on: Option<String>,
    pub genres: Option<Vec<ShikimoriGenre>>,
}

#[derive(Debug, Deserialize)]
pub struct ShikimoriImage {
    pub original: String,
    pub preview: String,
    pub x96: String,
    pub x48: String,
}

// Google Sheets row data
#[derive(Debug, Clone)]
pub struct SheetAnimeRow {
    pub date: Option<String>,
    pub title: String,
    pub watched: bool,
    pub season: Option<String>,
    pub episodes: Option<String>,
    pub voice_acting: Option<String>,
    pub buyer: Option<String>,
    pub chat_rating: Option<f64>,
    pub sheikh_rating: Option<f64>,
    pub streamer_rating: Option<f64>,
    pub vod_link: Option<String>,
    pub year: i64,
}
