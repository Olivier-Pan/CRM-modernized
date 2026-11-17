//! Authorization matrix, driven through the real router (`build_router`).
//!
//! Nothing here reaches Google: the fake service-account key fails in
//! `from_rsa_pem` before any HTTP call. So a handler that gets past its auth
//! checks and then needs the sheet answers 500 — "passed auth" — while a request
//! the auth layer refuses answers 401. The companies cache is pre-filled, so
//! company reads run fully offline and their JSON can be checked.

use std::sync::Arc;
use std::time::Duration;

use axum::{
    body::Body,
    http::{Method, Request, StatusCode},
    Router,
};
use serde_json::{json, Value};
use tower::ServiceExt;

use crate::{
    auth::jwt::create_token,
    cache::{AppCache, CacheEntry},
    config::Config,
    models::company::{Company, CompanyTimestamps, SharkGlobalStatus},
    ratelimit::RateLimiter,
    sheets::{GoogleAuth, SheetsClient},
    state::AppState,
};

const SECRET: &str = "test-secret";
const REMARK: &str = "Ne pas relancer avant mars";
const PASSWORD: &str = "Kf7mQp2xTb9R";

fn company(id: &str, name: &str) -> Company {
    Company {
        id: id.to_string(),
        edition_id: "e1".to_string(),
        name: name.to_string(),
        company_password: PASSWORD.to_string(),
        contact_name: Some("Ada".to_string()),
        contact_email: Some("ada@example.com".to_string()),
        contact_phone: None,
        contact_linkedin: None,
        website: None,
        sector: None,
        size: None,
        global_status: SharkGlobalStatus::Refused,
        description: None,
        logo_url: None,
        offers: None,
        booth_size: None,
        participation_options: None,
        representatives: None,
        special_needs: None,
        timestamps: CompanyTimestamps {
            created_at: "2026-09-01T10:00:00Z".to_string(),
            updated_at: "2026-09-02T10:00:00Z".to_string(),
        },
        internal_remark: Some(REMARK.to_string()),
        legal_name: Some(format!("{name} SAS")),
        novatech_offer: Some(true),
        forum_contract_date: Some("2026-03-15".to_string()),
        row_index: 2,
    }
}

async fn app() -> Router {
    let service_account = r#"{"client_email":"test@example.com","private_key":"not-a-key"}"#;
    let state = Arc::new(AppState {
        config: Config {
            google_sheets_id: "test".to_string(),
            google_service_account_json: service_account.to_string(),
            jwt_secret: SECRET.to_string(),
            port: 0,
        },
        sheets: SheetsClient::new(
            "test".to_string(),
            GoogleAuth::new(service_account).expect("fake service account parses"),
        ),
        cache: AppCache::new(),
        contact_rate_limit: RateLimiter::new(Duration::from_secs(600), 5),
        remark_write_lock: tokio::sync::Mutex::new(()),
        extra_columns_ready: std::sync::atomic::AtomicBool::new(true),
    });

    *state.cache.companies.write().await = Some(CacheEntry::new(
        vec![company("acme", "Acme"), company("globex", "Globex")],
        Duration::from_secs(600),
    ));

    crate::build_router(state)
}

fn token(role: &str, sub: &str) -> String {
    create_token(sub, "someone@example.com", role, SECRET).unwrap()
}

fn acme() -> Option<String> {
    Some(token("Company", "acme"))
}
fn member() -> Option<String> {
    Some(token("Member", "member-1"))
}
fn admin() -> Option<String> {
    Some(token("Admin", "admin-1"))
}

async fn call(
    app: &Router,
    method: Method,
    uri: &str,
    token: Option<String>,
    body: Option<Value>,
) -> (StatusCode, Value) {
    let mut request = Request::builder().method(method).uri(uri);
    if let Some(token) = token {
        request = request.header("Authorization", format!("Bearer {token}"));
    }
    let request = match body {
        Some(body) => request
            .header("Content-Type", "application/json")
            .body(Body::from(body.to_string())),
        None => request.body(Body::empty()),
    }
    .unwrap();

    let response = app.clone().oneshot(request).await.unwrap();
    let status = response.status();
    let bytes = axum::body::to_bytes(response.into_body(), usize::MAX).await.unwrap();
    (status, serde_json::from_slice(&bytes).unwrap_or(Value::Null))
}

/// Every route a Company token must never pass, with a body valid for staff.
fn staff_only_routes() -> Vec<(Method, &'static str, Option<Value>)> {
    vec![
        (Method::GET, "/api/companies", None),
        (Method::POST, "/api/companies", Some(json!({ "edition_id": "e1", "name": "New" }))),
        (
            Method::PUT,
            "/api/companies/acme/internal-remark",
            Some(json!({ "internal_remark": "x", "expected_internal_remark": "" })),
        ),
        (Method::POST, "/api/companies/acme/regenerate-password", None),
        (Method::GET, "/api/sharks", None),
        (Method::GET, "/api/sharks?company_id=acme", None),
        (Method::GET, "/api/sharks/mine", None),
        (Method::POST, "/api/sharks", Some(json!({ "company_id": "acme", "contact_method": "Email" }))),
        (Method::PUT, "/api/sharks/s1", Some(json!({ "notes": "x" }))),
        (Method::DELETE, "/api/sharks/s1", None),
        (Method::GET, "/api/members", None),
        (Method::GET, "/api/editions", None),
    ]
}

#[tokio::test]
async fn company_tokens_are_refused_on_every_staff_route() {
    let app = app().await;
    for (method, uri, body) in staff_only_routes() {
        let (status, _) = call(&app, method.clone(), uri, acme(), body.clone()).await;
        assert_eq!(status, StatusCode::UNAUTHORIZED, "Company token passed {method} {uri}");

        let (status, _) = call(&app, method.clone(), uri, None, body).await;
        assert_eq!(status, StatusCode::UNAUTHORIZED, "no token passed {method} {uri}");
    }
}

#[tokio::test]
async fn staff_get_past_auth_on_every_staff_route() {
    let app = app().await;
    for (method, uri, body) in staff_only_routes() {
        let (status, _) = call(&app, method.clone(), uri, admin(), body).await;
        assert_ne!(status, StatusCode::UNAUTHORIZED, "Admin refused on {method} {uri}");
    }
    let (status, _) = call(&app, Method::GET, "/api/members", member(), None).await;
    assert_ne!(status, StatusCode::UNAUTHORIZED, "Member refused on GET /api/members");
}

/// The portal's own read: the profile, and nothing internal.
#[tokio::test]
async fn a_company_reads_its_own_profile_without_internal_fields() {
    let app = app().await;
    let (status, body) = call(&app, Method::GET, "/api/companies/acme", acme(), None).await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(body["name"], "Acme");
    assert_eq!(body["contact_name"], "Ada");
    for key in ["internal_remark", "company_password", "global_status", "timestamps"] {
        assert!(body.get(key).is_none(), "{key} leaked to the company: {body}");
    }
    // Its own contract details travel: the portal form edits them.
    assert_eq!(body["legal_name"], "Acme SAS");
    assert_eq!(body["novatech_offer"], true);
    assert_eq!(body["forum_contract_date"], "2026-03-15");
}

#[tokio::test]
async fn a_company_saves_its_contract_details() {
    let app = app().await;
    let put = |body: Value| {
        let app = app.clone();
        async move { call(&app, Method::PUT, "/api/companies/acme", acme(), Some(body)).await }
    };

    // Valid: gets past auth and validation (then the fake sheet answers 500).
    let valid = json!({
        "legal_name": "Acme SAS", "novatech_offer": true, "forum_contract_date": "2026-03-15"
    });
    assert_eq!(put(valid).await.0, StatusCode::INTERNAL_SERVER_ERROR);
    let cleared = json!({ "legal_name": "", "novatech_offer": false, "forum_contract_date": "" });
    assert_eq!(put(cleared).await.0, StatusCode::INTERNAL_SERVER_ERROR);

    // Invalid: refused before any sheet access, with a French message.
    for bad in [
        json!({ "forum_contract_date": "15/03/2026" }),
        json!({ "forum_contract_date": "2026-02-30" }),
        json!({ "legal_name": "x".repeat(201) }),
    ] {
        let (status, body) = put(bad.clone()).await;
        assert_eq!(status, StatusCode::BAD_REQUEST, "{bad}");
        assert!(!body["error"].as_str().unwrap_or("").is_empty(), "{bad}: {body}");
    }
}

#[tokio::test]
async fn a_company_cannot_read_another_company() {
    let app = app().await;
    let (status, body) = call(&app, Method::GET, "/api/companies/globex", acme(), None).await;
    assert_eq!(status, StatusCode::UNAUTHORIZED);
    assert!(body.get("name").is_none());
}

#[tokio::test]
async fn staff_read_every_field() {
    let app = app().await;
    let (status, body) = call(&app, Method::GET, "/api/companies/globex", member(), None).await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(body["internal_remark"], REMARK);
    assert_eq!(body["company_password"], PASSWORD);
    assert_eq!(body["global_status"], "Refused");
    assert_eq!(body["timestamps"]["updated_at"], "2026-09-02T10:00:00Z");

    let (status, body) = call(&app, Method::GET, "/api/companies", member(), None).await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(body.as_array().map(Vec::len), Some(2));
    assert_eq!(body[0]["internal_remark"], REMARK);
}

#[tokio::test]
async fn a_company_saves_only_its_own_profile() {
    let app = app().await;
    let put = |uri: &'static str, body: Value| {
        let app = app.clone();
        async move { call(&app, Method::PUT, uri, acme(), Some(body)).await.0 }
    };

    // Its own profile: gets past auth (then the fake sheet answers 500).
    let profile = json!({ "contact_name": "Ada", "special_needs": "Prise électrique" });
    assert_eq!(put("/api/companies/acme", profile.clone()).await, StatusCode::INTERNAL_SERVER_ERROR);

    // Never another company, never the name, never the CRM status.
    assert_eq!(put("/api/companies/globex", profile).await, StatusCode::UNAUTHORIZED);
    assert_eq!(put("/api/companies/acme", json!({ "name": "Hacked" })).await, StatusCode::UNAUTHORIZED);
    assert_eq!(
        put("/api/companies/acme", json!({ "global_status": "Signed" })).await,
        StatusCode::UNAUTHORIZED
    );
}

#[tokio::test]
async fn only_admins_rename() {
    let app = app().await;
    let rename = || Some(json!({ "name": "Renamed" }));
    let (status, _) = call(&app, Method::PUT, "/api/companies/acme", member(), rename()).await;
    assert_eq!(status, StatusCode::UNAUTHORIZED);
    let (status, _) = call(&app, Method::PUT, "/api/companies/acme", admin(), rename()).await;
    assert_eq!(status, StatusCode::INTERNAL_SERVER_ERROR, "Admin rename should pass auth");
}

#[tokio::test]
async fn remark_body_is_validated_before_any_sheet_access() {
    let app = app().await;
    let uri = "/api/companies/acme/internal-remark";

    let too_long = json!({ "internal_remark": "é".repeat(5001), "expected_internal_remark": "" });
    let (status, body) = call(&app, Method::PUT, uri, member(), Some(too_long)).await;
    assert_eq!(status, StatusCode::BAD_REQUEST);
    assert!(body["error"].as_str().unwrap_or("").contains("5000"));

    // A body missing a field is rejected — it must never read as "clear it".
    let (status, _) = call(&app, Method::PUT, uri, member(), Some(json!({}))).await;
    assert!(status.is_client_error() && status != StatusCode::UNAUTHORIZED, "got {status}");
}

#[tokio::test]
async fn a_blank_password_never_logs_a_company_in() {
    let app = app().await;
    for password in ["", "   "] {
        let body = json!({ "company_id": "Acme", "password": password });
        let (status, _) = call(&app, Method::POST, "/api/auth/login", None, Some(body)).await;
        assert_eq!(status, StatusCode::UNAUTHORIZED, "blank password {password:?}");
    }
}

#[tokio::test]
async fn a_company_still_reaches_its_session_info() {
    let app = app().await;
    let (status, body) = call(&app, Method::GET, "/api/auth/me", acme(), None).await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(body["role"], "Company");
}
