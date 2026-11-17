use std::sync::Arc;
use axum::Router;
use sqlx::sqlite::SqlitePoolOptions;
use tower_http::{cors::{Any, CorsLayer}, trace::TraceLayer};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt, EnvFilter};

mod auth;
#[cfg(test)]
mod authz_tests;
mod cache;
mod config;
mod error;
mod middleware;
mod models;
mod ratelimit;
mod routes;
mod state;

use cache::AppCache;
use config::Config;
use ratelimit::RateLimiter;
use state::AppState;

#[tokio::main]
async fn main() {
    dotenvy::dotenv().ok(); // Lit automatiquement le fichier .env

    tracing_subscriber::registry()
        .with(EnvFilter::new(std::env::var("RUST_LOG").unwrap_or_else(|_| "info".into())))
        .with(tracing_subscriber::fmt::layer())
        .init();

    let db_url = std::env::var("DATABASE_URL").unwrap_or_else(|_| "sqlite://crm.db?mode=rwc".to_string());

    let pool = SqlitePoolOptions::new()
        .max_connections(5)
        .connect(&db_url)
        .await
        .expect("Impossible de se connecter à SQLite");

    // Applique automatiquement les fichiers du dossier migrations/
    sqlx::migrate!("./migrations")
        .run(&pool)
        .await
        .expect("Erreur lors de l'exécution des migrations SQLite");

    let config = Config::from_env().expect("Erreur de chargement de la configuration");
    let cache = AppCache::new();
    
    // Initialisation du rate limiter avec 1 minute de fenêtre et 5 requêtes max par exemple
    let contact_rate_limit = RateLimiter::new(std::time::Duration::from_secs(60), 5);

    let state = Arc::new(AppState {
        config,
        db: pool,
        cache,
        contact_rate_limit,
        remark_write_lock: tokio::sync::Mutex::new(()),
    });

    let app = build_router(state);

    let listener = tokio::net::TcpListener::bind("0.0.0.0:3000").await.unwrap();
    tracing::info!("🚀 Serveur démarré sur http://localhost:3000");
    axum::serve(listener, app).await.unwrap();
}

fn build_router(state: Arc<AppState>) -> Router {
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    Router::new()
        // Auth de base
        .route("/api/auth/login", axum::routing::post(routes::auth::login))
        .route("/api/auth/register", axum::routing::post(routes::auth::register)) // <-- CETTE LIGNE DOIT ÊTRE LÀ
        .route("/api/auth/me", axum::routing::get(routes::auth::me))
        
        // Companies
        .route("/api/companies", axum::routing::get(routes::companies::list_companies).post(routes::companies::create_company))
        .route("/api/companies/:id", axum::routing::get(routes::companies::get_company).put(routes::companies::update_company).delete(routes::companies::delete_company))
        .route("/api/companies/:id/regenerate-password", axum::routing::post(routes::companies::regenerate_password))
        .route("/api/companies/:id/internal-remark", axum::routing::put(routes::companies::update_internal_remark))
        
        // Contacts
        .route("/api/companies/:id/contacts", axum::routing::get(routes::contacts::list_contacts).post(routes::contacts::create_contact))
        .route("/api/contacts/:id", axum::routing::put(routes::contacts::update_contact).delete(routes::contacts::delete_contact))
        
        .route("/api/members", axum::routing::get(routes::members::list_members))
        .route("/api/members/:id/role", axum::routing::put(routes::members::update_role))
        .route("/api/members/:id/reset-password", axum::routing::put(routes::members::reset_password))
        
        // Sharks
        .route("/api/sharks", axum::routing::get(routes::sharks::list_sharks).post(routes::sharks::create_shark))
        .route("/api/sharks/mine", axum::routing::get(routes::sharks::my_sharks))
        .route("/api/sharks/:id", axum::routing::put(routes::sharks::update_shark).delete(routes::sharks::delete_shark))
        
        //logs
        .route("/api/logs", axum::routing::get(routes::logs::list_logs))

        //follow-ups
        .route("/api/companies/:id/follow-ups", axum::routing::get(routes::follow_ups::list_follow_ups).post(routes::follow_ups::create_follow_up))
        .route("/api/companies/:id/follow-ups/:follow_up_id", axum::routing::put(routes::follow_ups::update_follow_up).delete(routes::follow_ups::delete_follow_up))
        
        // Health check
        .route("/api/health", axum::routing::get(|| async { "ok" }))
        .layer(cors)
        .layer(TraceLayer::new_for_http())
        .with_state(state)

}