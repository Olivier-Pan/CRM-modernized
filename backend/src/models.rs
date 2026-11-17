use chrono::NaiveDateTime;
use serde::{Deserialize, Serialize};
use sqlx::FromRow;

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct Company {
    pub id: String,
    pub edition_id: Option<String>,
    pub name: String,
    pub logo_url: Option<String>,
    pub sector: Option<String>,
    pub size: Option<String>,
    pub description: Option<String>,
    pub website: Option<String>,
    pub global_status: String,
    pub novatech_offer: Option<bool>,
    pub forum_contract_date: Option<String>,
    pub internal_remark: Option<String>,
    pub company_password: Option<String>,
    pub created_at: NaiveDateTime,
    pub updated_at: NaiveDateTime,
}

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct Contact {
    pub id: String,
    pub company_id: String,
    pub contact_type: String,
    pub first_name: Option<String>,
    pub last_name: Option<String>,
    pub email: Option<String>,
    pub phone: Option<String>,
    pub linkedin_url: Option<String>,
    pub is_primary: bool,
    pub created_at: NaiveDateTime,
}

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct Shark {
    pub id: String,
    pub company_id: String,
    pub member_id: String,
    pub contact_id: Option<String>,
    pub status: String,
    pub contact_date: Option<String>,
    pub contact_method: Option<String>,
    pub notes: Option<String>,
    pub created_at: NaiveDateTime,
}

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct Member {
   pub id: String,
   pub name: String,
   pub email: String,
   pub role: String,
   #[serde(skip_serializing)] // Empêche de renvoyer le hash au frontend !
   pub password_hash: String,
   pub created_at: NaiveDateTime,
}