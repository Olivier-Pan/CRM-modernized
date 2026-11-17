use std::time::{Duration, Instant};
use tokio::sync::RwLock;

use crate::models::{Company, Contact, Shark};

pub struct CacheEntry<T> {
    data: T,
    fetched_at: Instant,
    ttl: Duration,
}

impl<T> CacheEntry<T> {
    pub fn new(data: T, ttl: Duration) -> Self {
        CacheEntry {
            data,
            fetched_at: Instant::now(),
            ttl,
        }
    }

    pub fn is_fresh(&self) -> bool {
        self.fetched_at.elapsed() < self.ttl
    }

    pub fn get(&self) -> &T {
        &self.data
    }
}

pub struct AppCache {
    // On pointe directement vers les structures de crate::models
    pub companies: RwLock<Option<CacheEntry<Vec<Company>>>>,
    pub contacts: RwLock<Option<CacheEntry<Vec<Contact>>>>,
    pub sharks: RwLock<Option<CacheEntry<Vec<Shark>>>>,
}

impl AppCache {
    pub fn new() -> Self {
        AppCache {
            companies: RwLock::new(None),
            contacts: RwLock::new(None),
            sharks: RwLock::new(None),
        }
    }

    pub fn default_ttl() -> Duration {
        Duration::from_secs(30)
    }
}

impl Default for AppCache {
    fn default() -> Self {
        Self::new()
    }
}