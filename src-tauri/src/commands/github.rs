use serde::{Deserialize, Serialize};
use crate::services::process::run_command;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PRFile {
    pub path: String,
    pub additions: u32,
    pub deletions: u32,
    pub status: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PRMetadata {
    pub owner: String,
    pub repo: String,
    pub number: u32,
    pub title: String,
    pub body: String,
    pub author: String,
    pub base_ref: String,
    pub head_ref: String,
    pub head_sha: String,
    pub additions: u32,
    pub deletions: u32,
    pub files: Vec<PRFile>,
}

pub fn parse_pr_url(url: &str) -> Result<(String, String, u32), String> {
    // Full URL: https://github.com/owner/repo/pull/123
    let re_full = regex::Regex::new(r"github\.com/([a-zA-Z0-9._-]+)/([a-zA-Z0-9._-]+)/pull/(\d+)")
        .unwrap();
    if let Some(caps) = re_full.captures(url) {
        let owner = caps.get(1).unwrap().as_str().to_string();
        let repo = caps.get(2).unwrap().as_str().to_string();
        let number: u32 = caps.get(3).unwrap().as_str().parse()
            .map_err(|e| format!("Invalid PR number: {}", e))?;
        return Ok((owner, repo, number));
    }

    // Shorthand: owner/repo#123
    let re_short = regex::Regex::new(r"^([a-zA-Z0-9._-]+)/([a-zA-Z0-9._-]+)#(\d+)$")
        .unwrap();
    if let Some(caps) = re_short.captures(url) {
        let owner = caps.get(1).unwrap().as_str().to_string();
        let repo = caps.get(2).unwrap().as_str().to_string();
        let number: u32 = caps.get(3).unwrap().as_str().parse()
            .map_err(|e| format!("Invalid PR number: {}", e))?;
        return Ok((owner, repo, number));
    }

    Err("Invalid PR URL format. Use https://github.com/owner/repo/pull/123 or owner/repo#123".to_string())
}

#[tauri::command]
pub async fn fetch_pr_metadata(pr_url: String) -> Result<PRMetadata, String> {
    let (owner, repo, number) = parse_pr_url(&pr_url)?;

    let number_str = number.to_string();
    let repo_arg = format!("{}/{}", owner, repo);

    let result = run_command(
        "gh",
        &[
            "pr", "view",
            &number_str,
            "--repo", &repo_arg,
            "--json", "title,body,author,files,additions,deletions,baseRefName,headRefName,headRefOid"
        ],
        None
    )?;

    if result.exit_code != 0 {
        return Err(format!("gh command failed: {}", result.stderr));
    }

    let data: serde_json::Value = serde_json::from_str(&result.stdout)
        .map_err(|e| format!("Failed to parse gh output: {}", e))?;

    let head_sha = data["headRefOid"].as_str()
        .unwrap_or("")
        .to_string();

    Ok(PRMetadata {
        owner,
        repo,
        number,
        title: data["title"].as_str().unwrap_or("").to_string(),
        body: data["body"].as_str().unwrap_or("").to_string(),
        author: data["author"]["login"].as_str().unwrap_or("unknown").to_string(),
        base_ref: data["baseRefName"].as_str().unwrap_or("").to_string(),
        head_ref: data["headRefName"].as_str().unwrap_or("").to_string(),
        head_sha,
        additions: data["additions"].as_u64().unwrap_or(0) as u32,
        deletions: data["deletions"].as_u64().unwrap_or(0) as u32,
        files: data["files"].as_array()
            .map(|arr| {
                arr.iter().filter_map(|f| {
                    Some(PRFile {
                        path: f["path"].as_str()?.to_string(),
                        additions: f["additions"].as_u64().unwrap_or(0) as u32,
                        deletions: f["deletions"].as_u64().unwrap_or(0) as u32,
                        status: f["status"].as_str().unwrap_or("modified").to_string(),
                    })
                }).collect()
            })
            .unwrap_or_default(),
    })
}

#[tauri::command]
pub async fn fetch_pr_diff(owner: String, repo: String, number: u32) -> Result<String, String> {
    let number_str = number.to_string();
    let repo_arg = format!("{}/{}", owner, repo);

    let result = run_command(
        "gh",
        &["pr", "diff", &number_str, "--repo", &repo_arg],
        None
    )?;

    if result.exit_code != 0 {
        return Err(format!("gh command failed: {}", result.stderr));
    }

    Ok(result.stdout)
}

#[tauri::command]
pub async fn fetch_file_content(
    owner: String,
    repo: String,
    file_ref: String,
    path: String,
    repo_root: Option<String>,
) -> Result<String, String> {
    // Strategy 1: git show from local repo
    if let Some(root) = repo_root {
        let ref_path = format!("{}:{}", file_ref, path);
        let result = run_command("git", &["show", &ref_path], Some(&root))?;
        if result.exit_code == 0 {
            return Ok(result.stdout);
        }
        // File doesn't exist at this ref (new/deleted)
        return Ok(String::new());
    }

    // Strategy 2: gh api
    let api_path = format!("repos/{}/{}/contents/{}?ref={}", owner, repo, path, file_ref);
    let result = run_command(
        "gh",
        &["api", &api_path, "-H", "Accept: application/vnd.github.raw+json"],
        None,
    )?;

    if result.exit_code != 0 {
        if result.stderr.contains("404") {
            return Ok(String::new());
        }
        return Err(format!("Failed to fetch file: {}", result.stderr));
    }

    Ok(result.stdout)
}
