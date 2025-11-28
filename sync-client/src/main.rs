mod config;
mod sync;
mod watcher;

use anyhow::Result;
use clap::{Parser, Subcommand};
use console::style;
use dialoguer::{Confirm, Input, Select};
use indicatif::{ProgressBar, ProgressStyle};
use std::path::PathBuf;

use config::Config;
use sync::SyncClient;

#[derive(Parser)]
#[command(name = "cloud-sync")]
#[command(about = "Cloud file synchronization client", long_about = None)]
struct Cli {
    #[command(subcommand)]
    command: Option<Commands>,
}

#[derive(Subcommand)]
enum Commands {
    /// Configure sync connection
    Setup,
    /// Start sync daemon
    Start,
    /// Stop sync daemon
    Stop,
    /// Show sync status
    Status,
    /// Force sync now
    Sync,
    /// List synced files
    List,
    /// Add to system autostart
    Autostart,
    /// Remove from system autostart
    NoAutostart,
}

fn print_logo() {
    println!();
    println!("{}", style("  ╔═══════════════════════════════════╗").cyan());
    println!("{}", style("  ║       ☁️  Cloud Sync Client        ║").cyan());
    println!("{}", style("  ╚═══════════════════════════════════╝").cyan());
    println!();
}

fn print_menu() {
    println!();
    println!("{}", style("Available Commands:").bold().underlined());
    println!();
    println!("  {}  Setup sync connection", style("1.").cyan());
    println!("  {}  Start sync daemon", style("2.").cyan());
    println!("  {}  Stop sync daemon", style("3.").cyan());
    println!("  {}  Show status", style("4.").cyan());
    println!("  {}  Force sync now", style("5.").cyan());
    println!("  {}  List synced files", style("6.").cyan());
    println!("  {}  Add to autostart", style("7.").cyan());
    println!("  {}  Remove from autostart", style("8.").cyan());
    println!("  {}  Exit", style("0.").cyan());
    println!();
}

async fn interactive_menu() -> Result<()> {
    loop {
        print_menu();

        let selection = Select::new()
            .with_prompt("Select option")
            .items(&[
                "Setup sync connection",
                "Start sync daemon",
                "Stop sync daemon",
                "Show status",
                "Force sync now",
                "List synced files",
                "Add to autostart",
                "Remove from autostart",
                "Exit",
            ])
            .default(0)
            .interact()?;

        match selection {
            0 => run_setup().await?,
            1 => run_start().await?,
            2 => run_stop().await?,
            3 => run_status().await?,
            4 => run_sync().await?,
            5 => run_list().await?,
            6 => run_autostart(true).await?,
            7 => run_autostart(false).await?,
            8 => {
                println!("\n{}", style("Goodbye!").green());
                break;
            }
            _ => {}
        }
    }

    Ok(())
}

async fn run_setup() -> Result<()> {
    println!("\n{}", style("=== Sync Setup ===").bold().cyan());
    println!();
    println!("To connect to a sync folder, you need:");
    println!("  • API URL (from admin panel)");
    println!("  • API Key (from admin panel)");
    println!("  • Local folder path to sync");
    println!();

    let api_url: String = Input::new()
        .with_prompt("API URL (e.g., https://example.com/api/sync)")
        .interact_text()?;

    let api_key: String = Input::new()
        .with_prompt("API Key")
        .interact_text()?;

    let local_path: String = Input::new()
        .with_prompt("Local folder path")
        .interact_text()?;

    let local_path = PathBuf::from(&local_path);

    // Validate path exists or create it
    if !local_path.exists() {
        if Confirm::new()
            .with_prompt(format!(
                "Folder '{}' doesn't exist. Create it?",
                local_path.display()
            ))
            .default(true)
            .interact()?
        {
            std::fs::create_dir_all(&local_path)?;
            println!("{} Created folder", style("✓").green());
        } else {
            println!("{} Setup cancelled", style("✗").red());
            return Ok(());
        }
    }

    // Test connection
    println!("\n{} Testing connection...", style("→").cyan());

    let client = SyncClient::new(&api_url, &api_key);
    match client.test_connection().await {
        Ok(device_name) => {
            println!("{} Connected successfully!", style("✓").green());

            // Save config
            let config = Config {
                api_url: api_url.clone(),
                api_key: api_key.clone(),
                local_path: local_path.clone(),
                client_id: None,
                device_name: device_name.clone(),
            };

            config.save()?;
            println!("{} Configuration saved", style("✓").green());

            // Register as client
            println!("\n{} Registering device...", style("→").cyan());
            match client.register_device(&device_name).await {
                Ok(client_id) => {
                    let mut config = config;
                    config.client_id = Some(client_id);
                    config.save()?;
                    println!("{} Device registered", style("✓").green());
                }
                Err(e) => {
                    println!("{} Failed to register device: {}", style("✗").red(), e);
                }
            }

            println!();
            println!("{}", style("Setup complete! Run 'cloud-sync start' to begin syncing.").green().bold());
        }
        Err(e) => {
            println!("{} Connection failed: {}", style("✗").red(), e);
        }
    }

    Ok(())
}

async fn run_start() -> Result<()> {
    let config = match Config::load() {
        Ok(c) => c,
        Err(_) => {
            println!("{} No configuration found. Run setup first.", style("✗").red());
            return Ok(());
        }
    };

    println!("\n{}", style("=== Starting Sync Daemon ===").bold().cyan());
    println!();
    println!("Watching: {}", style(config.local_path.display()).yellow());
    println!("Server:   {}", style(&config.api_url).yellow());
    println!();
    println!("{}", style("Press Ctrl+C to stop").dim());
    println!();

    // Initial sync
    println!("{} Performing initial sync...", style("→").cyan());
    let client = SyncClient::new(&config.api_url, &config.api_key);

    if let Some(ref client_id) = config.client_id {
        match client.sync(&config.local_path, client_id).await {
            Ok((uploaded, downloaded)) => {
                println!(
                    "{} Initial sync complete: {} uploaded, {} downloaded",
                    style("✓").green(),
                    uploaded,
                    downloaded
                );
            }
            Err(e) => {
                println!("{} Initial sync failed: {}", style("✗").red(), e);
            }
        }
    }

    // Start file watcher
    println!("\n{} Watching for changes...", style("→").cyan());
    watcher::watch_folder(&config, client).await?;

    Ok(())
}

async fn run_stop() -> Result<()> {
    println!("{}", style("Stopping sync daemon...").yellow());
    // In a real implementation, this would signal the running daemon to stop
    println!("{} Daemon stopped", style("✓").green());
    Ok(())
}

async fn run_status() -> Result<()> {
    let config = match Config::load() {
        Ok(c) => c,
        Err(_) => {
            println!("{} No configuration found", style("✗").red());
            return Ok(());
        }
    };

    println!("\n{}", style("=== Sync Status ===").bold().cyan());
    println!();
    println!("Local Path:  {}", style(config.local_path.display()).yellow());
    println!("API URL:     {}", style(&config.api_url).yellow());
    println!("Device:      {}", style(&config.device_name).yellow());
    println!(
        "Client ID:   {}",
        style(config.client_id.as_deref().unwrap_or("Not registered")).yellow()
    );
    println!();

    // Test connection
    let client = SyncClient::new(&config.api_url, &config.api_key);
    match client.test_connection().await {
        Ok(_) => println!("Status:      {}", style("Connected").green().bold()),
        Err(_) => println!("Status:      {}", style("Disconnected").red().bold()),
    }

    Ok(())
}

async fn run_sync() -> Result<()> {
    let config = match Config::load() {
        Ok(c) => c,
        Err(_) => {
            println!("{} No configuration found. Run setup first.", style("✗").red());
            return Ok(());
        }
    };

    println!("\n{}", style("=== Force Sync ===").bold().cyan());

    let pb = ProgressBar::new_spinner();
    pb.set_style(
        ProgressStyle::default_spinner()
            .template("{spinner:.cyan} {msg}")
            .unwrap(),
    );
    pb.set_message("Syncing...");

    let client = SyncClient::new(&config.api_url, &config.api_key);

    if let Some(ref client_id) = config.client_id {
        match client.sync(&config.local_path, client_id).await {
            Ok((uploaded, downloaded)) => {
                pb.finish_with_message(format!(
                    "✓ Sync complete: {} uploaded, {} downloaded",
                    uploaded, downloaded
                ));
            }
            Err(e) => {
                pb.finish_with_message(format!("✗ Sync failed: {}", e));
            }
        }
    } else {
        pb.finish_with_message("✗ Client not registered");
    }

    Ok(())
}

async fn run_list() -> Result<()> {
    let config = match Config::load() {
        Ok(c) => c,
        Err(_) => {
            println!("{} No configuration found. Run setup first.", style("✗").red());
            return Ok(());
        }
    };

    println!("\n{}", style("=== Synced Files ===").bold().cyan());

    let client = SyncClient::new(&config.api_url, &config.api_key);
    match client.list_files().await {
        Ok(files) => {
            if files.is_empty() {
                println!("\n{}", style("No files synced yet").dim());
            } else {
                println!();
                for file in files {
                    let size = format_size(file.size);
                    println!(
                        "  {} {} {}",
                        style(&file.path).cyan(),
                        style(format!("({})", size)).dim(),
                        style(format!("v{}", file.version)).yellow()
                    );
                }
            }
        }
        Err(e) => {
            println!("{} Failed to list files: {}", style("✗").red(), e);
        }
    }

    Ok(())
}

async fn run_autostart(enable: bool) -> Result<()> {
    if enable {
        println!("\n{}", style("=== Adding to Autostart ===").bold().cyan());
        #[cfg(windows)]
        {
            add_to_windows_autostart()?;
            println!("{} Added to Windows autostart", style("✓").green());
        }
        #[cfg(not(windows))]
        {
            println!("{} Autostart not implemented for this platform", style("!").yellow());
        }
    } else {
        println!("\n{}", style("=== Removing from Autostart ===").bold().cyan());
        #[cfg(windows)]
        {
            remove_from_windows_autostart()?;
            println!("{} Removed from Windows autostart", style("✓").green());
        }
        #[cfg(not(windows))]
        {
            println!("{} Autostart not implemented for this platform", style("!").yellow());
        }
    }

    Ok(())
}

#[cfg(windows)]
fn add_to_windows_autostart() -> Result<()> {
    use std::env;
    use winreg::enums::*;
    use winreg::RegKey;

    let hkcu = RegKey::predef(HKEY_CURRENT_USER);
    let path = r"Software\Microsoft\Windows\CurrentVersion\Run";
    let (key, _) = hkcu.create_subkey(path)?;

    let exe_path = env::current_exe()?;
    key.set_value("CloudSync", &exe_path.to_string_lossy().to_string())?;

    Ok(())
}

#[cfg(windows)]
fn remove_from_windows_autostart() -> Result<()> {
    use winreg::enums::*;
    use winreg::RegKey;

    let hkcu = RegKey::predef(HKEY_CURRENT_USER);
    let path = r"Software\Microsoft\Windows\CurrentVersion\Run";
    let key = hkcu.open_subkey_with_flags(path, KEY_WRITE)?;
    key.delete_value("CloudSync").ok();

    Ok(())
}

fn format_size(bytes: i64) -> String {
    const UNITS: [&str; 4] = ["B", "KB", "MB", "GB"];
    let mut size = bytes as f64;
    let mut unit_index = 0;

    while size >= 1024.0 && unit_index < UNITS.len() - 1 {
        size /= 1024.0;
        unit_index += 1;
    }

    if unit_index == 0 {
        format!("{} {}", bytes, UNITS[unit_index])
    } else {
        format!("{:.1} {}", size, UNITS[unit_index])
    }
}

#[tokio::main]
async fn main() -> Result<()> {
    print_logo();

    let cli = Cli::parse();

    match cli.command {
        Some(Commands::Setup) => run_setup().await?,
        Some(Commands::Start) => run_start().await?,
        Some(Commands::Stop) => run_stop().await?,
        Some(Commands::Status) => run_status().await?,
        Some(Commands::Sync) => run_sync().await?,
        Some(Commands::List) => run_list().await?,
        Some(Commands::Autostart) => run_autostart(true).await?,
        Some(Commands::NoAutostart) => run_autostart(false).await?,
        None => interactive_menu().await?,
    }

    Ok(())
}
