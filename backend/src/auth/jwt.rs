use anyhow::{Context, Result};
use chrono::Utc;
use jsonwebtoken::{decode, encode, DecodingKey, EncodingKey, Header, Validation};
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Claims {
    pub sub: String,   // user id
    pub email: String,
    pub role: String,  // "Admin" | "Member" | "Company"
    pub exp: usize,
}

/// Creates a JWT token valid for 24 hours.
pub fn create_token(sub: &str, email: &str, role: &str, secret: &str) -> Result<String> {
    let exp = (Utc::now().timestamp() + 60 * 60 * 24) as usize;

    let claims = Claims {
        sub: sub.to_string(),
        email: email.to_string(),
        role: role.to_string(),
        exp,
    };

    encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(secret.as_bytes()),
    )
    .context("Failed to create JWT token")
}

/// Validates a JWT token and returns its claims.
pub fn validate_token(token: &str, secret: &str) -> Result<Claims> {
    let token_data = decode::<Claims>(
        token,
        &DecodingKey::from_secret(secret.as_bytes()),
        &Validation::default(),
    )
    .context("Invalid or expired JWT token")?;

    Ok(token_data.claims)
}
