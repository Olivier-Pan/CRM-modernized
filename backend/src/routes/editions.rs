use std::sync::Arc;

use axum::{
    extract::{Path, State},
    Json,
};
use uuid::Uuid;

use crate::{
    cache::AppCache,
    error::AppError,
    middleware::auth::{RequireAdmin, RequireStaff},
    models::edition::{CreateEditionRequest, Edition, EditionRow, UpdateEditionRequest},
    sheets::client::SHEET_EDITIONS,
    state::AppState,
};

// ──────────────────────────────────────────────
// GET /api/editions — Genius staff only (the portal uses /api/public/edition)
// ──────────────────────────────────────────────

pub async fn list_editions(
    RequireStaff(_): RequireStaff,
    State(state): State<Arc<AppState>>,
) -> Result<Json<Vec<Edition>>, AppError> {
    let editions = fetch_editions(&state).await?;
    Ok(Json(editions))
}

// ──────────────────────────────────────────────
// POST /api/editions — admin only
// ──────────────────────────────────────────────

pub async fn create_edition(
    RequireAdmin(_): RequireAdmin,
    State(state): State<Arc<AppState>>,
    Json(req): Json<CreateEditionRequest>,
) -> Result<Json<Edition>, AppError> {
    let edition = Edition {
        id: Uuid::new_v4().to_string(),
        year: req.year,
        name: req.name,
        event_date: req.event_date,
        is_active: false,
        row_index: 0,
    };

    state
        .sheets
        .append_row(SHEET_EDITIONS, EditionRow::to_values(&edition))
        .await
        .map_err(|e| AppError::Internal(e.to_string()))?;

    *state.cache.editions.write().await = None;

    Ok(Json(edition))
}

// ──────────────────────────────────────────────
// PUT /api/editions/:id — admin only
// ──────────────────────────────────────────────

pub async fn update_edition(
    RequireAdmin(_): RequireAdmin,
    State(state): State<Arc<AppState>>,
    Path(id): Path<String>,
    Json(req): Json<UpdateEditionRequest>,
) -> Result<Json<Edition>, AppError> {
    let editions = fetch_editions(&state).await?;
    let mut edition = editions.into_iter().find(|e| e.id == id).ok_or(AppError::NotFound)?;

    if let Some(year) = req.year { edition.year = year; }
    if let Some(name) = req.name { edition.name = name; }
    if let Some(ed) = req.event_date { edition.event_date = Some(ed); }
    if let Some(active) = req.is_active { edition.is_active = active; }

    state
        .sheets
        .update_row(SHEET_EDITIONS, edition.row_index, EditionRow::to_values(&edition))
        .await
        .map_err(|e| AppError::Internal(e.to_string()))?;

    *state.cache.editions.write().await = None;

    Ok(Json(edition))
}

// ──────────────────────────────────────────────
// PUT /api/editions/:id/activate — admin only
// Sets this edition as the active one, deactivates all others
// ──────────────────────────────────────────────

pub async fn activate_edition(
    RequireAdmin(_): RequireAdmin,
    State(state): State<Arc<AppState>>,
    Path(id): Path<String>,
) -> Result<Json<Edition>, AppError> {
    let editions = fetch_editions(&state).await?;

    // Deactivate all editions
    for mut ed in editions.iter().cloned() {
        if ed.is_active {
            ed.is_active = false;
            state
                .sheets
                .update_row(SHEET_EDITIONS, ed.row_index, EditionRow::to_values(&ed))
                .await
                .map_err(|e| AppError::Internal(e.to_string()))?;
        }
    }

    // Activate the target edition
    let mut target = editions.into_iter().find(|e| e.id == id).ok_or(AppError::NotFound)?;
    target.is_active = true;

    state
        .sheets
        .update_row(SHEET_EDITIONS, target.row_index, EditionRow::to_values(&target))
        .await
        .map_err(|e| AppError::Internal(e.to_string()))?;

    *state.cache.editions.write().await = None;

    Ok(Json(target))
}

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

pub(crate) async fn fetch_editions(state: &AppState) -> Result<Vec<Edition>, AppError> {
    {
        let cache = state.cache.editions.read().await;
        if let Some(ref entry) = *cache {
            if entry.is_fresh() {
                return Ok(entry.get().clone());
            }
        }
    }

    let rows = state
        .sheets
        .read_sheet(SHEET_EDITIONS)
        .await
        .map_err(|e| AppError::Internal(e.to_string()))?;

    let editions: Vec<Edition> = rows
        .into_iter()
        .filter_map(|(row, row_index)| EditionRow::from_row(&row, row_index))
        .collect();

    let mut cache = state.cache.editions.write().await;
    *cache = Some(crate::cache::CacheEntry::new(
        editions.clone(),
        AppCache::default_ttl(),
    ));

    Ok(editions)
}
