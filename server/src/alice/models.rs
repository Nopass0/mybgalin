use serde::{Deserialize, Serialize};

/// Request headers from Yandex
#[derive(Debug, Clone)]
pub struct AliceRequestHeaders {
    pub request_id: String,
    pub authorization: Option<String>,
}

/// User info from Yandex
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AliceUserInfo {
    pub user_id: String,
}

/// Yandex Smart Home API - Device capability
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeviceCapability {
    #[serde(rename = "type")]
    pub capability_type: String,
    pub retrievable: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub reportable: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub parameters: Option<serde_json::Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub state: Option<CapabilityState>,
}

/// Capability state
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CapabilityState {
    pub instance: String,
    pub value: serde_json::Value,
}

/// Device property for reporting
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeviceProperty {
    #[serde(rename = "type")]
    pub property_type: String,
    pub retrievable: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub reportable: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub parameters: Option<serde_json::Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub state: Option<PropertyState>,
}

/// Property state
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PropertyState {
    pub instance: String,
    pub value: serde_json::Value,
}

/// Device info for Yandex
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AliceDevice {
    pub id: String,
    pub name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub room: Option<String>,
    #[serde(rename = "type")]
    pub device_type: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub custom_data: Option<serde_json::Value>,
    pub capabilities: Vec<DeviceCapability>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub properties: Option<Vec<DeviceProperty>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub device_info: Option<DeviceInfo>,
}

/// Device manufacturer info
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeviceInfo {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub manufacturer: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub model: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub hw_version: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub sw_version: Option<String>,
}

/// Unlink request
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UnlinkRequest {
    pub request_id: String,
}

/// User devices response
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserDevicesResponse {
    pub request_id: String,
    pub payload: UserDevicesPayload,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserDevicesPayload {
    pub user_id: String,
    pub devices: Vec<AliceDevice>,
}

/// Query request
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QueryRequest {
    pub devices: Vec<QueryDevice>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QueryDevice {
    pub id: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub custom_data: Option<serde_json::Value>,
}

/// Query response
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QueryResponse {
    pub request_id: String,
    pub payload: QueryPayload,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QueryPayload {
    pub devices: Vec<QueryDeviceResponse>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QueryDeviceResponse {
    pub id: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub capabilities: Option<Vec<DeviceCapability>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub properties: Option<Vec<DeviceProperty>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error_code: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error_message: Option<String>,
}

/// Action request
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ActionRequest {
    pub payload: ActionPayload,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ActionPayload {
    pub devices: Vec<ActionDevice>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ActionDevice {
    pub id: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub custom_data: Option<serde_json::Value>,
    pub capabilities: Vec<ActionCapability>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ActionCapability {
    #[serde(rename = "type")]
    pub capability_type: String,
    pub state: ActionState,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ActionState {
    pub instance: String,
    pub value: serde_json::Value,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub relative: Option<bool>,
}

/// Action response
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ActionResponse {
    pub request_id: String,
    pub payload: ActionResponsePayload,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ActionResponsePayload {
    pub devices: Vec<ActionDeviceResponse>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ActionDeviceResponse {
    pub id: String,
    pub capabilities: Vec<ActionCapabilityResponse>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ActionCapabilityResponse {
    #[serde(rename = "type")]
    pub capability_type: String,
    pub state: ActionResultState,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ActionResultState {
    pub instance: String,
    pub action_result: ActionResult,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ActionResult {
    pub status: String, // "DONE" or "ERROR"
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error_code: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error_message: Option<String>,
}

/// OAuth authorization request
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuthRequest {
    pub response_type: String,
    pub client_id: String,
    pub redirect_uri: String,
    pub scope: Option<String>,
    pub state: String,
}

/// OAuth token request
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TokenRequest {
    pub grant_type: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub code: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub refresh_token: Option<String>,
    pub client_id: String,
    pub client_secret: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub redirect_uri: Option<String>,
}

/// OAuth token response
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TokenResponse {
    pub access_token: String,
    pub token_type: String,
    pub expires_in: i64,
    pub refresh_token: String,
}

/// OAuth error response
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OAuthError {
    pub error: String,
    pub error_description: Option<String>,
}

/// Database model for Alice device
#[derive(Debug, Clone, sqlx::FromRow)]
pub struct DbAliceDevice {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub room: Option<String>,
    pub device_type: String,
    pub capabilities: String,
    pub properties: Option<String>,
    pub custom_data: Option<String>,
    pub is_enabled: bool,
}

/// Database model for Alice device state
#[derive(Debug, Clone, sqlx::FromRow)]
pub struct DbAliceDeviceState {
    pub id: i64,
    pub device_id: String,
    pub state_key: String,
    pub state_value: String,
}

/// Database model for Alice user
#[derive(Debug, Clone, sqlx::FromRow)]
pub struct DbAliceUser {
    pub id: i64,
    pub username: String,
    pub password_hash: String,
}

/// Database model for Alice token
#[derive(Debug, Clone, sqlx::FromRow)]
pub struct DbAliceToken {
    pub id: i64,
    pub user_id: i64,
    pub access_token: String,
    pub refresh_token: String,
    pub expires_at: chrono::NaiveDateTime,
}

/// Notification for website (stored in memory, broadcast via SSE)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WebsiteNotification {
    pub id: String,
    pub message: String,
    pub notification_type: String,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

/// PC control command
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum PcCommand {
    WakeOnLan { mac_address: String },
    Shutdown { ip: String, ssh_user: String },
    CheckStatus { ip: String },
}

/// Telegram message command
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TelegramMessage {
    pub chat_id: i64,
    pub message: String,
}
