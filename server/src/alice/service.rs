use crate::alice::models::*;
use crate::db::DbPool;
use crate::telegram::TelegramBot;
use parking_lot::RwLock;
use reqwest::Client;
use std::collections::HashMap;
use std::net::UdpSocket;
use std::sync::Arc;

/// Shared state for Alice notifications
#[derive(Clone)]
pub struct AliceState {
    pub notifications: Arc<RwLock<Vec<WebsiteNotification>>>,
    pub pc_status: Arc<RwLock<HashMap<String, bool>>>,
}

impl AliceState {
    pub fn new() -> Self {
        Self {
            notifications: Arc::new(RwLock::new(Vec::new())),
            pc_status: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    /// Add notification
    pub fn add_notification(&self, message: String, notification_type: String) -> WebsiteNotification {
        let notification = WebsiteNotification {
            id: uuid::Uuid::new_v4().to_string(),
            message,
            notification_type,
            created_at: chrono::Utc::now(),
        };

        let mut notifications = self.notifications.write();
        notifications.push(notification.clone());

        // Keep only last 100 notifications
        if notifications.len() > 100 {
            notifications.remove(0);
        }

        notification
    }

    /// Get recent notifications
    pub fn get_notifications(&self, limit: usize) -> Vec<WebsiteNotification> {
        let notifications = self.notifications.read();
        notifications.iter().rev().take(limit).cloned().collect()
    }

    /// Set PC status
    pub fn set_pc_status(&self, device_id: String, is_online: bool) {
        let mut status = self.pc_status.write();
        status.insert(device_id, is_online);
    }

    /// Get PC status
    pub fn get_pc_status(&self, device_id: &str) -> bool {
        let status = self.pc_status.read();
        status.get(device_id).copied().unwrap_or(false)
    }
}

impl Default for AliceState {
    fn default() -> Self {
        Self::new()
    }
}

/// Alice Smart Home Service
pub struct AliceService;

impl AliceService {
    /// Get all enabled devices
    pub async fn get_devices(pool: &DbPool) -> Result<Vec<AliceDevice>, sqlx::Error> {
        let devices = match pool {
            DbPool::Sqlite(p) => {
                sqlx::query_as::<_, DbAliceDevice>(
                    "SELECT id, name, description, room, device_type, capabilities, properties, custom_data, is_enabled FROM alice_devices WHERE is_enabled = TRUE"
                )
                .fetch_all(p)
                .await?
            }
            DbPool::Postgres(p) => {
                sqlx::query_as::<_, DbAliceDevice>(
                    "SELECT id, name, description, room, device_type, capabilities, properties, custom_data, is_enabled FROM alice_devices WHERE is_enabled = TRUE"
                )
                .fetch_all(p)
                .await?
            }
        };

        Ok(devices.into_iter().map(|d| Self::db_to_alice_device(d)).collect())
    }

    /// Get device by ID
    pub async fn get_device(pool: &DbPool, device_id: &str) -> Result<Option<AliceDevice>, sqlx::Error> {
        let device = match pool {
            DbPool::Sqlite(p) => {
                sqlx::query_as::<_, DbAliceDevice>(
                    "SELECT id, name, description, room, device_type, capabilities, properties, custom_data, is_enabled FROM alice_devices WHERE id = ?"
                )
                .bind(device_id)
                .fetch_optional(p)
                .await?
            }
            DbPool::Postgres(p) => {
                sqlx::query_as::<_, DbAliceDevice>(
                    "SELECT id, name, description, room, device_type, capabilities, properties, custom_data, is_enabled FROM alice_devices WHERE id = $1"
                )
                .bind(device_id)
                .fetch_optional(p)
                .await?
            }
        };

        Ok(device.map(|d| Self::db_to_alice_device(d)))
    }

    /// Convert DB device to Alice device
    fn db_to_alice_device(db_device: DbAliceDevice) -> AliceDevice {
        let capabilities_json: Vec<String> = serde_json::from_str(&db_device.capabilities).unwrap_or_default();

        let capabilities: Vec<DeviceCapability> = capabilities_json
            .iter()
            .map(|cap_type| {
                match cap_type.as_str() {
                    "on_off" => DeviceCapability {
                        capability_type: "devices.capabilities.on_off".to_string(),
                        retrievable: true,
                        reportable: Some(true),
                        parameters: None,
                        state: None,
                    },
                    "custom_button" => DeviceCapability {
                        capability_type: "devices.capabilities.toggle".to_string(),
                        retrievable: true,
                        reportable: Some(false),
                        parameters: Some(serde_json::json!({
                            "instance": "mute"
                        })),
                        state: None,
                    },
                    _ => DeviceCapability {
                        capability_type: format!("devices.capabilities.{}", cap_type),
                        retrievable: true,
                        reportable: None,
                        parameters: None,
                        state: None,
                    },
                }
            })
            .collect();

        let properties = db_device.properties.and_then(|p| {
            let props_json: Vec<String> = serde_json::from_str(&p).ok()?;
            Some(
                props_json
                    .iter()
                    .map(|prop_type| DeviceProperty {
                        property_type: format!("devices.properties.{}", prop_type),
                        retrievable: true,
                        reportable: Some(true),
                        parameters: None,
                        state: None,
                    })
                    .collect(),
            )
        });

        let custom_data = db_device.custom_data.and_then(|c| serde_json::from_str(&c).ok());

        AliceDevice {
            id: db_device.id,
            name: db_device.name,
            description: db_device.description,
            room: db_device.room,
            device_type: db_device.device_type,
            custom_data,
            capabilities,
            properties,
            device_info: Some(DeviceInfo {
                manufacturer: Some("BGalin Smart Home".to_string()),
                model: Some("v1.0".to_string()),
                hw_version: Some("1.0".to_string()),
                sw_version: Some("1.0".to_string()),
            }),
        }
    }

    /// Get device state
    pub async fn get_device_state(
        pool: &DbPool,
        device_id: &str,
        alice_state: &AliceState,
    ) -> Result<Vec<DeviceCapability>, sqlx::Error> {
        let device = Self::get_device(pool, device_id).await?;

        if device.is_none() {
            return Ok(vec![]);
        }

        let device = device.unwrap();
        let mut capabilities = device.capabilities;

        // Update states based on device type
        for cap in &mut capabilities {
            if cap.capability_type == "devices.capabilities.on_off" {
                let is_on = alice_state.get_pc_status(device_id);
                cap.state = Some(CapabilityState {
                    instance: "on".to_string(),
                    value: serde_json::Value::Bool(is_on),
                });
            } else if cap.capability_type == "devices.capabilities.toggle" {
                cap.state = Some(CapabilityState {
                    instance: "mute".to_string(),
                    value: serde_json::Value::Bool(false),
                });
            }
        }

        Ok(capabilities)
    }

    /// Execute action on device
    pub async fn execute_action(
        pool: &DbPool,
        device_id: &str,
        capability_type: &str,
        instance: &str,
        value: serde_json::Value,
        alice_state: &AliceState,
        telegram_bot: &TelegramBot,
        admin_telegram_id: i64,
    ) -> Result<ActionResult, Box<dyn std::error::Error + Send + Sync>> {
        let device = Self::get_device(pool, device_id).await?;

        if device.is_none() {
            return Ok(ActionResult {
                status: "ERROR".to_string(),
                error_code: Some("DEVICE_NOT_FOUND".to_string()),
                error_message: Some("Device not found".to_string()),
            });
        }

        let device = device.unwrap();
        let custom_data = device.custom_data.unwrap_or_default();

        // Log the command
        Self::log_command(pool, device_id, capability_type, &serde_json::to_string(&value).unwrap_or_default()).await.ok();

        match device_id {
            "pc-control" => {
                Self::handle_pc_control(pool, &custom_data, capability_type, instance, &value, alice_state).await
            }
            "telegram-bot" => {
                Self::handle_telegram_bot(&custom_data, capability_type, instance, &value, telegram_bot, admin_telegram_id).await
            }
            "website-notify" => {
                Self::handle_website_notify(capability_type, instance, &value, alice_state).await
            }
            _ => {
                Ok(ActionResult {
                    status: "ERROR".to_string(),
                    error_code: Some("INVALID_ACTION".to_string()),
                    error_message: Some("Unknown device".to_string()),
                })
            }
        }
    }

    /// Handle PC control - queues commands for PC client
    async fn handle_pc_control(
        pool: &DbPool,
        custom_data: &serde_json::Value,
        _capability_type: &str,
        instance: &str,
        value: &serde_json::Value,
        alice_state: &AliceState,
    ) -> Result<ActionResult, Box<dyn std::error::Error + Send + Sync>> {
        let mac = custom_data.get("mac").and_then(|v| v.as_str()).unwrap_or("");

        if instance == "on" {
            let turn_on = value.as_bool().unwrap_or(false);

            if turn_on {
                // Wake-on-LAN - still done directly from server (doesn't need PC to be on)
                if !mac.is_empty() {
                    match Self::send_wol(mac) {
                        Ok(_) => {
                            alice_state.set_pc_status("pc-control".to_string(), true);
                            alice_state.add_notification(
                                "ПК включается по команде Алисы".to_string(),
                                "info".to_string(),
                            );
                            return Ok(ActionResult {
                                status: "DONE".to_string(),
                                error_code: None,
                                error_message: None,
                            });
                        }
                        Err(e) => {
                            return Ok(ActionResult {
                                status: "ERROR".to_string(),
                                error_code: Some("INTERNAL_ERROR".to_string()),
                                error_message: Some(format!("WoL failed: {}", e)),
                            });
                        }
                    }
                } else {
                    return Ok(ActionResult {
                        status: "ERROR".to_string(),
                        error_code: Some("INVALID_VALUE".to_string()),
                        error_message: Some("MAC address not configured".to_string()),
                    });
                }
            } else {
                // Shutdown - queue command for PC client
                let command_data = serde_json::json!({
                    "type": "Shutdown"
                });

                match CommandQueueService::queue_command(pool, "pc_shutdown", command_data, 10).await {
                    Ok(cmd_id) => {
                        alice_state.set_pc_status("pc-control".to_string(), false);
                        alice_state.add_notification(
                            format!("Команда на выключение ПК отправлена (ID: {})", cmd_id),
                            "info".to_string(),
                        );
                        return Ok(ActionResult {
                            status: "DONE".to_string(),
                            error_code: None,
                            error_message: None,
                        });
                    }
                    Err(e) => {
                        return Ok(ActionResult {
                            status: "ERROR".to_string(),
                            error_code: Some("INTERNAL_ERROR".to_string()),
                            error_message: Some(format!("Failed to queue command: {}", e)),
                        });
                    }
                }
            }
        }

        Ok(ActionResult {
            status: "ERROR".to_string(),
            error_code: Some("INVALID_ACTION".to_string()),
            error_message: Some("Unknown action".to_string()),
        })
    }

    /// Send Wake-on-LAN magic packet
    fn send_wol(mac_address: &str) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        // Parse MAC address
        let mac_bytes: Vec<u8> = mac_address
            .split(|c| c == ':' || c == '-')
            .map(|s| u8::from_str_radix(s, 16))
            .collect::<Result<Vec<_>, _>>()?;

        if mac_bytes.len() != 6 {
            return Err("Invalid MAC address".into());
        }

        // Build magic packet: 6 bytes of 0xFF followed by MAC address 16 times
        let mut packet = vec![0xFFu8; 6];
        for _ in 0..16 {
            packet.extend_from_slice(&mac_bytes);
        }

        // Send to broadcast address on port 9
        let socket = UdpSocket::bind("0.0.0.0:0")?;
        socket.set_broadcast(true)?;
        socket.send_to(&packet, "255.255.255.255:9")?;

        Ok(())
    }

    /// Handle Telegram bot commands
    async fn handle_telegram_bot(
        custom_data: &serde_json::Value,
        _capability_type: &str,
        _instance: &str,
        _value: &serde_json::Value,
        telegram_bot: &TelegramBot,
        admin_telegram_id: i64,
    ) -> Result<ActionResult, Box<dyn std::error::Error + Send + Sync>> {
        let chat_id = custom_data
            .get("chat_id")
            .and_then(|v| v.as_str())
            .and_then(|s| s.parse::<i64>().ok())
            .unwrap_or(admin_telegram_id);

        // Send notification message
        let message = "Привет! Это сообщение от Алисы!";

        match telegram_bot.send_message(chat_id, message).await {
            Ok(_) => Ok(ActionResult {
                status: "DONE".to_string(),
                error_code: None,
                error_message: None,
            }),
            Err(e) => Ok(ActionResult {
                status: "ERROR".to_string(),
                error_code: Some("INTERNAL_ERROR".to_string()),
                error_message: Some(format!("Telegram error: {}", e)),
            }),
        }
    }

    /// Handle website notifications
    async fn handle_website_notify(
        _capability_type: &str,
        _instance: &str,
        _value: &serde_json::Value,
        alice_state: &AliceState,
    ) -> Result<ActionResult, Box<dyn std::error::Error + Send + Sync>> {
        alice_state.add_notification(
            "Уведомление от Алисы!".to_string(),
            "alice".to_string(),
        );

        Ok(ActionResult {
            status: "DONE".to_string(),
            error_code: None,
            error_message: None,
        })
    }

    /// Log command to database
    async fn log_command(
        pool: &DbPool,
        device_id: &str,
        command_type: &str,
        command_data: &str,
    ) -> Result<(), sqlx::Error> {
        match pool {
            DbPool::Sqlite(p) => {
                sqlx::query(
                    "INSERT INTO alice_command_log (device_id, command_type, command_data, success) VALUES (?, ?, ?, TRUE)"
                )
                .bind(device_id)
                .bind(command_type)
                .bind(command_data)
                .execute(p)
                .await?;
            }
            DbPool::Postgres(p) => {
                sqlx::query(
                    "INSERT INTO alice_command_log (device_id, command_type, command_data, success) VALUES ($1, $2, $3, TRUE)"
                )
                .bind(device_id)
                .bind(command_type)
                .bind(command_data)
                .execute(p)
                .await?;
            }
        }
        Ok(())
    }

    /// Validate access token
    pub async fn validate_token(pool: &DbPool, access_token: &str) -> Result<Option<i64>, sqlx::Error> {
        let token = match pool {
            DbPool::Sqlite(p) => {
                sqlx::query_as::<_, DbAliceToken>(
                    "SELECT id, user_id, access_token, refresh_token, expires_at FROM alice_tokens WHERE access_token = ? AND expires_at > datetime('now')"
                )
                .bind(access_token)
                .fetch_optional(p)
                .await?
            }
            DbPool::Postgres(p) => {
                sqlx::query_as::<_, DbAliceToken>(
                    "SELECT id, user_id, access_token, refresh_token, expires_at FROM alice_tokens WHERE access_token = $1 AND expires_at > NOW()"
                )
                .bind(access_token)
                .fetch_optional(p)
                .await?
            }
        };

        Ok(token.map(|t| t.user_id))
    }

    /// Create new tokens for user
    pub async fn create_tokens(pool: &DbPool, user_id: i64) -> Result<TokenResponse, sqlx::Error> {
        let access_token = uuid::Uuid::new_v4().to_string();
        let refresh_token = uuid::Uuid::new_v4().to_string();
        let expires_in = 3600i64; // 1 hour

        match pool {
            DbPool::Sqlite(p) => {
                // Delete old tokens for this user
                sqlx::query("DELETE FROM alice_tokens WHERE user_id = ?")
                    .bind(user_id)
                    .execute(p)
                    .await?;

                // Create new tokens
                sqlx::query(
                    "INSERT INTO alice_tokens (user_id, access_token, refresh_token, expires_at) VALUES (?, ?, ?, datetime('now', '+1 hour'))"
                )
                .bind(user_id)
                .bind(&access_token)
                .bind(&refresh_token)
                .execute(p)
                .await?;
            }
            DbPool::Postgres(p) => {
                // Delete old tokens for this user
                sqlx::query("DELETE FROM alice_tokens WHERE user_id = $1")
                    .bind(user_id)
                    .execute(p)
                    .await?;

                // Create new tokens
                sqlx::query(
                    "INSERT INTO alice_tokens (user_id, access_token, refresh_token, expires_at) VALUES ($1, $2, $3, NOW() + INTERVAL '1 hour')"
                )
                .bind(user_id)
                .bind(&access_token)
                .bind(&refresh_token)
                .execute(p)
                .await?;
            }
        }

        Ok(TokenResponse {
            access_token,
            token_type: "Bearer".to_string(),
            expires_in,
            refresh_token,
        })
    }

    /// Refresh tokens
    pub async fn refresh_tokens(pool: &DbPool, refresh_token: &str) -> Result<Option<TokenResponse>, sqlx::Error> {
        let token = match pool {
            DbPool::Sqlite(p) => {
                sqlx::query_as::<_, DbAliceToken>(
                    "SELECT id, user_id, access_token, refresh_token, expires_at FROM alice_tokens WHERE refresh_token = ?"
                )
                .bind(refresh_token)
                .fetch_optional(p)
                .await?
            }
            DbPool::Postgres(p) => {
                sqlx::query_as::<_, DbAliceToken>(
                    "SELECT id, user_id, access_token, refresh_token, expires_at FROM alice_tokens WHERE refresh_token = $1"
                )
                .bind(refresh_token)
                .fetch_optional(p)
                .await?
            }
        };

        if let Some(t) = token {
            let new_tokens = Self::create_tokens(pool, t.user_id).await?;
            Ok(Some(new_tokens))
        } else {
            Ok(None)
        }
    }

    /// Verify user credentials
    pub async fn verify_user(pool: &DbPool, username: &str, password: &str) -> Result<Option<i64>, sqlx::Error> {
        let user = match pool {
            DbPool::Sqlite(p) => {
                sqlx::query_as::<_, DbAliceUser>(
                    "SELECT id, username, password_hash FROM alice_users WHERE username = ?"
                )
                .bind(username)
                .fetch_optional(p)
                .await?
            }
            DbPool::Postgres(p) => {
                sqlx::query_as::<_, DbAliceUser>(
                    "SELECT id, username, password_hash FROM alice_users WHERE username = $1"
                )
                .bind(username)
                .fetch_optional(p)
                .await?
            }
        };

        if let Some(u) = user {
            // Simple password check for demo (in production use proper hashing)
            // The hash in DB is a placeholder - for now accept "admin" password
            if password == "admin" || u.password_hash.contains(&password) {
                return Ok(Some(u.id));
            }
        }

        Ok(None)
    }

    /// Update device configuration
    pub async fn update_device_config(
        pool: &DbPool,
        device_id: &str,
        custom_data: serde_json::Value,
    ) -> Result<(), sqlx::Error> {
        let custom_data_str = serde_json::to_string(&custom_data).unwrap_or_default();

        match pool {
            DbPool::Sqlite(p) => {
                sqlx::query("UPDATE alice_devices SET custom_data = ?, updated_at = datetime('now') WHERE id = ?")
                    .bind(&custom_data_str)
                    .bind(device_id)
                    .execute(p)
                    .await?;
            }
            DbPool::Postgres(p) => {
                sqlx::query("UPDATE alice_devices SET custom_data = $1, updated_at = NOW() WHERE id = $2")
                    .bind(&custom_data_str)
                    .bind(device_id)
                    .execute(p)
                    .await?;
            }
        }

        Ok(())
    }

    /// Get command log
    pub async fn get_command_log(pool: &DbPool, limit: i64) -> Result<Vec<serde_json::Value>, sqlx::Error> {
        let rows: Vec<(String, String, Option<String>, bool, chrono::NaiveDateTime)> = match pool {
            DbPool::Sqlite(p) => {
                sqlx::query_as(
                    "SELECT device_id, command_type, command_data, success, created_at FROM alice_command_log ORDER BY created_at DESC LIMIT ?"
                )
                .bind(limit)
                .fetch_all(p)
                .await?
            }
            DbPool::Postgres(p) => {
                sqlx::query_as(
                    "SELECT device_id, command_type, command_data, success, created_at FROM alice_command_log ORDER BY created_at DESC LIMIT $1"
                )
                .bind(limit)
                .fetch_all(p)
                .await?
            }
        };

        Ok(rows
            .into_iter()
            .map(|(device_id, command_type, command_data, success, created_at)| {
                serde_json::json!({
                    "device_id": device_id,
                    "command_type": command_type,
                    "command_data": command_data,
                    "success": success,
                    "created_at": created_at.to_string()
                })
            })
            .collect())
    }
}

/// Check if device is online via ping
pub async fn check_device_online(ip: &str) -> bool {
    let client = Client::new();
    let url = format!("http://{}:3000/health", ip);

    match client.get(&url).timeout(std::time::Duration::from_secs(2)).send().await {
        Ok(resp) => resp.status().is_success(),
        Err(_) => {
            // Try ping as fallback
            std::process::Command::new("ping")
                .args(["-c", "1", "-W", "1", ip])
                .output()
                .map(|o| o.status.success())
                .unwrap_or(false)
        }
    }
}

/// Command Queue Service for PC client
pub struct CommandQueueService;

impl CommandQueueService {
    /// Queue a command for PC client
    pub async fn queue_command(
        pool: &DbPool,
        command_type: &str,
        command_data: serde_json::Value,
        priority: i32,
    ) -> Result<i64, sqlx::Error> {
        let id: i64 = match pool {
            DbPool::Sqlite(_) => {
                // SQLite doesn't have this feature
                return Err(sqlx::Error::Protocol("Command queue requires PostgreSQL".to_string()));
            }
            DbPool::Postgres(p) => {
                let row: (i64,) = sqlx::query_as(
                    "INSERT INTO alice_command_queue (command_type, command_data, priority) VALUES ($1, $2, $3) RETURNING id"
                )
                .bind(command_type)
                .bind(&command_data)
                .bind(priority)
                .fetch_one(p)
                .await?;
                row.0
            }
        };

        println!("📝 Queued command {} (type: {}, priority: {})", id, command_type, priority);
        Ok(id)
    }

    /// Get pending commands for PC client
    pub async fn get_pending_commands(
        pool: &DbPool,
        limit: i64,
    ) -> Result<Vec<DbQueuedCommand>, sqlx::Error> {
        match pool {
            DbPool::Sqlite(_) => {
                Ok(vec![])
            }
            DbPool::Postgres(p) => {
                let commands = sqlx::query_as::<_, DbQueuedCommand>(
                    "SELECT id, command_type, command_data, priority, status, created_at, processed_at, result, error
                     FROM alice_command_queue
                     WHERE status = 'pending'
                     ORDER BY priority DESC, created_at ASC
                     LIMIT $1"
                )
                .bind(limit)
                .fetch_all(p)
                .await?;
                Ok(commands)
            }
        }
    }

    /// Mark commands as processing
    pub async fn mark_as_processing(
        pool: &DbPool,
        command_ids: &[i64],
    ) -> Result<(), sqlx::Error> {
        if command_ids.is_empty() {
            return Ok(());
        }

        match pool {
            DbPool::Sqlite(_) => Ok(()),
            DbPool::Postgres(p) => {
                // Build query for multiple IDs
                let ids_str: String = command_ids.iter().map(|id| id.to_string()).collect::<Vec<_>>().join(",");
                let query = format!(
                    "UPDATE alice_command_queue SET status = 'processing' WHERE id IN ({})",
                    ids_str
                );
                sqlx::query(&query).execute(p).await?;
                Ok(())
            }
        }
    }

    /// Mark command as completed
    pub async fn mark_as_completed(
        pool: &DbPool,
        command_id: i64,
        result: Option<String>,
    ) -> Result<(), sqlx::Error> {
        match pool {
            DbPool::Sqlite(_) => Ok(()),
            DbPool::Postgres(p) => {
                sqlx::query(
                    "UPDATE alice_command_queue SET status = 'completed', processed_at = NOW(), result = $1 WHERE id = $2"
                )
                .bind(result)
                .bind(command_id)
                .execute(p)
                .await?;
                Ok(())
            }
        }
    }

    /// Mark command as failed
    pub async fn mark_as_failed(
        pool: &DbPool,
        command_id: i64,
        error: String,
    ) -> Result<(), sqlx::Error> {
        match pool {
            DbPool::Sqlite(_) => Ok(()),
            DbPool::Postgres(p) => {
                sqlx::query(
                    "UPDATE alice_command_queue SET status = 'failed', processed_at = NOW(), error = $1 WHERE id = $2"
                )
                .bind(error)
                .bind(command_id)
                .execute(p)
                .await?;
                Ok(())
            }
        }
    }

    /// Clear old completed/failed commands (cleanup)
    pub async fn cleanup_old_commands(pool: &DbPool, hours: i32) -> Result<u64, sqlx::Error> {
        match pool {
            DbPool::Sqlite(_) => Ok(0),
            DbPool::Postgres(p) => {
                let result = sqlx::query(
                    "DELETE FROM alice_command_queue WHERE status IN ('completed', 'failed') AND processed_at < NOW() - $1::interval"
                )
                .bind(format!("{} hours", hours))
                .execute(p)
                .await?;
                Ok(result.rows_affected())
            }
        }
    }

    /// Register a new PC client
    pub async fn register_client(
        pool: &DbPool,
        client_name: &str,
        mac_address: Option<&str>,
    ) -> Result<(String, String), sqlx::Error> {
        let client_id = uuid::Uuid::new_v4().to_string();
        let api_key = format!("pc_{}", uuid::Uuid::new_v4().to_string().replace("-", ""));

        match pool {
            DbPool::Sqlite(_) => {
                Err(sqlx::Error::Protocol("PC client registration requires PostgreSQL".to_string()))
            }
            DbPool::Postgres(p) => {
                sqlx::query(
                    "INSERT INTO alice_pc_clients (client_id, client_name, api_key, mac_address) VALUES ($1, $2, $3, $4)"
                )
                .bind(&client_id)
                .bind(client_name)
                .bind(&api_key)
                .bind(mac_address)
                .execute(p)
                .await?;

                println!("🖥️ Registered new PC client: {} ({})", client_name, client_id);
                Ok((client_id, api_key))
            }
        }
    }

    /// Validate PC client API key
    pub async fn validate_client(
        pool: &DbPool,
        api_key: &str,
    ) -> Result<Option<DbPcClient>, sqlx::Error> {
        match pool {
            DbPool::Sqlite(_) => Ok(None),
            DbPool::Postgres(p) => {
                let client = sqlx::query_as::<_, DbPcClient>(
                    "SELECT id, client_id, client_name, api_key, is_online, last_seen, mac_address, ip_address, created_at
                     FROM alice_pc_clients WHERE api_key = $1"
                )
                .bind(api_key)
                .fetch_optional(p)
                .await?;
                Ok(client)
            }
        }
    }

    /// Update PC client last seen
    pub async fn update_client_heartbeat(
        pool: &DbPool,
        api_key: &str,
        ip_address: Option<&str>,
    ) -> Result<(), sqlx::Error> {
        match pool {
            DbPool::Sqlite(_) => Ok(()),
            DbPool::Postgres(p) => {
                sqlx::query(
                    "UPDATE alice_pc_clients SET is_online = TRUE, last_seen = NOW(), ip_address = COALESCE($1, ip_address) WHERE api_key = $2"
                )
                .bind(ip_address)
                .bind(api_key)
                .execute(p)
                .await?;
                Ok(())
            }
        }
    }

    /// Get all registered PC clients
    pub async fn get_clients(pool: &DbPool) -> Result<Vec<DbPcClient>, sqlx::Error> {
        match pool {
            DbPool::Sqlite(_) => Ok(vec![]),
            DbPool::Postgres(p) => {
                let clients = sqlx::query_as::<_, DbPcClient>(
                    "SELECT id, client_id, client_name, api_key, is_online, last_seen, mac_address, ip_address, created_at
                     FROM alice_pc_clients ORDER BY created_at DESC"
                )
                .fetch_all(p)
                .await?;
                Ok(clients)
            }
        }
    }

    /// Delete a PC client
    pub async fn delete_client(pool: &DbPool, client_id: &str) -> Result<bool, sqlx::Error> {
        match pool {
            DbPool::Sqlite(_) => Ok(false),
            DbPool::Postgres(p) => {
                let result = sqlx::query("DELETE FROM alice_pc_clients WHERE client_id = $1")
                    .bind(client_id)
                    .execute(p)
                    .await?;
                Ok(result.rows_affected() > 0)
            }
        }
    }
}

