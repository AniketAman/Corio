use crate::services::process::run_command;

fn worktree_path(repo: &str, pr_number: u32) -> String {
    format!("/tmp/.code-reviewer/{}-pr-{}", repo, pr_number)
}

#[tauri::command]
pub async fn create_worktree(
    repo_path: String,
    repo_name: String,
    pr_number: u32,
    branch: String,
) -> Result<String, String> {
    // Fetch latest from origin
    let fetch_result = run_command("git", &["fetch", "origin"], Some(&repo_path))?;
    if fetch_result.exit_code != 0 {
        return Err(format!("git fetch failed: {}", fetch_result.stderr));
    }

    let wt_path = worktree_path(&repo_name, pr_number);

    // Remove existing worktree if present
    let _ = remove_worktree_internal(&repo_path, &wt_path);

    // Ensure parent directory exists
    if let Some(parent) = std::path::Path::new(&wt_path).parent() {
        let _ = std::fs::create_dir_all(parent);
    }

    // Try to create worktree from origin/<branch>
    let origin_branch = format!("origin/{}", branch);
    let result = run_command(
        "git",
        &["worktree", "add", &wt_path, &origin_branch],
        Some(&repo_path),
    )?;

    if result.exit_code != 0 {
        // Fallback: try the branch name directly
        let result2 = run_command(
            "git",
            &["worktree", "add", &wt_path, &branch],
            Some(&repo_path),
        )?;
        if result2.exit_code != 0 {
            return Err(format!("git worktree add failed: {}", result2.stderr));
        }
    }

    Ok(wt_path)
}

fn remove_worktree_internal(repo_path: &str, wt_path: &str) -> Result<(), String> {
    let _ = run_command(
        "git",
        &["worktree", "remove", "--force", wt_path],
        Some(repo_path),
    );

    // Also remove directory if still exists
    if std::path::Path::new(wt_path).exists() {
        std::fs::remove_dir_all(wt_path)
            .map_err(|e| format!("Failed to remove worktree directory: {}", e))?;
    }

    Ok(())
}

#[tauri::command]
pub async fn remove_worktree(repo_path: String, worktree_path: String) -> Result<(), String> {
    remove_worktree_internal(&repo_path, &worktree_path)
}
