use crate::models::ApiResponse;
use crate::publish::{FrameSettings, JobStatus, PublishService, StatusResponse};
use rocket::form::Form;
use rocket::fs::TempFile;
use rocket::http::ContentType;
use rocket::response::stream::ReaderStream;
use rocket::serde::json::Json;
use rocket::tokio::fs::File;
use rocket::{get, post, FromForm, State};

#[derive(FromForm)]
pub struct ConvertForm<'r> {
    file: TempFile<'r>,
    start: Option<f64>,
    duration: Option<f64>,
    fps: Option<u8>,
    scale: Option<u8>,
    target_size: Option<u64>,
    optimization: Option<String>,
    skip_frames: Option<u8>,
    frame_style: Option<String>,
    frame_color: Option<String>,
    weapon_name: Option<String>,
    skin_name: Option<String>,
    show_label: Option<bool>,
}

#[derive(FromForm)]
pub struct OptimizeForm<'r> {
    file: TempFile<'r>,
    target_size: Option<u64>,
    optimization: Option<String>,
    skip_frames: Option<u8>,
    scale: Option<u8>,
    frame_style: Option<String>,
    frame_color: Option<String>,
    weapon_name: Option<String>,
    skin_name: Option<String>,
    show_label: Option<bool>,
}

/// Convert video to GIF
#[post("/studio/publish/convert", data = "<form>")]
pub async fn convert_video(
    mut form: Form<ConvertForm<'_>>,
    service: &State<PublishService>,
) -> Json<ApiResponse<serde_json::Value>> {
    // Create job
    let job = service.create_job();
    let job_id = job.id.clone();

    // Save uploaded file
    let job_dir = service.get_job_dir(&job_id);
    std::fs::create_dir_all(&job_dir).ok();

    let input_path = job_dir.join("input");
    if let Err(e) = form.file.persist_to(&input_path).await {
        return Json(ApiResponse::error(format!("Failed to save file: {}", e)));
    }

    // Parse parameters
    let start = form.start.unwrap_or(0.0);
    let duration = form.duration.unwrap_or(10.0);
    let fps = form.fps.unwrap_or(15);
    let scale = form.scale.unwrap_or(100);
    let target_size = form.target_size.unwrap_or(2 * 1024 * 1024);
    let optimization = form.optimization.as_deref().unwrap_or("smart").to_string();
    let skip_frames = form.skip_frames.unwrap_or(2);

    let frame_settings = if form.frame_style.is_some() {
        Some(FrameSettings {
            enabled: true,
            style: form.frame_style.clone().unwrap_or_default(),
            color: form.frame_color.clone().unwrap_or_else(|| "#ff6600".to_string()),
            weapon_name: form.weapon_name.clone().unwrap_or_else(|| "AK-47".to_string()),
            skin_name: form.skin_name.clone().unwrap_or_else(|| "Fire Serpent".to_string()),
            show_label: form.show_label.unwrap_or(true),
        })
    } else {
        None
    };

    // Spawn conversion task
    let service_clone = service.inner().clone();
    let job_id_clone = job_id.clone();
    let optimization_clone = optimization.clone();

    tokio::spawn(async move {
        let result = service_clone
            .convert_video_to_gif(
                &job_id_clone,
                input_path,
                start,
                duration,
                fps,
                scale,
                target_size,
                &optimization_clone,
                skip_frames,
                frame_settings,
            )
            .await;

        if let Err(e) = result {
            service_clone.update_job(&job_id_clone, |job| {
                job.status = JobStatus::Error;
                job.error = Some(e);
            });
        }
    });

    Json(ApiResponse::success(serde_json::json!({
        "jobId": job_id
    })))
}

/// Optimize GIF
#[post("/studio/publish/optimize", data = "<form>")]
pub async fn optimize_gif(
    mut form: Form<OptimizeForm<'_>>,
    service: &State<PublishService>,
) -> Json<ApiResponse<serde_json::Value>> {
    // Create job
    let job = service.create_job();
    let job_id = job.id.clone();

    // Save uploaded file
    let job_dir = service.get_job_dir(&job_id);
    std::fs::create_dir_all(&job_dir).ok();

    let input_path = job_dir.join("input.gif");
    if let Err(e) = form.file.persist_to(&input_path).await {
        return Json(ApiResponse::error(format!("Failed to save file: {}", e)));
    }

    // Parse parameters
    let target_size = form.target_size.unwrap_or(2 * 1024 * 1024);
    let optimization = form.optimization.as_deref().unwrap_or("smart").to_string();
    let skip_frames = form.skip_frames.unwrap_or(2);
    let scale = form.scale.unwrap_or(100);

    let frame_settings = if form.frame_style.is_some() {
        Some(FrameSettings {
            enabled: true,
            style: form.frame_style.clone().unwrap_or_default(),
            color: form.frame_color.clone().unwrap_or_else(|| "#ff6600".to_string()),
            weapon_name: form.weapon_name.clone().unwrap_or_else(|| "AK-47".to_string()),
            skin_name: form.skin_name.clone().unwrap_or_else(|| "Fire Serpent".to_string()),
            show_label: form.show_label.unwrap_or(true),
        })
    } else {
        None
    };

    // Spawn optimization task
    let service_clone = service.inner().clone();
    let job_id_clone = job_id.clone();
    let optimization_clone = optimization.clone();

    tokio::spawn(async move {
        let result = service_clone
            .optimize_gif(
                &job_id_clone,
                input_path,
                target_size,
                &optimization_clone,
                skip_frames,
                scale,
                frame_settings,
            )
            .await;

        if let Err(e) = result {
            service_clone.update_job(&job_id_clone, |job| {
                job.status = JobStatus::Error;
                job.error = Some(e);
            });
        }
    });

    Json(ApiResponse::success(serde_json::json!({
        "jobId": job_id
    })))
}

/// Get job status
#[get("/studio/publish/status/<job_id>")]
pub async fn get_status(
    job_id: &str,
    service: &State<PublishService>,
) -> Json<StatusResponse> {
    match service.get_job(job_id) {
        Some(job) => Json(StatusResponse {
            status: match job.status {
                JobStatus::Pending => "pending".to_string(),
                JobStatus::Processing => "processing".to_string(),
                JobStatus::Completed => "completed".to_string(),
                JobStatus::Error => "error".to_string(),
            },
            progress: job.progress,
            error: job.error,
            size: job.result_size,
            width: job.width,
            height: job.height,
            frame_count: job.frame_count,
        }),
        None => Json(StatusResponse {
            status: "not_found".to_string(),
            progress: 0,
            error: Some("Job not found".to_string()),
            size: None,
            width: None,
            height: None,
            frame_count: None,
        }),
    }
}

/// Get result file
#[get("/studio/publish/result/<job_id>")]
pub async fn get_result(
    job_id: &str,
    service: &State<PublishService>,
) -> Option<(ContentType, ReaderStream![File])> {
    let path = service.get_result_path(job_id)?;

    if !path.exists() {
        return None;
    }

    let file = File::open(&path).await.ok()?;
    Some((ContentType::GIF, ReaderStream::one(file)))
}

/// Download result file
#[get("/studio/publish/download/<job_id>")]
pub async fn download_result(
    job_id: &str,
    service: &State<PublishService>,
) -> Option<(ContentType, rocket::response::stream::ReaderStream![File])> {
    get_result(job_id, service).await
}
