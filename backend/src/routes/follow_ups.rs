use axum::{
    extract::{Path, State},
    http::StatusCode,
    Json,
};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use uuid::Uuid;

use crate::state::AppState;

#[derive(Serialize, sqlx::FromRow)]
pub struct FollowUp {
    pub id: String,
    pub company_id: String,
    pub member_id: String,
    pub contact_id: Option<String>,
    pub follow_up_date: String,
    pub method: Option<String>,
    pub notes: Option<String>,
    pub created_at: Option<String>,
}

#[derive(Deserialize)]
pub struct CreateFollowUpPayload {
    pub member_id: String,
    pub contact_id: Option<String>,
    pub follow_up_date: String,
    pub method: Option<String>,
    pub notes: Option<String>,
}

#[derive(Deserialize)]
pub struct UpdateFollowUpPayload {
    pub follow_up_date: String,
}

pub async fn list_follow_ups(
    State(state): State<Arc<AppState>>,
    Path(company_id): Path<String>,
) -> Result<Json<Vec<FollowUp>>, (StatusCode, String)> {
    let follow_ups = sqlx::query_as::<_, FollowUp>(
        "SELECT * FROM follow_ups WHERE company_id = ? ORDER BY follow_up_date ASC"
    )
    .bind(&company_id)
    .fetch_all(&state.db)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(follow_ups))
}

pub async fn create_follow_up(
    State(state): State<Arc<AppState>>,
    Path(company_id): Path<String>,
    Json(payload): Json<CreateFollowUpPayload>,
) -> Result<(StatusCode, Json<FollowUp>), (StatusCode, String)> {
    let id = Uuid::new_v4().to_string();
    
    sqlx::query(
        "INSERT INTO follow_ups (id, company_id, member_id, contact_id, follow_up_date, method, notes) VALUES (?, ?, ?, ?, ?, ?, ?)"
    )
    .bind(&id).bind(&company_id).bind(&payload.member_id).bind(&payload.contact_id)
    .bind(&payload.follow_up_date).bind(&payload.method).bind(&payload.notes)
    .execute(&state.db).await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let new_follow_up = sqlx::query_as::<_, FollowUp>("SELECT * FROM follow_ups WHERE id = ?")
        .bind(&id).fetch_one(&state.db).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok((StatusCode::CREATED, Json(new_follow_up)))
}

#[derive(serde::Serialize)]
pub struct DeleteResponse {
    pub success: bool,
}

#[derive(serde::Deserialize)]
pub struct FollowUpParams {
    pub id: String,          // Correspond à :id dans l'URL (company_id)
    pub follow_up_id: String, // Correspond à :follow_up_id dans l'URL
}

#[derive(serde::Serialize)]
pub struct SuccessResponse {
    pub success: bool,
}

pub async fn delete_follow_up(
    State(state): State<Arc<AppState>>,
    Path(params): Path<FollowUpParams>, // <- Extraction sécurisée
) -> Result<Json<SuccessResponse>, (StatusCode, String)> {
    sqlx::query("DELETE FROM follow_ups WHERE id = ?")
        .bind(&params.follow_up_id)
        .execute(&state.db).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    
    // On renvoie un vrai JSON pour satisfaire le frontend
    Ok(Json(SuccessResponse { success: true }))
}

pub async fn update_follow_up(
    State(state): State<Arc<AppState>>,
    Path(params): Path<FollowUpParams>, // <- Extraction sécurisée
    Json(payload): Json<UpdateFollowUpPayload>,
) -> Result<Json<FollowUp>, (StatusCode, String)> {
    sqlx::query("UPDATE follow_ups SET follow_up_date = ? WHERE id = ?")
        .bind(&payload.follow_up_date).bind(&params.follow_up_id).execute(&state.db).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let updated = sqlx::query_as::<_, FollowUp>("SELECT * FROM follow_ups WHERE id = ?")
        .bind(&params.follow_up_id).fetch_one(&state.db).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(updated))
}