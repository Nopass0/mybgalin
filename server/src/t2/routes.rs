use rocket::serde::json::Json;
use rocket::{get, post, put, delete, State};
use sqlx::SqlitePool;
use sha2::{Sha256, Digest};
use rand::Rng;

use super::models::*;
use super::guards::{T2AuthGuard, T2AdminGuard};
use super::ai;

#[derive(serde::Serialize)]
pub struct ApiResponse<T> {
    pub success: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub data: Option<T>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

impl<T> ApiResponse<T> {
    pub fn success(data: T) -> Json<Self> {
        Json(Self {
            success: true,
            data: Some(data),
            error: None,
        })
    }

    pub fn error(message: &str) -> Json<Self> {
        Json(Self {
            success: false,
            data: None,
            error: Some(message.to_string()),
        })
    }
}

fn generate_code() -> String {
    let mut rng = rand::thread_rng();
    format!("{:05}", rng.gen_range(10000..100000))
}

fn generate_token() -> String {
    let mut hasher = Sha256::new();
    hasher.update(uuid::Uuid::new_v4().to_string());
    hasher.update(chrono::Utc::now().timestamp().to_string());
    format!("{:x}", hasher.finalize())
}

// ============ HEALTH CHECK ============

#[get("/t2/health")]
pub async fn t2_health() -> Json<ApiResponse<String>> {
    println!("T2 health check called");
    ApiResponse::success("T2 API is running".to_string())
}

// ============ AUTH ROUTES ============

#[post("/t2/auth/login", data = "<request>")]
pub async fn t2_login(
    pool: &State<SqlitePool>,
    request: Json<LoginRequest>,
) -> Json<ApiResponse<LoginResponse>> {
    println!("T2 login attempt with code: {}", request.code);

    // Find employee by code
    let employee = match sqlx::query_as::<_, T2Employee>(
        r#"SELECT id, store_id, name, code, is_admin, created_at FROM t2_employees WHERE code = ?"#,
    )
    .bind(&request.code)
    .fetch_optional(pool.inner())
    .await
    {
        Ok(Some(emp)) => emp,
        Ok(None) => return ApiResponse::error("Неверный код доступа"),
        Err(e) => return ApiResponse::error(&format!("Database error: {}", e)),
    };

    // If name provided and employee name is empty, update it
    if let Some(name) = &request.name {
        if employee.name.is_empty() || employee.name == "Новый сотрудник" {
            let _ = sqlx::query("UPDATE t2_employees SET name = ? WHERE id = ?")
                .bind(name)
                .bind(employee.id)
                .execute(pool.inner())
                .await;
        }
    }

    // Create session
    let token = generate_token();
    let expires_at = chrono::Utc::now() + chrono::Duration::days(30);

    if let Err(e) = sqlx::query(
        r#"INSERT INTO t2_sessions (employee_id, token, expires_at) VALUES (?, ?, ?)"#,
    )
    .bind(employee.id)
    .bind(&token)
    .bind(expires_at.format("%Y-%m-%d %H:%M:%S").to_string())
    .execute(pool.inner())
    .await
    {
        return ApiResponse::error(&format!("Failed to create session: {}", e));
    }

    // Get stores
    let mut stores = Vec::new();
    if let Ok(Some(primary_store)) = sqlx::query_as::<_, T2Store>(
        r#"SELECT id, name, address, admin_code, created_at, updated_at FROM t2_stores WHERE id = ?"#,
    )
    .bind(employee.store_id)
    .fetch_optional(pool.inner())
    .await
    {
        stores.push(primary_store);
    }

    if employee.is_admin {
        if let Ok(all_stores) = sqlx::query_as::<_, T2Store>(
            r#"SELECT id, name, address, admin_code, created_at, updated_at FROM t2_stores WHERE id != ?"#,
        )
        .bind(employee.store_id)
        .fetch_all(pool.inner())
        .await
        {
            stores.extend(all_stores);
        }
    }

    let employee_name = request.name.clone().unwrap_or(employee.name.clone());

    ApiResponse::success(LoginResponse {
        token,
        employee: T2EmployeeWithStores {
            id: employee.id,
            store_id: employee.store_id,
            name: employee_name,
            code: employee.code,
            is_admin: employee.is_admin,
            created_at: employee.created_at,
            stores,
        },
    })
}

#[post("/t2/auth/logout")]
pub async fn t2_logout(
    pool: &State<SqlitePool>,
    auth: T2AuthGuard,
) -> Json<ApiResponse<()>> {
    let _ = sqlx::query("DELETE FROM t2_sessions WHERE employee_id = ?")
        .bind(auth.employee.id)
        .execute(pool.inner())
        .await;

    ApiResponse::success(())
}

#[get("/t2/auth/me")]
pub async fn t2_me(auth: T2AuthGuard) -> Json<ApiResponse<T2EmployeeWithStores>> {
    ApiResponse::success(auth.employee)
}

// ============ ADMIN ROUTES ============

#[get("/t2/admin/info")]
pub async fn t2_admin_info(
    pool: &State<SqlitePool>,
    auth: T2AdminGuard,
) -> Json<ApiResponse<serde_json::Value>> {
    let admin_code = sqlx::query_scalar::<_, String>(
        "SELECT code FROM t2_employees WHERE is_admin = TRUE LIMIT 1",
    )
    .fetch_optional(pool.inner())
    .await
    .ok()
    .flatten()
    .unwrap_or_default();

    ApiResponse::success(serde_json::json!({
        "admin_code": admin_code,
        "employee": auth.employee,
    }))
}

#[get("/t2/admin/stores")]
pub async fn t2_list_stores(
    pool: &State<SqlitePool>,
    _auth: T2AdminGuard,
) -> Json<ApiResponse<Vec<T2Store>>> {
    match sqlx::query_as::<_, T2Store>(
        "SELECT id, name, address, admin_code, created_at, updated_at FROM t2_stores ORDER BY id",
    )
    .fetch_all(pool.inner())
    .await
    {
        Ok(stores) => ApiResponse::success(stores),
        Err(e) => ApiResponse::error(&format!("Failed to fetch stores: {}", e)),
    }
}

#[post("/t2/admin/stores", data = "<request>")]
pub async fn t2_create_store(
    pool: &State<SqlitePool>,
    _auth: T2AdminGuard,
    request: Json<CreateStoreRequest>,
) -> Json<ApiResponse<T2Store>> {
    let admin_code = generate_code();

    match sqlx::query_as::<_, T2Store>(
        r#"
        INSERT INTO t2_stores (name, address, admin_code)
        VALUES (?, ?, ?)
        RETURNING id, name, address, admin_code, created_at, updated_at
        "#,
    )
    .bind(&request.name)
    .bind(&request.address)
    .bind(&admin_code)
    .fetch_one(pool.inner())
    .await
    {
        Ok(store) => ApiResponse::success(store),
        Err(e) => ApiResponse::error(&format!("Failed to create store: {}", e)),
    }
}

#[delete("/t2/admin/stores/<store_id>")]
pub async fn t2_delete_store(
    pool: &State<SqlitePool>,
    _auth: T2AdminGuard,
    store_id: i32,
) -> Json<ApiResponse<()>> {
    if store_id == 1 {
        return ApiResponse::error("Cannot delete main office");
    }

    match sqlx::query("DELETE FROM t2_stores WHERE id = ?")
        .bind(store_id)
        .execute(pool.inner())
        .await
    {
        Ok(_) => ApiResponse::success(()),
        Err(e) => ApiResponse::error(&format!("Failed to delete store: {}", e)),
    }
}

#[get("/t2/admin/employees")]
pub async fn t2_list_employees(
    pool: &State<SqlitePool>,
    _auth: T2AdminGuard,
) -> Json<ApiResponse<Vec<T2Employee>>> {
    match sqlx::query_as::<_, T2Employee>(
        "SELECT id, store_id, name, code, is_admin, created_at FROM t2_employees ORDER BY id",
    )
    .fetch_all(pool.inner())
    .await
    {
        Ok(employees) => ApiResponse::success(employees),
        Err(e) => ApiResponse::error(&format!("Failed to fetch employees: {}", e)),
    }
}

#[post("/t2/admin/employees", data = "<request>")]
pub async fn t2_create_employee(
    pool: &State<SqlitePool>,
    _auth: T2AdminGuard,
    request: Json<CreateEmployeeRequest>,
) -> Json<ApiResponse<T2Employee>> {
    let code = generate_code();

    match sqlx::query_as::<_, T2Employee>(
        r#"
        INSERT INTO t2_employees (store_id, name, code, is_admin)
        VALUES (?, ?, ?, FALSE)
        RETURNING id, store_id, name, code, is_admin, created_at
        "#,
    )
    .bind(request.store_id)
    .bind(&request.name)
    .bind(&code)
    .fetch_one(pool.inner())
    .await
    {
        Ok(employee) => ApiResponse::success(employee),
        Err(e) => ApiResponse::error(&format!("Failed to create employee: {}", e)),
    }
}

#[delete("/t2/admin/employees/<employee_id>")]
pub async fn t2_delete_employee(
    pool: &State<SqlitePool>,
    _auth: T2AdminGuard,
    employee_id: i32,
) -> Json<ApiResponse<()>> {
    if employee_id == 1 {
        return ApiResponse::error("Cannot delete main admin");
    }

    match sqlx::query("DELETE FROM t2_employees WHERE id = ?")
        .bind(employee_id)
        .execute(pool.inner())
        .await
    {
        Ok(_) => ApiResponse::success(()),
        Err(e) => ApiResponse::error(&format!("Failed to delete employee: {}", e)),
    }
}

#[post("/t2/admin/employees/<employee_id>/stores/<store_id>")]
pub async fn t2_add_employee_store(
    pool: &State<SqlitePool>,
    _auth: T2AdminGuard,
    employee_id: i32,
    store_id: i32,
) -> Json<ApiResponse<()>> {
    match sqlx::query(
        "INSERT OR IGNORE INTO t2_employee_stores (employee_id, store_id) VALUES (?, ?)",
    )
    .bind(employee_id)
    .bind(store_id)
    .execute(pool.inner())
    .await
    {
        Ok(_) => ApiResponse::success(()),
        Err(e) => ApiResponse::error(&format!("Failed to add store access: {}", e)),
    }
}

// ============ CATEGORIES ============

#[get("/t2/categories")]
pub async fn t2_get_categories(
    pool: &State<SqlitePool>,
    _auth: T2AuthGuard,
) -> Json<ApiResponse<Vec<T2Category>>> {
    match sqlx::query_as::<_, T2Category>(
        "SELECT id, name, icon, created_at FROM t2_categories ORDER BY id",
    )
    .fetch_all(pool.inner())
    .await
    {
        Ok(categories) => ApiResponse::success(categories),
        Err(e) => ApiResponse::error(&format!("Failed to fetch categories: {}", e)),
    }
}

// ============ TAGS ============

#[get("/t2/tags")]
pub async fn t2_get_tags(
    pool: &State<SqlitePool>,
    auth: T2AuthGuard,
) -> Json<ApiResponse<Vec<T2Tag>>> {
    match sqlx::query_as::<_, T2Tag>(
        "SELECT id, store_id, name, color, description, priority, created_at FROM t2_tags WHERE store_id = ? ORDER BY priority DESC, name",
    )
    .bind(auth.current_store_id)
    .fetch_all(pool.inner())
    .await
    {
        Ok(tags) => ApiResponse::success(tags),
        Err(e) => ApiResponse::error(&format!("Failed to fetch tags: {}", e)),
    }
}

#[post("/t2/tags", data = "<request>")]
pub async fn t2_create_tag(
    pool: &State<SqlitePool>,
    auth: T2AuthGuard,
    request: Json<CreateTagRequest>,
) -> Json<ApiResponse<T2Tag>> {
    match sqlx::query_as::<_, T2Tag>(
        r#"
        INSERT INTO t2_tags (store_id, name, color, description, priority)
        VALUES (?, ?, ?, ?, ?)
        RETURNING id, store_id, name, color, description, priority, created_at
        "#,
    )
    .bind(auth.current_store_id)
    .bind(&request.name)
    .bind(&request.color)
    .bind(&request.description)
    .bind(request.priority.unwrap_or(0))
    .fetch_one(pool.inner())
    .await
    {
        Ok(tag) => ApiResponse::success(tag),
        Err(e) => ApiResponse::error(&format!("Failed to create tag: {}", e)),
    }
}

#[put("/t2/tags/<tag_id>", data = "<request>")]
pub async fn t2_update_tag(
    pool: &State<SqlitePool>,
    auth: T2AuthGuard,
    tag_id: i32,
    request: Json<super::models::UpdateTagRequest>,
) -> Json<ApiResponse<T2Tag>> {
    // Check ownership
    let exists = sqlx::query_scalar::<_, i32>(
        "SELECT id FROM t2_tags WHERE id = ? AND store_id = ?",
    )
    .bind(tag_id)
    .bind(auth.current_store_id)
    .fetch_optional(pool.inner())
    .await
    .ok()
    .flatten();

    if exists.is_none() {
        return ApiResponse::error("Tag not found");
    }

    // Build update query dynamically
    let mut updates = Vec::new();
    if request.name.is_some() { updates.push("name = ?"); }
    if request.color.is_some() { updates.push("color = ?"); }
    if request.description.is_some() { updates.push("description = ?"); }
    if request.priority.is_some() { updates.push("priority = ?"); }

    if updates.is_empty() {
        // Nothing to update, return current tag
        match sqlx::query_as::<_, T2Tag>(
            "SELECT id, store_id, name, color, description, priority, created_at FROM t2_tags WHERE id = ?"
        )
        .bind(tag_id)
        .fetch_one(pool.inner())
        .await
        {
            Ok(tag) => return ApiResponse::success(tag),
            Err(e) => return ApiResponse::error(&format!("Failed to fetch tag: {}", e)),
        }
    }

    let query = format!("UPDATE t2_tags SET {} WHERE id = ? RETURNING id, store_id, name, color, description, priority, created_at", updates.join(", "));
    let mut q = sqlx::query_as::<_, T2Tag>(&query);

    if let Some(ref name) = request.name { q = q.bind(name); }
    if let Some(ref color) = request.color { q = q.bind(color); }
    if let Some(ref description) = request.description { q = q.bind(description); }
    if let Some(priority) = request.priority { q = q.bind(priority); }
    q = q.bind(tag_id);

    match q.fetch_one(pool.inner()).await {
        Ok(tag) => ApiResponse::success(tag),
        Err(e) => ApiResponse::error(&format!("Failed to update tag: {}", e)),
    }
}

#[delete("/t2/tags/<tag_id>")]
pub async fn t2_delete_tag(
    pool: &State<SqlitePool>,
    auth: T2AuthGuard,
    tag_id: i32,
) -> Json<ApiResponse<()>> {
    match sqlx::query("DELETE FROM t2_tags WHERE id = ? AND store_id = ?")
        .bind(tag_id)
        .bind(auth.current_store_id)
        .execute(pool.inner())
        .await
    {
        Ok(_) => ApiResponse::success(()),
        Err(e) => ApiResponse::error(&format!("Failed to delete tag: {}", e)),
    }
}

// ============ PRODUCTS ============

async fn get_product_with_details(pool: &SqlitePool, product_id: i32) -> Option<T2ProductWithDetails> {
    let product = sqlx::query_as::<_, T2Product>(
        "SELECT id, store_id, category_id, name, brand, model, price, quantity, image_url, created_at, updated_at FROM t2_products WHERE id = ?",
    )
    .bind(product_id)
    .fetch_optional(pool)
    .await
    .ok()??;

    let category_name = sqlx::query_scalar::<_, String>("SELECT name FROM t2_categories WHERE id = ?")
        .bind(product.category_id)
        .fetch_optional(pool)
        .await
        .ok()
        .flatten()
        .unwrap_or_default();

    let specs = sqlx::query_as::<_, T2ProductSpec>(
        "SELECT id, product_id, spec_name, spec_value FROM t2_product_specs WHERE product_id = ?",
    )
    .bind(product_id)
    .fetch_all(pool)
    .await
    .unwrap_or_default();

    let tags = sqlx::query_as::<_, T2Tag>(
        r#"
        SELECT t.id, t.store_id, t.name, t.color, t.description, t.priority, t.created_at
        FROM t2_tags t
        INNER JOIN t2_product_tags pt ON t.id = pt.tag_id
        WHERE pt.product_id = ?
        "#,
    )
    .bind(product_id)
    .fetch_all(pool)
    .await
    .unwrap_or_default();

    Some(T2ProductWithDetails {
        id: product.id,
        store_id: product.store_id,
        category_id: product.category_id,
        category_name,
        name: product.name,
        brand: product.brand,
        model: product.model,
        price: product.price,
        quantity: product.quantity,
        image_url: product.image_url,
        specs,
        tags,
        created_at: product.created_at,
        updated_at: product.updated_at,
    })
}

#[get("/t2/products?<category_id>&<search>")]
pub async fn t2_get_products(
    pool: &State<SqlitePool>,
    auth: T2AuthGuard,
    category_id: Option<i32>,
    search: Option<String>,
) -> Json<ApiResponse<Vec<T2ProductWithDetails>>> {
    // Prepare search pattern if needed
    let search_pattern = search.as_ref().map(|s| format!("%{}%", s));

    let product_ids: Vec<i32> = match (category_id, &search_pattern) {
        (Some(cat_id), Some(pattern)) => {
            sqlx::query_scalar::<_, i32>(
                "SELECT id FROM t2_products WHERE store_id = ? AND category_id = ? AND (name LIKE ? OR brand LIKE ? OR model LIKE ?) ORDER BY updated_at DESC"
            )
            .bind(auth.current_store_id)
            .bind(cat_id)
            .bind(pattern)
            .bind(pattern)
            .bind(pattern)
            .fetch_all(pool.inner())
            .await
            .unwrap_or_default()
        }
        (Some(cat_id), None) => {
            sqlx::query_scalar::<_, i32>(
                "SELECT id FROM t2_products WHERE store_id = ? AND category_id = ? ORDER BY updated_at DESC"
            )
            .bind(auth.current_store_id)
            .bind(cat_id)
            .fetch_all(pool.inner())
            .await
            .unwrap_or_default()
        }
        (None, Some(pattern)) => {
            sqlx::query_scalar::<_, i32>(
                "SELECT id FROM t2_products WHERE store_id = ? AND (name LIKE ? OR brand LIKE ? OR model LIKE ?) ORDER BY updated_at DESC"
            )
            .bind(auth.current_store_id)
            .bind(pattern)
            .bind(pattern)
            .bind(pattern)
            .fetch_all(pool.inner())
            .await
            .unwrap_or_default()
        }
        (None, None) => {
            sqlx::query_scalar::<_, i32>(
                "SELECT id FROM t2_products WHERE store_id = ? ORDER BY updated_at DESC"
            )
            .bind(auth.current_store_id)
            .fetch_all(pool.inner())
            .await
            .unwrap_or_default()
        }
    };

    let mut products = Vec::new();
    for id in product_ids {
        if let Some(product) = get_product_with_details(pool.inner(), id).await {
            products.push(product);
        }
    }

    ApiResponse::success(products)
}

#[get("/t2/products/<product_id>")]
pub async fn t2_get_product(
    pool: &State<SqlitePool>,
    _auth: T2AuthGuard,
    product_id: i32,
) -> Json<ApiResponse<T2ProductWithDetails>> {
    match get_product_with_details(pool.inner(), product_id).await {
        Some(product) => ApiResponse::success(product),
        None => ApiResponse::error("Product not found"),
    }
}

#[post("/t2/products", data = "<request>")]
pub async fn t2_create_product(
    pool: &State<SqlitePool>,
    auth: T2AuthGuard,
    request: Json<CreateProductRequest>,
) -> Json<ApiResponse<T2ProductWithDetails>> {
    // Insert product
    let product_id = match sqlx::query_scalar::<_, i32>(
        r#"
        INSERT INTO t2_products (store_id, category_id, name, brand, model, price, quantity, image_url)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        RETURNING id
        "#,
    )
    .bind(auth.current_store_id)
    .bind(request.category_id)
    .bind(&request.name)
    .bind(&request.brand)
    .bind(&request.model)
    .bind(request.price)
    .bind(request.quantity.unwrap_or(1))
    .bind(&request.image_url)
    .fetch_one(pool.inner())
    .await
    {
        Ok(id) => id,
        Err(e) => return ApiResponse::error(&format!("Failed to create product: {}", e)),
    };

    // Insert specs
    for spec in &request.specs {
        let _ = sqlx::query(
            "INSERT INTO t2_product_specs (product_id, spec_name, spec_value) VALUES (?, ?, ?)",
        )
        .bind(product_id)
        .bind(&spec.name)
        .bind(&spec.value)
        .execute(pool.inner())
        .await;
    }

    // Insert tags
    for tag_id in &request.tag_ids {
        let _ = sqlx::query("INSERT INTO t2_product_tags (product_id, tag_id) VALUES (?, ?)")
            .bind(product_id)
            .bind(tag_id)
            .execute(pool.inner())
            .await;
    }

    match get_product_with_details(pool.inner(), product_id).await {
        Some(product) => ApiResponse::success(product),
        None => ApiResponse::error("Failed to fetch created product"),
    }
}

#[put("/t2/products/<product_id>", data = "<request>")]
pub async fn t2_update_product(
    pool: &State<SqlitePool>,
    auth: T2AuthGuard,
    product_id: i32,
    request: Json<UpdateProductRequest>,
) -> Json<ApiResponse<T2ProductWithDetails>> {
    // Check ownership
    let exists = sqlx::query_scalar::<_, i32>(
        "SELECT id FROM t2_products WHERE id = ? AND store_id = ?",
    )
    .bind(product_id)
    .bind(auth.current_store_id)
    .fetch_optional(pool.inner())
    .await
    .ok()
    .flatten();

    if exists.is_none() {
        return ApiResponse::error("Product not found");
    }

    // Build update query
    let mut updates = Vec::new();

    if request.name.is_some() {
        updates.push("name = ?");
    }
    if request.brand.is_some() {
        updates.push("brand = ?");
    }
    if request.model.is_some() {
        updates.push("model = ?");
    }
    if request.price.is_some() {
        updates.push("price = ?");
    }
    if request.quantity.is_some() {
        updates.push("quantity = ?");
    }
    if request.image_url.is_some() {
        updates.push("image_url = ?");
    }

    if !updates.is_empty() {
        updates.push("updated_at = datetime('now')");
        let query = format!("UPDATE t2_products SET {} WHERE id = ?", updates.join(", "));

        let mut q = sqlx::query(&query);
        if let Some(ref name) = request.name { q = q.bind(name); }
        if let Some(ref brand) = request.brand { q = q.bind(brand); }
        if let Some(ref model) = request.model { q = q.bind(model); }
        if let Some(price) = request.price { q = q.bind(price); }
        if let Some(quantity) = request.quantity { q = q.bind(quantity); }
        if let Some(ref image_url) = request.image_url { q = q.bind(image_url); }
        q = q.bind(product_id);

        if let Err(e) = q.execute(pool.inner()).await {
            return ApiResponse::error(&format!("Failed to update product: {}", e));
        }
    }

    // Update specs if provided
    if let Some(ref specs) = request.specs {
        let _ = sqlx::query("DELETE FROM t2_product_specs WHERE product_id = ?")
            .bind(product_id)
            .execute(pool.inner())
            .await;

        for spec in specs {
            let _ = sqlx::query(
                "INSERT INTO t2_product_specs (product_id, spec_name, spec_value) VALUES (?, ?, ?)",
            )
            .bind(product_id)
            .bind(&spec.name)
            .bind(&spec.value)
            .execute(pool.inner())
            .await;
        }
    }

    // Update tags if provided
    if let Some(ref tag_ids) = request.tag_ids {
        let _ = sqlx::query("DELETE FROM t2_product_tags WHERE product_id = ?")
            .bind(product_id)
            .execute(pool.inner())
            .await;

        for tag_id in tag_ids {
            let _ = sqlx::query("INSERT INTO t2_product_tags (product_id, tag_id) VALUES (?, ?)")
                .bind(product_id)
                .bind(tag_id)
                .execute(pool.inner())
                .await;
        }
    }

    match get_product_with_details(pool.inner(), product_id).await {
        Some(product) => ApiResponse::success(product),
        None => ApiResponse::error("Failed to fetch updated product"),
    }
}

#[delete("/t2/products/<product_id>")]
pub async fn t2_delete_product(
    pool: &State<SqlitePool>,
    auth: T2AuthGuard,
    product_id: i32,
) -> Json<ApiResponse<()>> {
    match sqlx::query("DELETE FROM t2_products WHERE id = ? AND store_id = ?")
        .bind(product_id)
        .bind(auth.current_store_id)
        .execute(pool.inner())
        .await
    {
        Ok(_) => ApiResponse::success(()),
        Err(e) => ApiResponse::error(&format!("Failed to delete product: {}", e)),
    }
}

// ============ TARIFFS ============

#[get("/t2/tariffs")]
pub async fn t2_get_tariffs(
    pool: &State<SqlitePool>,
    auth: T2AuthGuard,
) -> Json<ApiResponse<Vec<T2Tariff>>> {
    match sqlx::query_as::<_, T2Tariff>(
        r#"SELECT id, store_id, name, price, minutes, sms, gb, unlimited_t2, unlimited_internet,
        unlimited_sms, unlimited_calls, unlimited_apps, description, created_at, updated_at
        FROM t2_tariffs WHERE store_id = ? ORDER BY price"#,
    )
    .bind(auth.current_store_id)
    .fetch_all(pool.inner())
    .await
    {
        Ok(tariffs) => ApiResponse::success(tariffs),
        Err(e) => ApiResponse::error(&format!("Failed to fetch tariffs: {}", e)),
    }
}

#[post("/t2/tariffs", data = "<request>")]
pub async fn t2_create_tariff(
    pool: &State<SqlitePool>,
    auth: T2AuthGuard,
    request: Json<CreateTariffRequest>,
) -> Json<ApiResponse<T2Tariff>> {
    match sqlx::query_as::<_, T2Tariff>(
        r#"
        INSERT INTO t2_tariffs (store_id, name, price, minutes, sms, gb, unlimited_t2, unlimited_internet,
        unlimited_sms, unlimited_calls, unlimited_apps, description)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        RETURNING id, store_id, name, price, minutes, sms, gb, unlimited_t2, unlimited_internet,
        unlimited_sms, unlimited_calls, unlimited_apps, description, created_at, updated_at
        "#,
    )
    .bind(auth.current_store_id)
    .bind(&request.name)
    .bind(request.price)
    .bind(request.minutes)
    .bind(request.sms)
    .bind(request.gb)
    .bind(request.unlimited_t2.unwrap_or(false))
    .bind(request.unlimited_internet.unwrap_or(false))
    .bind(request.unlimited_sms.unwrap_or(false))
    .bind(request.unlimited_calls.unwrap_or(false))
    .bind(&request.unlimited_apps)
    .bind(&request.description)
    .fetch_one(pool.inner())
    .await
    {
        Ok(tariff) => ApiResponse::success(tariff),
        Err(e) => ApiResponse::error(&format!("Failed to create tariff: {}", e)),
    }
}

#[put("/t2/tariffs/<tariff_id>", data = "<request>")]
pub async fn t2_update_tariff(
    pool: &State<SqlitePool>,
    auth: T2AuthGuard,
    tariff_id: i32,
    request: Json<super::models::UpdateTariffRequest>,
) -> Json<ApiResponse<T2Tariff>> {
    // Check ownership
    let exists = sqlx::query_scalar::<_, i32>(
        "SELECT id FROM t2_tariffs WHERE id = ? AND store_id = ?",
    )
    .bind(tariff_id)
    .bind(auth.current_store_id)
    .fetch_optional(pool.inner())
    .await
    .ok()
    .flatten();

    if exists.is_none() {
        return ApiResponse::error("Tariff not found");
    }

    // Build update query dynamically
    let mut updates = Vec::new();
    if request.name.is_some() { updates.push("name = ?"); }
    if request.price.is_some() { updates.push("price = ?"); }
    if request.minutes.is_some() { updates.push("minutes = ?"); }
    if request.sms.is_some() { updates.push("sms = ?"); }
    if request.gb.is_some() { updates.push("gb = ?"); }
    if request.unlimited_t2.is_some() { updates.push("unlimited_t2 = ?"); }
    if request.unlimited_internet.is_some() { updates.push("unlimited_internet = ?"); }
    if request.unlimited_sms.is_some() { updates.push("unlimited_sms = ?"); }
    if request.unlimited_calls.is_some() { updates.push("unlimited_calls = ?"); }
    if request.unlimited_apps.is_some() { updates.push("unlimited_apps = ?"); }
    if request.description.is_some() { updates.push("description = ?"); }

    if updates.is_empty() {
        match sqlx::query_as::<_, T2Tariff>(
            "SELECT id, store_id, name, price, minutes, sms, gb, unlimited_t2, unlimited_internet, unlimited_sms, unlimited_calls, unlimited_apps, description, created_at, updated_at FROM t2_tariffs WHERE id = ?"
        )
        .bind(tariff_id)
        .fetch_one(pool.inner())
        .await
        {
            Ok(tariff) => return ApiResponse::success(tariff),
            Err(e) => return ApiResponse::error(&format!("Failed to fetch tariff: {}", e)),
        }
    }

    updates.push("updated_at = datetime('now')");
    let query = format!("UPDATE t2_tariffs SET {} WHERE id = ? RETURNING id, store_id, name, price, minutes, sms, gb, unlimited_t2, unlimited_internet, unlimited_sms, unlimited_calls, unlimited_apps, description, created_at, updated_at", updates.join(", "));
    let mut q = sqlx::query_as::<_, T2Tariff>(&query);

    if let Some(ref name) = request.name { q = q.bind(name); }
    if let Some(price) = request.price { q = q.bind(price); }
    if let Some(minutes) = request.minutes { q = q.bind(minutes); }
    if let Some(sms) = request.sms { q = q.bind(sms); }
    if let Some(gb) = request.gb { q = q.bind(gb); }
    if let Some(unlimited_t2) = request.unlimited_t2 { q = q.bind(unlimited_t2); }
    if let Some(unlimited_internet) = request.unlimited_internet { q = q.bind(unlimited_internet); }
    if let Some(unlimited_sms) = request.unlimited_sms { q = q.bind(unlimited_sms); }
    if let Some(unlimited_calls) = request.unlimited_calls { q = q.bind(unlimited_calls); }
    if let Some(ref unlimited_apps) = request.unlimited_apps { q = q.bind(unlimited_apps); }
    if let Some(ref description) = request.description { q = q.bind(description); }
    q = q.bind(tariff_id);

    match q.fetch_one(pool.inner()).await {
        Ok(tariff) => ApiResponse::success(tariff),
        Err(e) => ApiResponse::error(&format!("Failed to update tariff: {}", e)),
    }
}

#[delete("/t2/tariffs/<tariff_id>")]
pub async fn t2_delete_tariff(
    pool: &State<SqlitePool>,
    auth: T2AuthGuard,
    tariff_id: i32,
) -> Json<ApiResponse<()>> {
    match sqlx::query("DELETE FROM t2_tariffs WHERE id = ? AND store_id = ?")
        .bind(tariff_id)
        .bind(auth.current_store_id)
        .execute(pool.inner())
        .await
    {
        Ok(_) => ApiResponse::success(()),
        Err(e) => ApiResponse::error(&format!("Failed to delete tariff: {}", e)),
    }
}

// ============ SERVICES ============

#[get("/t2/services")]
pub async fn t2_get_services(
    pool: &State<SqlitePool>,
    auth: T2AuthGuard,
) -> Json<ApiResponse<Vec<T2Service>>> {
    match sqlx::query_as::<_, T2Service>(
        "SELECT id, store_id, name, price, description, for_smartphones_only, created_at FROM t2_services WHERE store_id = ? ORDER BY name",
    )
    .bind(auth.current_store_id)
    .fetch_all(pool.inner())
    .await
    {
        Ok(services) => ApiResponse::success(services),
        Err(e) => ApiResponse::error(&format!("Failed to fetch services: {}", e)),
    }
}

#[post("/t2/services", data = "<request>")]
pub async fn t2_create_service(
    pool: &State<SqlitePool>,
    auth: T2AuthGuard,
    request: Json<CreateServiceRequest>,
) -> Json<ApiResponse<T2Service>> {
    match sqlx::query_as::<_, T2Service>(
        r#"
        INSERT INTO t2_services (store_id, name, price, description, for_smartphones_only)
        VALUES (?, ?, ?, ?, ?)
        RETURNING id, store_id, name, price, description, for_smartphones_only, created_at
        "#,
    )
    .bind(auth.current_store_id)
    .bind(&request.name)
    .bind(request.price)
    .bind(&request.description)
    .bind(request.for_smartphones_only.unwrap_or(false))
    .fetch_one(pool.inner())
    .await
    {
        Ok(service) => ApiResponse::success(service),
        Err(e) => ApiResponse::error(&format!("Failed to create service: {}", e)),
    }
}

#[put("/t2/services/<service_id>", data = "<request>")]
pub async fn t2_update_service(
    pool: &State<SqlitePool>,
    auth: T2AuthGuard,
    service_id: i32,
    request: Json<super::models::UpdateServiceRequest>,
) -> Json<ApiResponse<T2Service>> {
    // Check ownership
    let exists = sqlx::query_scalar::<_, i32>(
        "SELECT id FROM t2_services WHERE id = ? AND store_id = ?",
    )
    .bind(service_id)
    .bind(auth.current_store_id)
    .fetch_optional(pool.inner())
    .await
    .ok()
    .flatten();

    if exists.is_none() {
        return ApiResponse::error("Service not found");
    }

    // Build update query dynamically
    let mut updates = Vec::new();
    if request.name.is_some() { updates.push("name = ?"); }
    if request.price.is_some() { updates.push("price = ?"); }
    if request.description.is_some() { updates.push("description = ?"); }
    if request.for_smartphones_only.is_some() { updates.push("for_smartphones_only = ?"); }

    if updates.is_empty() {
        match sqlx::query_as::<_, T2Service>(
            "SELECT id, store_id, name, price, description, for_smartphones_only, created_at FROM t2_services WHERE id = ?"
        )
        .bind(service_id)
        .fetch_one(pool.inner())
        .await
        {
            Ok(service) => return ApiResponse::success(service),
            Err(e) => return ApiResponse::error(&format!("Failed to fetch service: {}", e)),
        }
    }

    let query = format!("UPDATE t2_services SET {} WHERE id = ? RETURNING id, store_id, name, price, description, for_smartphones_only, created_at", updates.join(", "));
    let mut q = sqlx::query_as::<_, T2Service>(&query);

    if let Some(ref name) = request.name { q = q.bind(name); }
    if let Some(price) = request.price { q = q.bind(price); }
    if let Some(ref description) = request.description { q = q.bind(description); }
    if let Some(for_smartphones_only) = request.for_smartphones_only { q = q.bind(for_smartphones_only); }
    q = q.bind(service_id);

    match q.fetch_one(pool.inner()).await {
        Ok(service) => ApiResponse::success(service),
        Err(e) => ApiResponse::error(&format!("Failed to update service: {}", e)),
    }
}

#[delete("/t2/services/<service_id>")]
pub async fn t2_delete_service(
    pool: &State<SqlitePool>,
    auth: T2AuthGuard,
    service_id: i32,
) -> Json<ApiResponse<()>> {
    match sqlx::query("DELETE FROM t2_services WHERE id = ? AND store_id = ?")
        .bind(service_id)
        .bind(auth.current_store_id)
        .execute(pool.inner())
        .await
    {
        Ok(_) => ApiResponse::success(()),
        Err(e) => ApiResponse::error(&format!("Failed to delete service: {}", e)),
    }
}

// ============ AI ROUTES ============

#[post("/t2/ai/analyze-price-tag", data = "<request>")]
pub async fn t2_analyze_price_tag(
    _auth: T2AuthGuard,
    request: Json<AnalyzePriceTagRequest>,
) -> Json<ApiResponse<AnalyzedPriceTag>> {
    match ai::analyze_price_tag(&request.image_base64).await {
        Ok(result) => ApiResponse::success(result),
        Err(e) => ApiResponse::error(&format!("Failed to analyze price tag: {}", e)),
    }
}

#[post("/t2/ai/recommend-products", data = "<request>")]
pub async fn t2_recommend_products(
    pool: &State<SqlitePool>,
    auth: T2AuthGuard,
    request: Json<CustomerRequest>,
) -> Json<ApiResponse<SaleRecommendations>> {
    let request_text = request.text.as_deref().unwrap_or("");

    if request_text.is_empty() && request.audio_url.is_none() {
        return ApiResponse::error("Please provide customer request");
    }

    // Get all phones from store
    let product_ids: Vec<i32> = sqlx::query_scalar(
        "SELECT id FROM t2_products WHERE store_id = ? AND category_id = 1",
    )
    .bind(auth.current_store_id)
    .fetch_all(pool.inner())
    .await
    .unwrap_or_default();

    let mut products = Vec::new();
    for id in product_ids {
        if let Some(product) = get_product_with_details(pool.inner(), id).await {
            products.push(product);
        }
    }

    let tariffs: Vec<T2Tariff> = sqlx::query_as(
        "SELECT id, store_id, name, price, minutes, sms, gb, unlimited_t2, unlimited_internet, unlimited_sms, unlimited_calls, unlimited_apps, description, created_at, updated_at FROM t2_tariffs WHERE store_id = ?",
    )
    .bind(auth.current_store_id)
    .fetch_all(pool.inner())
    .await
    .unwrap_or_default();

    match ai::analyze_customer_request(request_text, &products, &tariffs).await {
        Ok((requirements, recommendations)) => ApiResponse::success(SaleRecommendations {
            recommendations,
            parsed_requirements: requirements,
        }),
        Err(e) => ApiResponse::error(&format!("Failed to get recommendations: {}", e)),
    }
}

#[post("/t2/ai/recommend-accessories/<product_id>")]
pub async fn t2_recommend_accessories(
    pool: &State<SqlitePool>,
    auth: T2AuthGuard,
    product_id: i32,
) -> Json<ApiResponse<Vec<AccessoryRecommendation>>> {
    let phone = match get_product_with_details(pool.inner(), product_id).await {
        Some(p) => p,
        None => return ApiResponse::error("Product not found"),
    };

    // Get accessories
    let accessory_ids: Vec<i32> = sqlx::query_scalar(
        "SELECT id FROM t2_products WHERE store_id = ? AND category_id = 2",
    )
    .bind(auth.current_store_id)
    .fetch_all(pool.inner())
    .await
    .unwrap_or_default();

    let mut accessories = Vec::new();
    for id in accessory_ids {
        if let Some(product) = get_product_with_details(pool.inner(), id).await {
            accessories.push(product);
        }
    }

    match ai::recommend_accessories(&phone, &accessories).await {
        Ok(recommendations) => ApiResponse::success(recommendations),
        Err(e) => ApiResponse::error(&format!("Failed to get recommendations: {}", e)),
    }
}

#[post("/t2/ai/recommend-tariffs", data = "<request>")]
pub async fn t2_recommend_tariffs(
    pool: &State<SqlitePool>,
    auth: T2AuthGuard,
    request: Json<serde_json::Value>,
) -> Json<ApiResponse<Vec<serde_json::Value>>> {
    let customer_needs = request.get("customer_needs")
        .and_then(|v| v.as_str())
        .unwrap_or("");

    let product_id = request.get("product_id")
        .and_then(|v| v.as_i64())
        .map(|v| v as i32);

    let phone = if let Some(id) = product_id {
        get_product_with_details(pool.inner(), id).await
    } else {
        None
    };

    let tariffs: Vec<T2Tariff> = sqlx::query_as(
        "SELECT id, store_id, name, price, minutes, sms, gb, unlimited_t2, unlimited_internet, unlimited_sms, unlimited_calls, unlimited_apps, description, created_at, updated_at FROM t2_tariffs WHERE store_id = ?",
    )
    .bind(auth.current_store_id)
    .fetch_all(pool.inner())
    .await
    .unwrap_or_default();

    match ai::recommend_tariffs(customer_needs, phone.as_ref(), &tariffs).await {
        Ok(recommendations) => {
            let result: Vec<serde_json::Value> = recommendations
                .into_iter()
                .map(|(tariff, reason)| serde_json::json!({
                    "tariff": tariff,
                    "recommendation": reason,
                }))
                .collect();
            ApiResponse::success(result)
        }
        Err(e) => ApiResponse::error(&format!("Failed to get recommendations: {}", e)),
    }
}

#[get("/t2/ai/is-smartphone/<product_id>")]
pub async fn t2_is_smartphone(
    pool: &State<SqlitePool>,
    _auth: T2AuthGuard,
    product_id: i32,
) -> Json<ApiResponse<bool>> {
    match get_product_with_details(pool.inner(), product_id).await {
        Some(product) => ApiResponse::success(ai::is_smartphone(&product)),
        None => ApiResponse::error("Product not found"),
    }
}

// ============ SALES ============

#[get("/t2/sales?<limit>&<offset>")]
pub async fn t2_get_sales(
    pool: &State<SqlitePool>,
    auth: T2AuthGuard,
    limit: Option<i32>,
    offset: Option<i32>,
) -> Json<ApiResponse<Vec<T2SaleWithDetails>>> {
    let limit = limit.unwrap_or(50);
    let offset = offset.unwrap_or(0);

    let sales: Vec<T2Sale> = match sqlx::query_as(
        r#"
        SELECT id, store_id, employee_id, customer_request, customer_audio_url, total_amount, status, created_at
        FROM t2_sales
        WHERE store_id = ?
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?
        "#,
    )
    .bind(auth.current_store_id)
    .bind(limit)
    .bind(offset)
    .fetch_all(pool.inner())
    .await
    {
        Ok(s) => s,
        Err(e) => return ApiResponse::error(&format!("Failed to fetch sales: {}", e)),
    };

    let mut result = Vec::new();
    for sale in sales {
        let store_name = sqlx::query_scalar::<_, String>("SELECT name FROM t2_stores WHERE id = ?")
            .bind(sale.store_id)
            .fetch_optional(pool.inner())
            .await
            .ok()
            .flatten()
            .unwrap_or_default();

        let employee_name = sqlx::query_scalar::<_, String>("SELECT name FROM t2_employees WHERE id = ?")
            .bind(sale.employee_id)
            .fetch_optional(pool.inner())
            .await
            .ok()
            .flatten()
            .unwrap_or_default();

        let items: Vec<T2SaleItem> = sqlx::query_as(
            "SELECT id, sale_id, item_type, item_id, item_name, item_details, price, quantity, created_at FROM t2_sale_items WHERE sale_id = ?",
        )
        .bind(sale.id)
        .fetch_all(pool.inner())
        .await
        .unwrap_or_default();

        result.push(T2SaleWithDetails {
            id: sale.id,
            store_id: sale.store_id,
            store_name,
            employee_id: sale.employee_id,
            employee_name,
            customer_request: sale.customer_request,
            customer_audio_url: sale.customer_audio_url,
            total_amount: sale.total_amount,
            status: sale.status,
            items,
            created_at: sale.created_at,
        });
    }

    ApiResponse::success(result)
}

#[get("/t2/sales/my")]
pub async fn t2_get_my_sales(
    pool: &State<SqlitePool>,
    auth: T2AuthGuard,
) -> Json<ApiResponse<Vec<T2SaleWithDetails>>> {
    let sales: Vec<T2Sale> = match sqlx::query_as(
        r#"
        SELECT id, store_id, employee_id, customer_request, customer_audio_url, total_amount, status, created_at
        FROM t2_sales
        WHERE employee_id = ?
        ORDER BY created_at DESC
        LIMIT 100
        "#,
    )
    .bind(auth.employee.id)
    .fetch_all(pool.inner())
    .await
    {
        Ok(s) => s,
        Err(e) => return ApiResponse::error(&format!("Failed to fetch sales: {}", e)),
    };

    let mut result = Vec::new();
    for sale in sales {
        let store_name = sqlx::query_scalar::<_, String>("SELECT name FROM t2_stores WHERE id = ?")
            .bind(sale.store_id)
            .fetch_optional(pool.inner())
            .await
            .ok()
            .flatten()
            .unwrap_or_default();

        let items: Vec<T2SaleItem> = sqlx::query_as(
            "SELECT id, sale_id, item_type, item_id, item_name, item_details, price, quantity, created_at FROM t2_sale_items WHERE sale_id = ?",
        )
        .bind(sale.id)
        .fetch_all(pool.inner())
        .await
        .unwrap_or_default();

        result.push(T2SaleWithDetails {
            id: sale.id,
            store_id: sale.store_id,
            store_name,
            employee_id: sale.employee_id,
            employee_name: auth.employee.name.clone(),
            customer_request: sale.customer_request,
            customer_audio_url: sale.customer_audio_url,
            total_amount: sale.total_amount,
            status: sale.status,
            items,
            created_at: sale.created_at,
        });
    }

    ApiResponse::success(result)
}

#[post("/t2/sales", data = "<request>")]
pub async fn t2_create_sale(
    pool: &State<SqlitePool>,
    auth: T2AuthGuard,
    request: Json<CreateSaleRequest>,
) -> Json<ApiResponse<T2SaleWithDetails>> {
    // Calculate total
    let mut total: f64 = 0.0;
    let mut item_details = Vec::new();

    for item in &request.items {
        let (name, details, price) = match item.item_type.as_str() {
            "product" => {
                if let Some(product) = get_product_with_details(pool.inner(), item.item_id).await {
                    let specs: String = product.specs.iter()
                        .map(|s| format!("{}: {}", s.spec_name, s.spec_value))
                        .collect::<Vec<_>>()
                        .join(", ");
                    (product.name, specs, product.price)
                } else {
                    continue;
                }
            }
            "tariff" => {
                let tariff: Option<T2Tariff> = sqlx::query_as(
                    "SELECT id, store_id, name, price, minutes, sms, gb, unlimited_t2, unlimited_internet, unlimited_sms, unlimited_calls, unlimited_apps, description, created_at, updated_at FROM t2_tariffs WHERE id = ?",
                )
                .bind(item.item_id)
                .fetch_optional(pool.inner())
                .await
                .ok()
                .flatten();

                if let Some(t) = tariff {
                    let details = format!("{}мин, {}SMS, {}ГБ",
                        t.minutes.unwrap_or(0),
                        t.sms.unwrap_or(0),
                        t.gb.unwrap_or(0));
                    (t.name, details, t.price)
                } else {
                    continue;
                }
            }
            "service" => {
                let service: Option<T2Service> = sqlx::query_as(
                    "SELECT id, store_id, name, price, description, for_smartphones_only, created_at FROM t2_services WHERE id = ?",
                )
                .bind(item.item_id)
                .fetch_optional(pool.inner())
                .await
                .ok()
                .flatten();

                if let Some(s) = service {
                    (s.name, s.description.unwrap_or_default(), s.price)
                } else {
                    continue;
                }
            }
            _ => continue,
        };

        let qty = item.quantity.unwrap_or(1);
        total += price * qty as f64;
        item_details.push((item.item_type.clone(), item.item_id, name, details, price, qty));
    }

    // Create sale
    let sale_id = match sqlx::query_scalar::<_, i32>(
        r#"
        INSERT INTO t2_sales (store_id, employee_id, customer_request, customer_audio_url, total_amount, status)
        VALUES (?, ?, ?, ?, ?, 'completed')
        RETURNING id
        "#,
    )
    .bind(auth.current_store_id)
    .bind(auth.employee.id)
    .bind(&request.customer_request)
    .bind(&request.customer_audio_url)
    .bind(total)
    .fetch_one(pool.inner())
    .await
    {
        Ok(id) => id,
        Err(e) => return ApiResponse::error(&format!("Failed to create sale: {}", e)),
    };

    // Create sale items
    let mut items = Vec::new();
    for (item_type, item_id, name, details, price, qty) in item_details {
        if let Ok(item) = sqlx::query_as::<_, T2SaleItem>(
            r#"
            INSERT INTO t2_sale_items (sale_id, item_type, item_id, item_name, item_details, price, quantity)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            RETURNING id, sale_id, item_type, item_id, item_name, item_details, price, quantity, created_at
            "#,
        )
        .bind(sale_id)
        .bind(&item_type)
        .bind(item_id)
        .bind(&name)
        .bind(&details)
        .bind(price)
        .bind(qty)
        .fetch_one(pool.inner())
        .await
        {
            items.push(item);
        }
    }

    let store_name = sqlx::query_scalar::<_, String>("SELECT name FROM t2_stores WHERE id = ?")
        .bind(auth.current_store_id)
        .fetch_optional(pool.inner())
        .await
        .ok()
        .flatten()
        .unwrap_or_default();

    ApiResponse::success(T2SaleWithDetails {
        id: sale_id,
        store_id: auth.current_store_id,
        store_name,
        employee_id: auth.employee.id,
        employee_name: auth.employee.name.clone(),
        customer_request: request.customer_request.clone(),
        customer_audio_url: request.customer_audio_url.clone(),
        total_amount: total,
        status: "completed".to_string(),
        items,
        created_at: chrono::Utc::now().format("%Y-%m-%d %H:%M:%S").to_string(),
    })
}

// ============ SEARCH ============

#[get("/t2/search?<query>")]
pub async fn t2_search(
    pool: &State<SqlitePool>,
    auth: T2AuthGuard,
    query: String,
) -> Json<ApiResponse<Vec<T2ProductWithDetails>>> {
    let search_pattern = format!("%{}%", query);

    // Search in products by name, brand, model
    let product_ids: Vec<i32> = sqlx::query_scalar(
        r#"
        SELECT DISTINCT p.id FROM t2_products p
        LEFT JOIN t2_product_specs ps ON p.id = ps.product_id
        WHERE p.store_id = ?
        AND (p.name LIKE ? OR p.brand LIKE ? OR p.model LIKE ? OR ps.spec_value LIKE ?)
        ORDER BY p.updated_at DESC
        LIMIT 50
        "#,
    )
    .bind(auth.current_store_id)
    .bind(&search_pattern)
    .bind(&search_pattern)
    .bind(&search_pattern)
    .bind(&search_pattern)
    .fetch_all(pool.inner())
    .await
    .unwrap_or_default();

    let mut products = Vec::new();
    for id in product_ids {
        if let Some(product) = get_product_with_details(pool.inner(), id).await {
            products.push(product);
        }
    }

    ApiResponse::success(products)
}

// ============ STATS ============

#[get("/t2/stats")]
pub async fn t2_get_stats(
    pool: &State<SqlitePool>,
    auth: T2AuthGuard,
) -> Json<ApiResponse<serde_json::Value>> {
    let store_id = auth.current_store_id;

    let products_count: i32 = sqlx::query_scalar("SELECT COUNT(*) FROM t2_products WHERE store_id = ?")
        .bind(store_id)
        .fetch_one(pool.inner())
        .await
        .unwrap_or(0);

    let sales_today: i32 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM t2_sales WHERE store_id = ? AND date(created_at) = date('now')",
    )
    .bind(store_id)
    .fetch_one(pool.inner())
    .await
    .unwrap_or(0);

    let revenue_today: f64 = sqlx::query_scalar(
        "SELECT COALESCE(SUM(total_amount), 0) FROM t2_sales WHERE store_id = ? AND date(created_at) = date('now')",
    )
    .bind(store_id)
    .fetch_one(pool.inner())
    .await
    .unwrap_or(0.0);

    let total_sales: i32 = sqlx::query_scalar("SELECT COUNT(*) FROM t2_sales WHERE store_id = ?")
        .bind(store_id)
        .fetch_one(pool.inner())
        .await
        .unwrap_or(0);

    let total_revenue: f64 = sqlx::query_scalar(
        "SELECT COALESCE(SUM(total_amount), 0) FROM t2_sales WHERE store_id = ?",
    )
    .bind(store_id)
    .fetch_one(pool.inner())
    .await
    .unwrap_or(0.0);

    ApiResponse::success(serde_json::json!({
        "products_count": products_count,
        "sales_today": sales_today,
        "revenue_today": revenue_today,
        "total_sales": total_sales,
        "total_revenue": total_revenue,
    }))
}
