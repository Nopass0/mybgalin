use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PublishJob {
    pub id: String,
    pub status: JobStatus,
    pub progress: u8,
    pub error: Option<String>,
    pub result_path: Option<String>,
    pub result_size: Option<u64>,
    pub width: Option<u32>,
    pub height: Option<u32>,
    pub frame_count: Option<u32>,
    pub created_at: DateTime<Utc>,
    pub expires_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum JobStatus {
    Pending,
    Processing,
    Completed,
    Error,
}

#[allow(dead_code)]
#[derive(Debug, Deserialize)]
pub struct ConvertRequest {
    pub start: Option<f64>,
    pub duration: Option<f64>,
    pub fps: Option<u8>,
    pub scale: Option<u8>,
    pub target_size: Option<u64>,
    pub optimization: Option<String>,
    pub skip_frames: Option<u8>,
    pub frame_style: Option<String>,
    pub frame_color: Option<String>,
    pub weapon_name: Option<String>,
    pub skin_name: Option<String>,
    pub show_label: Option<bool>,
}

#[allow(dead_code)]
#[derive(Debug, Deserialize)]
pub struct OptimizeRequest {
    pub target_size: Option<u64>,
    pub optimization: Option<String>,
    pub skip_frames: Option<u8>,
    pub scale: Option<u8>,
    pub frame_style: Option<String>,
    pub frame_color: Option<String>,
    pub weapon_name: Option<String>,
    pub skin_name: Option<String>,
    pub show_label: Option<bool>,
}

#[allow(dead_code)]
#[derive(Debug, Serialize)]
pub struct JobResponse {
    #[serde(rename = "jobId")]
    pub job_id: String,
}

#[derive(Debug, Serialize)]
pub struct StatusResponse {
    pub status: String,
    pub progress: u8,
    pub error: Option<String>,
    pub size: Option<u64>,
    pub width: Option<u32>,
    pub height: Option<u32>,
    #[serde(rename = "frameCount")]
    pub frame_count: Option<u32>,
}

#[allow(dead_code)]
#[derive(Debug, Clone)]
pub struct FrameSettings {
    pub enabled: bool,
    pub style: String,
    pub color: String,
    pub weapon_name: String,
    pub skin_name: String,
    pub show_label: bool,
}

impl Default for FrameSettings {
    fn default() -> Self {
        Self {
            enabled: false,
            style: "cs2".to_string(),
            color: "#ff6600".to_string(),
            weapon_name: "AK-47".to_string(),
            skin_name: "Fire Serpent".to_string(),
            show_label: true,
        }
    }
}
