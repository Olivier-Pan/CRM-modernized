use axum::{
    extract::{Path, State},
    http::StatusCode,
    Json,
};
use serde::Deserialize;
use std::sync::Arc;
use uuid::Uuid;

use crate::{models::Contact, state::AppState};

// La structure des données envoyées par React pour créer un contact
#[derive(Deserialize)]
pub struct CreateContactPayload {
    pub contact_type: String, // 'person', 'generic_email', 'company_linkedin', 'website_form'
    pub first_name: Option<String>,
    pub last_name: Option<String>,
    pub email: Option<String>,
    pub phone: Option<String>,
    pub linkedin_url: Option<String>,
    pub is_primary: Option<bool>,
}

/// GET /api/companies/:id/contacts
/// Liste tous les contacts rattachés à une entreprise spécifique
pub async fn list_contacts(
    State(state): State<Arc<AppState>>,
    Path(company_id): Path<String>,
) -> Result<Json<Vec<Contact>>, (StatusCode, String)> {
    let contacts = sqlx::query_as::<_, Contact>(
        "SELECT * FROM contacts WHERE company_id = ? ORDER BY created_at ASC"
    )
    .bind(&company_id)
    .fetch_all(&state.db)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(contacts))
}

/// POST /api/companies/:id/contacts
/// Ajoute un nouveau contact à l'entreprise
pub async fn create_contact(
    State(state): State<Arc<AppState>>,
    Path(company_id): Path<String>,
    Json(payload): Json<CreateContactPayload>,
) -> Result<(StatusCode, Json<Contact>), (StatusCode, String)> {
    let id = Uuid::new_v4().to_string();
    let is_primary = payload.is_primary.unwrap_or(false);

    // Si on crée un contact "primaire", il faudrait idéalement passer les autres à false,
    // mais on commence par l'insertion simple.
    sqlx::query(
        r#"
        INSERT INTO contacts 
        (id, company_id, contact_type, first_name, last_name, email, phone, linkedin_url, is_primary)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        "#
    )
    .bind(&id)
    .bind(&company_id)
    .bind(&payload.contact_type)
    .bind(&payload.first_name)
    .bind(&payload.last_name)
    .bind(&payload.email)
    .bind(&payload.phone)
    .bind(&payload.linkedin_url)
    .bind(is_primary)
    .execute(&state.db)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    // Récupérer le contact créé
    let new_contact = sqlx::query_as::<_, Contact>(
        "SELECT * FROM contacts WHERE id = ?"
    )
    .bind(&id)
    .fetch_one(&state.db)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok((StatusCode::CREATED, Json(new_contact)))
}

// Ajoute cette structure sous tes autres structures (vers la ligne 20)
#[derive(Deserialize)]
pub struct UpdateContactPayload {
    pub is_primary: Option<bool>,
}

// Ajoute ces deux fonctions TOUT EN BAS du fichier contacts.rs

/// PUT /api/contacts/:id
/// Met à jour un contact (ex: le définir comme principal)
pub async fn update_contact(
    State(state): State<Arc<AppState>>,
    Path(id): Path<String>,
    Json(payload): Json<UpdateContactPayload>,
) -> Result<Json<Contact>, (StatusCode, String)> {
    if let Some(true) = payload.is_primary {
        // Optionnel mais recommandé : on passe d'abord tous les autres contacts de cette entreprise à false
        let contact = sqlx::query_as::<_, Contact>("SELECT * FROM contacts WHERE id = ?")
            .bind(&id).fetch_one(&state.db).await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
            
        sqlx::query("UPDATE contacts SET is_primary = false WHERE company_id = ?")
            .bind(&contact.company_id).execute(&state.db).await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
            
        // Puis on passe celui-ci à true
        sqlx::query("UPDATE contacts SET is_primary = true WHERE id = ?")
            .bind(&id).execute(&state.db).await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    }

    let updated = sqlx::query_as::<_, Contact>("SELECT * FROM contacts WHERE id = ?")
        .bind(&id).fetch_one(&state.db).await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
        
    Ok(Json(updated))
}

/// DELETE /api/contacts/:id
/// Supprime définitivement un contact
pub async fn delete_contact(
    State(state): State<Arc<AppState>>,
    Path(id): Path<String>,
) -> Result<StatusCode, (StatusCode, String)> {
    let result = sqlx::query("DELETE FROM contacts WHERE id = ?")
        .bind(&id)
        .execute(&state.db)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if result.rows_affected() == 0 {
        return Err((StatusCode::NOT_FOUND, "Contact introuvable".to_string()));
    }

    Ok(StatusCode::NO_CONTENT)
}