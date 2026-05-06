use serde::{Deserialize, Serialize};
use std::fs;
use crate::services::paths;
use crate::commands::github::PRMetadata;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CachedReview {
    pub key: String,
    pub review_text: String,
    pub pr_metadata: PRMetadata,
    pub timestamp: String,
}

fn cache_filename(owner: &str, repo: &str, number: u32, preset: &str, sha: &str) -> String {
    let short_sha = if sha.len() >= 7 { &sha[..7] } else { sha };
    format!("{}-{}-{}-{}-{}.json", owner, repo, number, preset, short_sha)
}

#[tauri::command]
pub async fn get_cached_review(
    owner: String,
    repo: String,
    number: u32,
    preset: String,
    sha: String,
) -> Result<Option<CachedReview>, String> {
    let filename = cache_filename(&owner, &repo, number, &preset, &sha);
    let cache_path = paths::cache_dir().join(&filename);

    if !cache_path.exists() {
        return Ok(None);
    }

    let content = fs::read_to_string(&cache_path)
        .map_err(|e| format!("Failed to read cache: {}", e))?;

    let cached: CachedReview = serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse cache: {}", e))?;

    Ok(Some(cached))
}

#[tauri::command]
pub async fn save_cached_review(
    owner: String,
    repo: String,
    number: u32,
    preset: String,
    sha: String,
    review_text: String,
    pr_metadata: PRMetadata,
) -> Result<(), String> {
    let short_sha = if sha.len() >= 7 { &sha[..7] } else { &sha };
    let key = format!("{}/{}#{}:{}:{}", owner, repo, number, preset, short_sha);
    let filename = cache_filename(&owner, &repo, number, &preset, &sha);
    let cache_path = paths::cache_dir().join(&filename);

    let cached = CachedReview {
        key,
        review_text,
        pr_metadata,
        timestamp: chrono::Utc::now().to_rfc3339(),
    };

    let content = serde_json::to_string_pretty(&cached)
        .map_err(|e| format!("Failed to serialize cache: {}", e))?;

    fs::write(&cache_path, content)
        .map_err(|e| format!("Failed to write cache: {}", e))?;

    Ok(())
}
