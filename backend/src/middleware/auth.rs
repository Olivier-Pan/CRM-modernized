use axum::{
    async_trait,
    extract::FromRequestParts,
    http::{request::Parts, HeaderMap},
};

use crate::{
    auth::{jwt::Claims, roles::is_genius_staff},
    error::AppError,
    state::AppState,
};

/// Extracts and validates the JWT from the Authorization header.
/// Injects `Claims` into the handler if valid, otherwise returns 401.
pub struct AuthUser(pub Claims);

#[async_trait]
impl FromRequestParts<std::sync::Arc<AppState>> for AuthUser {
    type Rejection = AppError;

    async fn from_request_parts(
        parts: &mut Parts,
        state: &std::sync::Arc<AppState>,
    ) -> Result<Self, Self::Rejection> {
        let token = extract_bearer_token(&parts.headers)
            .ok_or(AppError::Unauthorized)?;

        let claims = crate::auth::jwt::validate_token(&token, &state.config.jwt_secret)
            .map_err(|_| AppError::Unauthorized)?;

        Ok(AuthUser(claims))
    }
}

/// Like `AuthUser` but additionally requires the `Admin` role.
#[allow(dead_code)]
pub struct RequireAdmin(pub Claims);

#[async_trait]
impl FromRequestParts<std::sync::Arc<AppState>> for RequireAdmin {
    type Rejection = AppError;

    async fn from_request_parts(
        parts: &mut Parts,
        state: &std::sync::Arc<AppState>,
    ) -> Result<Self, Self::Rejection> {
        let token = extract_bearer_token(&parts.headers)
            .ok_or(AppError::Unauthorized)?;

        let claims = crate::auth::jwt::validate_token(&token, &state.config.jwt_secret)
            .map_err(|_| AppError::Unauthorized)?;

        if claims.role != "Admin" {
            return Err(AppError::Unauthorized);
        }

        Ok(RequireAdmin(claims))
    }
}

/// Like `AuthUser` but only for Genius staff (`Admin` or `Member`).
pub struct RequireStaff(pub Claims);

#[async_trait]
impl FromRequestParts<std::sync::Arc<AppState>> for RequireStaff {
    type Rejection = AppError;

    async fn from_request_parts(
        parts: &mut Parts,
        state: &std::sync::Arc<AppState>,
    ) -> Result<Self, Self::Rejection> {
        let AuthUser(claims) = AuthUser::from_request_parts(parts, state).await?;

        if !is_genius_staff(&claims) {
            return Err(AppError::Unauthorized);
        }

        Ok(RequireStaff(claims))
    }
}

/// Like `AuthUser` but only for exhibitor portal accounts (`role == "Company"`).
/// `claims.sub` contains the `company_id`.
pub struct RequireCompany(pub Claims);

#[async_trait]
impl FromRequestParts<std::sync::Arc<AppState>> for RequireCompany {
    type Rejection = AppError;

    async fn from_request_parts(
        parts: &mut Parts,
        state: &std::sync::Arc<AppState>,
    ) -> Result<Self, Self::Rejection> {
        let AuthUser(claims) = AuthUser::from_request_parts(parts, state).await?;

        if claims.role != "Company" {
            return Err(AppError::Unauthorized);
        }

        Ok(RequireCompany(claims))
    }
}

fn extract_bearer_token(headers: &HeaderMap) -> Option<String> {
    let auth_header = headers.get("Authorization")?.to_str().ok()?;
    let token = auth_header.strip_prefix("Bearer ")?;
    Some(token.to_string())
}