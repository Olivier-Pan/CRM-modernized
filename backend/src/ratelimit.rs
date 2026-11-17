use std::collections::HashMap;
use std::time::{Duration, Instant};

use tokio::sync::Mutex;

/// Fixed-window limiter, keyed by client IP.
///
/// Only guards the public (unauthenticated) contact endpoint, so a coarse
/// in-process counter is enough: the backend runs as a single container, and a
/// restart simply forgives everyone.
pub struct RateLimiter {
    hits: Mutex<HashMap<String, Vec<Instant>>>,
    window: Duration,
    max_hits: usize,
}

impl RateLimiter {
    pub fn new(window: Duration, max_hits: usize) -> Self {
        RateLimiter {
            hits: Mutex::new(HashMap::new()),
            window,
            max_hits,
        }
    }

    /// Records a hit for `key`. Returns false when the caller is over quota.
    pub async fn check(&self, key: &str) -> bool {
        let now = Instant::now();
        let mut hits = self.hits.lock().await;

        // Opportunistic sweep so a long-running process cannot grow unbounded.
        if hits.len() > 1024 {
            hits.retain(|_, stamps| stamps.iter().any(|t| now.duration_since(*t) < self.window));
        }

        let entry = hits.entry(key.to_string()).or_default();
        entry.retain(|t| now.duration_since(*t) < self.window);

        if entry.len() >= self.max_hits {
            return false;
        }

        entry.push(now);
        true
    }
}
