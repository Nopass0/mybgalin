use serde::{Deserialize, Serialize};
use sqlx::FromRow;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct T2Store {
    pub id: i32,
    pub name: String,
    pub address: String,
    pub admin_code: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct T2Employee {
    pub id: i32,
    pub store_id: i32,
    pub name: String,
    pub code: String,
    pub is_admin: bool,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct T2EmployeeWithStores {
    pub id: i32,
    pub store_id: i32,
    pub name: String,
    pub code: String,
    pub is_admin: bool,
    pub created_at: String,
    pub stores: Vec<T2Store>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct T2Category {
    pub id: i32,
    pub name: String,
    pub icon: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct T2Tag {
    pub id: i32,
    pub store_id: i32,
    pub name: String,
    pub color: String,
    pub description: Option<String>,
    pub priority: i32,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct T2Product {
    pub id: i32,
    pub store_id: i32,
    pub category_id: i32,
    pub name: String,
    pub brand: Option<String>,
    pub model: Option<String>,
    pub price: f64,
    pub quantity: i32,
    pub image_url: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct T2ProductWithDetails {
    pub id: i32,
    pub store_id: i32,
    pub category_id: i32,
    pub category_name: String,
    pub name: String,
    pub brand: Option<String>,
    pub model: Option<String>,
    pub price: f64,
    pub quantity: i32,
    pub image_url: Option<String>,
    pub specs: Vec<T2ProductSpec>,
    pub tags: Vec<T2Tag>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct T2ProductSpec {
    pub id: i32,
    pub product_id: i32,
    pub spec_name: String,
    pub spec_value: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct T2Tariff {
    pub id: i32,
    pub store_id: i32,
    pub name: String,
    pub price: f64,
    pub minutes: Option<i32>,
    pub sms: Option<i32>,
    pub gb: Option<i32>,
    pub unlimited_t2: bool,
    pub unlimited_internet: bool,
    pub unlimited_sms: bool,
    pub unlimited_calls: bool,
    pub unlimited_apps: Option<String>,
    pub description: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct T2Service {
    pub id: i32,
    pub store_id: i32,
    pub name: String,
    pub price: f64,
    pub description: Option<String>,
    pub for_smartphones_only: bool,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct T2Sale {
    pub id: i32,
    pub store_id: i32,
    pub employee_id: i32,
    pub customer_request: Option<String>,
    pub customer_audio_url: Option<String>,
    pub total_amount: f64,
    pub status: String,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct T2SaleWithDetails {
    pub id: i32,
    pub store_id: i32,
    pub store_name: String,
    pub employee_id: i32,
    pub employee_name: String,
    pub customer_request: Option<String>,
    pub customer_audio_url: Option<String>,
    pub total_amount: f64,
    pub status: String,
    pub items: Vec<T2SaleItem>,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct T2SaleItem {
    pub id: i32,
    pub sale_id: i32,
    pub item_type: String,
    pub item_id: i32,
    pub item_name: String,
    pub item_details: Option<String>,
    pub price: f64,
    pub quantity: i32,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct T2Session {
    pub id: i32,
    pub employee_id: i32,
    pub token: String,
    pub expires_at: String,
    pub created_at: String,
}

// Request/Response types
#[derive(Debug, Deserialize)]
pub struct LoginRequest {
    pub code: String,
    pub name: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct LoginResponse {
    pub token: String,
    pub employee: T2EmployeeWithStores,
}

#[derive(Debug, Deserialize)]
pub struct CreateStoreRequest {
    pub name: String,
    pub address: String,
}

#[derive(Debug, Deserialize)]
pub struct CreateEmployeeRequest {
    pub store_id: i32,
    pub name: String,
}

#[derive(Debug, Deserialize)]
pub struct CreateProductRequest {
    pub category_id: i32,
    pub name: String,
    pub brand: Option<String>,
    pub model: Option<String>,
    pub price: f64,
    pub quantity: Option<i32>,
    pub image_url: Option<String>,
    pub specs: Vec<ProductSpecInput>,
    pub tag_ids: Vec<i32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProductSpecInput {
    pub name: String,
    pub value: String,
}

#[derive(Debug, Deserialize)]
pub struct UpdateProductRequest {
    pub name: Option<String>,
    pub brand: Option<String>,
    pub model: Option<String>,
    pub price: Option<f64>,
    pub quantity: Option<i32>,
    pub image_url: Option<String>,
    pub specs: Option<Vec<ProductSpecInput>>,
    pub tag_ids: Option<Vec<i32>>,
}

#[derive(Debug, Deserialize)]
pub struct CreateTagRequest {
    pub name: String,
    pub color: String,
    pub description: Option<String>,
    pub priority: Option<i32>,
}

#[derive(Debug, Deserialize)]
pub struct CreateTariffRequest {
    pub name: String,
    pub price: f64,
    pub minutes: Option<i32>,
    pub sms: Option<i32>,
    pub gb: Option<i32>,
    pub unlimited_t2: Option<bool>,
    pub unlimited_internet: Option<bool>,
    pub unlimited_sms: Option<bool>,
    pub unlimited_calls: Option<bool>,
    pub unlimited_apps: Option<String>,
    pub description: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateServiceRequest {
    pub name: String,
    pub price: f64,
    pub description: Option<String>,
    pub for_smartphones_only: Option<bool>,
}

#[derive(Debug, Deserialize)]
pub struct CustomerRequest {
    pub text: Option<String>,
    pub audio_url: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct ProductRecommendation {
    pub product: T2ProductWithDetails,
    pub price_category: String,
    pub match_score: i32,
    pub match_reasons: Vec<String>,
}

#[derive(Debug, Serialize)]
pub struct SaleRecommendations {
    pub recommendations: Vec<ProductRecommendation>,
    pub parsed_requirements: ParsedRequirements,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ParsedRequirements {
    pub budget_min: Option<f64>,
    pub budget_max: Option<f64>,
    pub brand_preferences: Vec<String>,
    pub required_features: Vec<String>,
    pub use_cases: Vec<String>,
}

#[derive(Debug, Serialize)]
pub struct AccessoryRecommendation {
    pub product: T2ProductWithDetails,
    pub reason: String,
    pub benefit: String,
}

#[derive(Debug, Deserialize)]
pub struct AnalyzePriceTagRequest {
    pub image_base64: String,
}

#[derive(Debug, Serialize)]
pub struct AnalyzedPriceTag {
    pub name: Option<String>,
    pub brand: Option<String>,
    pub model: Option<String>,
    pub price: Option<f64>,
    pub specs: Vec<ProductSpecInput>,
    pub raw_text: String,
}

#[derive(Debug, Deserialize)]
pub struct CreateSaleRequest {
    pub customer_request: Option<String>,
    pub customer_audio_url: Option<String>,
    pub items: Vec<SaleItemInput>,
}

#[derive(Debug, Deserialize)]
pub struct SaleItemInput {
    pub item_type: String,
    pub item_id: i32,
    pub quantity: Option<i32>,
}

#[derive(Debug, Deserialize)]
pub struct SearchProductsRequest {
    pub query: String,
    pub category_id: Option<i32>,
}
