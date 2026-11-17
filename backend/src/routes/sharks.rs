use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    Json,
};
use serde::Deserialize;
use sqlx::QueryBuilder;
use std::sync::Arc;
use uuid::Uuid;

use crate::{models::Shark, state::AppState};

#[derive(Deserialize)]
pub struct SharkQuery {
    pub company_id: Option<String>,
}

#[derive(Deserialize)]
pub struct CreateSharkPayload {
   pub company_id: String,
   pub contact_id: Option<String>,
   pub member_id: Option<String>,
   pub contact_method: Option<String>,
   pub contact_date: Option<String>,
   pub notes: Option<String>,
}

#[derive(Deserialize)]
pub struct UpdateSharkPayload {
   pub status: Option<String>,
   pub member_id: Option<String>,
   pub contact_method: Option<String>,
   pub contact_date: Option<String>,
   pub notes: Option<String>,
}

/// GET /api/sharks?company_id=...
pub async fn list_sharks(
    State(state): State<Arc<AppState>>,
    Query(params): Query<SharkQuery>,
) -> Result<Json<Vec<Shark>>, (StatusCode, String)> {
    let sharks = if let Some(cid) = params.company_id {
        sqlx::query_as::<_, Shark>("SELECT * FROM sharks WHERE company_id = ? ORDER BY created_at DESC")
            .bind(&cid)
            .fetch_all(&state.db)
            .await
    } else {
        sqlx::query_as::<_, Shark>("SELECT * FROM sharks ORDER BY created_at DESC")
            .fetch_all(&state.db)
            .await
    };

    match sharks {
        Ok(data) => Ok(Json(data)),
        Err(e) => Err((StatusCode::INTERNAL_SERVER_ERROR, e.to_string())),
    }
}

/// GET /api/sharks/mine
pub async fn my_sharks(
   State(state): State<Arc<AppState>>,
) -> Result<Json<Vec<Shark>>, (StatusCode, String)> {
   // Ici on remet la valeur temporaire (pas de payload)
   let member_id = "ID_TEMPORAIRE".to_string(); 

   let sharks = sqlx::query_as::<_, Shark>("SELECT * FROM sharks WHERE member_id = ? ORDER BY created_at DESC")
       .bind(&member_id)
       .fetch_all(&state.db)
       .await
       .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

   Ok(Json(sharks))
}

/// POST /api/sharks
pub async fn create_shark(
   State(state): State<Arc<AppState>>,
   Json(payload): Json<CreateSharkPayload>,
) -> Result<(StatusCode, Json<Shark>), (StatusCode, String)> {
   let id = Uuid::new_v4().to_string();
   let member_id = payload.member_id.unwrap_or_else(|| "ID_TEMPORAIRE".to_string());
   
   println!("---> 1. DÉBUT CRÉATION SHARK. member_id: {}", member_id);

   let insert_result = sqlx::query(
       r#"
       INSERT INTO sharks (id, company_id, member_id, contact_id, status, contact_date, contact_method, notes)
       VALUES (?, ?, ?, ?, 'ToContact', ?, ?, ?)
       "#
   )
   .bind(&id)
   .bind(&payload.company_id)
   .bind(&member_id)
   .bind(&payload.contact_id)
   .bind(&payload.contact_date)
   .bind(&payload.contact_method)
   .bind(&payload.notes)
   .execute(&state.db)
   .await;

   match insert_result {
       Ok(_) => println!("---> 2. INSERTION SQL RÉUSSIE !"),
       Err(e) => {
           println!("---> ❌ ERREUR INSERTION SQL : {:?}", e);
           return Err((StatusCode::INTERNAL_SERVER_ERROR, e.to_string()));
       }
   }

   let fetch_result = sqlx::query_as::<_, Shark>("SELECT * FROM sharks WHERE id = ?")
       .bind(&id)
       .fetch_one(&state.db)
       .await;

   match fetch_result {
       Ok(new_shark) => {
           println!("---> 3. LECTURE SQL RÉUSSIE !");
           Ok((StatusCode::CREATED, Json(new_shark)))
       },
       Err(e) => {
           println!("---> ❌ ERREUR LECTURE SQL : {:?}", e);
           Err((StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))
       }
   }
}

/// PUT /api/sharks/:id
pub async fn update_shark(
    State(state): State<Arc<AppState>>,
    Path(id): Path<String>,
    Json(payload): Json<UpdateSharkPayload>,
) -> Result<Json<Shark>, (StatusCode, String)> {
    
    // 1. LECTURE AVANT MISE À JOUR (Pour connaître l'ancien statut)
    let current_shark_result = sqlx::query_as::<_, Shark>("SELECT * FROM sharks WHERE id = ?")
        .bind(&id)
        .fetch_one(&state.db)
        .await;

    // 2. MISE À JOUR DYNAMIQUE
    let mut query = QueryBuilder::new("UPDATE sharks SET ");
    let mut has_updates = false;

    if let Some(v) = &payload.status {
        if has_updates { query.push(", "); }
        query.push("status = "); query.push_bind(v); has_updates = true;
    }
    if let Some(v) = &payload.contact_method {
        if has_updates { query.push(", "); }
        query.push("contact_method = "); query.push_bind(v); has_updates = true;
    }
    if let Some(v) = &payload.contact_date {
        if has_updates { query.push(", "); }
        query.push("contact_date = "); query.push_bind(v); has_updates = true;
    }
    if let Some(v) = &payload.notes {
        if has_updates { query.push(", "); }
        query.push("notes = "); query.push_bind(v); has_updates = true;
    }
    if let Some(v) = &payload.member_id {
        if has_updates { query.push(", "); }
        query.push("member_id = "); query.push_bind(v); has_updates = true;
    }

    if has_updates {
        query.push(" WHERE id = ");
        query.push_bind(&id);
        query.build().execute(&state.db).await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    }

    // 3. ENREGISTREMENT DANS L'HISTORIQUE (LOGS)
    if let (Ok(current_shark), Some(new_status)) = (current_shark_result, &payload.status) {
        
        println!("---> TENTATIVE LOG : Ancien statut = {}, Nouveau = {}", current_shark.status, new_status);
        
        if current_shark.status != *new_status {
            
            let member_name = sqlx::query_scalar::<_, String>("SELECT name FROM members WHERE id = ?")
                .bind(&current_shark.member_id)
                .fetch_optional(&state.db)
                .await
                .unwrap_or(None)
                .unwrap_or_else(|| "Un membre".to_string());

            let company_name = sqlx::query_scalar::<_, String>("SELECT name FROM companies WHERE id = ?")
                .bind(&current_shark.company_id)
                .fetch_optional(&state.db)
                .await
                .unwrap_or(None)
                .unwrap_or_else(|| "Une entreprise".to_string());

            let log_id = Uuid::new_v4().to_string();
            
            // On vérifie l'erreur de l'insertion ici !
            let insert_log = sqlx::query(
                "INSERT INTO activity_logs (id, member_name, company_name, old_status, new_status) VALUES (?, ?, ?, ?, ?)"
            )
            .bind(&log_id)
            .bind(&member_name)
            .bind(&company_name)
            .bind(&current_shark.status)
            .bind(new_status)
            .execute(&state.db)
            .await;

            match insert_log {
                Ok(_) => println!("---> ✅ LOG INSÉRÉ DANS SQLITE AVEC SUCCÈS !"),
                Err(e) => println!("---> ❌ ERREUR SQLITE LOG : {:?}", e),
            }
        } else {
            println!("---> LE STATUT N'A PAS CHANGÉ, PAS DE LOG.");
        }
    }

    // 4. RÉCUPÉRATION ET RENVOI DU SHARK MIS À JOUR
    let updated_shark = sqlx::query_as::<_, Shark>("SELECT * FROM sharks WHERE id = ?")
        .bind(&id)
        .fetch_one(&state.db)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(updated_shark))
}

/// DELETE /api/sharks/:id
pub async fn delete_shark(
    State(state): State<Arc<AppState>>,
    Path(id): Path<String>,
) -> Result<StatusCode, (StatusCode, String)> {
    let result = sqlx::query("DELETE FROM sharks WHERE id = ?")
        .bind(&id)
        .execute(&state.db)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if result.rows_affected() == 0 {
        return Err((StatusCode::NOT_FOUND, "Shark introuvable".to_string()));
    }

    Ok(StatusCode::NO_CONTENT)
}
