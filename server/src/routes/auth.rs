use crate::auth::AuthService;
use crate::models::{ApiResponse, RequestOtpRequest, RequestOtpResponse, VerifyOtpRequest, VerifyOtpResponse};
use crate::telegram::TelegramBot;
use rocket::serde::json::Json;
use rocket::{post, State};
use sqlx::PgPool;

#[post("/auth/request-otp", data = "<_request>")]
pub async fn request_otp(
    _request: Json<RequestOtpRequest>,
    pool: &State<PgPool>,
    telegram_bot: &State<TelegramBot>,
    admin_telegram_id: &State<i64>,
) -> Json<ApiResponse<RequestOtpResponse>> {
    let telegram_id = **admin_telegram_id;

    // Get or create user
    let user = match AuthService::get_or_create_user(pool, telegram_id).await {
        Ok(user) => user,
        Err(e) => {
            return Json(ApiResponse::error(format!("Database error: {}", e)));
        }
    };

    // Generate OTP code
    let code = AuthService::generate_otp();

    // Save OTP to database
    if let Err(e) = AuthService::create_otp(pool, user.id, &code).await {
        return Json(ApiResponse::error(format!("Failed to create OTP: {}", e)));
    }

    // Send code via Telegram
    if let Err(e) = telegram_bot.send_otp_code(telegram_id, &code).await {
        return Json(ApiResponse::error(format!(
            "Failed to send Telegram message: {}",
            e
        )));
    }

    Json(ApiResponse::success(RequestOtpResponse {
        success: true,
        message: "OTP code sent to Telegram".to_string(),
    }))
}

#[post("/auth/verify-otp", data = "<request>")]
pub async fn verify_otp(
    request: Json<VerifyOtpRequest>,
    pool: &State<PgPool>,
    admin_telegram_id: &State<i64>,
) -> Json<ApiResponse<VerifyOtpResponse>> {
    let telegram_id = **admin_telegram_id;

    match AuthService::verify_otp(pool, telegram_id, &request.code).await {
        Ok(Some(token)) => Json(ApiResponse::success(VerifyOtpResponse {
            success: true,
            token: Some(token),
            message: "Authentication successful".to_string(),
        })),
        Ok(None) => Json(ApiResponse::success(VerifyOtpResponse {
            success: false,
            token: None,
            message: "Invalid or expired OTP code".to_string(),
        })),
        Err(e) => Json(ApiResponse::error(format!("Database error: {}", e))),
    }
}
