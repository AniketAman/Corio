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

    preset.template
        .replace("{{repoContext}}", repo_context)
        .replace("{{title}}", &pr.title)
        .replace("{{author}}", &pr.author)
        .replace("{{fileCount}}", &pr.files.len().to_string())
        .replace("{{additions}}", &pr.additions.to_string())
        .replace("{{deletions}}", &pr.deletions.to_string())
        .replace("{{body}}", if pr.body.is_empty() { "(No description provided)" } else { &pr.body })
        .replace("{{diff}}", diff)
        .replace("{{fileInstructions}}", &file_instructions)
        .replace("{{repoToolHint}}", repo_tool_hint)
}

#[tauri::command]
pub async fn start_review(
    app: AppHandle,
    pr: PRMetadata,
    diff: String,
    model: String,
    preset_id: String,
    worktree_path: Option<String>,
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

    let mut cmd = Command::new("claude");
    cmd.args(&args)
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());

    if let Some(ref cwd) = worktree_path {
        cmd.current_dir(cwd);
    }

    let mut child = cmd.spawn()
        .map_err(|e| format!("Failed to spawn claude: {}", e))?;

    // Write prompt to stdin then close it
    if let Some(mut stdin) = child.stdin.take() {
        stdin.write_all(prompt.as_bytes())
            .map_err(|e| format!("Failed to write prompt: {}", e))?;
        // stdin drops here, closing it
    }

    let stdout = child.stdout.take()
        .ok_or_else(|| "Failed to capture stdout".to_string())?;

    // Shared session_id across threads
    let session_id = std::sync::Arc::new(std::sync::Mutex::new(String::new()));
    let session_id_clone = session_id.clone();

    // Spawn a background thread to read stdout and emit Tauri events
    let app_clone = app.clone();
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

            if let Ok(data) = serde_json::from_str::<serde_json::Value>(&line) {
                // Extract session ID from system init event
                if data["type"] == "system" && data["subtype"] == "init" {
                    if let Some(sid) = data["session_id"].as_str() {
                        let mut session = session_id_clone.lock().unwrap();
                        *session = sid.to_string();
                        let _ = app_clone.emit("review-session-id", sid.to_string());
                    }
                }

                // Extract text from complete assistant messages
                if data["type"] == "assistant" {
                    if let Some(content) = data["message"]["content"].as_array() {
                        for block in content {
                            if block["type"] == "text" {
                                if let Some(text) = block["text"].as_str() {
                                    let _ = app_clone.emit("review-chunk", text.to_string());
                                }
                            }
                        }
                    }
                }

                // Handle streaming content_block_delta events
                if data["type"] == "content_block_delta" {
                    if let Some(text) = data["delta"]["text"].as_str() {
                        let _ = app_clone.emit("review-chunk", text.to_string());
                    }
                }
            }
        }

        // Wait for the claude process to finish
        let _ = child.wait();
        let _ = app_clone.emit("review-complete", ());

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
