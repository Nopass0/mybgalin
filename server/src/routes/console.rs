use crate::guards::AuthGuard;
use rocket::http::Status;
use rocket::serde::json::Json;
use rocket::{get, post};
use serde::{Deserialize, Serialize};
use std::process::Stdio;
use tokio::process::Command;
use tokio::io::AsyncReadExt;
use std::time::Duration;

// === Models ===

#[derive(Debug, Deserialize)]
pub struct ExecuteCommandRequest {
    pub command: String,
    pub timeout_secs: Option<u64>,
}

#[derive(Debug, Serialize)]
pub struct CommandResult {
    pub stdout: String,
    pub stderr: String,
    pub exit_code: Option<i32>,
    pub execution_time_ms: u128,
    pub success: bool,
    pub timed_out: bool,
}

#[derive(Debug, Serialize)]
pub struct SystemInfo {
    pub hostname: String,
    pub os: String,
    pub kernel: String,
    pub uptime_seconds: u64,
    pub load_average: [f64; 3],
    pub memory: MemoryInfo,
    pub disk: DiskInfo,
    pub cpu_count: usize,
}

#[derive(Debug, Serialize)]
pub struct MemoryInfo {
    pub total_mb: u64,
    pub used_mb: u64,
    pub free_mb: u64,
    pub usage_percent: f64,
}

#[derive(Debug, Serialize)]
pub struct DiskInfo {
    pub total_gb: f64,
    pub used_gb: f64,
    pub free_gb: f64,
    pub usage_percent: f64,
}

#[derive(Debug, Serialize)]
pub struct ProcessInfo {
    pub pid: u32,
    pub name: String,
    pub cpu_percent: f64,
    pub memory_mb: f64,
    pub status: String,
}

#[derive(Debug, Serialize)]
pub struct ServerLogs {
    pub logs: Vec<String>,
    pub total_lines: usize,
}

// === Endpoints ===

/// Execute a shell command (with safety restrictions)
#[post("/console/execute", data = "<request>")]
pub async fn execute_command(
    _auth: AuthGuard,
    request: Json<ExecuteCommandRequest>,
) -> Result<Json<CommandResult>, Status> {
    let cmd = request.command.trim();

    // Safety checks - block dangerous commands
    let blocked_commands = [
        "rm -rf /",
        "rm -rf /*",
        "mkfs",
        ":(){:|:&};:",
        "dd if=/dev/zero",
        "chmod -R 777 /",
        "chown -R",
        "> /dev/sda",
        "shutdown",
        "reboot",
        "halt",
        "poweroff",
        "init 0",
        "init 6",
    ];

    let cmd_lower = cmd.to_lowercase();
    for blocked in blocked_commands {
        if cmd_lower.contains(&blocked.to_lowercase()) {
            return Ok(Json(CommandResult {
                stdout: String::new(),
                stderr: format!("Command blocked for safety: {}", blocked),
                exit_code: None,
                execution_time_ms: 0,
                success: false,
                timed_out: false,
            }));
        }
    }

    // Block commands that try to access sensitive files
    let sensitive_patterns = ["/etc/shadow", "/etc/passwd", "~/.ssh", ".env"];
    for pattern in sensitive_patterns {
        if cmd_lower.contains(pattern) {
            return Ok(Json(CommandResult {
                stdout: String::new(),
                stderr: format!("Access to sensitive file blocked: {}", pattern),
                exit_code: None,
                execution_time_ms: 0,
                success: false,
                timed_out: false,
            }));
        }
    }

    let timeout = Duration::from_secs(request.timeout_secs.unwrap_or(30).min(300));
    let start = std::time::Instant::now();

    // Execute command
    let result = tokio::time::timeout(timeout, async {
        let mut child = Command::new("sh")
            .arg("-c")
            .arg(cmd)
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn()
            .map_err(|e| format!("Failed to spawn: {}", e))?;

        let stdout = child.stdout.take();
        let stderr = child.stderr.take();

        let mut stdout_str = String::new();
        let mut stderr_str = String::new();

        if let Some(mut out) = stdout {
            out.read_to_string(&mut stdout_str).await.ok();
        }

        if let Some(mut err) = stderr {
            err.read_to_string(&mut stderr_str).await.ok();
        }

        let status = child.wait().await.map_err(|e| format!("Wait error: {}", e))?;

        Ok::<_, String>((stdout_str, stderr_str, status.code()))
    })
    .await;

    let execution_time_ms = start.elapsed().as_millis();

    match result {
        Ok(Ok((stdout, stderr, exit_code))) => {
            Ok(Json(CommandResult {
                stdout: truncate_output(&stdout, 100000),
                stderr: truncate_output(&stderr, 100000),
                exit_code,
                execution_time_ms,
                success: exit_code == Some(0),
                timed_out: false,
            }))
        }
        Ok(Err(e)) => {
            Ok(Json(CommandResult {
                stdout: String::new(),
                stderr: e,
                exit_code: None,
                execution_time_ms,
                success: false,
                timed_out: false,
            }))
        }
        Err(_) => {
            Ok(Json(CommandResult {
                stdout: String::new(),
                stderr: "Command timed out".to_string(),
                exit_code: None,
                execution_time_ms,
                success: false,
                timed_out: true,
            }))
        }
    }
}

/// Get system information
#[get("/console/system")]
pub async fn get_system_info(
    _auth: AuthGuard,
) -> Result<Json<SystemInfo>, Status> {
    // Hostname
    let hostname = tokio::fs::read_to_string("/etc/hostname")
        .await
        .unwrap_or_else(|_| "unknown".to_string())
        .trim()
        .to_string();

    // OS info
    let os_release = tokio::fs::read_to_string("/etc/os-release")
        .await
        .unwrap_or_default();
    let os = os_release
        .lines()
        .find(|l| l.starts_with("PRETTY_NAME="))
        .map(|l| l.trim_start_matches("PRETTY_NAME=").trim_matches('"'))
        .unwrap_or("Linux")
        .to_string();

    // Kernel version
    let kernel = run_simple_command("uname -r").await.trim().to_string();

    // Uptime
    let uptime_str = tokio::fs::read_to_string("/proc/uptime")
        .await
        .unwrap_or_else(|_| "0".to_string());
    let uptime_seconds = uptime_str
        .split_whitespace()
        .next()
        .and_then(|s| s.parse::<f64>().ok())
        .unwrap_or(0.0) as u64;

    // Load average
    let loadavg_str = tokio::fs::read_to_string("/proc/loadavg")
        .await
        .unwrap_or_else(|_| "0 0 0".to_string());
    let load_parts: Vec<f64> = loadavg_str
        .split_whitespace()
        .take(3)
        .filter_map(|s| s.parse().ok())
        .collect();
    let load_average = [
        load_parts.get(0).copied().unwrap_or(0.0),
        load_parts.get(1).copied().unwrap_or(0.0),
        load_parts.get(2).copied().unwrap_or(0.0),
    ];

    // Memory info
    let meminfo = tokio::fs::read_to_string("/proc/meminfo")
        .await
        .unwrap_or_default();
    let mem_total = parse_meminfo_kb(&meminfo, "MemTotal") / 1024;
    let mem_free = parse_meminfo_kb(&meminfo, "MemFree") / 1024;
    let mem_buffers = parse_meminfo_kb(&meminfo, "Buffers") / 1024;
    let mem_cached = parse_meminfo_kb(&meminfo, "Cached") / 1024;
    let mem_used = mem_total - mem_free - mem_buffers - mem_cached;
    let memory = MemoryInfo {
        total_mb: mem_total,
        used_mb: mem_used,
        free_mb: mem_free + mem_buffers + mem_cached,
        usage_percent: if mem_total > 0 { (mem_used as f64 / mem_total as f64) * 100.0 } else { 0.0 },
    };

    // Disk info (root partition)
    let df_output = run_simple_command("df -B1 / | tail -1").await;
    let disk_parts: Vec<&str> = df_output.split_whitespace().collect();
    let disk = if disk_parts.len() >= 4 {
        let total = disk_parts.get(1).and_then(|s| s.parse::<u64>().ok()).unwrap_or(0);
        let used = disk_parts.get(2).and_then(|s| s.parse::<u64>().ok()).unwrap_or(0);
        let free = disk_parts.get(3).and_then(|s| s.parse::<u64>().ok()).unwrap_or(0);
        DiskInfo {
            total_gb: total as f64 / 1_073_741_824.0,
            used_gb: used as f64 / 1_073_741_824.0,
            free_gb: free as f64 / 1_073_741_824.0,
            usage_percent: if total > 0 { (used as f64 / total as f64) * 100.0 } else { 0.0 },
        }
    } else {
        DiskInfo {
            total_gb: 0.0,
            used_gb: 0.0,
            free_gb: 0.0,
            usage_percent: 0.0,
        }
    };

    // CPU count
    let cpu_count = run_simple_command("nproc")
        .await
        .trim()
        .parse::<usize>()
        .unwrap_or(1);

    Ok(Json(SystemInfo {
        hostname,
        os,
        kernel,
        uptime_seconds,
        load_average,
        memory,
        disk,
        cpu_count,
    }))
}

/// Get top processes
#[get("/console/processes")]
pub async fn get_processes(
    _auth: AuthGuard,
) -> Result<Json<Vec<ProcessInfo>>, Status> {
    let ps_output = run_simple_command("ps aux --sort=-%mem | head -20").await;

    let processes: Vec<ProcessInfo> = ps_output
        .lines()
        .skip(1) // Skip header
        .filter_map(|line| {
            let parts: Vec<&str> = line.split_whitespace().collect();
            if parts.len() >= 11 {
                Some(ProcessInfo {
                    pid: parts[1].parse().unwrap_or(0),
                    name: parts[10..].join(" "),
                    cpu_percent: parts[2].parse().unwrap_or(0.0),
                    memory_mb: parts[5].parse::<f64>().unwrap_or(0.0) / 1024.0,
                    status: parts[7].to_string(),
                })
            } else {
                None
            }
        })
        .collect();

    Ok(Json(processes))
}

/// Get recent server logs
#[get("/console/logs?<lines>&<service>")]
pub async fn get_logs(
    _auth: AuthGuard,
    lines: Option<usize>,
    service: Option<&str>,
) -> Result<Json<ServerLogs>, Status> {
    let num_lines = lines.unwrap_or(100).min(1000);

    let cmd = if let Some(svc) = service {
        // Validate service name
        if !svc.chars().all(|c| c.is_alphanumeric() || c == '-' || c == '_') {
            return Err(Status::BadRequest);
        }
        format!("journalctl -u {} -n {} --no-pager --output=short-iso 2>/dev/null || tail -n {} /var/log/syslog 2>/dev/null || echo 'No logs available'", svc, num_lines, num_lines)
    } else {
        format!("journalctl -n {} --no-pager --output=short-iso 2>/dev/null || tail -n {} /var/log/syslog 2>/dev/null || echo 'No logs available'", num_lines, num_lines)
    };

    let output = run_simple_command(&cmd).await;
    let logs: Vec<String> = output.lines().map(|s| s.to_string()).collect();

    Ok(Json(ServerLogs {
        total_lines: logs.len(),
        logs,
    }))
}

/// Get available services
#[get("/console/services")]
pub async fn get_services(
    _auth: AuthGuard,
) -> Result<Json<Vec<String>>, Status> {
    let output = run_simple_command("systemctl list-units --type=service --state=running --no-legend 2>/dev/null | awk '{print $1}'").await;

    let services: Vec<String> = output
        .lines()
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty())
        .collect();

    Ok(Json(services))
}

// === Helper functions ===

async fn run_simple_command(cmd: &str) -> String {
    Command::new("sh")
        .arg("-c")
        .arg(cmd)
        .output()
        .await
        .map(|o| String::from_utf8_lossy(&o.stdout).to_string())
        .unwrap_or_default()
}

fn parse_meminfo_kb(meminfo: &str, key: &str) -> u64 {
    meminfo
        .lines()
        .find(|l| l.starts_with(key))
        .and_then(|l| {
            l.split_whitespace()
                .nth(1)
                .and_then(|s| s.parse::<u64>().ok())
        })
        .unwrap_or(0)
}

fn truncate_output(s: &str, max_len: usize) -> String {
    if s.len() > max_len {
        format!("{}... [truncated, {} more bytes]", &s[..max_len], s.len() - max_len)
    } else {
        s.to_string()
    }
}
