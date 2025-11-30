use crate::guards::AuthGuard;
use rocket::http::Status;
use rocket::response::content::RawHtml;
use rocket::serde::json::Json;
use rocket::{get, post, put, delete, State};
use rocket::request::{self, FromRequest, Request};
use rocket::outcome::Outcome;
use serde::{Deserialize, Serialize};
use sqlx::SqlitePool;
use uuid::Uuid;

// Request guard for tracking info
pub struct TrackingInfo {
    pub ip_address: Option<String>,
    pub user_agent: String,
    pub referer: Option<String>,
}

#[rocket::async_trait]
impl<'r> FromRequest<'r> for TrackingInfo {
    type Error = ();

    async fn from_request(req: &'r Request<'_>) -> request::Outcome<Self, Self::Error> {
        let ip_address = req.client_ip().map(|ip| ip.to_string());
        let user_agent = req.headers().get_one("User-Agent").unwrap_or("").to_string();
        let referer = req.headers().get_one("Referer").map(|s| s.to_string());

        Outcome::Success(TrackingInfo {
            ip_address,
            user_agent,
            referer,
        })
    }
}

// Models
#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct ShortLink {
    pub id: String,
    pub name: String,
    pub original_url: String,
    pub short_code: String,
    pub external_short_url: Option<String>,
    pub is_active: bool,
    pub redirect_to_studio: bool,
    pub set_studio_flag: bool,
    pub custom_js: Option<String>,
    pub expires_at: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct LinkClick {
    pub id: i32,
    pub link_id: String,
    pub ip_address: Option<String>,
    pub user_agent: Option<String>,
    pub referer: Option<String>,
    pub country: Option<String>,
    pub city: Option<String>,
    pub device_type: Option<String>,
    pub browser: Option<String>,
    pub os: Option<String>,
    pub is_bot: bool,
    pub screen_width: Option<i32>,
    pub screen_height: Option<i32>,
    pub language: Option<String>,
    pub timezone: Option<String>,
    pub clicked_at: String,
}

#[derive(Debug, Deserialize)]
pub struct CreateLinkRequest {
    pub name: String,
    pub original_url: String,
    pub redirect_to_studio: Option<bool>,
    pub set_studio_flag: Option<bool>,
    pub custom_js: Option<String>,
    pub expires_at: Option<String>,
    pub use_external_shortener: Option<bool>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateLinkRequest {
    pub name: Option<String>,
    pub original_url: Option<String>,
    pub is_active: Option<bool>,
    pub redirect_to_studio: Option<bool>,
    pub set_studio_flag: Option<bool>,
    pub custom_js: Option<String>,
    pub expires_at: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct LinkStats {
    pub link: ShortLink,
    pub total_clicks: i64,
    pub unique_visitors: i64,
    pub clicks_today: i64,
    pub clicks_this_week: i64,
    pub clicks_this_month: i64,
    pub top_countries: Vec<CountryStat>,
    pub top_browsers: Vec<BrowserStat>,
    pub top_devices: Vec<DeviceStat>,
    pub clicks_by_day: Vec<DayStat>,
    pub recent_clicks: Vec<LinkClick>,
}

#[derive(Debug, Serialize)]
pub struct CountryStat {
    pub country: String,
    pub count: i64,
}

#[derive(Debug, Serialize)]
pub struct BrowserStat {
    pub browser: String,
    pub count: i64,
}

#[derive(Debug, Serialize)]
pub struct DeviceStat {
    pub device: String,
    pub count: i64,
}

#[derive(Debug, Serialize)]
pub struct DayStat {
    pub date: String,
    pub count: i64,
}

#[derive(Debug, Serialize)]
pub struct LinkWithStats {
    pub link: ShortLink,
    pub total_clicks: i64,
    pub clicks_today: i64,
}

#[derive(Debug, Deserialize)]
pub struct TrackClickRequest {
    pub screen_width: Option<i64>,
    pub screen_height: Option<i64>,
    pub language: Option<String>,
    pub timezone: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct RedirectResponse {
    pub target_url: String,
    pub set_studio_flag: bool,
    pub redirect_to_studio: bool,
    pub custom_js: Option<String>,
}

// Helper to generate short code
fn generate_short_code() -> String {
    let id = Uuid::new_v4().to_string();
    id.chars().filter(|c| c.is_alphanumeric()).take(8).collect()
}

// Parse user agent to extract browser, OS, device
fn parse_user_agent(ua: &str) -> (String, String, String) {
    let ua_lower = ua.to_lowercase();

    // Detect browser
    let browser = if ua_lower.contains("firefox") {
        "Firefox"
    } else if ua_lower.contains("edg/") || ua_lower.contains("edge") {
        "Edge"
    } else if ua_lower.contains("chrome") && !ua_lower.contains("chromium") {
        "Chrome"
    } else if ua_lower.contains("safari") && !ua_lower.contains("chrome") {
        "Safari"
    } else if ua_lower.contains("opera") || ua_lower.contains("opr/") {
        "Opera"
    } else {
        "Other"
    };

    // Detect OS
    let os = if ua_lower.contains("windows") {
        "Windows"
    } else if ua_lower.contains("mac os") || ua_lower.contains("macos") {
        "macOS"
    } else if ua_lower.contains("linux") && !ua_lower.contains("android") {
        "Linux"
    } else if ua_lower.contains("android") {
        "Android"
    } else if ua_lower.contains("iphone") || ua_lower.contains("ipad") || ua_lower.contains("ios") {
        "iOS"
    } else {
        "Other"
    };

    // Detect device type
    let device = if ua_lower.contains("mobile") || ua_lower.contains("android") && !ua_lower.contains("tablet")
        || ua_lower.contains("iphone") {
        "Mobile"
    } else if ua_lower.contains("tablet") || ua_lower.contains("ipad") {
        "Tablet"
    } else {
        "Desktop"
    };

    (browser.to_string(), os.to_string(), device.to_string())
}

// Check if user agent is a bot
fn is_bot(ua: &str) -> bool {
    let ua_lower = ua.to_lowercase();
    let bot_patterns = [
        "bot", "crawler", "spider", "scraper", "curl", "wget",
        "python", "java/", "go-http", "axios", "node-fetch",
        "googlebot", "bingbot", "yandexbot", "facebookexternalhit",
        "twitterbot", "linkedinbot", "telegrambot", "whatsapp"
    ];
    bot_patterns.iter().any(|p| ua_lower.contains(p))
}

// Shorten URL using is.gd API
async fn shorten_with_isgd(url: &str) -> Option<String> {
    let client = reqwest::Client::new();
    let encoded_url = urlencoding::encode(url);
    let api_url = format!("https://is.gd/create.php?format=simple&url={}", encoded_url);

    match client.get(&api_url).send().await {
        Ok(response) => {
            if response.status().is_success() {
                response.text().await.ok()
            } else {
                None
            }
        }
        Err(_) => None,
    }
}

// === Admin Routes (Protected) ===

#[get("/links")]
pub async fn list_links(
    _auth: AuthGuard,
    pool: &State<SqlitePool>,
) -> Result<Json<Vec<ShortLink>>, Status> {
    let links = sqlx::query_as::<_, ShortLink>(
        "SELECT * FROM short_links ORDER BY created_at DESC"
    )
    .fetch_all(pool.inner())
    .await
    .map_err(|_| Status::InternalServerError)?;

    Ok(Json(links))
}

#[post("/links", data = "<request>")]
pub async fn create_link(
    _auth: AuthGuard,
    pool: &State<SqlitePool>,
    request: Json<CreateLinkRequest>,
) -> Result<Json<ShortLink>, Status> {
    let id = Uuid::new_v4().to_string();
    let short_code = generate_short_code();

    // Get external short URL if requested
    let base_url = std::env::var("BASE_URL").unwrap_or_else(|_| "https://bgalin.ru".to_string());
    let our_short_url = format!("{}/l/{}", base_url, short_code);

    let external_short_url = if request.use_external_shortener.unwrap_or(false) {
        shorten_with_isgd(&our_short_url).await
    } else {
        None
    };

    sqlx::query(
        r#"
        INSERT INTO short_links (id, name, original_url, short_code, external_short_url,
            redirect_to_studio, set_studio_flag, custom_js, expires_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        "#,
    )
    .bind(&id)
    .bind(&request.name)
    .bind(&request.original_url)
    .bind(&short_code)
    .bind(&external_short_url)
    .bind(request.redirect_to_studio.unwrap_or(false))
    .bind(request.set_studio_flag.unwrap_or(false))
    .bind(&request.custom_js)
    .bind(&request.expires_at)
    .execute(pool.inner())
    .await
    .map_err(|_| Status::InternalServerError)?;

    let link = sqlx::query_as::<_, ShortLink>("SELECT * FROM short_links WHERE id = ?")
        .bind(&id)
        .fetch_one(pool.inner())
        .await
        .map_err(|_| Status::InternalServerError)?;

    Ok(Json(link))
}

#[put("/links/<id>", data = "<request>")]
pub async fn update_link(
    _auth: AuthGuard,
    pool: &State<SqlitePool>,
    id: &str,
    request: Json<UpdateLinkRequest>,
) -> Result<Json<ShortLink>, Status> {
    // Check if link exists
    let existing = sqlx::query_as::<_, ShortLink>("SELECT * FROM short_links WHERE id = ?")
        .bind(id)
        .fetch_optional(pool.inner())
        .await
        .map_err(|_| Status::InternalServerError)?;

    if existing.is_none() {
        return Err(Status::NotFound);
    }

    sqlx::query(
        r#"
        UPDATE short_links SET
            name = COALESCE(?, name),
            original_url = COALESCE(?, original_url),
            is_active = COALESCE(?, is_active),
            redirect_to_studio = COALESCE(?, redirect_to_studio),
            set_studio_flag = COALESCE(?, set_studio_flag),
            custom_js = COALESCE(?, custom_js),
            expires_at = COALESCE(?, expires_at),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
        "#,
    )
    .bind(&request.name)
    .bind(&request.original_url)
    .bind(request.is_active)
    .bind(request.redirect_to_studio)
    .bind(request.set_studio_flag)
    .bind(&request.custom_js)
    .bind(&request.expires_at)
    .bind(id)
    .execute(pool.inner())
    .await
    .map_err(|_| Status::InternalServerError)?;

    let link = sqlx::query_as::<_, ShortLink>("SELECT * FROM short_links WHERE id = ?")
        .bind(id)
        .fetch_one(pool.inner())
        .await
        .map_err(|_| Status::InternalServerError)?;

    Ok(Json(link))
}

#[delete("/links/<id>")]
pub async fn delete_link(
    _auth: AuthGuard,
    pool: &State<SqlitePool>,
    id: &str,
) -> Result<Status, Status> {
    let result = sqlx::query("DELETE FROM short_links WHERE id = ?")
        .bind(id)
        .execute(pool.inner())
        .await
        .map_err(|_| Status::InternalServerError)?;

    if result.rows_affected() == 0 {
        return Err(Status::NotFound);
    }

    Ok(Status::NoContent)
}

#[get("/links/<id>/stats", rank = 1)]
pub async fn get_link_stats(
    _auth: AuthGuard,
    pool: &State<SqlitePool>,
    id: &str,
) -> Result<Json<LinkStats>, Status> {
    let link = sqlx::query_as::<_, ShortLink>("SELECT * FROM short_links WHERE id = ?")
        .bind(id)
        .fetch_optional(pool.inner())
        .await
        .map_err(|_| Status::InternalServerError)?
        .ok_or(Status::NotFound)?;

    // Total clicks
    let total_clicks: (i64,) = sqlx::query_as(
        "SELECT COUNT(*) FROM link_clicks WHERE link_id = ?"
    )
    .bind(id)
    .fetch_one(pool.inner())
    .await
    .map_err(|_| Status::InternalServerError)?;

    // Unique visitors (by IP)
    let unique_visitors: (i64,) = sqlx::query_as(
        "SELECT COUNT(DISTINCT ip_address) FROM link_clicks WHERE link_id = ?"
    )
    .bind(id)
    .fetch_one(pool.inner())
    .await
    .map_err(|_| Status::InternalServerError)?;

    // Clicks today
    let clicks_today: (i64,) = sqlx::query_as(
        "SELECT COUNT(*) FROM link_clicks WHERE link_id = ? AND date(clicked_at) = date('now')"
    )
    .bind(id)
    .fetch_one(pool.inner())
    .await
    .map_err(|_| Status::InternalServerError)?;

    // Clicks this week
    let clicks_this_week: (i64,) = sqlx::query_as(
        "SELECT COUNT(*) FROM link_clicks WHERE link_id = ? AND clicked_at >= datetime('now', '-7 days')"
    )
    .bind(id)
    .fetch_one(pool.inner())
    .await
    .map_err(|_| Status::InternalServerError)?;

    // Clicks this month
    let clicks_this_month: (i64,) = sqlx::query_as(
        "SELECT COUNT(*) FROM link_clicks WHERE link_id = ? AND clicked_at >= datetime('now', '-30 days')"
    )
    .bind(id)
    .fetch_one(pool.inner())
    .await
    .map_err(|_| Status::InternalServerError)?;

    // Top countries
    let top_countries: Vec<(Option<String>, i64)> = sqlx::query_as(
        r#"
        SELECT country, COUNT(*) as count
        FROM link_clicks
        WHERE link_id = ? AND country IS NOT NULL
        GROUP BY country
        ORDER BY count DESC
        LIMIT 10
        "#
    )
    .bind(id)
    .fetch_all(pool.inner())
    .await
    .map_err(|_| Status::InternalServerError)?;

    // Top browsers
    let top_browsers: Vec<(Option<String>, i64)> = sqlx::query_as(
        r#"
        SELECT browser, COUNT(*) as count
        FROM link_clicks
        WHERE link_id = ? AND browser IS NOT NULL
        GROUP BY browser
        ORDER BY count DESC
        LIMIT 10
        "#
    )
    .bind(id)
    .fetch_all(pool.inner())
    .await
    .map_err(|_| Status::InternalServerError)?;

    // Top devices
    let top_devices: Vec<(Option<String>, i64)> = sqlx::query_as(
        r#"
        SELECT device_type, COUNT(*) as count
        FROM link_clicks
        WHERE link_id = ? AND device_type IS NOT NULL
        GROUP BY device_type
        ORDER BY count DESC
        LIMIT 10
        "#
    )
    .bind(id)
    .fetch_all(pool.inner())
    .await
    .map_err(|_| Status::InternalServerError)?;

    // Clicks by day (last 30 days)
    let clicks_by_day: Vec<(String, i64)> = sqlx::query_as(
        r#"
        SELECT date(clicked_at) as date, COUNT(*) as count
        FROM link_clicks
        WHERE link_id = ? AND clicked_at >= datetime('now', '-30 days')
        GROUP BY date(clicked_at)
        ORDER BY date DESC
        "#
    )
    .bind(id)
    .fetch_all(pool.inner())
    .await
    .map_err(|_| Status::InternalServerError)?;

    // Recent clicks
    let recent_clicks = sqlx::query_as::<_, LinkClick>(
        "SELECT * FROM link_clicks WHERE link_id = ? ORDER BY clicked_at DESC LIMIT 50"
    )
    .bind(id)
    .fetch_all(pool.inner())
    .await
    .map_err(|_| Status::InternalServerError)?;

    Ok(Json(LinkStats {
        link,
        total_clicks: total_clicks.0,
        unique_visitors: unique_visitors.0,
        clicks_today: clicks_today.0,
        clicks_this_week: clicks_this_week.0,
        clicks_this_month: clicks_this_month.0,
        top_countries: top_countries.into_iter().map(|(c, count)| CountryStat {
            country: c.unwrap_or_else(|| "Unknown".to_string()), count
        }).collect(),
        top_browsers: top_browsers.into_iter().map(|(b, count)| BrowserStat {
            browser: b.unwrap_or_else(|| "Unknown".to_string()), count
        }).collect(),
        top_devices: top_devices.into_iter().map(|(d, count)| DeviceStat {
            device: d.unwrap_or_else(|| "Unknown".to_string()), count
        }).collect(),
        clicks_by_day: clicks_by_day.into_iter().map(|(date, count)| DayStat { date, count }).collect(),
        recent_clicks,
    }))
}

#[post("/links/<id>/regenerate-external", rank = 1)]
pub async fn regenerate_external_url(
    _auth: AuthGuard,
    pool: &State<SqlitePool>,
    id: &str,
) -> Result<Json<ShortLink>, Status> {
    let link = sqlx::query_as::<_, ShortLink>("SELECT * FROM short_links WHERE id = ?")
        .bind(id)
        .fetch_optional(pool.inner())
        .await
        .map_err(|_| Status::InternalServerError)?
        .ok_or(Status::NotFound)?;

    let base_url = std::env::var("BASE_URL").unwrap_or_else(|_| "https://bgalin.ru".to_string());
    let our_short_url = format!("{}/l/{}", base_url, link.short_code);

    let external_short_url = shorten_with_isgd(&our_short_url).await;

    sqlx::query("UPDATE short_links SET external_short_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
        .bind(&external_short_url)
        .bind(id)
        .execute(pool.inner())
        .await
        .map_err(|_| Status::InternalServerError)?;

    let updated_link = sqlx::query_as::<_, ShortLink>("SELECT * FROM short_links WHERE id = ?")
        .bind(id)
        .fetch_one(pool.inner())
        .await
        .map_err(|_| Status::InternalServerError)?;

    Ok(Json(updated_link))
}

// === Public Redirect Routes ===

// Main redirect endpoint - serves HTML with tracking script
#[get("/l/<code>")]
pub async fn redirect_link(
    pool: &State<SqlitePool>,
    code: &str,
    tracking: TrackingInfo,
) -> Result<RawHtml<String>, Status> {
    let link = sqlx::query_as::<_, ShortLink>(
        "SELECT * FROM short_links WHERE short_code = ? AND is_active = TRUE"
    )
    .bind(code)
    .fetch_optional(pool.inner())
    .await
    .map_err(|_| Status::InternalServerError)?
    .ok_or(Status::NotFound)?;

    // Check expiration
    if let Some(ref expires_at) = link.expires_at {
        if let Ok(exp) = chrono::NaiveDateTime::parse_from_str(expires_at, "%Y-%m-%d %H:%M:%S") {
            if exp < chrono::Utc::now().naive_utc() {
                return Err(Status::Gone);
            }
        }
    }

    // Get request info for initial tracking
    let (browser, os, device_type) = parse_user_agent(&tracking.user_agent);
    let is_bot_ua = is_bot(&tracking.user_agent);

    // Insert click record
    sqlx::query(
        r#"
        INSERT INTO link_clicks (link_id, ip_address, user_agent, referer, browser, os, device_type, is_bot)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        "#
    )
    .bind(&link.id)
    .bind(&tracking.ip_address)
    .bind(&tracking.user_agent)
    .bind(&tracking.referer)
    .bind(&browser)
    .bind(&os)
    .bind(&device_type)
    .bind(is_bot_ua)
    .execute(pool.inner())
    .await
    .ok();

    // Generate HTML with tracking and redirect
    let custom_js = link.custom_js.as_deref().unwrap_or("");
    let html = format!(r#"<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Redirecting...</title>
    <style>
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
            color: #fff;
        }}
        .loader {{
            text-align: center;
        }}
        .spinner {{
            width: 40px;
            height: 40px;
            border: 3px solid rgba(255,255,255,0.3);
            border-radius: 50%;
            border-top-color: #fff;
            animation: spin 1s ease-in-out infinite;
            margin: 0 auto 20px;
        }}
        @keyframes spin {{
            to {{ transform: rotate(360deg); }}
        }}
    </style>
</head>
<body>
    <div class="loader">
        <div class="spinner"></div>
        <p>Redirecting...</p>
    </div>
    <script>
        (function() {{
            // Set flags in localStorage if needed
            {set_studio_flag}
            {redirect_to_studio}

            // Custom JS
            {custom_js}

            // Redirect
            setTimeout(function() {{
                window.location.href = "{target_url}";
            }}, 100);
        }})();
    </script>
</body>
</html>"#,
        set_studio_flag = if link.set_studio_flag {
            "localStorage.setItem('studio_redirect', 'true');"
        } else {
            ""
        },
        redirect_to_studio = if link.redirect_to_studio {
            "localStorage.setItem('always_studio', 'true');"
        } else {
            ""
        },
        custom_js = custom_js,
        target_url = link.original_url,
    );

    Ok(RawHtml(html))
}

// API endpoint to get redirect info (for SPA usage)
#[get("/links/resolve/<code>", rank = 2)]
pub async fn resolve_link(
    pool: &State<SqlitePool>,
    code: &str,
) -> Result<Json<RedirectResponse>, Status> {
    let link = sqlx::query_as::<_, ShortLink>(
        "SELECT * FROM short_links WHERE short_code = ? AND is_active = TRUE"
    )
    .bind(code)
    .fetch_optional(pool.inner())
    .await
    .map_err(|_| Status::InternalServerError)?
    .ok_or(Status::NotFound)?;

    // Check expiration
    if let Some(ref expires_at) = link.expires_at {
        if let Ok(exp) = chrono::NaiveDateTime::parse_from_str(expires_at, "%Y-%m-%d %H:%M:%S") {
            if exp < chrono::Utc::now().naive_utc() {
                return Err(Status::Gone);
            }
        }
    }

    Ok(Json(RedirectResponse {
        target_url: link.original_url,
        set_studio_flag: link.set_studio_flag,
        redirect_to_studio: link.redirect_to_studio,
        custom_js: link.custom_js,
    }))
}

// Track additional click data (called from client-side JS)
#[post("/links/track/<code>", data = "<request>", rank = 2)]
pub async fn track_click(
    pool: &State<SqlitePool>,
    code: &str,
    request: Json<TrackClickRequest>,
) -> Result<Status, Status> {
    // Update the most recent click for this link with additional data
    sqlx::query(
        r#"
        UPDATE link_clicks
        SET screen_width = ?, screen_height = ?, language = ?, timezone = ?
        WHERE id = (
            SELECT id FROM link_clicks
            WHERE link_id = (SELECT id FROM short_links WHERE short_code = ?)
            ORDER BY clicked_at DESC LIMIT 1
        )
        "#
    )
    .bind(request.screen_width)
    .bind(request.screen_height)
    .bind(&request.language)
    .bind(&request.timezone)
    .bind(code)
    .execute(pool.inner())
    .await
    .map_err(|_| Status::InternalServerError)?;

    Ok(Status::Ok)
}

// Get all links with click counts for list view
#[get("/links/summary")]
pub async fn get_links_summary(
    _auth: AuthGuard,
    pool: &State<SqlitePool>,
) -> Result<Json<Vec<LinkWithStats>>, Status> {
    let links = sqlx::query_as::<_, ShortLink>(
        "SELECT * FROM short_links ORDER BY created_at DESC"
    )
    .fetch_all(pool.inner())
    .await
    .map_err(|_| Status::InternalServerError)?;

    let mut results = Vec::new();
    for link in links {
        let total: (i64,) = sqlx::query_as(
            "SELECT COUNT(*) FROM link_clicks WHERE link_id = ?"
        )
        .bind(&link.id)
        .fetch_one(pool.inner())
        .await
        .map_err(|_| Status::InternalServerError)?;

        let today: (i64,) = sqlx::query_as(
            "SELECT COUNT(*) FROM link_clicks WHERE link_id = ? AND date(clicked_at) = date('now')"
        )
        .bind(&link.id)
        .fetch_one(pool.inner())
        .await
        .map_err(|_| Status::InternalServerError)?;

        results.push(LinkWithStats {
            link,
            total_clicks: total.0,
            clicks_today: today.0,
        });
    }

    Ok(Json(results))
}
