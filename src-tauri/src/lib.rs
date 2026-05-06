mod commands;
mod services;

use services::paths;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    if let Err(e) = paths::ensure_dirs() {
        eprintln!("Failed to create config directories: {}", e);
    }

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            commands::github::fetch_pr_metadata,
            commands::github::fetch_pr_diff,
            commands::config::load_config,
            commands::config::save_config,
            commands::config::get_repo_path,
            commands::config::save_repo_path,
            commands::worktree::create_worktree,
            commands::worktree::remove_worktree,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
