use anyhow::{Context, Result};
use base64::engine::general_purpose::URL_SAFE_NO_PAD;
use chrono::Utc;
use jsonwebtoken::{encode, Algorithm, EncodingKey, Header};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tokio::sync::Mutex;

#[derive(Debug, Deserialize)]
struct ServiceAccount {
    client_email: String,
    private_key: String,
    // other fields we don't need
}

#[derive(Debug, Serialize, Deserialize)]
struct JwtClaims {
    iss: String,
    scope: String,
    aud: String,
    exp: i64,
    iat: i64,
}

#[derive(Debug, Deserialize)]
struct TokenResponse {
    access_token: String,
    expires_in: i64,
}

#[derive(Debug, Clone)]
struct CachedToken {
    access_token: String,
    expires_at: i64, // Unix timestamp
}

#[derive(Debug, Clone)]
pub struct GoogleAuth {
    service_account: Arc<ServiceAccountInner>,
    cached_token: Arc<Mutex<Option<CachedToken>>>,
    http_client: reqwest::Client,
}

#[derive(Debug)]
struct ServiceAccountInner {
    client_email: String,
    private_key: String,
}

impl GoogleAuth {
    pub fn new(service_account_json: &str) -> Result<Self> {
        let sa: ServiceAccount = serde_json::from_str(service_account_json)
            .context("Failed to parse service account JSON")?;

        Ok(GoogleAuth {
            service_account: Arc::new(ServiceAccountInner {
                client_email: sa.client_email,
                private_key: sa.private_key,
            }),
            cached_token: Arc::new(Mutex::new(None)),
            http_client: reqwest::Client::new(),
        })
    }

    pub async fn get_access_token(&self) -> Result<String> {
        let mut cached = self.cached_token.lock().await;

        // Refresh if missing or expiring in less than 5 minutes
        let now = Utc::now().timestamp();
        if let Some(ref token) = *cached {
            if token.expires_at > now + 300 {
                return Ok(token.access_token.clone());
            }
        }

        // Build JWT for Google OAuth2
        let iat = now;
        let exp = now + 3600;

        let claims = JwtClaims {
            iss: self.service_account.client_email.clone(),
            scope: "https://www.googleapis.com/auth/spreadsheets".to_string(),
            aud: "https://oauth2.googleapis.com/token".to_string(),
            exp,
            iat,
        };

        // Google requires RS256 with the PEM private key
        let encoding_key = EncodingKey::from_rsa_pem(
            self.service_account.private_key.as_bytes(),
        )
        .context("Failed to parse RSA private key from service account")?;

        let header = Header::new(Algorithm::RS256);
        let assertion = encode(&header, &claims, &encoding_key)
            .context("Failed to sign JWT for Google OAuth2")?;

        // Exchange JWT for access token
        let params = [
            ("grant_type", "urn:ietf:params:oauth:grant-type:jwt-bearer"),
            ("assertion", &assertion),
        ];

        let response = self
            .http_client
            .post("https://oauth2.googleapis.com/token")
            .form(&params)
            .send()
            .await
            .context("Failed to send token request to Google")?;

        if !response.status().is_success() {
            let status = response.status();
            let body = response.text().await.unwrap_or_default();
            anyhow::bail!("Google token exchange failed ({}): {}", status, body);
        }

        let token_resp: TokenResponse = response
            .json()
            .await
            .context("Failed to parse Google token response")?;

        let new_cached = CachedToken {
            access_token: token_resp.access_token.clone(),
            expires_at: now + token_resp.expires_in,
        };
        *cached = Some(new_cached);

        Ok(token_resp.access_token)
    }
}

// URL_SAFE_NO_PAD is available for future base64 encoding needs (e.g. JWT parts inspection)
#[allow(dead_code)]
const _URL_SAFE_NO_PAD: base64::engine::general_purpose::GeneralPurpose = URL_SAFE_NO_PAD;
