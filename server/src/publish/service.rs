use crate::publish::models::*;
use chrono::{Duration, Utc};
use parking_lot::RwLock;
use std::collections::HashMap;
use std::path::PathBuf;
use std::process::Command;
use std::sync::Arc;
use tokio::fs;
use uuid::Uuid;

#[derive(Clone)]
pub struct PublishService {
    jobs: Arc<RwLock<HashMap<String, PublishJob>>>,
    temp_dir: PathBuf,
}

impl PublishService {
    pub fn new() -> Self {
        // Create temp directory for publish jobs
        let temp_dir = std::env::temp_dir().join("bgalin_publish");
        std::fs::create_dir_all(&temp_dir).ok();

        Self {
            jobs: Arc::new(RwLock::new(HashMap::new())),
            temp_dir,
        }
    }

    /// Create a new job
    pub fn create_job(&self) -> PublishJob {
        let id = Uuid::new_v4().to_string();
        let now = Utc::now();
        let job = PublishJob {
            id: id.clone(),
            status: JobStatus::Pending,
            progress: 0,
            error: None,
            result_path: None,
            result_size: None,
            width: None,
            height: None,
            frame_count: None,
            created_at: now,
            expires_at: now + Duration::hours(1),
        };

        self.jobs.write().insert(id, job.clone());
        job
    }

    /// Get job by ID
    pub fn get_job(&self, id: &str) -> Option<PublishJob> {
        self.jobs.read().get(id).cloned()
    }

    /// Update job status
    pub fn update_job(&self, id: &str, update: impl FnOnce(&mut PublishJob)) {
        if let Some(job) = self.jobs.write().get_mut(id) {
            update(job);
        }
    }

    /// Get temp directory for a job
    pub fn get_job_dir(&self, job_id: &str) -> PathBuf {
        self.temp_dir.join(job_id)
    }

    /// Convert video to GIF using ffmpeg
    pub async fn convert_video_to_gif(
        &self,
        job_id: &str,
        input_path: PathBuf,
        start: f64,
        duration: f64,
        fps: u8,
        scale: u8,
        target_size: u64,
        optimization: &str,
        skip_frames: u8,
        frame_settings: Option<FrameSettings>,
    ) -> Result<PathBuf, String> {
        let job_dir = self.get_job_dir(job_id);
        fs::create_dir_all(&job_dir).await.map_err(|e| e.to_string())?;

        let output_path = job_dir.join("output.gif");
        let palette_path = job_dir.join("palette.png");

        self.update_job(job_id, |job| {
            job.status = JobStatus::Processing;
            job.progress = 10;
        });

        // Calculate scale filter
        let scale_filter = if scale < 100 {
            format!("scale=iw*{}/100:-1:flags=lanczos", scale)
        } else {
            "scale=iw:-1:flags=lanczos".to_string()
        };

        // Build FFmpeg filter for palette generation
        let fps_filter = format!("fps={}", fps);
        let palette_filters = format!("{},{}", fps_filter, scale_filter);

        // Step 1: Generate palette
        let palette_result = Command::new("ffmpeg")
            .args([
                "-y",
                "-ss", &start.to_string(),
                "-t", &duration.to_string(),
                "-i", input_path.to_str().unwrap(),
                "-vf", &format!("{},palettegen=stats_mode=diff", palette_filters),
                palette_path.to_str().unwrap(),
            ])
            .output();

        match palette_result {
            Ok(output) if output.status.success() => {}
            Ok(output) => {
                let stderr = String::from_utf8_lossy(&output.stderr);
                return Err(format!("Palette generation failed: {}", stderr));
            }
            Err(e) => return Err(format!("FFmpeg not found: {}", e)),
        }

        self.update_job(job_id, |job| {
            job.progress = 40;
        });

        // Step 2: Create GIF with palette
        let gif_filters = format!(
            "{},{},paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle",
            fps_filter, scale_filter
        );

        let gif_result = Command::new("ffmpeg")
            .args([
                "-y",
                "-ss", &start.to_string(),
                "-t", &duration.to_string(),
                "-i", input_path.to_str().unwrap(),
                "-i", palette_path.to_str().unwrap(),
                "-filter_complex", &gif_filters,
                "-loop", "0",
                output_path.to_str().unwrap(),
            ])
            .output();

        match gif_result {
            Ok(output) if output.status.success() => {}
            Ok(output) => {
                let stderr = String::from_utf8_lossy(&output.stderr);
                return Err(format!("GIF creation failed: {}", stderr));
            }
            Err(e) => return Err(format!("FFmpeg error: {}", e)),
        }

        self.update_job(job_id, |job| {
            job.progress = 70;
        });

        // Step 3: Optimize if needed
        let file_size = fs::metadata(&output_path).await.map(|m| m.len()).unwrap_or(0);

        if file_size > target_size {
            // Try to optimize by reducing frames or quality
            let optimized = self.optimize_gif_file(
                &output_path,
                target_size,
                optimization,
                skip_frames,
            ).await?;

            if optimized != output_path {
                fs::remove_file(&output_path).await.ok();
                fs::rename(&optimized, &output_path).await.map_err(|e| e.to_string())?;
            }
        }

        self.update_job(job_id, |job| {
            job.progress = 90;
        });

        // Step 4: Add frame if enabled
        if let Some(settings) = frame_settings {
            if settings.enabled {
                self.add_frame_to_gif(&output_path, &settings).await?;
            }
        }

        // Get final file info
        let metadata = fs::metadata(&output_path).await.map_err(|e| e.to_string())?;
        let (width, height, frame_count) = self.get_gif_info(&output_path).await?;

        self.update_job(job_id, |job| {
            job.status = JobStatus::Completed;
            job.progress = 100;
            job.result_path = Some(output_path.to_string_lossy().to_string());
            job.result_size = Some(metadata.len());
            job.width = Some(width);
            job.height = Some(height);
            job.frame_count = Some(frame_count);
        });

        // Clean up palette
        fs::remove_file(&palette_path).await.ok();
        fs::remove_file(&input_path).await.ok();

        Ok(output_path)
    }

    /// Optimize an existing GIF
    pub async fn optimize_gif(
        &self,
        job_id: &str,
        input_path: PathBuf,
        target_size: u64,
        optimization: &str,
        skip_frames: u8,
        scale: u8,
        frame_settings: Option<FrameSettings>,
    ) -> Result<PathBuf, String> {
        let job_dir = self.get_job_dir(job_id);
        fs::create_dir_all(&job_dir).await.map_err(|e| e.to_string())?;

        let output_path = job_dir.join("output.gif");

        self.update_job(job_id, |job| {
            job.status = JobStatus::Processing;
            job.progress = 20;
        });

        // Copy input to output initially
        fs::copy(&input_path, &output_path).await.map_err(|e| e.to_string())?;

        // Apply scale if needed
        if scale < 100 {
            let scaled_path = job_dir.join("scaled.gif");
            let scale_filter = format!("scale=iw*{}/100:-1:flags=lanczos", scale);

            let result = Command::new("ffmpeg")
                .args([
                    "-y",
                    "-i", output_path.to_str().unwrap(),
                    "-vf", &scale_filter,
                    scaled_path.to_str().unwrap(),
                ])
                .output();

            match result {
                Ok(output) if output.status.success() => {
                    fs::remove_file(&output_path).await.ok();
                    fs::rename(&scaled_path, &output_path).await.map_err(|e| e.to_string())?;
                }
                _ => {}
            }
        }

        self.update_job(job_id, |job| {
            job.progress = 50;
        });

        // Check size and optimize if needed
        let file_size = fs::metadata(&output_path).await.map(|m| m.len()).unwrap_or(0);

        if file_size > target_size {
            let optimized = self.optimize_gif_file(
                &output_path,
                target_size,
                optimization,
                skip_frames,
            ).await?;

            if optimized != output_path {
                fs::remove_file(&output_path).await.ok();
                fs::rename(&optimized, &output_path).await.map_err(|e| e.to_string())?;
            }
        }

        self.update_job(job_id, |job| {
            job.progress = 80;
        });

        // Add frame if enabled
        if let Some(settings) = frame_settings {
            if settings.enabled {
                self.add_frame_to_gif(&output_path, &settings).await?;
            }
        }

        // Get final file info
        let metadata = fs::metadata(&output_path).await.map_err(|e| e.to_string())?;
        let (width, height, frame_count) = self.get_gif_info(&output_path).await?;

        self.update_job(job_id, |job| {
            job.status = JobStatus::Completed;
            job.progress = 100;
            job.result_path = Some(output_path.to_string_lossy().to_string());
            job.result_size = Some(metadata.len());
            job.width = Some(width);
            job.height = Some(height);
            job.frame_count = Some(frame_count);
        });

        // Clean up input
        fs::remove_file(&input_path).await.ok();

        Ok(output_path)
    }

    /// Optimize GIF file to reach target size
    async fn optimize_gif_file(
        &self,
        input_path: &PathBuf,
        target_size: u64,
        optimization: &str,
        skip_frames: u8,
    ) -> Result<PathBuf, String> {
        let parent = input_path.parent().unwrap();
        let optimized_path = parent.join("optimized.gif");

        match optimization {
            "smart" => {
                // Try different optimizations until we hit target size
                let mut current_skip = 2;
                let mut current_scale = 100u8;

                loop {
                    let filters = format!(
                        "select='not(mod(n\\,{}))',scale=iw*{}/100:-1:flags=lanczos,setpts=N/FRAME_RATE/TB",
                        current_skip,
                        current_scale
                    );

                    let result = Command::new("ffmpeg")
                        .args([
                            "-y",
                            "-i", input_path.to_str().unwrap(),
                            "-vf", &filters,
                            optimized_path.to_str().unwrap(),
                        ])
                        .output();

                    match result {
                        Ok(output) if output.status.success() => {
                            let size = fs::metadata(&optimized_path).await.map(|m| m.len()).unwrap_or(0);
                            if size <= target_size {
                                return Ok(optimized_path);
                            }

                            // Try more aggressive optimization
                            if current_scale > 50 {
                                current_scale -= 10;
                            } else if current_skip < 10 {
                                current_skip += 1;
                                current_scale = 100;
                            } else {
                                // Can't optimize further
                                return Ok(optimized_path);
                            }
                        }
                        _ => return Err("Optimization failed".to_string()),
                    }
                }
            }
            "skip-frames" => {
                let filters = format!(
                    "select='not(mod(n\\,{}))',setpts=N/FRAME_RATE/TB",
                    skip_frames
                );

                let result = Command::new("ffmpeg")
                    .args([
                        "-y",
                        "-i", input_path.to_str().unwrap(),
                        "-vf", &filters,
                        optimized_path.to_str().unwrap(),
                    ])
                    .output();

                match result {
                    Ok(output) if output.status.success() => Ok(optimized_path),
                    _ => Err("Frame skipping failed".to_string()),
                }
            }
            "resize" => {
                // Just copy, scaling was already applied
                fs::copy(input_path, &optimized_path).await.map_err(|e| e.to_string())?;
                Ok(optimized_path)
            }
            _ => Ok(input_path.clone()),
        }
    }

    /// Add decorative frame to GIF
    async fn add_frame_to_gif(&self, gif_path: &PathBuf, settings: &FrameSettings) -> Result<(), String> {
        // For now, we'll add text overlay using FFmpeg
        // In a production environment, this would use imageproc for more complex frames

        if !settings.show_label {
            return Ok(());
        }

        let label = format!("{} | {}", settings.weapon_name, settings.skin_name);
        let parent = gif_path.parent().unwrap();
        let framed_path = parent.join("framed.gif");

        // Convert hex color to FFmpeg format
        let color = settings.color.trim_start_matches('#');
        let _font_color = format!("0x{}", color);

        // Add text overlay with gradient background
        let drawtext = format!(
            "drawbox=y=ih-50:w=iw:h=50:color=black@0.7:t=fill,\
             drawtext=text='{}':fontsize=24:fontcolor=white:\
             x=(w-text_w)/2:y=h-38:font=Arial:borderw=2:bordercolor=black",
            label.replace("'", "\\'")
        );

        let result = Command::new("ffmpeg")
            .args([
                "-y",
                "-i", gif_path.to_str().unwrap(),
                "-vf", &drawtext,
                framed_path.to_str().unwrap(),
            ])
            .output();

        match result {
            Ok(output) if output.status.success() => {
                fs::remove_file(gif_path).await.ok();
                fs::rename(&framed_path, gif_path).await.map_err(|e| e.to_string())?;
                Ok(())
            }
            Ok(output) => {
                // If text overlay fails, just continue without it
                let stderr = String::from_utf8_lossy(&output.stderr);
                eprintln!("Frame overlay warning: {}", stderr);
                Ok(())
            }
            Err(e) => {
                eprintln!("Frame overlay error: {}", e);
                Ok(())
            }
        }
    }

    /// Get GIF dimensions and frame count
    async fn get_gif_info(&self, path: &PathBuf) -> Result<(u32, u32, u32), String> {
        let output = Command::new("ffprobe")
            .args([
                "-v", "error",
                "-select_streams", "v:0",
                "-show_entries", "stream=width,height,nb_frames",
                "-of", "csv=p=0",
                path.to_str().unwrap(),
            ])
            .output();

        match output {
            Ok(out) if out.status.success() => {
                let stdout = String::from_utf8_lossy(&out.stdout);
                let parts: Vec<&str> = stdout.trim().split(',').collect();

                if parts.len() >= 2 {
                    let width = parts[0].parse().unwrap_or(0);
                    let height = parts[1].parse().unwrap_or(0);
                    let frames = parts.get(2).and_then(|s| s.parse().ok()).unwrap_or(0);
                    Ok((width, height, frames))
                } else {
                    Ok((0, 0, 0))
                }
            }
            _ => Ok((0, 0, 0)),
        }
    }

    /// Clean up expired jobs
    pub async fn cleanup_expired(&self) {
        let now = Utc::now();
        let mut expired_ids = Vec::new();

        {
            let jobs = self.jobs.read();
            for (id, job) in jobs.iter() {
                if job.expires_at < now {
                    expired_ids.push(id.clone());
                }
            }
        }

        for id in expired_ids {
            // Remove job files
            let job_dir = self.get_job_dir(&id);
            fs::remove_dir_all(&job_dir).await.ok();

            // Remove job from map
            self.jobs.write().remove(&id);
        }
    }

    /// Get result file path
    pub fn get_result_path(&self, job_id: &str) -> Option<PathBuf> {
        self.jobs.read().get(job_id).and_then(|job| {
            job.result_path.as_ref().map(PathBuf::from)
        })
    }
}

impl Default for PublishService {
    fn default() -> Self {
        Self::new()
    }
}
