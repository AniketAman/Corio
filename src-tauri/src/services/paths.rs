use std::path::PathBuf;
use dirs::home_dir;

pub fn config_dir() -> PathBuf {
    home_dir()
        .expect("Could not find home directory")
        .join(".code-reviewer")
}

pub fn cache_dir() -> PathBuf {
    config_dir().join("cache")
}

pub fn presets_dir() -> PathBuf {
    config_dir().join("presets")
}

pub fn config_file() -> PathBuf {
    config_dir().join("config.json")
}

pub fn ensure_dirs() -> std::io::Result<()> {
    std::fs::create_dir_all(config_dir())?;
    std::fs::create_dir_all(cache_dir())?;
    std::fs::create_dir_all(presets_dir())?;
    Ok(())
}
