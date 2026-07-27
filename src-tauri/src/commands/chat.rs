use tauri::{AppHandle, Emitter};
use std::process::{Command, Stdio};
use std::io::{BufRead, BufReader, Write};

#[tauri::command]
pub async fn send_chat_message(
    app: AppHandle,
    question: String,
    session_id: String,
    model: String,
    worktree_path: Option<String>,
    tab_id: String,
) -> Result<(), String> {
    let mut args = vec![
        "-p".to_string(),
        "--model".to_string(),
        model,
        "--output-format".to_string(),
        "stream-json".to_string(),
        "--verbose".to_string(),
        "--resume".to_string(),
        session_id,
    ];

    if worktree_path.is_some() {
        args.push("--allowedTools".to_string());
        args.push("Read,Glob,Grep,mcp__codegraph__codegraph_explore".to_string());
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

    // Write question to stdin
    if let Some(mut stdin) = child.stdin.take() {
        stdin.write_all(question.as_bytes())
            .map_err(|e| format!("Failed to write question: {}", e))?;
    }

    let stdout = child.stdout.take()
        .ok_or_else(|| "Failed to capture stdout".to_string())?;

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

            if let Ok(data) = serde_json::from_str::<serde_json::Value>(&line) {
                // Extract text from assistant messages
                if data["type"] == "assistant" {
                    if let Some(content) = data["message"]["content"].as_array() {
                        for block in content {
                            if block["type"] == "text" {
                                if let Some(text) = block["text"].as_str() {
                                    let _ = app_clone.emit("chat-chunk", serde_json::json!({ "tabId": tab_id_clone, "text": text }));
                                }
                            }
                        }
                    }
                }

                // Handle streaming content_block_delta
                if data["type"] == "content_block_delta" {
                    if let Some(text) = data["delta"]["text"].as_str() {
                        let _ = app_clone.emit("chat-chunk", serde_json::json!({ "tabId": tab_id_clone, "text": text }));
                    }
                }
            }
        }

        let _ = child.wait();
        let _ = app_clone.emit("chat-complete", serde_json::json!({ "tabId": tab_id_clone }));
    });

    Ok(())
}
