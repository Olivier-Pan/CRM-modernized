use std::sync::Arc;
use axum::Router;
use sqlx::sqlite::SqlitePoolOptions;
use tower_http::{cors::{Any, CorsLayer}, services::ServeDir, trace::TraceLayer};
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
    dotenvy::dotenv().ok();

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

    sqlx::migrate!("./migrations")
        .run(&pool)
        .await
        .expect("Erreur lors de l'exécution des migrations SQLite");

    let config = Config::from_env().expect("Erreur de chargement de la configuration");
    let cache = AppCache::new();
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
        .route("/api/auth/register", axum::routing::post(routes::auth::register))
        .route("/api/auth/me", axum::routing::get(routes::auth::me))

        // Companies
        .route("/api/companies", axum::routing::get(routes::companies::list_companies).post(routes::companies::create_company))
        .route("/api/companies/:id", axum::routing::get(routes::companies::get_company).put(routes::companies::update_company).delete(routes::companies::delete_company))
        .route("/api/companies/:id/regenerate-password", axum::routing::post(routes::companies::regenerate_password))
        .route("/api/companies/:id/internal-remark", axum::routing::put(routes::companies::update_internal_remark))
        .route("/api/companies/:id/brochure", axum::routing::get(routes::brochure::get_company_brochure_readonly))

        // Portail Exposant (Login, Brochure & Logo)
        .route("/api/exhibitor/login", axum::routing::post(routes::brochure::login_exhibitor))
        .route("/api/exhibitor/brochure", axum::routing::get(routes::brochure::get_exhibitor_brochure).put(routes::brochure::update_exhibitor_brochure))
        .route("/api/exhibitor/logo", axum::routing::post(routes::brochure::upload_exhibitor_logo))

        // Contacts
        .route("/api/companies/:id/contacts", axum::routing::get(routes::contacts::list_contacts).post(routes::contacts::create_contact))
        .route("/api/contacts/:id", axum::routing::put(routes::contacts::update_contact).delete(routes::contacts::delete_contact))

        // Members
        .route("/api/members", axum::routing::get(routes::members::list_members))
        .route("/api/members/:id/role", axum::routing::put(routes::members::update_role))
        .route("/api/members/:id/reset-password", axum::routing::put(routes::members::reset_password))

        // Sharks
        .route("/api/sharks", axum::routing::get(routes::sharks::list_sharks).post(routes::sharks::create_shark))
        .route("/api/sharks/mine", axum::routing::get(routes::sharks::my_sharks))
        .route("/api/sharks/:id", axum::routing::put(routes::sharks::update_shark).delete(routes::sharks::delete_shark))

        // Logs
        .route("/api/logs", axum::routing::get(routes::logs::list_logs))

        // Follow-ups
        .route("/api/companies/:id/follow-ups", axum::routing::get(routes::follow_ups::list_follow_ups).post(routes::follow_ups::create_follow_up))
        .route("/api/companies/:id/follow-ups/:follow_up_id", axum::routing::put(routes::follow_ups::update_follow_up).delete(routes::follow_ups::delete_follow_up))

        // Fichiers uploadés (logos exposants) — /api/uploads passe par le proxy Nginx existant
        .nest_service("/api/uploads", ServeDir::new("uploads"))
        .nest_service("/uploads", ServeDir::new("uploads"))

        // Health check
        .route("/api/health", axum::routing::get(|| async { "ok" }))
        .layer(cors)
        .layer(TraceLayer::new_for_http())
        .with_state(state)
}