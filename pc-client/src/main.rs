//! Alice PC Client - Polls server for commands and executes them locally
//!
//! This client connects to the bgalin.ru server, polls for commands from
//! the Alice Smart Home system, and executes them on the local PC.
//!
//! Commands supported:
//! - Shutdown: Shuts down the PC
//! - Restart: Restarts the PC
//! - Lock: Locks the workstation
//! - Notification: Shows a desktop notification
//! - OpenUrl: Opens a URL in the default browser
//! - Volume: Control system volume (Windows only)
//! - Screenshot: Takes a screenshot
//! - Custom: Execute custom commands

use chrono::{DateTime, Utc};
use clap::Parser;
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::process::Command;
use std::time::Duration;

/// Alice PC Client - Receives commands from Alice Smart Home
#[derive(Parser, Debug)]
#[command(author, version, about, long_about = None)]
struct Args {
    /// Server URL (e.g., https://bgalin.ru)
    #[arg(short, long, default_value = "https://bgalin.ru")]
    server: String,

    /// API key for authentication
    #[arg(short, long, env = "ALICE_PC_API_KEY")]
    api_key: Option<String>,

    /// Config file path
    #[arg(short, long)]
    config: Option<PathBuf>,

    /// Poll interval in seconds
    #[arg(short, long, default_value = "5")]
    interval: u64,

    /// Run once and exit (don't loop)
    #[arg(long)]
    once: bool,

    /// Verbose output
    #[arg(short, long)]
    verbose: bool,
}

/// Configuration file format
#[derive(Debug, Serialize, Deserialize, Default)]
struct Config {
    server: Option<String>,
    api_key: Option<String>,
    interval: Option<u64>,
}

/// Command from server
#[derive(Debug, Deserialize)]
struct QueuedCommand {
    id: i64,
    command_type: String,
    command_data: serde_json::Value,
    priority: i32,
}

/// Result to send back to server
#[derive(Debug, Serialize)]
struct CommandResult {
    command_id: i64,
    success: bool,
    result: Option<String>,
    error: Option<String>,
}

/// Heartbeat response
#[derive(Debug, Deserialize)]
struct HeartbeatResponse {
    status: String,
    client_id: String,
    server_time: String,
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let args = Args::parse();

    // Load config from file if specified
    let config = if let Some(config_path) = &args.config {
        if config_path.exists() {
            let content = std::fs::read_to_string(config_path)?;
            toml::from_str(&content)?
        } else {
            Config::default()
        }
    } else {
        // Try default config location
        let default_path = dirs::config_dir()
            .map(|p| p.join("alice-pc-client").join("config.toml"));

        if let Some(path) = default_path {
            if path.exists() {
                let content = std::fs::read_to_string(path)?;
                toml::from_str(&content)?
            } else {
                Config::default()
            }
        } else {
            Config::default()
        }
    };

    // Merge config with args (args take precedence)
    let server = args.server.clone();
    let api_key = args.api_key
        .or(config.api_key)
        .ok_or("API key is required. Set via --api-key or ALICE_PC_API_KEY env var")?;
    let interval = args.interval;

    println!("=== Alice PC Client ===");
    println!("Server: {}", server);
    println!("Poll interval: {}s", interval);
    println!();

    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(30))
        .build()?;

    // Initial heartbeat
    if let Err(e) = send_heartbeat(&client, &server, &api_key).await {
        eprintln!("Warning: Initial heartbeat failed: {}", e);
    }

    loop {
        // Poll for commands
        match poll_commands(&client, &server, &api_key, args.verbose).await {
            Ok(commands) => {
                for cmd in commands {
                    if args.verbose {
                        println!("Processing command {} (type: {})", cmd.id, cmd.command_type);
                    }

                    let result = execute_command(&cmd).await;

                    // Report result
                    if let Err(e) = report_result(&client, &server, &api_key, result).await {
                        eprintln!("Failed to report result: {}", e);
                    }
                }
            }
            Err(e) => {
                if args.verbose {
                    eprintln!("Poll failed: {}", e);
                }
            }
        }

        if args.once {
            break;
        }

        tokio::time::sleep(Duration::from_secs(interval)).await;
    }

    Ok(())
}

/// Send heartbeat to server
async fn send_heartbeat(
    client: &reqwest::Client,
    server: &str,
    api_key: &str,
) -> Result<HeartbeatResponse, Box<dyn std::error::Error>> {
    let url = format!("{}/api/alice/pc/heartbeat", server);

    let response = client
        .post(&url)
        .header("X-API-Key", api_key)
        .send()
        .await?;

    if response.status().is_success() {
        let heartbeat: HeartbeatResponse = response.json().await?;
        println!("Connected to server (client: {})", heartbeat.client_id);
        Ok(heartbeat)
    } else {
        Err(format!("Heartbeat failed: {}", response.status()).into())
    }
}

/// Poll server for pending commands
async fn poll_commands(
    client: &reqwest::Client,
    server: &str,
    api_key: &str,
    verbose: bool,
) -> Result<Vec<QueuedCommand>, Box<dyn std::error::Error>> {
    let url = format!("{}/api/alice/pc/poll", server);

    let response = client
        .get(&url)
        .header("X-API-Key", api_key)
        .send()
        .await?;

    if response.status().is_success() {
        let commands: Vec<QueuedCommand> = response.json().await?;
        if !commands.is_empty() {
            println!("Received {} command(s)", commands.len());
        } else if verbose {
            println!("No pending commands");
        }
        Ok(commands)
    } else if response.status() == reqwest::StatusCode::UNAUTHORIZED {
        Err("Invalid API key".into())
    } else {
        Err(format!("Poll failed: {}", response.status()).into())
    }
}

/// Report command result to server
async fn report_result(
    client: &reqwest::Client,
    server: &str,
    api_key: &str,
    result: CommandResult,
) -> Result<(), Box<dyn std::error::Error>> {
    let url = format!("{}/api/alice/pc/result", server);

    let response = client
        .post(&url)
        .header("X-API-Key", api_key)
        .json(&result)
        .send()
        .await?;

    if response.status().is_success() {
        if result.success {
            println!("Command {} completed successfully", result.command_id);
        } else {
            println!("Command {} failed: {}", result.command_id, result.error.unwrap_or_default());
        }
        Ok(())
    } else {
        Err(format!("Report failed: {}", response.status()).into())
    }
}

/// Execute a command locally
async fn execute_command(cmd: &QueuedCommand) -> CommandResult {
    let result = match cmd.command_type.as_str() {
        "pc_shutdown" | "Shutdown" => execute_shutdown().await,
        "pc_restart" | "Restart" => execute_restart().await,
        "pc_lock" | "Lock" => execute_lock().await,
        "Notification" => {
            let title = cmd.command_data.get("title")
                .and_then(|v| v.as_str())
                .unwrap_or("Alice");
            let message = cmd.command_data.get("message")
                .and_then(|v| v.as_str())
                .unwrap_or("Notification from Alice");
            execute_notification(title, message).await
        }
        "OpenUrl" => {
            let url = cmd.command_data.get("url")
                .and_then(|v| v.as_str())
                .unwrap_or("");
            execute_open_url(url).await
        }
        "Screenshot" => execute_screenshot().await,
        "Volume" => {
            let action = cmd.command_data.get("action")
                .and_then(|v| v.as_str())
                .unwrap_or("mute");
            let value = cmd.command_data.get("value")
                .and_then(|v| v.as_i64())
                .map(|v| v as i32);
            execute_volume(action, value).await
        }
        "RunCommand" => {
            let command = cmd.command_data.get("command")
                .and_then(|v| v.as_str())
                .unwrap_or("");
            let args: Vec<String> = cmd.command_data.get("args")
                .and_then(|v| v.as_array())
                .map(|arr| arr.iter().filter_map(|v| v.as_str().map(String::from)).collect())
                .unwrap_or_default();
            execute_run_command(command, &args).await
        }
        "Custom" => {
            let name = cmd.command_data.get("name")
                .and_then(|v| v.as_str())
                .unwrap_or("");
            execute_custom(name, &cmd.command_data).await
        }
        _ => Err(format!("Unknown command type: {}", cmd.command_type)),
    };

    match result {
        Ok(msg) => CommandResult {
            command_id: cmd.id,
            success: true,
            result: Some(msg),
            error: None,
        },
        Err(e) => CommandResult {
            command_id: cmd.id,
            success: false,
            result: None,
            error: Some(e),
        },
    }
}

// ============== Command Implementations ==============

async fn execute_shutdown() -> Result<String, String> {
    println!("Executing: SHUTDOWN");

    #[cfg(target_os = "windows")]
    {
        Command::new("shutdown")
            .args(["/s", "/t", "5", "/c", "Shutdown requested by Alice"])
            .spawn()
            .map_err(|e| format!("Failed to initiate shutdown: {}", e))?;
    }

    #[cfg(target_os = "linux")]
    {
        Command::new("shutdown")
            .args(["-h", "+1", "Shutdown requested by Alice"])
            .spawn()
            .map_err(|e| format!("Failed to initiate shutdown: {}", e))?;
    }

    #[cfg(target_os = "macos")]
    {
        Command::new("osascript")
            .args(["-e", "tell app \"System Events\" to shut down"])
            .spawn()
            .map_err(|e| format!("Failed to initiate shutdown: {}", e))?;
    }

    Ok("Shutdown initiated".to_string())
}

async fn execute_restart() -> Result<String, String> {
    println!("Executing: RESTART");

    #[cfg(target_os = "windows")]
    {
        Command::new("shutdown")
            .args(["/r", "/t", "5", "/c", "Restart requested by Alice"])
            .spawn()
            .map_err(|e| format!("Failed to initiate restart: {}", e))?;
    }

    #[cfg(target_os = "linux")]
    {
        Command::new("shutdown")
            .args(["-r", "+1", "Restart requested by Alice"])
            .spawn()
            .map_err(|e| format!("Failed to initiate restart: {}", e))?;
    }

    #[cfg(target_os = "macos")]
    {
        Command::new("osascript")
            .args(["-e", "tell app \"System Events\" to restart"])
            .spawn()
            .map_err(|e| format!("Failed to initiate restart: {}", e))?;
    }

    Ok("Restart initiated".to_string())
}

async fn execute_lock() -> Result<String, String> {
    println!("Executing: LOCK");

    #[cfg(target_os = "windows")]
    {
        Command::new("rundll32.exe")
            .args(["user32.dll,LockWorkStation"])
            .spawn()
            .map_err(|e| format!("Failed to lock: {}", e))?;
    }

    #[cfg(target_os = "linux")]
    {
        // Try common screen lockers
        let lockers = ["loginctl", "gnome-screensaver-command", "xdg-screensaver"];
        let args = [["lock-session"], ["-l"], ["lock"]];

        for (locker, arg) in lockers.iter().zip(args.iter()) {
            if Command::new(locker).args(arg).spawn().is_ok() {
                return Ok("Screen locked".to_string());
            }
        }
        return Err("No screen locker found".to_string());
    }

    #[cfg(target_os = "macos")]
    {
        Command::new("pmset")
            .args(["displaysleepnow"])
            .spawn()
            .map_err(|e| format!("Failed to lock: {}", e))?;
    }

    Ok("Screen locked".to_string())
}

async fn execute_notification(title: &str, message: &str) -> Result<String, String> {
    println!("Executing: NOTIFICATION - {} : {}", title, message);

    #[cfg(target_os = "windows")]
    {
        // Use PowerShell to show notification
        let script = format!(
            r#"[Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] | Out-Null
$template = [Windows.UI.Notifications.ToastNotificationManager]::GetTemplateContent([Windows.UI.Notifications.ToastTemplateType]::ToastText02)
$text = $template.GetElementsByTagName('text')
$text[0].AppendChild($template.CreateTextNode('{}')) | Out-Null
$text[1].AppendChild($template.CreateTextNode('{}')) | Out-Null
$notify = [Windows.UI.Notifications.ToastNotification]::new($template)
[Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier('Alice PC Client').Show($notify)"#,
            title.replace("'", "''"),
            message.replace("'", "''")
        );

        Command::new("powershell")
            .args(["-Command", &script])
            .spawn()
            .map_err(|e| format!("Failed to show notification: {}", e))?;
    }

    #[cfg(target_os = "linux")]
    {
        Command::new("notify-send")
            .args([title, message])
            .spawn()
            .map_err(|e| format!("Failed to show notification: {}", e))?;
    }

    #[cfg(target_os = "macos")]
    {
        let script = format!(
            r#"display notification "{}" with title "{}""#,
            message.replace("\"", "\\\""),
            title.replace("\"", "\\\"")
        );
        Command::new("osascript")
            .args(["-e", &script])
            .spawn()
            .map_err(|e| format!("Failed to show notification: {}", e))?;
    }

    Ok("Notification shown".to_string())
}

async fn execute_open_url(url: &str) -> Result<String, String> {
    if url.is_empty() {
        return Err("URL is empty".to_string());
    }

    println!("Executing: OPEN URL - {}", url);

    #[cfg(target_os = "windows")]
    {
        Command::new("cmd")
            .args(["/c", "start", "", url])
            .spawn()
            .map_err(|e| format!("Failed to open URL: {}", e))?;
    }

    #[cfg(target_os = "linux")]
    {
        Command::new("xdg-open")
            .arg(url)
            .spawn()
            .map_err(|e| format!("Failed to open URL: {}", e))?;
    }

    #[cfg(target_os = "macos")]
    {
        Command::new("open")
            .arg(url)
            .spawn()
            .map_err(|e| format!("Failed to open URL: {}", e))?;
    }

    Ok(format!("Opened URL: {}", url))
}

async fn execute_screenshot() -> Result<String, String> {
    println!("Executing: SCREENSHOT");

    let timestamp = chrono::Local::now().format("%Y%m%d_%H%M%S");
    let filename = format!("screenshot_{}.png", timestamp);

    #[cfg(target_os = "windows")]
    {
        // Use PowerShell to take screenshot
        let script = format!(
            r#"Add-Type -AssemblyName System.Windows.Forms
$screen = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
$bitmap = New-Object System.Drawing.Bitmap($screen.Width, $screen.Height)
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$graphics.CopyFromScreen($screen.Location, [System.Drawing.Point]::Empty, $screen.Size)
$bitmap.Save('{}')
$graphics.Dispose()
$bitmap.Dispose()"#,
            filename
        );

        Command::new("powershell")
            .args(["-Command", &script])
            .output()
            .map_err(|e| format!("Failed to take screenshot: {}", e))?;
    }

    #[cfg(target_os = "linux")]
    {
        Command::new("gnome-screenshot")
            .args(["-f", &filename])
            .output()
            .or_else(|_| Command::new("scrot").arg(&filename).output())
            .map_err(|e| format!("Failed to take screenshot: {}", e))?;
    }

    #[cfg(target_os = "macos")]
    {
        Command::new("screencapture")
            .arg(&filename)
            .output()
            .map_err(|e| format!("Failed to take screenshot: {}", e))?;
    }

    Ok(format!("Screenshot saved: {}", filename))
}

async fn execute_volume(action: &str, value: Option<i32>) -> Result<String, String> {
    println!("Executing: VOLUME - {} {:?}", action, value);

    match action {
        "mute" | "toggle_mute" => {
            #[cfg(target_os = "windows")]
            {
                // Use nircmd or PowerShell
                Command::new("powershell")
                    .args(["-Command", "(New-Object -ComObject WScript.Shell).SendKeys([char]173)"])
                    .spawn()
                    .map_err(|e| format!("Failed to mute: {}", e))?;
            }

            #[cfg(target_os = "linux")]
            {
                Command::new("amixer")
                    .args(["set", "Master", "toggle"])
                    .spawn()
                    .map_err(|e| format!("Failed to mute: {}", e))?;
            }

            #[cfg(target_os = "macos")]
            {
                Command::new("osascript")
                    .args(["-e", "set volume with output muted"])
                    .spawn()
                    .map_err(|e| format!("Failed to mute: {}", e))?;
            }

            Ok("Volume muted/unmuted".to_string())
        }
        "set" => {
            let vol = value.unwrap_or(50).clamp(0, 100);

            #[cfg(target_os = "windows")]
            {
                let script = format!(
                    r#"$wshell = New-Object -ComObject WScript.Shell; $wshell.SendKeys([char]175)"#
                );
                // This is a simplified version - for proper control use nircmd
                Command::new("powershell")
                    .args(["-Command", &script])
                    .spawn()
                    .map_err(|e| format!("Failed to set volume: {}", e))?;
            }

            #[cfg(target_os = "linux")]
            {
                Command::new("amixer")
                    .args(["set", "Master", &format!("{}%", vol)])
                    .spawn()
                    .map_err(|e| format!("Failed to set volume: {}", e))?;
            }

            #[cfg(target_os = "macos")]
            {
                let vol_mac = vol * 7 / 100; // Mac volume is 0-7
                Command::new("osascript")
                    .args(["-e", &format!("set volume output volume {}", vol_mac)])
                    .spawn()
                    .map_err(|e| format!("Failed to set volume: {}", e))?;
            }

            Ok(format!("Volume set to {}%", vol))
        }
        _ => Err(format!("Unknown volume action: {}", action)),
    }
}

async fn execute_run_command(command: &str, args: &[String]) -> Result<String, String> {
    if command.is_empty() {
        return Err("Command is empty".to_string());
    }

    println!("Executing: RUN COMMAND - {} {:?}", command, args);

    // Security check - don't allow dangerous commands
    let dangerous = ["rm", "del", "format", "mkfs", "dd", "sudo", "su"];
    if dangerous.iter().any(|d| command.contains(d)) {
        return Err("Dangerous command blocked".to_string());
    }

    let output = Command::new(command)
        .args(args)
        .output()
        .map_err(|e| format!("Failed to run command: {}", e))?;

    if output.status.success() {
        let stdout = String::from_utf8_lossy(&output.stdout);
        Ok(format!("Command completed: {}", stdout.trim()))
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr);
        Err(format!("Command failed: {}", stderr.trim()))
    }
}

async fn execute_custom(name: &str, data: &serde_json::Value) -> Result<String, String> {
    println!("Executing: CUSTOM - {} : {:?}", name, data);

    // Custom commands can be extended here
    match name {
        "ping" => Ok("pong".to_string()),
        "echo" => {
            let msg = data.get("payload")
                .and_then(|v| v.as_str())
                .unwrap_or("echo");
            Ok(msg.to_string())
        }
        _ => Err(format!("Unknown custom command: {}", name)),
    }
}
