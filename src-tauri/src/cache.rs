use once_cell::sync::Lazy;
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use std::time::{Duration, SystemTime};

#[derive(Clone)]
struct CacheEntry<T> {
    value: T,
    expires_at: SystemTime,
}

pub struct Cache<T: Clone> {
    store: Arc<Mutex<HashMap<String, CacheEntry<T>>>>,
    ttl: Duration,
}

impl<T: Clone> Cache<T> {
    pub fn new(ttl_seconds: u64) -> Self {
        Self {
            store: Arc::new(Mutex::new(HashMap::new())),
            ttl: Duration::from_secs(ttl_seconds),
        }
    }

    pub fn get(&self, key: &str) -> Option<T> {
        let mut store = self.store.lock().unwrap();
        
        if let Some(entry) = store.get(key) {
            // Check if expired
            if SystemTime::now() < entry.expires_at {
                return Some(entry.value.clone());
            } else {
                // Remove expired entry
                store.remove(key);
            }
        }
        
        None
    }

    pub fn set(&self, key: String, value: T) {
        let mut store = self.store.lock().unwrap();
        let expires_at = SystemTime::now() + self.ttl;
        
        store.insert(key, CacheEntry {
            value,
            expires_at,
        });
    }

    pub fn clear(&self) {
        let mut store = self.store.lock().unwrap();
        store.clear();
    }

    #[allow(dead_code)]
    pub fn remove(&self, key: &str) {
        let mut store = self.store.lock().unwrap();
        store.remove(key);
    }

    /// Clean up expired entries
    pub fn cleanup(&self) {
        let mut store = self.store.lock().unwrap();
        let now = SystemTime::now();
        
        store.retain(|_, entry| now < entry.expires_at);
    }
}

// Specialized cache for query responses
pub type QueryCache = Cache<String>;

// Global cache instances
pub static QUERY_CACHE: Lazy<QueryCache> = Lazy::new(|| Cache::new(300)); // 5 minutes

#[allow(dead_code)]
pub static PRICE_CACHE: Lazy<QueryCache> = Lazy::new(|| Cache::new(30));  // 30 seconds
#[allow(dead_code)]
pub static WALLET_CACHE: Lazy<QueryCache> = Lazy::new(|| Cache::new(60)); // 1 minute

// Cache keys helper
pub fn query_cache_key(query: &str) -> String {
    format!("query:{}", query)
}

#[allow(dead_code)]
pub fn price_cache_key(symbol: &str) -> String {
    format!("price:{}", symbol.to_lowercase())
}

#[allow(dead_code)]
pub fn wallet_cache_key(address: &str) -> String {
    format!("wallet:{}", address)
}

