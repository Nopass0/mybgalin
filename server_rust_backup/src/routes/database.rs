use crate::guards::AuthGuard;
use rocket::http::Status;
use rocket::serde::json::Json;
use rocket::{get, post, State};
use serde::{Deserialize, Serialize};
use sqlx::SqlitePool;
use sqlx::{Row, Column};

// === Models ===

#[derive(Debug, Serialize)]
pub struct TableInfo {
    pub name: String,
    pub row_count: i64,
}

#[derive(Debug, Serialize)]
pub struct ColumnInfo {
    pub cid: i64,
    pub name: String,
    pub column_type: String,
    pub notnull: bool,
    pub default_value: Option<String>,
    pub pk: bool,
}

#[derive(Debug, Serialize)]
pub struct TableSchema {
    pub name: String,
    pub columns: Vec<ColumnInfo>,
    pub row_count: i64,
}

#[derive(Debug, Deserialize)]
pub struct QueryRequest {
    pub query: String,
    pub params: Option<Vec<String>>,
}

#[derive(Debug, Serialize)]
pub struct QueryResult {
    pub columns: Vec<String>,
    pub rows: Vec<Vec<serde_json::Value>>,
    pub row_count: usize,
    pub execution_time_ms: u128,
}

#[derive(Debug, Deserialize)]
pub struct TableDataRequest {
    pub table: String,
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub sort_column: Option<String>,
    pub sort_direction: Option<String>,
    pub filters: Option<Vec<ColumnFilter>>,
}

#[derive(Debug, Deserialize)]
pub struct ColumnFilter {
    pub column: String,
    pub operator: String, // eq, neq, gt, lt, gte, lte, like, is_null, is_not_null
    pub value: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct TableDataResult {
    pub columns: Vec<ColumnInfo>,
    pub rows: Vec<Vec<serde_json::Value>>,
    pub total_rows: i64,
    pub page: i64,
    pub page_size: i64,
    pub total_pages: i64,
}

#[derive(Debug, Serialize)]
pub struct DatabaseStats {
    pub total_tables: i64,
    pub total_rows: i64,
    pub database_size_bytes: i64,
    pub tables: Vec<TableInfo>,
}

// === Endpoints ===

/// Get list of all tables with row counts
#[get("/database/tables")]
pub async fn get_tables(
    _auth: AuthGuard,
    pool: &State<SqlitePool>,
) -> Result<Json<Vec<TableInfo>>, Status> {
    let tables: Vec<(String,)> = sqlx::query_as(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
    )
    .fetch_all(pool.inner())
    .await
    .map_err(|_| Status::InternalServerError)?;

    let mut result = Vec::new();
    for (table_name,) in tables {
        let count: (i64,) = sqlx::query_as(&format!("SELECT COUNT(*) FROM \"{}\"", table_name))
            .fetch_one(pool.inner())
            .await
            .unwrap_or((0,));

        result.push(TableInfo {
            name: table_name,
            row_count: count.0,
        });
    }

    Ok(Json(result))
}

/// Get schema for a specific table
#[get("/database/tables/<table_name>/schema")]
pub async fn get_table_schema(
    _auth: AuthGuard,
    pool: &State<SqlitePool>,
    table_name: &str,
) -> Result<Json<TableSchema>, Status> {
    // Validate table name (prevent SQL injection)
    if !is_valid_identifier(table_name) {
        return Err(Status::BadRequest);
    }

    // Check if table exists
    let exists: (i64,) = sqlx::query_as(
        "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name = ?"
    )
    .bind(table_name)
    .fetch_one(pool.inner())
    .await
    .map_err(|_| Status::InternalServerError)?;

    if exists.0 == 0 {
        return Err(Status::NotFound);
    }

    // Get column info using PRAGMA
    let columns_raw: Vec<(i64, String, String, i64, Option<String>, i64)> = sqlx::query_as(
        &format!("PRAGMA table_info(\"{}\")", table_name)
    )
    .fetch_all(pool.inner())
    .await
    .map_err(|_| Status::InternalServerError)?;

    let columns: Vec<ColumnInfo> = columns_raw.into_iter().map(|(cid, name, col_type, notnull, dflt_value, pk)| {
        ColumnInfo {
            cid,
            name,
            column_type: col_type,
            notnull: notnull == 1,
            default_value: dflt_value,
            pk: pk == 1,
        }
    }).collect();

    // Get row count
    let count: (i64,) = sqlx::query_as(&format!("SELECT COUNT(*) FROM \"{}\"", table_name))
        .fetch_one(pool.inner())
        .await
        .unwrap_or((0,));

    Ok(Json(TableSchema {
        name: table_name.to_string(),
        columns,
        row_count: count.0,
    }))
}

/// Get data from a table with pagination, sorting, and filtering
#[post("/database/tables/data", data = "<request>")]
pub async fn get_table_data(
    _auth: AuthGuard,
    pool: &State<SqlitePool>,
    request: Json<TableDataRequest>,
) -> Result<Json<TableDataResult>, Status> {
    let table_name = &request.table;

    // Validate table name
    if !is_valid_identifier(table_name) {
        return Err(Status::BadRequest);
    }

    // Check if table exists
    let exists: (i64,) = sqlx::query_as(
        "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name = ?"
    )
    .bind(table_name)
    .fetch_one(pool.inner())
    .await
    .map_err(|_| Status::InternalServerError)?;

    if exists.0 == 0 {
        return Err(Status::NotFound);
    }

    // Get column info
    let columns_raw: Vec<(i64, String, String, i64, Option<String>, i64)> = sqlx::query_as(
        &format!("PRAGMA table_info(\"{}\")", table_name)
    )
    .fetch_all(pool.inner())
    .await
    .map_err(|_| Status::InternalServerError)?;

    let columns: Vec<ColumnInfo> = columns_raw.into_iter().map(|(cid, name, col_type, notnull, dflt_value, pk)| {
        ColumnInfo {
            cid,
            name,
            column_type: col_type,
            notnull: notnull == 1,
            default_value: dflt_value,
            pk: pk == 1,
        }
    }).collect();

    let column_names: Vec<&str> = columns.iter().map(|c| c.name.as_str()).collect();

    // Build WHERE clause from filters
    let mut where_clauses = Vec::new();
    let mut bind_values: Vec<String> = Vec::new();

    if let Some(filters) = &request.filters {
        for filter in filters {
            if !is_valid_identifier(&filter.column) {
                continue;
            }

            let clause = match filter.operator.as_str() {
                "eq" => {
                    if let Some(v) = &filter.value {
                        bind_values.push(v.clone());
                        format!("\"{}\" = ?", filter.column)
                    } else { continue; }
                }
                "neq" => {
                    if let Some(v) = &filter.value {
                        bind_values.push(v.clone());
                        format!("\"{}\" != ?", filter.column)
                    } else { continue; }
                }
                "gt" => {
                    if let Some(v) = &filter.value {
                        bind_values.push(v.clone());
                        format!("\"{}\" > ?", filter.column)
                    } else { continue; }
                }
                "lt" => {
                    if let Some(v) = &filter.value {
                        bind_values.push(v.clone());
                        format!("\"{}\" < ?", filter.column)
                    } else { continue; }
                }
                "gte" => {
                    if let Some(v) = &filter.value {
                        bind_values.push(v.clone());
                        format!("\"{}\" >= ?", filter.column)
                    } else { continue; }
                }
                "lte" => {
                    if let Some(v) = &filter.value {
                        bind_values.push(v.clone());
                        format!("\"{}\" <= ?", filter.column)
                    } else { continue; }
                }
                "like" => {
                    if let Some(v) = &filter.value {
                        bind_values.push(format!("%{}%", v));
                        format!("\"{}\" LIKE ?", filter.column)
                    } else { continue; }
                }
                "is_null" => format!("\"{}\" IS NULL", filter.column),
                "is_not_null" => format!("\"{}\" IS NOT NULL", filter.column),
                _ => continue,
            };
            where_clauses.push(clause);
        }
    }

    let where_sql = if where_clauses.is_empty() {
        String::new()
    } else {
        format!(" WHERE {}", where_clauses.join(" AND "))
    };

    // Get total count with filters
    let count_sql = format!("SELECT COUNT(*) FROM \"{}\"{}", table_name, where_sql);
    let mut count_query = sqlx::query_scalar::<_, i64>(&count_sql);
    for v in &bind_values {
        count_query = count_query.bind(v);
    }
    let total_rows: i64 = count_query
        .fetch_one(pool.inner())
        .await
        .unwrap_or(0);

    // Pagination
    let page = request.page.unwrap_or(1).max(1);
    let page_size = request.page_size.unwrap_or(50).min(1000).max(1);
    let offset = (page - 1) * page_size;
    let total_pages = (total_rows as f64 / page_size as f64).ceil() as i64;

    // Sorting
    let order_sql = if let Some(sort_col) = &request.sort_column {
        if is_valid_identifier(sort_col) && column_names.contains(&sort_col.as_str()) {
            let direction = request.sort_direction.as_deref().unwrap_or("ASC");
            let dir = if direction.to_uppercase() == "DESC" { "DESC" } else { "ASC" };
            format!(" ORDER BY \"{}\" {}", sort_col, dir)
        } else {
            String::new()
        }
    } else {
        String::new()
    };

    // Build and execute query
    let data_sql = format!(
        "SELECT * FROM \"{}\"{}{} LIMIT {} OFFSET {}",
        table_name, where_sql, order_sql, page_size, offset
    );

    let mut query = sqlx::query(&data_sql);
    for v in &bind_values {
        query = query.bind(v);
    }

    let rows_raw = query
        .fetch_all(pool.inner())
        .await
        .map_err(|_| Status::InternalServerError)?;

    // Convert rows to JSON values
    let rows: Vec<Vec<serde_json::Value>> = rows_raw.iter().map(|row| {
        columns.iter().map(|col| {
            sqlite_value_to_json(row, &col.name, &col.column_type)
        }).collect()
    }).collect();

    Ok(Json(TableDataResult {
        columns,
        rows,
        total_rows,
        page,
        page_size,
        total_pages,
    }))
}

/// Execute a raw SQL query (SELECT only for safety)
#[post("/database/query", data = "<request>")]
pub async fn execute_query(
    _auth: AuthGuard,
    pool: &State<SqlitePool>,
    request: Json<QueryRequest>,
) -> Result<Json<QueryResult>, Status> {
    let query = request.query.trim();

    // Only allow SELECT queries for safety
    let query_upper = query.to_uppercase();
    if !query_upper.starts_with("SELECT")
        && !query_upper.starts_with("PRAGMA")
        && !query_upper.starts_with("EXPLAIN") {
        return Err(Status::Forbidden);
    }

    // Block dangerous operations even in SELECT
    let forbidden = ["DROP", "DELETE", "INSERT", "UPDATE", "ALTER", "CREATE", "ATTACH", "DETACH"];
    for word in forbidden {
        if query_upper.contains(word) {
            return Err(Status::Forbidden);
        }
    }

    let start = std::time::Instant::now();

    // Execute query
    let rows_raw = sqlx::query(query)
        .fetch_all(pool.inner())
        .await
        .map_err(|e| {
            eprintln!("Query error: {:?}", e);
            Status::BadRequest
        })?;

    let execution_time_ms = start.elapsed().as_millis();

    if rows_raw.is_empty() {
        return Ok(Json(QueryResult {
            columns: vec![],
            rows: vec![],
            row_count: 0,
            execution_time_ms,
        }));
    }

    // Get column names from first row
    let first_row = &rows_raw[0];
    let columns: Vec<String> = (0..first_row.len())
        .filter_map(|i| first_row.column(i).name().to_string().into())
        .collect();

    // Convert rows to JSON
    let rows: Vec<Vec<serde_json::Value>> = rows_raw.iter().map(|row| {
        columns.iter().map(|col_name| {
            // Try different types
            if let Ok(v) = row.try_get::<i64, _>(col_name.as_str()) {
                serde_json::Value::Number(v.into())
            } else if let Ok(v) = row.try_get::<f64, _>(col_name.as_str()) {
                serde_json::json!(v)
            } else if let Ok(v) = row.try_get::<String, _>(col_name.as_str()) {
                serde_json::Value::String(v)
            } else if let Ok(v) = row.try_get::<bool, _>(col_name.as_str()) {
                serde_json::Value::Bool(v)
            } else if let Ok(v) = row.try_get::<Option<String>, _>(col_name.as_str()) {
                v.map(serde_json::Value::String).unwrap_or(serde_json::Value::Null)
            } else {
                serde_json::Value::Null
            }
        }).collect()
    }).collect();

    Ok(Json(QueryResult {
        columns,
        rows: rows.clone(),
        row_count: rows.len(),
        execution_time_ms,
    }))
}

/// Get database statistics
#[get("/database/stats")]
pub async fn get_database_stats(
    _auth: AuthGuard,
    pool: &State<SqlitePool>,
) -> Result<Json<DatabaseStats>, Status> {
    // Get all tables
    let tables: Vec<(String,)> = sqlx::query_as(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
    )
    .fetch_all(pool.inner())
    .await
    .map_err(|_| Status::InternalServerError)?;

    let mut table_infos = Vec::new();
    let mut total_rows: i64 = 0;

    for (table_name,) in tables {
        let count: (i64,) = sqlx::query_as(&format!("SELECT COUNT(*) FROM \"{}\"", table_name))
            .fetch_one(pool.inner())
            .await
            .unwrap_or((0,));

        total_rows += count.0;
        table_infos.push(TableInfo {
            name: table_name,
            row_count: count.0,
        });
    }

    // Get database size
    let page_count: (i64,) = sqlx::query_as("PRAGMA page_count")
        .fetch_one(pool.inner())
        .await
        .unwrap_or((0,));

    let page_size: (i64,) = sqlx::query_as("PRAGMA page_size")
        .fetch_one(pool.inner())
        .await
        .unwrap_or((4096,));

    let database_size_bytes = page_count.0 * page_size.0;

    Ok(Json(DatabaseStats {
        total_tables: table_infos.len() as i64,
        total_rows,
        database_size_bytes,
        tables: table_infos,
    }))
}

// === Helper functions ===

fn is_valid_identifier(name: &str) -> bool {
    !name.is_empty()
        && name.chars().all(|c| c.is_alphanumeric() || c == '_')
        && !name.chars().next().unwrap_or('0').is_numeric()
}

fn sqlite_value_to_json(row: &sqlx::sqlite::SqliteRow, col_name: &str, col_type: &str) -> serde_json::Value {
    let col_type_upper = col_type.to_uppercase();

    if col_type_upper.contains("INT") {
        if let Ok(v) = row.try_get::<i64, _>(col_name) {
            return serde_json::Value::Number(v.into());
        }
    }

    if col_type_upper.contains("REAL") || col_type_upper.contains("FLOAT") || col_type_upper.contains("DOUBLE") {
        if let Ok(v) = row.try_get::<f64, _>(col_name) {
            return serde_json::json!(v);
        }
    }

    if col_type_upper.contains("BOOL") {
        if let Ok(v) = row.try_get::<bool, _>(col_name) {
            return serde_json::Value::Bool(v);
        }
    }

    // Try string
    if let Ok(v) = row.try_get::<String, _>(col_name) {
        return serde_json::Value::String(v);
    }

    // Try optional types
    if let Ok(v) = row.try_get::<Option<i64>, _>(col_name) {
        return v.map(|n| serde_json::Value::Number(n.into())).unwrap_or(serde_json::Value::Null);
    }

    if let Ok(v) = row.try_get::<Option<String>, _>(col_name) {
        return v.map(serde_json::Value::String).unwrap_or(serde_json::Value::Null);
    }

    serde_json::Value::Null
}
