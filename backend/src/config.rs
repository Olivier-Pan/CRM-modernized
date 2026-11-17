use anyhow::{Context, Result};

#[derive(Debug, Clone)]
pub struct Config {
    pub jwt_secret: String,
    pub port: u16,
}

impl Config {
    pub fn from_env() -> Result<Self> {
        dotenvy::dotenv().ok();

        let jwt_secret = std::env::var("JWT_SECRET")
            .context("JWT_SECRET env var is required")?;

        let port = std::env::var("PORT")
            .unwrap_or_else(|_| "3000".to_string())
            .parse::<u16>()
            .context("PORT must be a valid port number")?;

        Ok(Config {
            jwt_secret,
            port,
        })
    }
}