use axum::{extract::State, http::StatusCode, Json};
use serde::Serialize;
use std::sync::Arc;

use crate::state::AppState;

#[derive(Serialize, sqlx::FromRow)]
pub struct ActivityLog {
    pub id: String,
    pub member_name: String,
    pub company_name: String,
    pub old_status: String,
    pub new_status: String,
    pub created_at: Option<String>,
}

/// GET /api/logs
pub async fn list_logs(
    State(state): State<Arc<AppState>>,
) -> Result<Json<Vec<ActivityLog>>, (StatusCode, String)> {
    let logs = sqlx::query_as::<_, ActivityLog>(
        "SELECT id, member_name, company_name, old_status, new_status, created_at FROM activity_logs ORDER BY created_at DESC LIMIT 50"
    )
    .fetch_all(&state.db)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(logs))
}