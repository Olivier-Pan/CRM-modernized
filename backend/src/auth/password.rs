use anyhow::{Context, Result};

/// Hashes a plain-text password using bcrypt with cost 12.
pub fn hash_password(plain: &str) -> Result<String> {
    bcrypt::hash(plain, 12).context("Failed to hash password")
}

/// Verifies a plain-text password against a bcrypt hash.
pub fn verify_password(plain: &str, hash: &str) -> Result<bool> {
    bcrypt::verify(plain, hash).context("Failed to verify password")
}
