use serde::{Deserialize, Serialize};
use std::env;

use super::models::*;

const DEFAULT_AI_MODEL: &str = "google/gemini-2.5-flash-preview-05-20";

#[derive(Debug, Serialize)]
struct OpenRouterRequest {
    model: String,
    messages: Vec<Message>,
    temperature: f32,
    max_tokens: u32,
}

#[derive(Debug, Serialize)]
struct Message {
    role: String,
    content: Vec<ContentPart>,
}

#[derive(Debug, Serialize)]
#[serde(tag = "type")]
enum ContentPart {
    #[serde(rename = "text")]
    Text { text: String },
    #[serde(rename = "image_url")]
    ImageUrl { image_url: ImageUrlContent },
}

#[derive(Debug, Serialize)]
struct ImageUrlContent {
    url: String,
}

#[derive(Debug, Deserialize)]
struct OpenRouterResponse {
    choices: Vec<Choice>,
}

#[derive(Debug, Deserialize)]
struct Choice {
    message: MessageContent,
}

#[derive(Debug, Deserialize)]
struct MessageContent {
    content: String,
}

async fn call_openrouter(messages: Vec<Message>, temperature: f32) -> Result<String, String> {
    let api_key = env::var("OPENROUTER_API_KEY")
        .map_err(|_| "OPENROUTER_API_KEY not set".to_string())?;

    let model = env::var("AI_MODEL").unwrap_or_else(|_| DEFAULT_AI_MODEL.to_string());

    let request = OpenRouterRequest {
        model,
        messages,
        temperature,
        max_tokens: 4096,
    };

    let client = reqwest::Client::new();
    let response = client
        .post("https://openrouter.ai/api/v1/chat/completions")
        .header("Authorization", format!("Bearer {}", api_key))
        .header("HTTP-Referer", "https://bgalin.ru")
        .header("X-Title", "T2 Sales System")
        .json(&request)
        .send()
        .await
        .map_err(|e| format!("Request failed: {}", e))?;

    let response_text = response
        .text()
        .await
        .map_err(|e| format!("Failed to read response: {}", e))?;

    let parsed: OpenRouterResponse = serde_json::from_str(&response_text)
        .map_err(|e| format!("Failed to parse response: {} - {}", e, response_text))?;

    parsed
        .choices
        .first()
        .map(|c| c.message.content.clone())
        .ok_or_else(|| "No response from AI".to_string())
}

/// Analyze a price tag image and extract product information
pub async fn analyze_price_tag(image_base64: &str) -> Result<AnalyzedPriceTag, String> {
    let prompt = r#"Ты - система распознавания ценников для магазина электроники.

Проанализируй изображение ценника и извлеки всю информацию о товаре.

Верни ТОЛЬКО JSON в следующем формате (без markdown, только чистый JSON):
{
    "name": "полное название товара",
    "brand": "бренд/производитель",
    "model": "модель",
    "price": 12990,
    "specs": [
        {"name": "Тип экрана", "value": "AMOLED"},
        {"name": "Диагональ", "value": "6.5 дюймов"},
        {"name": "Частота обновления", "value": "120 Гц"},
        {"name": "Оперативная память", "value": "8 ГБ"},
        {"name": "Встроенная память", "value": "256 ГБ"},
        {"name": "Процессор", "value": "Snapdragon 8 Gen 2"},
        {"name": "Цвет", "value": "Чёрный"},
        {"name": "Камера", "value": "108 МП + 12 МП + 5 МП"},
        {"name": "Аккумулятор", "value": "5000 мАч"}
    ],
    "raw_text": "весь текст с ценника как есть"
}

Извлекай ВСЕ характеристики которые видишь на ценнике. Если какое-то поле не определено, используй null.
Цену указывай как число без символов валюты."#;

    let messages = vec![Message {
        role: "user".to_string(),
        content: vec![
            ContentPart::Text { text: prompt.to_string() },
            ContentPart::ImageUrl {
                image_url: ImageUrlContent {
                    url: format!("data:image/jpeg;base64,{}", image_base64),
                },
            },
        ],
    }];

    let response = call_openrouter(messages, 0.1).await?;

    // Try to extract JSON from response
    let json_str = if response.contains("```json") {
        response
            .split("```json")
            .nth(1)
            .and_then(|s| s.split("```").next())
            .unwrap_or(&response)
            .trim()
    } else if response.contains("```") {
        response
            .split("```")
            .nth(1)
            .unwrap_or(&response)
            .trim()
    } else {
        response.trim()
    };

    #[derive(Deserialize)]
    struct ParsedTag {
        name: Option<String>,
        brand: Option<String>,
        model: Option<String>,
        price: Option<f64>,
        specs: Option<Vec<SpecParsed>>,
        raw_text: Option<String>,
    }

    #[derive(Deserialize)]
    struct SpecParsed {
        name: Option<String>,
        value: Option<String>,
    }

    let parsed: ParsedTag = serde_json::from_str(json_str)
        .map_err(|e| format!("Failed to parse AI response: {} - {}", e, json_str))?;

    Ok(AnalyzedPriceTag {
        name: parsed.name,
        brand: parsed.brand,
        model: parsed.model,
        price: parsed.price,
        specs: parsed.specs
            .unwrap_or_default()
            .into_iter()
            .filter_map(|s| {
                // Filter out specs with null name or value
                match (s.name, s.value) {
                    (Some(name), Some(value)) if !name.is_empty() && !value.is_empty() => {
                        Some(ProductSpecInput { name, value })
                    }
                    _ => None,
                }
            })
            .collect(),
        raw_text: parsed.raw_text.unwrap_or_default(),
    })
}

/// Parse customer request and find matching products
pub async fn analyze_customer_request(
    request_text: &str,
    products: &[T2ProductWithDetails],
    tariffs: &[T2Tariff],
) -> Result<(ParsedRequirements, Vec<ProductRecommendation>), String> {
    let products_json = serde_json::to_string(products).unwrap_or_default();

    let prompt = format!(r#"Ты - ИИ-помощник продавца в магазине Tele2. Твоя задача - понять потребности клиента и подобрать лучшие варианты телефонов.

Запрос клиента: "{}"

Доступные товары (JSON):
{}

Проанализируй запрос клиента и выбери 3 наиболее подходящих телефона:
1. Дорогой вариант - лучший из подходящих, премиум
2. Бюджетный вариант - самый доступный из подходящих
3. Средний вариант - оптимальное соотношение цена/качество

Верни ТОЛЬКО JSON (без markdown):
{{
    "requirements": {{
        "budget_min": null,
        "budget_max": 30000,
        "brand_preferences": ["Samsung", "Xiaomi"],
        "required_features": ["хорошая камера", "большой экран"],
        "use_cases": ["фото", "игры"]
    }},
    "recommendations": [
        {{
            "product_id": 1,
            "price_category": "expensive",
            "match_score": 95,
            "match_reasons": ["Отличная камера 108 МП", "Флагманский процессор для игр", "AMOLED экран"]
        }},
        {{
            "product_id": 2,
            "price_category": "cheap",
            "match_score": 75,
            "match_reasons": ["Хорошая камера за свои деньги", "Достаточно для казуальных игр"]
        }},
        {{
            "product_id": 3,
            "price_category": "medium",
            "match_score": 85,
            "match_reasons": ["Отличный баланс цены и возможностей", "Качественная камера"]
        }}
    ]
}}

Если нет подходящих товаров - верни пустой массив recommendations.
match_score от 0 до 100 - насколько товар соответствует запросу."#, request_text, products_json);

    let messages = vec![Message {
        role: "user".to_string(),
        content: vec![ContentPart::Text { text: prompt }],
    }];

    let response = call_openrouter(messages, 0.3).await?;

    let json_str = if response.contains("```json") {
        response
            .split("```json")
            .nth(1)
            .and_then(|s| s.split("```").next())
            .unwrap_or(&response)
            .trim()
    } else if response.contains("```") {
        response
            .split("```")
            .nth(1)
            .unwrap_or(&response)
            .trim()
    } else {
        response.trim()
    };

    #[derive(Deserialize)]
    struct AIResponse {
        requirements: ParsedRequirements,
        recommendations: Vec<AIRecommendation>,
    }

    #[derive(Deserialize)]
    struct AIRecommendation {
        product_id: i32,
        price_category: String,
        match_score: i32,
        match_reasons: Vec<String>,
    }

    let parsed: AIResponse = serde_json::from_str(json_str)
        .map_err(|e| format!("Failed to parse AI response: {} - {}", e, json_str))?;

    let recommendations: Vec<ProductRecommendation> = parsed
        .recommendations
        .into_iter()
        .filter_map(|rec| {
            products
                .iter()
                .find(|p| p.id == rec.product_id)
                .map(|product| ProductRecommendation {
                    product: product.clone(),
                    price_category: rec.price_category,
                    match_score: rec.match_score,
                    match_reasons: rec.match_reasons,
                })
        })
        .collect();

    Ok((parsed.requirements, recommendations))
}

/// Recommend accessories for a phone
pub async fn recommend_accessories(
    phone: &T2ProductWithDetails,
    accessories: &[T2ProductWithDetails],
) -> Result<Vec<AccessoryRecommendation>, String> {
    let phone_json = serde_json::to_string(phone).unwrap_or_default();
    let accessories_json = serde_json::to_string(accessories).unwrap_or_default();

    let prompt = format!(r#"Ты - опытный продавец-консультант в магазине Tele2. Клиент выбрал телефон и ты должен предложить подходящие аксессуары.

Выбранный телефон:
{}

Доступные аксессуары:
{}

Выбери до 3 самых подходящих аксессуаров для этого телефона. Для каждого объясни:
- Почему он подходит именно к этому телефону
- Какую пользу получит клиент

Твоя цель - максимизировать продажи, но при этом рекомендовать только действительно полезные вещи.

Верни ТОЛЬКО JSON (без markdown):
{{
    "accessories": [
        {{
            "product_id": 5,
            "reason": "Защитное стекло идеально подходит для большого 6.7-дюймового экрана",
            "benefit": "Защитит дорогой AMOLED экран от царапин и трещин при падении"
        }},
        {{
            "product_id": 8,
            "reason": "Чехол разработан специально для этой модели",
            "benefit": "Защитит корпус телефона, сохранит его товарный вид для возможной перепродажи"
        }}
    ]
}}

Если нет подходящих аксессуаров - верни пустой массив."#, phone_json, accessories_json);

    let messages = vec![Message {
        role: "user".to_string(),
        content: vec![ContentPart::Text { text: prompt }],
    }];

    let response = call_openrouter(messages, 0.3).await?;

    let json_str = if response.contains("```json") {
        response
            .split("```json")
            .nth(1)
            .and_then(|s| s.split("```").next())
            .unwrap_or(&response)
            .trim()
    } else if response.contains("```") {
        response
            .split("```")
            .nth(1)
            .unwrap_or(&response)
            .trim()
    } else {
        response.trim()
    };

    #[derive(Deserialize)]
    struct AIResponse {
        accessories: Vec<AIAccessory>,
    }

    #[derive(Deserialize)]
    struct AIAccessory {
        product_id: i32,
        reason: String,
        benefit: String,
    }

    let parsed: AIResponse = serde_json::from_str(json_str)
        .map_err(|e| format!("Failed to parse AI response: {} - {}", e, json_str))?;

    let recommendations: Vec<AccessoryRecommendation> = parsed
        .accessories
        .into_iter()
        .filter_map(|acc| {
            accessories
                .iter()
                .find(|p| p.id == acc.product_id)
                .map(|product| AccessoryRecommendation {
                    product: product.clone(),
                    reason: acc.reason,
                    benefit: acc.benefit,
                })
        })
        .collect();

    Ok(recommendations)
}

/// Recommend tariffs based on customer needs
pub async fn recommend_tariffs(
    customer_needs: &str,
    phone: Option<&T2ProductWithDetails>,
    tariffs: &[T2Tariff],
) -> Result<Vec<(T2Tariff, String)>, String> {
    let phone_info = phone
        .map(|p| serde_json::to_string(p).unwrap_or_default())
        .unwrap_or_else(|| "Не выбран".to_string());
    let tariffs_json = serde_json::to_string(tariffs).unwrap_or_default();

    let prompt = format!(r#"Ты - консультант Tele2 по тарифам. Клиент покупает телефон и тебе нужно предложить подходящий тариф.

Потребности клиента: "{}"
Выбранный телефон: {}

Доступные тарифы:
{}

Выбери до 2 самых подходящих тарифов и объясни почему они подходят клиенту.
Учитывай:
- Если это смартфон - предлагай тарифы с интернетом
- Если кнопочный телефон - предлагай простые тарифы с минутами
- Безлимит на мессенджеры важен для молодых пользователей
- Безлимит на Tele2 полезен если у родственников тоже Tele2

Верни ТОЛЬКО JSON (без markdown):
{{
    "tariffs": [
        {{
            "tariff_id": 1,
            "recommendation": "Этот тариф идеально подходит для активного использования интернета и мессенджеров"
        }}
    ]
}}"#, customer_needs, phone_info, tariffs_json);

    let messages = vec![Message {
        role: "user".to_string(),
        content: vec![ContentPart::Text { text: prompt }],
    }];

    let response = call_openrouter(messages, 0.3).await?;

    let json_str = if response.contains("```json") {
        response
            .split("```json")
            .nth(1)
            .and_then(|s| s.split("```").next())
            .unwrap_or(&response)
            .trim()
    } else if response.contains("```") {
        response
            .split("```")
            .nth(1)
            .unwrap_or(&response)
            .trim()
    } else {
        response.trim()
    };

    #[derive(Deserialize)]
    struct AIResponse {
        tariffs: Vec<AITariff>,
    }

    #[derive(Deserialize)]
    struct AITariff {
        tariff_id: i32,
        recommendation: String,
    }

    let parsed: AIResponse = serde_json::from_str(json_str)
        .map_err(|e| format!("Failed to parse AI response: {} - {}", e, json_str))?;

    let recommendations: Vec<(T2Tariff, String)> = parsed
        .tariffs
        .into_iter()
        .filter_map(|t| {
            tariffs
                .iter()
                .find(|tariff| tariff.id == t.tariff_id)
                .map(|tariff| (tariff.clone(), t.recommendation))
        })
        .collect();

    Ok(recommendations)
}

/// Parse tariff information from text or image
pub async fn parse_tariffs_from_text(text: &str) -> Result<Vec<ParsedTariff>, String> {
    let prompt = format!(r#"Ты - система парсинга тарифов оператора Tele2 (T2).

Проанализируй следующий текст с информацией о тарифах и извлеки данные о каждом тарифе.

Текст:
{}

Верни ТОЛЬКО JSON (без markdown):
{{
    "tariffs": [
        {{
            "name": "Название тарифа",
            "price": 500,
            "minutes": 500,
            "sms": 100,
            "gb": 30,
            "unlimited_t2": true,
            "unlimited_internet": false,
            "unlimited_sms": false,
            "unlimited_calls": false,
            "unlimited_apps": "YouTube, Telegram, WhatsApp",
            "description": "Описание тарифа"
        }}
    ]
}}

Правила:
- Если минуты/SMS/GB безлимитные, укажи соответствующий флаг unlimited_* = true и число = null
- Если значение не указано, используй null
- Цену указывай как число (в рублях за месяц)
- unlimited_apps - список приложений с безлимитным трафиком через запятую
- Извлекай ВСЕ тарифы из текста"#, text);

    let messages = vec![Message {
        role: "user".to_string(),
        content: vec![ContentPart::Text { text: prompt }],
    }];

    let response = call_openrouter(messages, 0.1).await?;

    let json_str = if response.contains("```json") {
        response
            .split("```json")
            .nth(1)
            .and_then(|s| s.split("```").next())
            .unwrap_or(&response)
            .trim()
    } else if response.contains("```") {
        response
            .split("```")
            .nth(1)
            .unwrap_or(&response)
            .trim()
    } else {
        response.trim()
    };

    #[derive(Deserialize)]
    struct AIResponse {
        tariffs: Vec<ParsedTariff>,
    }

    let parsed: AIResponse = serde_json::from_str(json_str)
        .map_err(|e| format!("Failed to parse AI response: {} - {}", e, json_str))?;

    Ok(parsed.tariffs)
}

/// Parse tariff information from image
pub async fn parse_tariffs_from_image(image_base64: &str) -> Result<Vec<ParsedTariff>, String> {
    let prompt = r#"Ты - система парсинга тарифов оператора Tele2 (T2).

Проанализируй изображение с информацией о тарифах и извлеки данные о каждом тарифе.

Верни ТОЛЬКО JSON (без markdown):
{
    "tariffs": [
        {
            "name": "Название тарифа",
            "price": 500,
            "minutes": 500,
            "sms": 100,
            "gb": 30,
            "unlimited_t2": true,
            "unlimited_internet": false,
            "unlimited_sms": false,
            "unlimited_calls": false,
            "unlimited_apps": "YouTube, Telegram, WhatsApp",
            "description": "Описание тарифа"
        }
    ]
}

Правила:
- Если минуты/SMS/GB безлимитные, укажи соответствующий флаг unlimited_* = true и число = null
- Если значение не указано, используй null
- Цену указывай как число (в рублях за месяц)
- unlimited_apps - список приложений с безлимитным трафиком через запятую
- Извлекай ВСЕ тарифы с изображения"#;

    let messages = vec![Message {
        role: "user".to_string(),
        content: vec![
            ContentPart::Text { text: prompt.to_string() },
            ContentPart::ImageUrl {
                image_url: ImageUrlContent {
                    url: format!("data:image/jpeg;base64,{}", image_base64),
                },
            },
        ],
    }];

    let response = call_openrouter(messages, 0.1).await?;

    let json_str = if response.contains("```json") {
        response
            .split("```json")
            .nth(1)
            .and_then(|s| s.split("```").next())
            .unwrap_or(&response)
            .trim()
    } else if response.contains("```") {
        response
            .split("```")
            .nth(1)
            .unwrap_or(&response)
            .trim()
    } else {
        response.trim()
    };

    #[derive(Deserialize)]
    struct AIResponse {
        tariffs: Vec<ParsedTariff>,
    }

    let parsed: AIResponse = serde_json::from_str(json_str)
        .map_err(|e| format!("Failed to parse AI response: {} - {}", e, json_str))?;

    Ok(parsed.tariffs)
}

/// Fetch and parse tariffs from T2 website
pub async fn fetch_tariffs_from_t2_website(region: &str) -> Result<Vec<ParsedTariff>, String> {
    let url = format!("https://{}.t2.ru/tariffs", region);

    let client = reqwest::Client::builder()
        .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {}", e))?;

    let response = client
        .get(&url)
        .send()
        .await
        .map_err(|e| format!("Failed to fetch T2 website: {}", e))?;

    let html = response
        .text()
        .await
        .map_err(|e| format!("Failed to read response: {}", e))?;

    // Extract text content and JSON data from HTML
    let text_content = extract_tariff_data_from_html(&html);

    if text_content.is_empty() {
        return Err("No tariff data found on page".to_string());
    }

    // Use AI to parse the extracted content
    let prompt = format!(r#"Ты - система парсинга тарифов оператора Tele2 (T2).

Проанализируй следующие данные с сайта t2.ru и извлеки информацию о всех тарифах.

Данные:
{}

Верни ТОЛЬКО JSON (без markdown):
{{
    "tariffs": [
        {{
            "name": "Название тарифа",
            "price": 500,
            "minutes": 500,
            "sms": 100,
            "gb": 30,
            "unlimited_t2": true,
            "unlimited_internet": false,
            "unlimited_sms": false,
            "unlimited_calls": false,
            "unlimited_apps": "YouTube, Telegram, WhatsApp",
            "description": "Описание тарифа"
        }}
    ]
}}

Правила:
- Если минуты/SMS/GB безлимитные, укажи соответствующий флаг unlimited_* = true и число = null
- Если значение не указано, используй null
- Цену указывай как число (в рублях за месяц)
- unlimited_apps - список приложений с безлимитным трафиком через запятую
- Извлекай ВСЕ тарифы которые найдёшь
- Типичные названия тарифов T2: "Мой Онлайн", "Мой Онлайн+", "Игровой", "Премиум", "Везде онлайн" и т.д."#, text_content);

    let messages = vec![Message {
        role: "user".to_string(),
        content: vec![ContentPart::Text { text: prompt }],
    }];

    let response = call_openrouter(messages, 0.2).await?;

    let json_str = if response.contains("```json") {
        response
            .split("```json")
            .nth(1)
            .and_then(|s| s.split("```").next())
            .unwrap_or(&response)
            .trim()
    } else if response.contains("```") {
        response
            .split("```")
            .nth(1)
            .unwrap_or(&response)
            .trim()
    } else {
        response.trim()
    };

    #[derive(Deserialize)]
    struct AIResponse {
        tariffs: Vec<ParsedTariff>,
    }

    let parsed: AIResponse = serde_json::from_str(json_str)
        .map_err(|e| format!("Failed to parse AI response: {} - {}", e, json_str))?;

    Ok(parsed.tariffs)
}

/// Extract tariff-related data from HTML
fn extract_tariff_data_from_html(html: &str) -> String {
    let mut result = String::new();

    // Try to find JSON data in script tags (Next.js/React often embed data this way)
    if let Some(start) = html.find("__NEXT_DATA__") {
        if let Some(json_start) = html[start..].find('>') {
            let after_tag = &html[start + json_start + 1..];
            if let Some(json_end) = after_tag.find("</script>") {
                let json_data = &after_tag[..json_end];
                result.push_str("JSON Data:\n");
                result.push_str(json_data);
                result.push_str("\n\n");
            }
        }
    }

    // Look for window.__PRELOADED_STATE__ or similar
    for pattern in &["__PRELOADED_STATE__", "__INITIAL_STATE__", "window.__DATA__"] {
        if let Some(start) = html.find(pattern) {
            if let Some(eq_pos) = html[start..].find('=') {
                let after_eq = &html[start + eq_pos + 1..];
                // Find the end of JSON (look for </script> or ;)
                let end = after_eq.find("</script>")
                    .or_else(|| after_eq.find(";\n"))
                    .unwrap_or(after_eq.len().min(10000));
                let json_data = after_eq[..end].trim().trim_end_matches(';');
                result.push_str(&format!("{} Data:\n", pattern));
                result.push_str(json_data);
                result.push_str("\n\n");
            }
        }
    }

    // Extract visible text that might contain tariff info
    // Look for price patterns and tariff names
    let price_pattern = regex::Regex::new(r#"(\d{2,4})\s*[₽руб]"#).ok();
    let tariff_keywords = ["тариф", "Мой Онлайн", "Игровой", "Премиум", "минут", "ГБ", "SMS", "безлимит"];

    // Extract text between tags that might contain tariff info
    let tag_pattern = regex::Regex::new(r#">([^<]{10,500})<"#).ok();
    if let Some(re) = tag_pattern {
        for cap in re.captures_iter(html) {
            if let Some(text) = cap.get(1) {
                let t = text.as_str().trim();
                // Check if text contains tariff-related keywords
                let has_keyword = tariff_keywords.iter().any(|k| t.to_lowercase().contains(&k.to_lowercase()));
                let has_price = price_pattern.as_ref().map(|p| p.is_match(t)).unwrap_or(false);

                if (has_keyword || has_price) && !t.contains("function") && !t.contains("var ") {
                    result.push_str(t);
                    result.push('\n');
                }
            }
        }
    }

    // If still empty, just extract all text content
    if result.len() < 100 {
        let text_pattern = regex::Regex::new(r#">([^<]+)<"#).ok();
        if let Some(re) = text_pattern {
            for cap in re.captures_iter(html) {
                if let Some(text) = cap.get(1) {
                    let t = text.as_str().trim();
                    if t.len() > 3 && !t.contains("function") && !t.contains("var ") && !t.starts_with("//") {
                        result.push_str(t);
                        result.push(' ');
                    }
                }
            }
        }
    }

    // Limit the size
    if result.len() > 15000 {
        result.truncate(15000);
    }

    result
}

/// Check if a phone is a smartphone (not a feature phone)
pub fn is_smartphone(product: &T2ProductWithDetails) -> bool {
    // Check category
    if product.category_id != 1 {
        return false;
    }

    // Check specs for smartphone indicators
    let smartphone_indicators = ["Android", "iOS", "OLED", "AMOLED", "LCD", "ГБ", "GB", "МП", "MP"];

    for spec in &product.specs {
        for indicator in &smartphone_indicators {
            if spec.spec_value.contains(indicator) {
                return true;
            }
        }
    }

    // Check name for keywords
    let name_lower = product.name.to_lowercase();
    let smartphone_keywords = ["smartphone", "смартфон", "iphone", "galaxy", "redmi", "poco", "realme"];

    for keyword in &smartphone_keywords {
        if name_lower.contains(keyword) {
            return true;
        }
    }

    // Check for button phone indicators
    let button_phone_indicators = ["кнопочный", "button", "feature phone"];
    for indicator in &button_phone_indicators {
        if name_lower.contains(indicator) {
            return false;
        }
    }

    // Default to smartphone if it's in phone category
    true
}
