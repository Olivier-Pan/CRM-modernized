use axum::{
   extract::State,
   http::StatusCode,
   Json,
};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use bcrypt::{hash, verify, DEFAULT_COST};
use jsonwebtoken::{encode, Header, EncodingKey};

use crate::{models::Member, state::AppState};

#[derive(Deserialize)]
pub struct RegisterPayload {
    pub email: String,
    pub password: String,
    pub name: String,
}

#[derive(Deserialize)]
pub struct LoginPayload {
   pub email: Option<String>,
   pub password: Option<String>,
}

#[derive(Serialize)]
pub struct AuthResponse {
   pub token: String,
   pub role: String,
}

#[derive(Debug, Serialize, Deserialize)]
struct Claims {
    sub: String, // ID de l'utilisateur
    exp: usize,
}

/// POST /api/auth/register
/// POST /api/auth/register
pub async fn register(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<RegisterPayload>,
) -> Result<(StatusCode, Json<Member>), (StatusCode, String)> {
    let email = payload.email.trim().to_lowercase();

    // 1. Vérifier si l'email est dans la liste blanche (table members)
    let existing: Option<(String, String)> = sqlx::query_as(
        "SELECT id, password_hash FROM members WHERE email = ?"
    )
    .bind(&email)
    .fetch_optional(&state.db)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let (member_id, existing_hash) = match existing {
        None => {
            return Err((
                StatusCode::FORBIDDEN, // Code 403
                "Inscription refusée : cette adresse email ne fait pas partie des membres de l'association.".to_string(),
            ));
        }
        Some((_, hash)) if !hash.is_empty() => {
            return Err((
                StatusCode::CONFLICT, // Code 409
                "Cette adresse email est déjà associée à un compte. Veuillez voir avec un admin pour réinitialiser le mot de passe.".to_string(),
            ));
        }
        Some((id, hash)) => (id, hash),
    };
    let _ = existing_hash;

    // 2. Hacher le mot de passe
    let password_hash = hash(&payload.password, DEFAULT_COST)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    // 3. Activer le compte pré-enregistré (conserve son id et son rôle Admin/Member)
    sqlx::query(
        "UPDATE members SET name = ?, password_hash = ? WHERE id = ?"
    )
    .bind(payload.name.trim())
    .bind(&password_hash)
    .bind(&member_id)
    .execute(&state.db)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    // 4. Renvoyer le membre mis à jour
    let updated_member = sqlx::query_as::<_, Member>("SELECT * FROM members WHERE id = ?")
        .bind(&member_id)
        .fetch_one(&state.db)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok((StatusCode::CREATED, Json(updated_member)))
}

/// POST /api/auth/login
pub async fn login(
   State(state): State<Arc<AppState>>,
   Json(payload): Json<LoginPayload>,
) -> Result<Json<AuthResponse>, (StatusCode, String)> {
    let email = payload.email.ok_or((StatusCode::BAD_REQUEST, "Email requis".to_string()))?;
    let password = payload.password.ok_or((StatusCode::BAD_REQUEST, "Mot de passe requis".to_string()))?;

    // 1. Chercher l'utilisateur (Vérification de l'email)
    let fetch_result = sqlx::query_as::<_, Member>("SELECT * FROM members WHERE email = ?")
        .bind(&email)
        .fetch_one(&state.db)
        .await;

    let member = match fetch_result {
        Ok(m) => m,
        Err(sqlx::Error::RowNotFound) => {
            // L'email n'existe pas : on renvoie le message personnalisé (Code 400 ou 404)
            return Err((
                StatusCode::NOT_FOUND, 
                "Cette adresse email n'existe pas. Veuillez vous créer un compte.".to_string()
            ));
        },
        Err(e) => {
            return Err((StatusCode::INTERNAL_SERVER_ERROR, e.to_string()));
        }
    };

    // 2. Vérifier le mot de passe
    if !verify(&password, &member.password_hash).unwrap_or(false) {
        // Le mot de passe est faux : on utilise BAD_REQUEST (400) au lieu de UNAUTHORIZED (401)
        // Cela empêche ton frontend de forcer un rechargement de page "anti-piratage"
        return Err((
            StatusCode::BAD_REQUEST, 
            "Le mot de passe est incorrect.".to_string()
        ));
    }

    // 3. Générer le JWT
    let claims = Claims {
        sub: member.id.clone(),
        exp: (chrono::Utc::now() + chrono::Duration::hours(24)).timestamp() as usize,
    };
    
    let token = encode(&Header::default(), &claims, &EncodingKey::from_secret("SECRET_KEY".as_ref()))
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

   Ok(Json(AuthResponse {
       token,
       role: member.role,
   }))
}

use axum::http::HeaderMap;
use jsonwebtoken::{decode, DecodingKey, Validation};

/// GET /api/auth/me
pub async fn me(
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
) -> Result<Json<Member>, (StatusCode, String)> {
    
    // 1. Récupérer l'en-tête "Authorization" envoyé par React
    let auth_header = headers.get("Authorization")
        .and_then(|h| h.to_str().ok())
        .ok_or((StatusCode::UNAUTHORIZED, "Token manquant".to_string()))?;

    // 2. Extraire le token (enlever le mot "Bearer ")
    let token = if auth_header.starts_with("Bearer ") {
        &auth_header[7..]
    } else {
        return Err((StatusCode::UNAUTHORIZED, "Format de token invalide".to_string()));
    };

    // 3. Décoder le token pour y lire les 'Claims' (qui contiennent la vraie ID)
    let token_data = decode::<Claims>(
        token,
        &DecodingKey::from_secret("SECRET_KEY".as_ref()),
        &Validation::default(),
    ).map_err(|_| (StatusCode::UNAUTHORIZED, "Token invalide ou expiré".to_string()))?;

    // 4. Chercher le vrai membre dans la base de données avec sa vraie ID
    let member = sqlx::query_as::<_, Member>("SELECT * FROM members WHERE id = ?")
        .bind(&token_data.claims.sub)
        .fetch_one(&state.db)
        .await
        .map_err(|_| (StatusCode::NOT_FOUND, "Utilisateur introuvable".to_string()))?;

    // On renvoie le vrai membre au frontend (le password_hash sera masqué grâce à #[serde(skip_serializing)])
    Ok(Json(member))
}