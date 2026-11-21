use axum::{
    extract::{Path, State},
    http::{StatusCode, HeaderMap}, 
    Json,
};
use serde::Deserialize;
use sqlx::QueryBuilder;
use std::sync::Arc;
use uuid::Uuid;

use crate::{models::Company, state::AppState};

#[derive(Deserialize)]
pub struct CreateCompanyPayload {
    pub edition_id: Option<String>,
    pub name: String,
    pub logo_url: Option<String>,
}

#[derive(Deserialize)]
pub struct UpdateCompanyPayload {
    pub name: Option<String>,
    pub logo_url: Option<String>,
    pub sector: Option<String>,
    pub size: Option<String>,
    pub description: Option<String>,
    pub website: Option<String>,
    pub global_status: Option<String>,
    pub novatech_offer: Option<bool>,
    pub forum_contract_date: Option<String>,
}

#[derive(Deserialize)]
pub struct UpdateRemarkPayload {
    pub internal_remark: String,
    pub expected_internal_remark: String,
}

#[derive(serde::Serialize)]
pub struct ConflictResponse {
    pub current_internal_remark: Option<String>,
}

#[derive(serde::Deserialize)]
struct TokenClaims {
    sub: String,
}


/// GET /api/companies
pub async fn list_companies(
    State(state): State<Arc<AppState>>,
) -> Result<Json<Vec<Company>>, (StatusCode, String)> {
    let companies = sqlx::query_as::<_, Company>(
        "SELECT * FROM companies ORDER BY updated_at DESC"
    )
    .fetch_all(&state.db)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(companies))
}

/// GET /api/companies/:id
pub async fn get_company(
    State(state): State<Arc<AppState>>,
    Path(id): Path<String>,
) -> Result<Json<Company>, (StatusCode, String)> {
    let company = sqlx::query_as::<_, Company>(
        "SELECT * FROM companies WHERE id = ?"
    )
    .bind(&id)
    .fetch_optional(&state.db)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    match company {
        Some(c) => Ok(Json(c)),
        None => Err((StatusCode::NOT_FOUND, "Entreprise introuvable".to_string())),
    }
}

/// POST /api/companies
/// POST /api/companies
pub async fn create_company(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<CreateCompanyPayload>,
) -> Result<(StatusCode, Json<Company>), (StatusCode, String)> {
    let id = Uuid::new_v4().to_string();

    // Résout un edition_id valide (rattache par défaut à l'édition active)
    let valid_edition_id: Option<String> = match payload.edition_id.as_deref().map(str::trim) {
        Some(eid) if !eid.is_empty() => {
            let exists = sqlx::query_scalar::<_, String>("SELECT id FROM editions WHERE id = ?")
                .bind(eid)
                .fetch_optional(&state.db)
                .await
                .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

            if exists.is_some() {
                Some(eid.to_string())
            } else {
                sqlx::query_scalar::<_, String>("SELECT id FROM editions WHERE is_active = 1 LIMIT 1")
                    .fetch_optional(&state.db)
                    .await
                    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
            }
        }
        _ => sqlx::query_scalar::<_, String>("SELECT id FROM editions WHERE is_active = 1 LIMIT 1")
            .fetch_optional(&state.db)
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?,
    };

    sqlx::query(
        r#"
        INSERT INTO companies (id, edition_id, name, logo_url, global_status)
        VALUES (?, ?, ?, ?, 'ToContact')
        "#
    )
    .bind(&id)
    .bind(&valid_edition_id)
    .bind(&payload.name)
    .bind(&payload.logo_url)
    .execute(&state.db)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let new_company = sqlx::query_as::<_, Company>(
        "SELECT * FROM companies WHERE id = ?"
    )
    .bind(&id)
    .fetch_one(&state.db)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok((StatusCode::CREATED, Json(new_company)))
}

/// PUT /api/companies/:id
pub async fn update_company(
    State(state): State<Arc<AppState>>,
    headers: HeaderMap, // <-- NOUVEAU : On récupère les headers de la requête
    Path(id): Path<String>,
    Json(payload): Json<UpdateCompanyPayload>,
) -> Result<Json<Company>, (StatusCode, String)> {
    
    // 1. LIRE L'ÉTAT ACTUEL
    let current_company_result = sqlx::query_as::<_, Company>("SELECT * FROM companies WHERE id = ?")
        .bind(&id)
        .fetch_one(&state.db)
        .await;

    // 2. MISE À JOUR DYNAMIQUE
    let mut query = QueryBuilder::new("UPDATE companies SET updated_at = CURRENT_TIMESTAMP");
    let mut has_updates = false;

    if let Some(v) = &payload.name { query.push(", name = "); query.push_bind(v); has_updates = true; }
    if let Some(v) = &payload.logo_url { query.push(", logo_url = "); query.push_bind(v); has_updates = true; }
    if let Some(v) = &payload.sector { query.push(", sector = "); query.push_bind(v); has_updates = true; }
    if let Some(v) = &payload.size { query.push(", size = "); query.push_bind(v); has_updates = true; }
    if let Some(v) = &payload.description { query.push(", description = "); query.push_bind(v); has_updates = true; }
    if let Some(v) = &payload.website { query.push(", website = "); query.push_bind(v); has_updates = true; }
    if let Some(v) = &payload.global_status { query.push(", global_status = "); query.push_bind(v); has_updates = true; }
    if let Some(v) = &payload.novatech_offer { query.push(", novatech_offer = "); query.push_bind(v); has_updates = true; }
    if let Some(v) = &payload.forum_contract_date { query.push(", forum_contract_date = "); query.push_bind(v); has_updates = true; }

    if has_updates {
        query.push(" WHERE id = ");
        query.push_bind(&id);
        query.build().execute(&state.db).await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    }

    // 3. ENREGISTRER LE LOG D'ACTIVITÉ
    if let (Ok(current_company), Some(new_status)) = (current_company_result, &payload.global_status) {
        if current_company.global_status != *new_status {
            
            let mut member_name = "Un membre".to_string();

            // STRATÉGIE A : On lit le token JWT de la personne connectée (Toi !)
            if let Some(auth_header) = headers.get("Authorization").and_then(|h| h.to_str().ok()) {
                if auth_header.starts_with("Bearer ") {
                    let token = &auth_header[7..];
                    if let Ok(token_data) = jsonwebtoken::decode::<TokenClaims>(
                        token,
                        &jsonwebtoken::DecodingKey::from_secret("SECRET_KEY".as_ref()),
                        &jsonwebtoken::Validation::default(),
                    ) {
                        // On a ton ID ! On cherche ton vrai nom dans la base
                        if let Ok(Some(name)) = sqlx::query_scalar::<_, String>("SELECT name FROM members WHERE id = ?")
                            .bind(&token_data.claims.sub)
                            .fetch_optional(&state.db)
                            .await
                        {
                            member_name = name;
                        }
                    }
                }
            }

            // STRATÉGIE B (Secours) : Si pas de token, on cherche qui est le Shark assigné
            if member_name == "Un membre" {
                if let Ok(Some(name)) = sqlx::query_scalar::<_, String>(
                    "SELECT m.name FROM sharks s JOIN members m ON s.member_id = m.id WHERE s.company_id = ?"
                )
                .bind(&id)
                .fetch_optional(&state.db)
                .await
                {
                    member_name = name;
                }
            }

            // ÉCRITURE DU LOG
            let log_id = Uuid::new_v4().to_string();
            let _ = sqlx::query(
                "INSERT INTO activity_logs (id, member_name, company_name, old_status, new_status) VALUES (?, ?, ?, ?, ?)"
            )
            .bind(&log_id)
            .bind(&member_name)
            .bind(&current_company.name)
            .bind(&current_company.global_status)
            .bind(new_status)
            .execute(&state.db)
            .await;
        }
    }

    // 4. RÉCUPÉRATION ET RENVOI
    let updated_company = sqlx::query_as::<_, Company>("SELECT * FROM companies WHERE id = ?")
        .bind(&id)
        .fetch_one(&state.db)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(updated_company))
}

/// DELETE /api/companies/:id
pub async fn delete_company(
    State(state): State<Arc<AppState>>,
    Path(id): Path<String>,
) -> Result<StatusCode, (StatusCode, String)> {
    let mut tx = state
        .db
        .begin()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    sqlx::query("DELETE FROM follow_ups WHERE company_id = ?")
        .bind(&id)
        .execute(&mut *tx)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    sqlx::query("DELETE FROM sharks WHERE company_id = ?")
        .bind(&id)
        .execute(&mut *tx)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    sqlx::query("DELETE FROM contacts WHERE company_id = ?")
        .bind(&id)
        .execute(&mut *tx)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let result = sqlx::query("DELETE FROM companies WHERE id = ?")
        .bind(&id)
        .execute(&mut *tx)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if result.rows_affected() == 0 {
        return Err((StatusCode::NOT_FOUND, "Entreprise introuvable".to_string()));
    }

    tx.commit()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(StatusCode::NO_CONTENT)
}

/// PUT /api/companies/:id/internal-remark
pub async fn update_internal_remark(
    State(state): State<Arc<AppState>>,
    Path(id): Path<String>,
    Json(payload): Json<UpdateRemarkPayload>,
) -> Result<Json<Company>, (StatusCode, Json<ConflictResponse>)> {
    let _lock = state.remark_write_lock.lock().await;

    let current_remark = sqlx::query_scalar::<_, Option<String>>(
        "SELECT internal_remark FROM companies WHERE id = ?"
    )
    .bind(&id)
    .fetch_one(&state.db)
    .await
    .map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, Json(ConflictResponse { current_internal_remark: None })))?;

    let current_str = current_remark.clone().unwrap_or_default();
    
    if current_str != payload.expected_internal_remark {
        return Err((
            StatusCode::CONFLICT,
            Json(ConflictResponse { current_internal_remark: current_remark }),
        ));
    }

    sqlx::query("UPDATE companies SET internal_remark = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
        .bind(if payload.internal_remark.is_empty() { None } else { Some(&payload.internal_remark) })
        .bind(&id)
        .execute(&state.db)
        .await
        .map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, Json(ConflictResponse { current_internal_remark: None })))?;

    let updated_company = sqlx::query_as::<_, Company>("SELECT * FROM companies WHERE id = ?")
        .bind(&id)
        .fetch_one(&state.db)
        .await
        .map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, Json(ConflictResponse { current_internal_remark: None })))?;

    Ok(Json(updated_company))
}

/// POST /api/companies/:id/regenerate-password
pub async fn regenerate_password(
    State(state): State<Arc<AppState>>,
    Path(id): Path<String>,
) -> Result<Json<Company>, (StatusCode, String)> {
    let new_password = format!("{:06}", rand::random::<u32>() % 1000000);

    sqlx::query("UPDATE companies SET company_password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
        .bind(&new_password)
        .bind(&id)
        .execute(&state.db)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let updated_company = sqlx::query_as::<_, Company>("SELECT * FROM companies WHERE id = ?")
        .bind(&id)
        .fetch_one(&state.db)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(updated_company))
}