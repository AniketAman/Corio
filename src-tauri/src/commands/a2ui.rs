use std::process::{Command, Stdio};
use std::io::Write;

fn build_a2ui_prompt(review_text: &str) -> String {
    format!(
        r#"Convert the following code review into an A2UI interactive format.

Return a JSON array where each element represents a visual component.

Review text:
{}

Return ONLY the JSON array, no markdown formatting."#,
        review_text
    )
}

fn fix_a2ui_payload(raw: &str) -> Option<Vec<serde_json::Value>> {
    // Try direct parse
    if let Ok(payload) = serde_json::from_str::<Vec<serde_json::Value>>(raw) {
        return Some(payload);
    }

    // Try extracting from markdown code block
    if let Some(start) = raw.find("```json") {
        let after_marker = &raw[start + 7..];
        if let Some(end) = after_marker.find("```") {
            let json_str = &after_marker[..end];
            if let Ok(payload) = serde_json::from_str::<Vec<serde_json::Value>>(json_str.trim()) {
                return Some(payload);
            }
        }
    }

    // Try extracting any JSON array
    if let Some(start) = raw.find('[') {
        if let Some(end) = raw.rfind(']') {
            let json_str = &raw[start..=end];
            if let Ok(payload) = serde_json::from_str::<Vec<serde_json::Value>>(json_str) {
                return Some(payload);
            }
        }
    }

    None
}

#[tauri::command]
pub async fn convert_to_a2ui(review_text: String) -> Result<Vec<serde_json::Value>, String> {
    let prompt = build_a2ui_prompt(&review_text);

    let path_env = std::env::var("PATH").unwrap_or_default();
    let home = std::env::var("HOME").unwrap_or_default();
    let extended_path = format!("{}/.superset/bin:{}/.local/bin:{}/.cargo/bin:/usr/local/bin:/opt/homebrew/bin:{}", home, home, home, path_env);

    let mut cmd = Command::new("claude");
    cmd.args(&["-p", "--model", "haiku", "--output-format", "json"])
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

    let mut child = cmd.spawn()
        .map_err(|e| format!("Failed to spawn claude: {}", e))?;

    if let Some(mut stdin) = child.stdin.take() {
        stdin.write_all(prompt.as_bytes())
            .map_err(|e| format!("Failed to write prompt: {}", e))?;
    }

    let output = child.wait_with_output()
        .map_err(|e| format!("Failed to read output: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Claude exited with code: {:?}. {}", output.status.code(), stderr));
    }

    let stdout = String::from_utf8_lossy(&output.stdout).to_string();

    // Try to extract result from JSON wrapper
    let raw_text = if let Ok(response) = serde_json::from_str::<serde_json::Value>(&stdout) {
        if let Some(result) = response["result"].as_str() {
            result.to_string()
        } else if let Some(content) = response["content"].as_array() {
            content.iter()
                .find(|b| b["type"] == "text")
                .and_then(|b| b["text"].as_str())
                .unwrap_or(&stdout)
                .to_string()
        } else {
            stdout
        }
    } else {
        stdout
    };

    fix_a2ui_payload(&raw_text)
        .ok_or_else(|| "Failed to parse A2UI payload from Claude response".to_string())
}
