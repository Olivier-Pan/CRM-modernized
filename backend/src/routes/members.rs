use axum::{
   extract::{Path, State},
   http::{StatusCode, HeaderMap},
   Json,
};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use bcrypt::{hash, DEFAULT_COST};

use crate::{models::Member, state::AppState};

#[derive(Deserialize, Serialize)]
struct TokenClaims {
    sub: String,
}

// Fonction utilitaire pour extraire et vérifier l'admin à partir du header Authorization
async fn is_user_admin(state: &Arc<AppState>, headers: &HeaderMap) -> Result<bool, (StatusCode, String)> {
    let auth_header = headers.get("Authorization")
        .and_then(|h| h.to_str().ok())
        .ok_or((StatusCode::UNAUTHORIZED, "Token manquant".to_string()))?;

    if !auth_header.starts_with("Bearer ") {
        return Err((StatusCode::UNAUTHORIZED, "Format de token invalide".to_string()));
    }

    let token = &auth_header[7..];
    
    let token_data = jsonwebtoken::decode::<TokenClaims>(
        token,
        &jsonwebtoken::DecodingKey::from_secret("SECRET_KEY".as_ref()),
        &jsonwebtoken::Validation::default(),
    ).map_err(|_| (StatusCode::UNAUTHORIZED, "Token invalide ou expiré".to_string()))?;

    // On vérifie directement la colonne "role" de ta base de données
    let role = sqlx::query_scalar::<_, String>("SELECT role FROM members WHERE id = ?")
        .bind(&token_data.claims.sub)
        .fetch_one(&state.db)
        .await
        .unwrap_or_default();

    Ok(role == "Admin")
}

// 1. LIRE TOUS LES MEMBRES (La fonction qui manquait !)
pub async fn list_members(
   State(state): State<Arc<AppState>>,
) -> Result<Json<Vec<Member>>, (StatusCode, String)> {
   let members = sqlx::query_as::<_, Member>("SELECT * FROM members ORDER BY name ASC")
       .fetch_all(&state.db)
       .await
       .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

   Ok(Json(members))
}

// 2. CHANGER LE RÔLE
#[derive(Deserialize)]
pub struct UpdateRolePayload {
   pub role: String,
}

pub async fn update_role(
   State(state): State<Arc<AppState>>,
   headers: HeaderMap,
   Path(id): Path<String>,
   Json(payload): Json<UpdateRolePayload>,
) -> Result<StatusCode, (StatusCode, String)> {
   
   // Vérification du bouclier de sécurité
   if !is_user_admin(&state, &headers).await? {
       return Err((StatusCode::FORBIDDEN, "Accès refusé : Réservé aux administrateurs".to_string()));
   }

   sqlx::query("UPDATE members SET role = ? WHERE id = ?")
       .bind(&payload.role)
       .bind(&id)
       .execute(&state.db)
       .await
       .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

   Ok(StatusCode::NO_CONTENT)
}

// 3. RÉINITIALISER LE MOT DE PASSE (Réservé à l'Admin)
#[derive(Deserialize)]
pub struct ResetPasswordPayload {
   pub new_password: String,
}

pub async fn reset_password(
   State(state): State<Arc<AppState>>,
   headers: HeaderMap,
   Path(id): Path<String>,
   Json(payload): Json<ResetPasswordPayload>,
) -> Result<StatusCode, (StatusCode, String)> {
   
   // Vérification du bouclier de sécurité
   if !is_user_admin(&state, &headers).await? {
       return Err((StatusCode::FORBIDDEN, "Accès refusé : Réservé aux administrateurs".to_string()));
   }

   let password_hash = hash(&payload.new_password, DEFAULT_COST)
       .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

   sqlx::query("UPDATE members SET password_hash = ? WHERE id = ?")
       .bind(&password_hash)
       .bind(&id)
       .execute(&state.db)
       .await
       .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

   Ok(StatusCode::NO_CONTENT)
}