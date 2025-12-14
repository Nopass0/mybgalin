use crate::alice::{
    models::*,
    service::{AliceService, AliceState},
};
use crate::db::DbPool;
use crate::guards::AdminSession;
use crate::telegram::TelegramBot;
use rocket::form::FromForm;
use rocket::http::Status;
use rocket::request::{FromRequest, Outcome, Request};
use rocket::response::Redirect;
use rocket::serde::json::Json;
use rocket::{get, post, State};
use serde::{Deserialize, Serialize};
use std::env;

/// Alice authorization header guard
pub struct AliceAuth {
    pub user_id: i64,
}

#[rocket::async_trait]
impl<'r> FromRequest<'r> for AliceAuth {
    type Error = ();

    async fn from_request(request: &'r Request<'_>) -> Outcome<Self, Self::Error> {
        let pool = request.guard::<&State<DbPool>>().await.unwrap();

        // Get Authorization header
        let auth_header = request.headers().get_one("Authorization");

        if let Some(auth) = auth_header {
            if let Some(token) = auth.strip_prefix("Bearer ") {
                match AliceService::validate_token(pool.inner(), token).await {
                    Ok(Some(user_id)) => return Outcome::Success(AliceAuth { user_id }),
                    _ => {}
                }
            }
        }

        Outcome::Error((Status::Unauthorized, ()))
    }
}

/// Health check for Alice integration
#[get("/alice/v1.0")]
pub fn alice_health() -> &'static str {
    "OK"
}

/// Unlink user (revoke access)
#[post("/alice/v1.0/user/unlink")]
pub async fn alice_unlink(_auth: AliceAuth) -> Json<serde_json::Value> {
    Json(serde_json::json!({}))
}

/// Get user devices
#[get("/alice/v1.0/user/devices")]
pub async fn alice_get_devices(
    auth: AliceAuth,
    pool: &State<DbPool>,
) -> Result<Json<UserDevicesResponse>, Status> {
    let request_id = uuid::Uuid::new_v4().to_string();

    match AliceService::get_devices(pool.inner()).await {
        Ok(devices) => Ok(Json(UserDevicesResponse {
            request_id,
            payload: UserDevicesPayload {
                user_id: auth.user_id.to_string(),
                devices,
            },
        })),
        Err(_) => Err(Status::InternalServerError),
    }
}

/// Query device states
#[post("/alice/v1.0/user/devices/query", data = "<request>")]
pub async fn alice_query_devices(
    _auth: AliceAuth,
    pool: &State<DbPool>,
    alice_state: &State<AliceState>,
    request: Json<QueryRequest>,
) -> Result<Json<QueryResponse>, Status> {
    let request_id = uuid::Uuid::new_v4().to_string();

    let mut device_responses = Vec::new();

    for device in &request.devices {
        match AliceService::get_device_state(pool.inner(), &device.id, alice_state.inner()).await {
            Ok(capabilities) => {
                device_responses.push(QueryDeviceResponse {
                    id: device.id.clone(),
                    capabilities: Some(capabilities),
                    properties: None,
                    error_code: None,
                    error_message: None,
                });
            }
            Err(_) => {
                device_responses.push(QueryDeviceResponse {
                    id: device.id.clone(),
                    capabilities: None,
                    properties: None,
                    error_code: Some("DEVICE_UNREACHABLE".to_string()),
                    error_message: Some("Failed to query device".to_string()),
                });
            }
        }
    }

    Ok(Json(QueryResponse {
        request_id,
        payload: QueryPayload {
            devices: device_responses,
        },
    }))
}

/// Execute actions on devices
#[post("/alice/v1.0/user/devices/action", data = "<request>")]
pub async fn alice_action(
    _auth: AliceAuth,
    pool: &State<DbPool>,
    alice_state: &State<AliceState>,
    telegram_bot: &State<TelegramBot>,
    admin_telegram_id: &State<i64>,
    request: Json<ActionRequest>,
) -> Result<Json<ActionResponse>, Status> {
    let request_id = uuid::Uuid::new_v4().to_string();

    let mut device_responses = Vec::new();

    for device in &request.payload.devices {
        let mut capability_responses = Vec::new();

        for cap in &device.capabilities {
            let result = AliceService::execute_action(
                pool.inner(),
                &device.id,
                &cap.capability_type,
                &cap.state.instance,
                cap.state.value.clone(),
                alice_state.inner(),
                telegram_bot.inner(),
                **admin_telegram_id,
            )
            .await
            .unwrap_or(ActionResult {
                status: "ERROR".to_string(),
                error_code: Some("INTERNAL_ERROR".to_string()),
                error_message: Some("Unknown error".to_string()),
            });

            capability_responses.push(ActionCapabilityResponse {
                capability_type: cap.capability_type.clone(),
                state: ActionResultState {
                    instance: cap.state.instance.clone(),
                    action_result: result,
                },
            });
        }

        device_responses.push(ActionDeviceResponse {
            id: device.id.clone(),
            capabilities: capability_responses,
        });
    }

    Ok(Json(ActionResponse {
        request_id,
        payload: ActionResponsePayload {
            devices: device_responses,
        },
    }))
}

// ================== OAuth Endpoints ==================

#[derive(Debug, FromForm)]
pub struct AuthForm {
    pub response_type: String,
    pub client_id: String,
    pub redirect_uri: String,
    pub scope: Option<String>,
    pub state: String,
}

#[derive(Debug, FromForm)]
pub struct LoginForm {
    pub username: String,
    pub password: String,
    pub state: String,
    pub redirect_uri: String,
    pub client_id: String,
}

/// OAuth authorization page
#[get("/alice/auth?<response_type>&<client_id>&<redirect_uri>&<scope>&<state>")]
pub fn alice_auth_page(
    response_type: String,
    client_id: String,
    redirect_uri: String,
    scope: Option<String>,
    state: String,
) -> rocket::response::content::RawHtml<String> {
    let expected_client_id = env::var("ALICE_CLIENT_ID").unwrap_or_else(|_| "alice_client".to_string());

    if client_id != expected_client_id || response_type != "code" {
        return rocket::response::content::RawHtml(format!(
            r#"<!DOCTYPE html>
            <html>
            <head><title>Error</title></head>
            <body><h1>Invalid request</h1></body>
            </html>"#
        ));
    }

    let html = format!(
        r##"<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Авторизация для Алисы</title>
    <style>
        body {{ font-family: system-ui, sans-serif; background: #5c6bc0; min-height: 100vh; display: flex; align-items: center; justify-content: center; margin: 0; padding: 20px; }}
        .login-box {{ background: white; padding: 40px; border-radius: 16px; box-shadow: 0 20px 60px rgba(0,0,0,0.3); max-width: 400px; width: 100%; }}
        h1 {{ margin: 0 0 30px; color: #333; font-size: 24px; text-align: center; }}
        input {{ width: 100%; padding: 12px 16px; border: 2px solid #e0e0e0; border-radius: 8px; font-size: 16px; margin-bottom: 16px; box-sizing: border-box; }}
        button {{ width: 100%; padding: 14px; background: #5c6bc0; color: white; border: none; border-radius: 8px; font-size: 16px; font-weight: 600; cursor: pointer; }}
        .info {{ text-align: center; margin-top: 20px; color: #666; font-size: 14px; }}
    </style>
</head>
<body>
    <div class="login-box">
        <h1>Авторизация для Алисы</h1>
        <form method="post" action="/alice/auth/login">
            <input type="hidden" name="state" value="{state}">
            <input type="hidden" name="redirect_uri" value="{redirect_uri}">
            <input type="hidden" name="client_id" value="{client_id}">
            <input type="text" name="username" placeholder="Логин" required autofocus>
            <input type="password" name="password" placeholder="Пароль" required>
            <button type="submit">Войти</button>
        </form>
        <p class="info">Разрешить Алисе управлять вашим умным домом</p>
    </div>
</body>
</html>"##,
        state = state,
        redirect_uri = redirect_uri,
        client_id = client_id
    );

    rocket::response::content::RawHtml(html)
}

/// Process login form
#[post("/alice/auth/login", data = "<form>")]
pub async fn alice_auth_login(
    pool: &State<DbPool>,
    form: rocket::form::Form<LoginForm>,
) -> Result<Redirect, rocket::response::content::RawHtml<String>> {
    let expected_client_id = env::var("ALICE_CLIENT_ID").unwrap_or_else(|_| "alice_client".to_string());

    if form.client_id != expected_client_id {
        return Err(rocket::response::content::RawHtml(
            "<html><body><h1>Invalid client</h1></body></html>".to_string(),
        ));
    }

    match AliceService::verify_user(pool.inner(), &form.username, &form.password).await {
        Ok(Some(user_id)) => {
            // Generate authorization code
            let code = uuid::Uuid::new_v4().to_string();

            // Store code in temporary storage (in production, use proper storage)
            // For now, we'll use the access token as the code
            let _ = AliceService::create_tokens(pool.inner(), user_id).await;

            // Redirect back to Yandex with code
            let redirect_url = format!(
                "{}?code={}&state={}",
                form.redirect_uri, code, form.state
            );

            Ok(Redirect::to(redirect_url))
        }
        _ => Err(rocket::response::content::RawHtml(format!(
            r#"<!DOCTYPE html>
            <html>
            <head><title>Ошибка</title></head>
            <body>
                <h1>Неверный логин или пароль</h1>
                <a href="/alice/auth?response_type=code&client_id={}&redirect_uri={}&state={}">Попробовать снова</a>
            </body>
            </html>"#,
            form.client_id, form.redirect_uri, form.state
        ))),
    }
}

#[derive(Debug, FromForm)]
pub struct TokenForm {
    pub grant_type: String,
    pub code: Option<String>,
    pub refresh_token: Option<String>,
    pub client_id: String,
    pub client_secret: String,
    pub redirect_uri: Option<String>,
}

/// OAuth token endpoint
#[post("/alice/token", data = "<form>")]
pub async fn alice_token(
    pool: &State<DbPool>,
    form: rocket::form::Form<TokenForm>,
) -> Result<Json<TokenResponse>, (Status, Json<OAuthError>)> {
    let expected_client_id = env::var("ALICE_CLIENT_ID").unwrap_or_else(|_| "alice_client".to_string());
    let expected_client_secret = env::var("ALICE_CLIENT_SECRET").unwrap_or_else(|_| "alice_secret".to_string());

    if form.client_id != expected_client_id || form.client_secret != expected_client_secret {
        return Err((
            Status::Unauthorized,
            Json(OAuthError {
                error: "invalid_client".to_string(),
                error_description: Some("Invalid client credentials".to_string()),
            }),
        ));
    }

    match form.grant_type.as_str() {
        "authorization_code" => {
            // For simplicity, we'll create new tokens for the first user
            // In production, you'd validate the code and get the user
            match AliceService::create_tokens(pool.inner(), 1).await {
                Ok(tokens) => Ok(Json(tokens)),
                Err(_) => Err((
                    Status::InternalServerError,
                    Json(OAuthError {
                        error: "server_error".to_string(),
                        error_description: Some("Failed to create tokens".to_string()),
                    }),
                )),
            }
        }
        "refresh_token" => {
            if let Some(ref refresh_token) = form.refresh_token {
                match AliceService::refresh_tokens(pool.inner(), refresh_token).await {
                    Ok(Some(tokens)) => Ok(Json(tokens)),
                    Ok(None) => Err((
                        Status::Unauthorized,
                        Json(OAuthError {
                            error: "invalid_grant".to_string(),
                            error_description: Some("Invalid refresh token".to_string()),
                        }),
                    )),
                    Err(_) => Err((
                        Status::InternalServerError,
                        Json(OAuthError {
                            error: "server_error".to_string(),
                            error_description: Some("Failed to refresh tokens".to_string()),
                        }),
                    )),
                }
            } else {
                Err((
                    Status::BadRequest,
                    Json(OAuthError {
                        error: "invalid_request".to_string(),
                        error_description: Some("Missing refresh_token".to_string()),
                    }),
                ))
            }
        }
        _ => Err((
            Status::BadRequest,
            Json(OAuthError {
                error: "unsupported_grant_type".to_string(),
                error_description: Some("Unsupported grant type".to_string()),
            }),
        )),
    }
}

// ================== Admin API Endpoints ==================

#[derive(Debug, Serialize, Deserialize)]
pub struct DeviceConfigRequest {
    pub device_id: String,
    pub config: serde_json::Value,
}

/// Get all Alice devices (admin)
#[get("/alice/admin/devices")]
pub async fn alice_admin_get_devices(
    _session: AdminSession,
    pool: &State<DbPool>,
) -> Result<Json<Vec<AliceDevice>>, Status> {
    match AliceService::get_devices(pool.inner()).await {
        Ok(devices) => Ok(Json(devices)),
        Err(_) => Err(Status::InternalServerError),
    }
}

/// Update device configuration (admin)
#[post("/alice/admin/devices/config", data = "<request>")]
pub async fn alice_admin_update_config(
    _session: AdminSession,
    pool: &State<DbPool>,
    request: Json<DeviceConfigRequest>,
) -> Result<Json<serde_json::Value>, Status> {
    match AliceService::update_device_config(pool.inner(), &request.device_id, request.config.clone()).await {
        Ok(_) => Ok(Json(serde_json::json!({"success": true}))),
        Err(_) => Err(Status::InternalServerError),
    }
}

/// Get command log (admin)
#[get("/alice/admin/commands?<limit>")]
pub async fn alice_admin_get_commands(
    _session: AdminSession,
    pool: &State<DbPool>,
    limit: Option<i64>,
) -> Result<Json<Vec<serde_json::Value>>, Status> {
    let limit = limit.unwrap_or(50);
    match AliceService::get_command_log(pool.inner(), limit).await {
        Ok(commands) => Ok(Json(commands)),
        Err(_) => Err(Status::InternalServerError),
    }
}

/// Get notifications (admin/public for SSE)
#[get("/alice/notifications?<limit>")]
pub async fn alice_get_notifications(
    alice_state: &State<AliceState>,
    limit: Option<usize>,
) -> Json<Vec<WebsiteNotification>> {
    let limit = limit.unwrap_or(10);
    Json(alice_state.get_notifications(limit))
}

/// Send test notification
#[post("/alice/admin/test-notification", data = "<message>")]
pub async fn alice_test_notification(
    _session: AdminSession,
    alice_state: &State<AliceState>,
    message: Json<serde_json::Value>,
) -> Json<WebsiteNotification> {
    let msg = message.get("message").and_then(|v| v.as_str()).unwrap_or("Тестовое уведомление");
    let notification = alice_state.inner().add_notification(msg.to_string(), "test".to_string());
    Json(notification)
}

/// Send Telegram message (admin)
#[post("/alice/admin/telegram", data = "<request>")]
pub async fn alice_admin_telegram(
    _session: AdminSession,
    telegram_bot: &State<TelegramBot>,
    admin_telegram_id: &State<i64>,
    request: Json<serde_json::Value>,
) -> Result<Json<serde_json::Value>, Status> {
    let chat_id = request
        .get("chat_id")
        .and_then(|v| v.as_i64())
        .unwrap_or(**admin_telegram_id);
    let message = request
        .get("message")
        .and_then(|v| v.as_str())
        .unwrap_or("Тестовое сообщение от Алисы");

    match telegram_bot.send_message(chat_id, message).await {
        Ok(_) => Ok(Json(serde_json::json!({"success": true}))),
        Err(e) => {
            eprintln!("Telegram error: {}", e);
            Err(Status::InternalServerError)
        }
    }
}

/// Wake PC via WoL (admin)
#[post("/alice/admin/wake-pc", data = "<request>")]
pub async fn alice_admin_wake_pc(
    _session: AdminSession,
    alice_state: &State<AliceState>,
    request: Json<serde_json::Value>,
) -> Result<Json<serde_json::Value>, Status> {
    let mac = request
        .get("mac")
        .and_then(|v| v.as_str())
        .unwrap_or("");

    if mac.is_empty() {
        return Ok(Json(serde_json::json!({"success": false, "error": "MAC address required"})));
    }

    // Parse and send WoL packet
    let mac_bytes: Result<Vec<u8>, _> = mac
        .split(|c| c == ':' || c == '-')
        .map(|s| u8::from_str_radix(s, 16))
        .collect();

    match mac_bytes {
        Ok(bytes) if bytes.len() == 6 => {
            use std::net::UdpSocket;

            let mut packet = vec![0xFFu8; 6];
            for _ in 0..16 {
                packet.extend_from_slice(&bytes);
            }

            match UdpSocket::bind("0.0.0.0:0") {
                Ok(socket) => {
                    let _ = socket.set_broadcast(true);
                    if socket.send_to(&packet, "255.255.255.255:9").is_ok() {
                        alice_state.set_pc_status("pc-control".to_string(), true);
                        return Ok(Json(serde_json::json!({"success": true})));
                    }
                }
                Err(_) => {}
            }
            Err(Status::InternalServerError)
        }
        _ => Ok(Json(serde_json::json!({"success": false, "error": "Invalid MAC address"}))),
    }
}
