mod commands;
mod services;

use services::paths;
use tauri::Emitter;
use tauri::Manager;
use tauri::menu::{Menu, PredefinedMenuItem, Submenu};
use tauri_plugin_global_shortcut::GlobalShortcutExt;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    if let Err(e) = paths::ensure_dirs() {
        eprintln!("Failed to create config directories: {}", e);
    }

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .setup(|app| {
            // --- Task 22: Native Menu Bar ---
            let app_handle = app.handle();
            build_native_menu(app_handle)?;

            // --- Task 18: Global Keyboard Shortcut (Cmd+Shift+R) ---
            register_global_shortcut(app)?;

            // --- Task 20: Deep Links ---
            register_deep_links(app)?;

            Ok(())
        })
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

/// Task 22: Build native macOS menu bar
fn build_native_menu(app_handle: &tauri::AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    let about = PredefinedMenuItem::about(app_handle, Some("About Code Reviewer"), None)?;
    let separator = PredefinedMenuItem::separator(app_handle)?;
    let hide = PredefinedMenuItem::hide(app_handle, Some("Hide Code Reviewer"))?;
    let hide_others = PredefinedMenuItem::hide_others(app_handle, Some("Hide Others"))?;
    let show_all = PredefinedMenuItem::show_all(app_handle, Some("Show All"))?;
    let quit = PredefinedMenuItem::quit(app_handle, Some("Quit Code Reviewer"))?;

    let app_menu = Submenu::with_items(
        app_handle,
        "Code Reviewer",
        true,
        &[
            &about,
            &separator,
            &hide,
            &hide_others,
            &show_all,
            &PredefinedMenuItem::separator(app_handle)?,
            &quit,
        ],
    )?;

    // Edit menu
    let cut = PredefinedMenuItem::cut(app_handle, Some("Cut"))?;
    let copy = PredefinedMenuItem::copy(app_handle, Some("Copy"))?;
    let paste = PredefinedMenuItem::paste(app_handle, Some("Paste"))?;
    let select_all = PredefinedMenuItem::select_all(app_handle, Some("Select All"))?;

    let edit_menu = Submenu::with_items(
        app_handle,
        "Edit",
        true,
        &[&cut, &copy, &paste, &PredefinedMenuItem::separator(app_handle)?, &select_all],
    )?;

    // Window menu
    let minimize = PredefinedMenuItem::minimize(app_handle, Some("Minimize"))?;
    let fullscreen = PredefinedMenuItem::fullscreen(app_handle, Some("Zoom"))?;
    let close = PredefinedMenuItem::close_window(app_handle, Some("Close"))?;

    let window_menu = Submenu::with_items(
        app_handle,
        "Window",
        true,
        &[&minimize, &fullscreen, &PredefinedMenuItem::separator(app_handle)?, &close],
    )?;

    let menu = Menu::with_items(app_handle, &[&app_menu, &edit_menu, &window_menu])?;
    app_handle.set_menu(menu)?;

    Ok(())
}

/// Task 18: Register global keyboard shortcut Cmd+Shift+R
fn register_global_shortcut(app: &mut tauri::App) -> Result<(), Box<dyn std::error::Error>> {
    use tauri_plugin_global_shortcut::ShortcutState;

    let app_handle = app.handle().clone();
    app.global_shortcut().on_shortcut("CmdOrCtrl+Shift+R", move |_app, _shortcut, event| {
        if event.state == ShortcutState::Pressed {
            if let Some(window) = app_handle.get_webview_window("main") {
                let _ = window.set_focus();
                let _ = window.unminimize();
            }
        }
    })?;

    Ok(())
}

/// Task 20: Register deep link handler
fn register_deep_links(app: &mut tauri::App) -> Result<(), Box<dyn std::error::Error>> {
    use tauri_plugin_deep_link::DeepLinkExt;

    let handle = app.handle().clone();
    app.deep_link().on_open_url(move |event| {
        // Parse URLs like code-reviewer://owner/repo/number
        for url in event.urls() {
            let url_str = url.to_string();
            let _ = handle.emit("deep-link-open", url_str);
        }
    });

    Ok(())
}
