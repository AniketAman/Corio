use tauri::{AppHandle, Emitter};
use tauri_plugin_notification::NotificationExt;
use std::process::{Command, Stdio};
use std::io::{BufRead, BufReader, Write};
use crate::commands::github::PRMetadata;
use crate::commands::presets::Preset;

fn build_review_prompt(
    pr: &PRMetadata,
    diff: &str,
    preset: &Preset,
    repo_mode: bool,
) -> String {
    let file_instructions = if preset.parse_file_markers {
        pr.files
            .iter()
            .map(|f| {
                format!(
                    "### FILE: {}\nExplain what changed in this file and why. Note any issues, edge cases, or suggestions.",
                    f.path
                )
            })
            .collect::<Vec<_>>()
            .join("\n\n")
    } else {
        String::new()
    };

    let repo_context = if repo_mode {
        ". You have access to the full codebase via Read, Glob, and Grep tools"
    } else {
        ""
    };

    let repo_tool_hint = if repo_mode {
        "Use the codebase tools to read related files (imports, tests, types) for deeper context."
    } else {
        ""
    };

    let result = preset.template
        .replace("{{repoContext}}", repo_context)
        .replace("{{title}}", &pr.title)
        .replace("{{author}}", &pr.author)
        .replace("{{fileCount}}", &pr.files.len().to_string())
        .replace("{{additions}}", &pr.additions.to_string())
        .replace("{{deletions}}", &pr.deletions.to_string())
        .replace("{{body}}", if pr.body.is_empty() { "(No description provided)" } else { &pr.body })
        .replace("{{diff}}", diff)
        .replace("{{fileInstructions}}", &file_instructions)
        .replace("{{repoToolHint}}", repo_tool_hint);

    format!("{}\n{}", result, crate::commands::presets::reviewer_discipline())
}

#[tauri::command]
pub async fn start_review(
    app: AppHandle,
    pr: PRMetadata,
    diff: String,
    model: String,
    preset_id: String,
    worktree_path: Option<String>,
    tab_id: String,
) -> Result<String, String> {
    // Get preset
    let presets = crate::commands::presets::get_all_presets().await?;
    let preset = presets
        .iter()
        .find(|p| p.id == preset_id)
        .ok_or_else(|| format!("Preset not found: {}", preset_id))?
        .clone();

    let repo_mode = worktree_path.is_some();
    let prompt = build_review_prompt(&pr, &diff, &preset, repo_mode);

    // Build claude CLI args
    let mut args = vec![
        "-p".to_string(),
        "--model".to_string(),
        model,
        "--output-format".to_string(),
        "stream-json".to_string(),
        "--verbose".to_string(),
    ];

    if repo_mode {
        args.push("--allowedTools".to_string());
        args.push("Read,Glob,Grep".to_string());
    }

    // Ensure PATH includes common locations for claude CLI
    let path_env = std::env::var("PATH").unwrap_or_default();
    let home = std::env::var("HOME").unwrap_or_default();
    let extended_path = format!("{}/.superset/bin:{}/.local/bin:{}/.cargo/bin:/usr/local/bin:/opt/homebrew/bin:{}", home, home, home, path_env);

    let mut cmd = Command::new("claude");
    cmd.args(&args)
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .env("PATH", &extended_path)
        .env("HOME", &home);

    for key in &["CLAUDE_CODE_USE_BEDROCK", "AWS_PROFILE", "AWS_REGION", "AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY", "AWS_SESSION_TOKEN", "ANTHROPIC_API_KEY"] {
        if let Ok(val) = std::env::var(key) {
            cmd.env(key, val);
        }
    }

    if let Some(ref cwd) = worktree_path {
        cmd.current_dir(cwd);
    }

    let mut child = cmd.spawn()
        .map_err(|e| format!("Failed to spawn claude: {}. PATH={}", e, extended_path))?;

    // Write prompt to stdin then close it
    if let Some(mut stdin) = child.stdin.take() {
        stdin.write_all(prompt.as_bytes())
            .map_err(|e| format!("Failed to write prompt: {}", e))?;
        // stdin drops here, closing it
    }

    let stdout = child.stdout.take()
        .ok_or_else(|| "Failed to capture stdout".to_string())?;

    let stderr = child.stderr.take();

    // Shared session_id across threads
    let session_id = std::sync::Arc::new(std::sync::Mutex::new(String::new()));
    let session_id_clone = session_id.clone();

    // Drain stderr in a separate thread to prevent pipe buffer deadlock
    let stderr_handle = stderr.map(|se| {
        std::thread::spawn(move || {
            let reader = BufReader::new(se);
            let mut output = String::new();
            for line in reader.lines() {
                if let Ok(l) = line {
                    output.push_str(&l);
                    output.push('\n');
                }
            }
            output
        })
    });

    // Spawn a background thread to read stdout and emit Tauri events
    let app_clone = app.clone();
    let tab_id_clone = tab_id.clone();
    std::thread::spawn(move || {
        let reader = BufReader::new(stdout);
        for line in reader.lines() {
            let line = match line {
                Ok(l) => l,
                Err(_) => break,
            };

            if line.trim().is_empty() {
                continue;
            }

            // Non-JSON lines from claude (errors, login prompts) — emit as chunks so user sees them
            if !line.starts_with('{') {
                let _ = app_clone.emit("review-chunk", serde_json::json!({ "tabId": tab_id_clone, "text": line }));
                continue;
            }

            if let Ok(data) = serde_json::from_str::<serde_json::Value>(&line) {
                // Extract session ID from system init event
                if data["type"] == "system" && data["subtype"] == "init" {
                    if let Some(sid) = data["session_id"].as_str() {
                        let mut session = session_id_clone.lock().unwrap();
                        *session = sid.to_string();
                        let _ = app_clone.emit("review-session-id", serde_json::json!({ "tabId": tab_id_clone, "sessionId": sid }));
                    }
                }

                // Extract text from complete assistant messages
                if data["type"] == "assistant" {
                    if let Some(content) = data["message"]["content"].as_array() {
                        for block in content {
                            if block["type"] == "text" {
                                if let Some(text) = block["text"].as_str() {
                                    let _ = app_clone.emit("review-chunk", serde_json::json!({ "tabId": tab_id_clone, "text": text }));
                                }
                            }
                        }
                    }
                }

                // Handle streaming content_block_delta events
                if data["type"] == "content_block_delta" {
                    if let Some(text) = data["delta"]["text"].as_str() {
                        let _ = app_clone.emit("review-chunk", serde_json::json!({ "tabId": tab_id_clone, "text": text }));
                    }
                }
            }
        }

        // Wait for the claude process to finish
        let _ = child.wait();
        let _ = app_clone.emit("review-complete", serde_json::json!({ "tabId": tab_id_clone }));

        // Task 19: Send native notification when review is complete
        let _ = app_clone.notification()
            .builder()
            .title("Review Complete")
            .body("Your PR review is ready")
            .show();
    });

    // Return immediately — session ID is delivered via the review-session-id event
    // The frontend listens for this event and updates sessionId in context
    Ok(String::new())
}
