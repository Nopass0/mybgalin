use super::models::SheetAnimeRow;
use reqwest::Client;
use serde_json::Value;

pub struct GoogleSheetsClient {
    client: Client,
    sheet_id: String,
}

impl GoogleSheetsClient {
    pub fn new(sheet_id: String) -> Self {
        Self {
            client: Client::new(),
            sheet_id,
        }
    }

    pub async fn fetch_sheet_data(&self, year: i64) -> Result<Vec<SheetAnimeRow>, String> {
        // Google Sheets CSV export URL
        let url = format!(
            "https://docs.google.com/spreadsheets/d/{}/gviz/tq?tqx=out:csv&sheet={}",
            self.sheet_id, year
        );

        let response = self
            .client
            .get(&url)
            .send()
            .await
            .map_err(|e| format!("Request error: {}", e))?;

        if !response.status().is_success() {
            return Err(format!("Google Sheets error: {}", response.status()));
        }

        let csv_text = response
            .text()
            .await
            .map_err(|e| format!("Read error: {}", e))?;

        self.parse_csv(&csv_text, year)
    }

    fn parse_csv(&self, csv_text: &str, year: i64) -> Result<Vec<SheetAnimeRow>, String> {
        let mut reader = csv::Reader::from_reader(csv_text.as_bytes());
        let mut rows = Vec::new();

        // Skip first 13 rows (data starts from row 14, which is index 13)
        for (index, result) in reader.records().enumerate() {
            if index < 13 {
                continue;
            }

            let record = result.map_err(|e| format!("CSV parse error: {}", e))?;

            // Skip empty rows
            if record.len() < 2 || record.get(1).unwrap_or("").trim().is_empty() {
                continue;
            }

            // Parse row data
            // Columns: Date (0), Title (1), Watched (2), Season (3), Episodes (4),
            // Voice Acting (5), Buyer (6), Chat Rating (7), Sheikh Rating (8),
            // Streamer Rating (9), VOD Link (10)

            let date = record.get(0).and_then(|s| {
                let trimmed = s.trim();
                if trimmed.is_empty() { None } else { Some(trimmed.to_string()) }
            });

            let title = record.get(1)
                .ok_or("Missing title")?
                .trim()
                .to_string();

            let watched = record.get(2)
                .map(|s| s.trim().to_lowercase())
                .map(|s| s == "да" || s == "yes" || s == "true" || s == "+")
                .unwrap_or(false);

            let season = record.get(3).and_then(|s| {
                let trimmed = s.trim();
                if trimmed.is_empty() { None } else { Some(trimmed.to_string()) }
            });

            let episodes = record.get(4).and_then(|s| {
                let trimmed = s.trim();
                if trimmed.is_empty() { None } else { Some(trimmed.to_string()) }
            });

            let voice_acting = record.get(5).and_then(|s| {
                let trimmed = s.trim();
                if trimmed.is_empty() { None } else { Some(trimmed.to_string()) }
            });

            let buyer = record.get(6).and_then(|s| {
                let trimmed = s.trim();
                if trimmed.is_empty() { None } else { Some(trimmed.to_string()) }
            });

            let chat_rating = record.get(7)
                .and_then(|s| s.trim().replace(',', ".").parse::<f64>().ok());

            let sheikh_rating = record.get(8)
                .and_then(|s| s.trim().replace(',', ".").parse::<f64>().ok());

            let streamer_rating = record.get(9)
                .and_then(|s| s.trim().replace(',', ".").parse::<f64>().ok());

            let vod_link = record.get(10).and_then(|s| {
                let trimmed = s.trim();
                if trimmed.is_empty() { None } else { Some(trimmed.to_string()) }
            });

            rows.push(SheetAnimeRow {
                date,
                title,
                watched,
                season,
                episodes,
                voice_acting,
                buyer,
                chat_rating,
                sheikh_rating,
                streamer_rating,
                vod_link,
                year,
            });
        }

        Ok(rows)
    }
}
