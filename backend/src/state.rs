use crate::{cache::AppCache, config::Config, ratelimit::RateLimiter};
use sqlx::SqlitePool;

pub struct AppState {
    pub config: Config,
    pub db: SqlitePool, // On remplace 'sheets' par 'db'
    pub cache: AppCache,
    /// Guards the public contact form only.
    pub contact_rate_limit: RateLimiter,
    /// Serializes internal-remark saves, so the "has it changed since you
    /// opened it?" check and the write cannot interleave (single backend
    /// instance).
    pub remark_write_lock: tokio::sync::Mutex<()>,
    
    // extra_columns_ready supprimé car propre à la gestion des colonnes Excel/Sheets
}