use axum::{
    extract::{Multipart, Path, State},
    http::{HeaderMap, StatusCode},
    Json,
};
use serde::{Deserialize, Serialize};
use sqlx::{FromRow, SqlitePool};
use std::{path::PathBuf, sync::Arc};
use tokio::fs;

use crate::{
    auth::{jwt::create_token, password::verify_password, roles::is_genius_staff},
    middleware::auth::RequireCompany,
    state::AppState,
};

#[derive(Debug, Deserialize)]
struct StaffSubClaims {
    sub: String,
}

async fn verify_crm_staff(
    state: &Arc<AppState>,
    headers: &HeaderMap,
) -> Result<(), (StatusCode, String)> {
    let auth_header = headers
        .get("Authorization")
        .and_then(|h| h.to_str().ok())
        .ok_or((StatusCode::UNAUTHORIZED, "Token manquant".to_string()))?;

    let token = auth_header
        .strip_prefix("Bearer ")
        .ok_or((StatusCode::UNAUTHORIZED, "Format de token invalide".to_string()))?;

    // 1. Tokens signés avec JWT_SECRET (ex. comptes exposants "Company" ou staff avec rôle explicite)
    if let Ok(claims) = crate::auth::jwt::validate_token(token, &state.config.jwt_secret) {
        if is_genius_staff(&claims) {
            return Ok(());
        }
        return Err((
            StatusCode::FORBIDDEN,
            "Accès réservé aux membres Genius".to_string(),
        ));
    }

    // 2. Tokens membres CRM générés par /api/auth/login (Claims { sub, exp } avec SECRET_KEY)
    let token_data = jsonwebtoken::decode::<StaffSubClaims>(
        token,
        &jsonwebtoken::DecodingKey::from_secret("SECRET_KEY".as_ref()),
        &jsonwebtoken::Validation::default(),
    )
    .map_err(|_| (StatusCode::UNAUTHORIZED, "Token invalide ou expiré".to_string()))?;

    let member_exists: Option<String> = sqlx::query_scalar("SELECT id FROM members WHERE id = ?")
        .bind(&token_data.claims.sub)
        .fetch_optional(&state.db)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if member_exists.is_some() {
        Ok(())
    } else {
        Err((StatusCode::UNAUTHORIZED, "Membre introuvable".to_string()))
    }
}

#[derive(Debug, Deserialize)]
pub struct ExhibitorLoginRequest {
    pub company_name: String,
    pub password: String,
}

#[derive(Debug, Serialize)]
pub struct ExhibitorLoginResponse {
    pub token: String,
}

/// POST /api/exhibitor/login
pub async fn login_exhibitor(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<ExhibitorLoginRequest>,
) -> Result<Json<ExhibitorLoginResponse>, (StatusCode, String)> {
    let clean_name = payload.company_name.trim();
    if clean_name.is_empty() || payload.password.is_empty() {
        return Err((
            StatusCode::BAD_REQUEST,
            "Veuillez renseigner le nom de votre entreprise et votre mot de passe.".to_string(),
        ));
    }

    let row: Option<(String, Option<String>)> = sqlx::query_as(
        r#"
        SELECT c.id, c.company_password
        FROM companies c
        LEFT JOIN company_brochures b ON b.company_id = c.id
        WHERE LOWER(TRIM(c.name)) = LOWER(?)
           OR (TRIM(b.custom_company_name) != '' AND LOWER(TRIM(b.custom_company_name)) = LOWER(?))
        LIMIT 1
        "#,
    )
    .bind(clean_name)
    .bind(clean_name)
    .fetch_optional(&state.db)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let Some((company_id, maybe_password)) = row else {
        return Err((
            StatusCode::UNAUTHORIZED,
            "Nom d'entreprise ou mot de passe incorrect.".to_string(),
        ));
    };

    let Some(stored_password) = maybe_password.filter(|p| !p.trim().is_empty()) else {
        return Err((
            StatusCode::UNAUTHORIZED,
            "Aucun accès portail n'a encore été généré pour cette entreprise.".to_string(),
        ));
    };

    let is_valid = if stored_password.starts_with("$2") {
        verify_password(&payload.password, &stored_password).unwrap_or(false)
    } else {
        stored_password == payload.password
    };

    if !is_valid {
        return Err((
            StatusCode::UNAUTHORIZED,
            "Nom d'entreprise ou mot de passe incorrect.".to_string(),
        ));
    }

    let token = create_token(&company_id, "", "Company", &state.config.jwt_secret)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(ExhibitorLoginResponse { token }))
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct BrochureSpeaker {
    #[serde(default)]
    pub full_name: String,
    #[serde(default)]
    pub role: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct BrochurePayload {
    #[serde(default)]
    pub crm_company_name: String,
    #[serde(default)]
    pub custom_company_name: String,
    #[serde(default)]
    pub sector: String,
    #[serde(default)]
    pub website: String,
    #[serde(default)]
    pub founded_year: String,
    #[serde(default)]
    pub headcount: String,
    #[serde(default)]
    pub address: String,
    #[serde(default)]
    pub revenue: String,
    #[serde(default)]
    pub starting_salary: String,
    #[serde(default)]
    pub public_email: String,
    #[serde(default)]
    pub public_phone: String,
    #[serde(default)]
    pub linkedin_url: String,
    #[serde(default)]
    pub instagram_url: String,
    #[serde(default)]
    pub logo_url: String,

    #[serde(default)]
    pub presentation: String,
    #[serde(default)]
    pub sought_profiles: String,
    #[serde(default)]
    pub recruitment_process: String,
    #[serde(default)]
    pub roles_offered: String,
    #[serde(default)]
    pub career_progression: String,
    pub abroad_positions: Option<bool>,
    #[serde(default)]
    pub contract_types: Vec<String>,
    #[serde(default)]
    pub other_contract_type: String,
    #[serde(default)]
    pub locations: String,

    #[serde(default)]
    pub contact_full_name: String,
    #[serde(default)]
    pub contact_email: String,
    #[serde(default)]
    pub contact_phone: String,

    #[serde(default)]
    pub booth_size: String,
    pub pitch_zone: Option<bool>,
    #[serde(default)]
    pub speakers: Vec<BrochureSpeaker>,

    #[serde(default)]
    pub is_locked: bool,
    pub updated_at: Option<String>,
}

#[derive(Debug, FromRow)]
struct BrochureRow {
    custom_company_name: String,
    sector: String,
    website: String,
    founded_year: String,
    headcount: String,
    address: String,
    revenue: String,
    starting_salary: String,
    public_email: String,
    public_phone: String,
    linkedin_url: String,
    instagram_url: String,
    logo_url: String,
    presentation: String,
    sought_profiles: String,
    recruitment_process: String,
    roles_offered: String,
    career_progression: String,
    abroad_positions: Option<bool>,
    contract_types: String,
    other_contract_type: String,
    locations: String,
    contact_full_name: String,
    contact_email: String,
    contact_phone: String,
    booth_size: String,
    pitch_zone: Option<bool>,
    speakers: String,
    is_locked: bool,
    updated_at: Option<String>,
}

async fn load_brochure_for_company(
    pool: &SqlitePool,
    company_id: &str,
) -> Result<BrochurePayload, (StatusCode, String)> {
    let company_name: String = sqlx::query_scalar("SELECT name FROM companies WHERE id = ?")
        .bind(company_id)
        .fetch_optional(pool)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
        .ok_or((StatusCode::NOT_FOUND, "Entreprise introuvable".to_string()))?;

    let row = sqlx::query_as::<_, BrochureRow>(
        r#"
        SELECT
            custom_company_name, sector, website, founded_year, headcount, address,
            revenue, starting_salary, public_email, public_phone, linkedin_url, instagram_url,
            logo_url, presentation, sought_profiles, recruitment_process, roles_offered,
            career_progression, abroad_positions, contract_types, other_contract_type,
            locations, contact_full_name, contact_email, contact_phone,
            booth_size, pitch_zone, speakers, is_locked, updated_at
        FROM company_brochures
        WHERE company_id = ?
        "#,
    )
    .bind(company_id)
    .fetch_optional(pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let Some(r) = row else {
        return Ok(BrochurePayload {
            crm_company_name: company_name,
            custom_company_name: String::new(),
            sector: String::new(),
            website: String::new(),
            founded_year: String::new(),
            headcount: String::new(),
            address: String::new(),
            revenue: String::new(),
            starting_salary: String::new(),
            public_email: String::new(),
            public_phone: String::new(),
            linkedin_url: String::new(),
            instagram_url: String::new(),
            logo_url: String::new(),
            presentation: String::new(),
            sought_profiles: String::new(),
            recruitment_process: String::new(),
            roles_offered: String::new(),
            career_progression: String::new(),
            abroad_positions: None,
            contract_types: vec![],
            other_contract_type: String::new(),
            locations: String::new(),
            contact_full_name: String::new(),
            contact_email: String::new(),
            contact_phone: String::new(),
            booth_size: String::new(),
            pitch_zone: None,
            speakers: vec![],
            is_locked: false,
            updated_at: None,
        });
    };

    let contracts: Vec<String> = serde_json::from_str(&r.contract_types).unwrap_or_default();
    let normalized_logo_url = if r.logo_url.starts_with("/uploads/") {
        format!("/api{}", r.logo_url)
    } else {
        r.logo_url
    };
    let speakers: Vec<BrochureSpeaker> = serde_json::from_str(&r.speakers).unwrap_or_default();

    Ok(BrochurePayload {
        crm_company_name: company_name,
        custom_company_name: r.custom_company_name,
        sector: r.sector,
        website: r.website,
        founded_year: r.founded_year,
        headcount: r.headcount,
        address: r.address,
        revenue: r.revenue,
        starting_salary: r.starting_salary,
        public_email: r.public_email,
        public_phone: r.public_phone,
        linkedin_url: r.linkedin_url,
        instagram_url: r.instagram_url,
        logo_url: normalized_logo_url,
        presentation: r.presentation,
        sought_profiles: r.sought_profiles,
        recruitment_process: r.recruitment_process,
        roles_offered: r.roles_offered,
        career_progression: r.career_progression,
        abroad_positions: r.abroad_positions,
        contract_types: contracts,
        other_contract_type: r.other_contract_type,
        locations: r.locations,
        contact_full_name: r.contact_full_name,
        contact_email: r.contact_email,
        contact_phone: r.contact_phone,
        booth_size: r.booth_size,
        pitch_zone: r.pitch_zone,
        speakers,
        is_locked: r.is_locked,
        updated_at: r.updated_at,
    })
}

/// GET /api/exhibitor/brochure
pub async fn get_exhibitor_brochure(
    State(state): State<Arc<AppState>>,
    RequireCompany(claims): RequireCompany,
) -> Result<Json<BrochurePayload>, (StatusCode, String)> {
    let payload = load_brochure_for_company(&state.db, &claims.sub).await?;
    Ok(Json(payload))
}

/// PUT /api/exhibitor/brochure
pub async fn update_exhibitor_brochure(
    State(state): State<Arc<AppState>>,
    RequireCompany(claims): RequireCompany,
    Json(body): Json<BrochurePayload>,
) -> Result<Json<BrochurePayload>, (StatusCode, String)> {
    let locked: Option<bool> =
        sqlx::query_scalar("SELECT is_locked FROM company_brochures WHERE company_id = ?")
            .bind(&claims.sub)
            .fetch_optional(&state.db)
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if locked.unwrap_or(false) {
        return Err((
            StatusCode::FORBIDDEN,
            "La période de saisie est clôturée.".to_string(),
        ));
    }

    let required = [
        (&body.sector, "Le secteur d'activité est obligatoire."),
        (&body.website, "Le site web est obligatoire."),
        (&body.headcount, "L'effectif est obligatoire."),
        (&body.address, "L'adresse est obligatoire."),
        (&body.presentation, "La présentation est obligatoire."),
        (&body.contact_full_name, "Le contact événement est obligatoire."),
        (&body.contact_email, "Le mail du contact est obligatoire."),
        (&body.contact_phone, "Le téléphone du contact est obligatoire."),
    ];
    for (val, msg) in required {
        if val.trim().is_empty() {
            return Err((StatusCode::BAD_REQUEST, msg.to_string()));
        }
    }

    let contracts_json = serde_json::to_string(&body.contract_types)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let cleaned_speakers: Vec<BrochureSpeaker> = body
        .speakers
        .iter()
        .map(|s| BrochureSpeaker {
            full_name: s.full_name.trim().to_string(),
            role: s.role.trim().to_string(),
        })
        .filter(|s| !s.full_name.is_empty() || !s.role.is_empty())
        .take(8)
        .collect();
    let speakers_json = serde_json::to_string(&cleaned_speakers)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    sqlx::query(
        r#"
        INSERT INTO company_brochures (
            company_id, custom_company_name, sector, website, founded_year, headcount, address,
            revenue, starting_salary, public_email, public_phone, linkedin_url, instagram_url,
            logo_url, presentation, sought_profiles, recruitment_process, roles_offered,
            career_progression, abroad_positions, contract_types, other_contract_type,
            locations, contact_full_name, contact_email, contact_phone,
            booth_size, pitch_zone, speakers, updated_at
        )
        VALUES (
            ?1, ?2, ?3, ?4, ?5, ?6, ?7,
            ?8, ?9, ?10, ?11, ?12, ?13,
            ?14, ?15, ?16, ?17, ?18,
            ?19, ?20, ?21, ?22,
            ?23, ?24, ?25, ?26,
            ?27, ?28, ?29, datetime('now')
        )
        ON CONFLICT(company_id) DO UPDATE SET
            custom_company_name = excluded.custom_company_name,
            sector = excluded.sector,
            website = excluded.website,
            founded_year = excluded.founded_year,
            headcount = excluded.headcount,
            address = excluded.address,
            revenue = excluded.revenue,
            starting_salary = excluded.starting_salary,
            public_email = excluded.public_email,
            public_phone = excluded.public_phone,
            linkedin_url = excluded.linkedin_url,
            instagram_url = excluded.instagram_url,
            logo_url = excluded.logo_url,
            presentation = excluded.presentation,
            sought_profiles = excluded.sought_profiles,
            recruitment_process = excluded.recruitment_process,
            roles_offered = excluded.roles_offered,
            career_progression = excluded.career_progression,
            abroad_positions = excluded.abroad_positions,
            contract_types = excluded.contract_types,
            other_contract_type = excluded.other_contract_type,
            locations = excluded.locations,
            contact_full_name = excluded.contact_full_name,
            contact_email = excluded.contact_email,
            contact_phone = excluded.contact_phone,
            booth_size = excluded.booth_size,
            pitch_zone = excluded.pitch_zone,
            speakers = excluded.speakers,
            updated_at = datetime('now')
        "#,
    )
    .bind(&claims.sub)
    .bind(&body.custom_company_name)
    .bind(&body.sector)
    .bind(&body.website)
    .bind(&body.founded_year)
    .bind(&body.headcount)
    .bind(&body.address)
    .bind(&body.revenue)
    .bind(&body.starting_salary)
    .bind(&body.public_email)
    .bind(&body.public_phone)
    .bind(&body.linkedin_url)
    .bind(&body.instagram_url)
    .bind(&body.logo_url)
    .bind(&body.presentation)
    .bind(&body.sought_profiles)
    .bind(&body.recruitment_process)
    .bind(&body.roles_offered)
    .bind(&body.career_progression)
    .bind(body.abroad_positions)
    .bind(&contracts_json)
    .bind(&body.other_contract_type)
    .bind(&body.locations)
    .bind(&body.contact_full_name)
    .bind(&body.contact_email)
    .bind(&body.contact_phone)
    .bind(&body.booth_size)
    .bind(body.pitch_zone)
    .bind(&speakers_json)
    .execute(&state.db)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let updated = load_brochure_for_company(&state.db, &claims.sub).await?;
    Ok(Json(updated))
}

/// POST /api/exhibitor/logo
pub async fn upload_exhibitor_logo(
    State(state): State<Arc<AppState>>,
    RequireCompany(claims): RequireCompany,
    mut multipart: Multipart,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    while let Some(field) = multipart
        .next_field()
        .await
        .map_err(|e| (StatusCode::BAD_REQUEST, e.to_string()))?
    {
        if field.name() == Some("logo") {
            let file_name = field.file_name().unwrap_or("logo.png").to_string();
            let ext = file_name.rsplit('.').next().unwrap_or("png").to_lowercase();
            if !["png", "jpg", "jpeg", "svg", "webp"].contains(&ext.as_str()) {
                return Err((StatusCode::BAD_REQUEST, "Format d'image non supporté.".to_string()));
            }

            let data = field
                .bytes()
                .await
                .map_err(|e| (StatusCode::BAD_REQUEST, e.to_string()))?;
            if data.len() > 5 * 1024 * 1024 {
                return Err((StatusCode::BAD_REQUEST, "Fichier trop volumineux (max 5 Mo).".to_string()));
            }

            let upload_dir = PathBuf::from("uploads/logos");
            fs::create_dir_all(&upload_dir)
                .await
                .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

            let stored_name = format!(
                "company_{}_{}.{}",
                claims.sub,
                chrono::Utc::now().timestamp(),
                ext
            );
            let full_path = upload_dir.join(&stored_name);
            fs::write(&full_path, &data)
                .await
                .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

            let public_url = format!("/api/uploads/logos/{}", stored_name);

            sqlx::query(
                r#"
                INSERT INTO company_brochures (company_id, logo_url, updated_at)
                VALUES (?1, ?2, datetime('now'))
                ON CONFLICT(company_id) DO UPDATE SET logo_url = excluded.logo_url
                "#,
            )
            .bind(&claims.sub)
            .bind(&public_url)
            .execute(&state.db)
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

            return Ok(Json(serde_json::json!({ "logo_url": public_url })));
        }
    }

    Err((StatusCode::BAD_REQUEST, "Aucun fichier 'logo' reçu.".to_string()))
}

/// GET /api/companies/:id/brochure (lecture seule pour le staff Genius uniquement)
pub async fn get_company_brochure_readonly(
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
    Path(company_id): Path<String>,
) -> Result<Json<BrochurePayload>, (StatusCode, String)> {
    verify_crm_staff(&state, &headers).await?;
    let payload = load_brochure_for_company(&state.db, &company_id).await?;
    Ok(Json(payload))
}