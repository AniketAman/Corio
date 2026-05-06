use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use crate::services::paths;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Config {
    #[serde(default)]
    pub repos: HashMap<String, String>,
    #[serde(default)]
    pub defaults: ConfigDefaults,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConfigDefaults {
    #[serde(default = "default_model")]
    pub model: String,
    #[serde(default = "default_preset")]
    pub preset: String,
    #[serde(default = "default_notifications_enabled")]
    pub notifications_enabled: bool,
    #[serde(default = "default_notification_sound")]
    pub notification_sound: bool,
}

fn default_model() -> String {
    "claude-opus-4-6-20250925".to_string()
}

fn default_preset() -> String {
    "review".to_string()
}

fn default_notifications_enabled() -> bool {
    true
}

fn default_notification_sound() -> bool {
    false
}

impl Default for ConfigDefaults {
    fn default() -> Self {
        Self {
            model: default_model(),
            preset: default_preset(),
            notifications_enabled: default_notifications_enabled(),
            notification_sound: default_notification_sound(),
        }
    }
}

impl Default for Config {
    fn default() -> Self {
        Self {
            repos: HashMap::new(),
            defaults: ConfigDefaults::default(),
        }
    }
}

#[tauri::command]
pub async fn load_config() -> Result<Config, String> {
    let config_path = paths::config_file();

    if !config_path.exists() {
        return Ok(Config::default());
    }

    let content = fs::read_to_string(&config_path)
        .map_err(|e| format!("Failed to read config: {}", e))?;

    let config: Config = serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse config: {}", e))?;

    Ok(config)
}

#[tauri::command]
pub async fn save_config(config: Config) -> Result<(), String> {
    let config_path = paths::config_file();

    let content = serde_json::to_string_pretty(&config)
        .map_err(|e| format!("Failed to serialize config: {}", e))?;

    fs::write(&config_path, content)
        .map_err(|e| format!("Failed to write config: {}", e))?;

    Ok(())
}

#[tauri::command]
pub async fn get_repo_path(owner: String, repo: String) -> Result<Option<String>, String> {
    let config = load_config().await?;
    let key = format!("{}/{}", owner, repo);
    Ok(config.repos.get(&key).cloned())
}

#[tauri::command]
pub async fn save_repo_path(owner: String, repo: String, path: String) -> Result<(), String> {
    let mut config = load_config().await?;
    let key = format!("{}/{}", owner, repo);

    // Validate path
    let git_path = std::path::Path::new(&path).join(".git");
    if !git_path.exists() {
        return Err(format!("Path {} is not a git repository", path));
    }

    config.repos.insert(key, path);
    save_config(config).await
}
