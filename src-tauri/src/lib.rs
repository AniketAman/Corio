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
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            commands::github::fetch_pr_metadata,
            commands::github::fetch_pr_diff,
            commands::config::load_config,
            commands::config::save_config,
            commands::config::get_repo_path,
            commands::config::save_repo_path,
            commands::worktree::create_worktree,
            commands::worktree::remove_worktree,
            commands::cache::get_cached_review,
            commands::cache::save_cached_review,
            commands::presets::get_all_presets,
            commands::presets::save_preset,
            commands::presets::delete_preset,
            commands::review::start_review,
            commands::chat::send_chat_message,
            commands::a2ui::convert_to_a2ui,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
