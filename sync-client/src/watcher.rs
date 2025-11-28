use crate::config::Config;
use crate::sync::SyncClient;
use anyhow::Result;
use console::style;
use notify::RecursiveMode;
use notify_debouncer_mini::new_debouncer;
use std::path::PathBuf;
use std::sync::mpsc::channel;
use std::time::Duration;

pub async fn watch_folder(config: &Config, client: SyncClient) -> Result<()> {
    let (tx, rx) = channel();

    // Create debouncer with 2 second delay
    let mut debouncer = new_debouncer(Duration::from_secs(2), tx)?;

    // Start watching
    debouncer
        .watcher()
        .watch(&config.local_path, RecursiveMode::Recursive)?;

    println!(
        "{} Watching {} for changes...",
        style("→").cyan(),
        style(config.local_path.display()).yellow()
    );

    let local_path = config.local_path.clone();

    // Process events
    loop {
        match rx.recv() {
            Ok(result) => match result {
                Ok(events) => {
                    for event in events {
                        handle_event(&client, &local_path, event.path).await;
                    }
                }
                Err(error) => {
                    eprintln!("{} Watch error: {:?}", style("✗").red(), error);
                }
            },
            Err(e) => {
                eprintln!("{} Channel error: {}", style("✗").red(), e);
                break;
            }
        }
    }

    Ok(())
}

async fn handle_event(
    client: &SyncClient,
    base_path: &PathBuf,
    path: PathBuf,
) {
    // Get relative path
    let relative_path = match path.strip_prefix(base_path) {
        Ok(p) => p.to_string_lossy().replace('\\', "/"),
        Err(_) => return,
    };

    // Skip hidden files and directories
    if relative_path.starts_with('.') || relative_path.contains("/.") {
        return;
    }

    if path.exists() {
        if path.is_file() {
            // File created or modified - upload
            println!(
                "{} Uploading: {}",
                style("↑").green(),
                style(&relative_path).cyan()
            );

            match client.upload_file(&path, &relative_path).await {
                Ok(_) => {
                    println!(
                        "{} Uploaded: {}",
                        style("✓").green(),
                        style(&relative_path).cyan()
                    );
                }
                Err(e) => {
                    eprintln!(
                        "{} Failed to upload {}: {}",
                        style("✗").red(),
                        relative_path,
                        e
                    );
                }
            }
        }
    } else {
        // File deleted
        println!(
            "{} Deleting: {}",
            style("↓").red(),
            style(&relative_path).cyan()
        );

        match client.delete_file(&relative_path).await {
            Ok(_) => {
                println!(
                    "{} Deleted: {}",
                    style("✓").green(),
                    style(&relative_path).cyan()
                );
            }
            Err(e) => {
                eprintln!(
                    "{} Failed to delete {}: {}",
                    style("✗").red(),
                    relative_path,
                    e
                );
            }
        }
    }
}
