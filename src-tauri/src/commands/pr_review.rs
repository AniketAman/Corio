use serde::{Deserialize, Serialize};
use crate::services::process::run_command;
use std::fs;
use std::env;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReviewComment {
    pub path: String,
    pub line: u32,
    pub body: String,
}

#[derive(Debug, Serialize)]
struct GitHubReviewComment {
    path: String,
    line: u32,
    side: String,
    body: String,
}

#[derive(Debug, Serialize)]
struct GitHubReviewPayload {
    commit_id: String,
    event: String,
    body: String,
    comments: Vec<GitHubReviewComment>,
}

#[tauri::command]
pub async fn submit_review(
    owner: String,
    repo: String,
    number: u32,
    head_sha: String,
    verdict: String,
    body: Option<String>,
    comments: Vec<ReviewComment>,
) -> Result<(), String> {
    // Convert comments to GitHub API format
    let github_comments: Vec<GitHubReviewComment> = comments
        .into_iter()
        .map(|c| GitHubReviewComment {
            path: c.path,
            line: c.line,
            side: "RIGHT".to_string(),
            body: c.body,
        })
        .collect();

    // Create the review payload
    let payload = GitHubReviewPayload {
        commit_id: head_sha,
        event: verdict,
        body: body.unwrap_or_default(),
        comments: github_comments,
    };

    // Generate temp file path
    let temp_dir = env::temp_dir();
    let uuid = uuid::Uuid::new_v4();
    let temp_file = temp_dir.join(format!("cr-review-{}.json", uuid));

    // Write payload to temp file
    let payload_json = serde_json::to_string_pretty(&payload)
        .map_err(|e| format!("Failed to serialize review payload: {}", e))?;

    fs::write(&temp_file, payload_json)
        .map_err(|e| format!("Failed to write temp file: {}", e))?;

    // Call gh API - ensure cleanup happens regardless of result
    let result = (|| {
        let temp_file_str = temp_file.to_str()
            .ok_or_else(|| "Failed to convert temp file path to string".to_string())?;

        let endpoint = format!("repos/{}/{}/pulls/{}/reviews", owner, repo, number);
        let output = run_command(
            "gh",
            &["api", &endpoint, "--method", "POST", "--input", temp_file_str],
            None,
        )?;

        if output.exit_code != 0 {
            return Err(format!(
                "gh command failed (exit {}): {}",
                output.exit_code,
                output.stderr
            ));
        }

        Ok(())
    })();

    // Always clean up temp file
    let _ = fs::remove_file(&temp_file);

    result
}
