use serde::{Deserialize, Serialize};
use std::fs;
use uuid::Uuid;

use crate::services::paths;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Preset {
    pub id: String,
    pub name: String,
    pub description: String,
    pub template: String,
    pub built_in: bool,
    pub parse_file_markers: bool,
}

// ─── Built-in preset templates ───────────────────────────────────────────────

const REVIEW_TEMPLATE: &str = r#"You are reviewing a GitHub PR{{repoContext}}.

## PR Information
- **Title:** {{title}}
- **Author:** {{author}}
- **Files changed:** {{fileCount}} (+{{additions}} -{{deletions}})

## PR Description (author's stated intent)
{{body}}

## Diff
{{diff}}

## Instructions

Structure your review using EXACTLY this format. Use the exact markers shown below — they are parsed by the UI to show per-file explanations.

### Overall Summary

Write 2-4 paragraphs covering:
- What this PR aims to achieve (based on the description above)
- Whether the implementation matches the stated intent — call out any gaps or deviations
- Overall assessment of the approach

{{fileInstructions}}

### Potential Issues
List any cross-cutting concerns, edge cases, or improvements across the entire PR.

{{repoToolHint}}"#;

const EXPLAIN_TEMPLATE: &str = r#"You are explaining a GitHub PR to help the reader understand the codebase{{repoContext}}.

## PR Information
- **Title:** {{title}}
- **Author:** {{author}}
- **Files changed:** {{fileCount}} (+{{additions}} -{{deletions}})

## PR Description
{{body}}

## Diff
{{diff}}

## Instructions

Focus on TEACHING — help the reader understand what this code does and why.

### Overall Summary
Write 2-4 paragraphs covering:
- What problem does this PR solve?
- What approach was chosen and WHY (what alternatives exist?)
- How do these changes fit into the larger system architecture?
- Key abstractions or patterns introduced

{{fileInstructions}}

### Key Takeaways
Summarize the most important concepts a reader should remember.

{{repoToolHint}}"#;

const SECURITY_TEMPLATE: &str = r#"You are performing a security-focused review of a GitHub PR{{repoContext}}.

## PR Information
- **Title:** {{title}}
- **Author:** {{author}}
- **Files changed:** {{fileCount}} (+{{additions}} -{{deletions}})

## PR Description
{{body}}

## Diff
{{diff}}

## Instructions

Focus EXCLUSIVELY on security concerns. Skip all stylistic, performance, or architectural feedback unless it has direct security implications.

Analyze the diff for:
- **Injection:** SQL injection, command injection, template injection, XSS
- **Authentication & Authorization:** auth bypasses, privilege escalation, missing access checks
- **Secrets:** hardcoded credentials, API keys, tokens, or sensitive data in code
- **Insecure Deserialization:** untrusted data deserialized without validation
- **SSRF:** server-side request forgery via user-controlled URLs
- **Path Traversal:** user input used in file paths without sanitization
- **Sensitive Data Exposure:** PII logged, returned in errors, or stored insecurely
- **Input Validation:** missing or insufficient validation at trust boundaries

## Output Format

### Security Summary
1-2 paragraphs: overall security posture of this PR. Is it introducing new attack surface?

### Findings

For each finding, use this format:

#### [SEVERITY: Critical|High|Medium|Low] — Title
- **Location:** file:line
- **Description:** What the vulnerability is
- **Attack scenario:** How an attacker could exploit this
- **Recommendation:** Specific fix

If no security issues are found, state that clearly and explain what security-relevant patterns were checked.

{{repoToolHint}}"#;

const STRICT_TEMPLATE: &str = r#"You are performing a strict, priority-ordered code review of a GitHub PR{{repoContext}}.

## PR Information
- **Title:** {{title}}
- **Author:** {{author}}
- **Files changed:** {{fileCount}} (+{{additions}} -{{deletions}})

## PR Description (author's stated intent)
{{body}}

## Diff
{{diff}}

## Instructions

Review with strict standards. Only report findings with confidence >= 80/100. Use the PR description as the author's plan — verify the implementation aligns with it.

## Output Format

Use EXACTLY this structure:

## Scope
Reviewing: [list files changed]
Against: PR description (author's stated intent)

## Strengths
- [specific things done well, with file:line references]

## Findings

### Priority 1 — Correctness & Performance

#### Critical (confidence 90–100)
[findings — if none, write "None"]

#### Important (confidence 80–89)
[findings — if none, write "None"]

### Priority 2 — Code Duplication & Conventions
[findings — if none, write "None"]

### Priority 3 — Test Coverage
[findings — if none, write "None"]

## Mandatory Checks
- **Code Duplication:** [result]
- **Migration Safety:** [N/A or result]
- **Error Handling:** [result]
- **Plan Alignment:** [result comparing implementation to PR description, or "N/A — no PR description provided"]

## Assessment
**Ready to merge:** Yes | With fixes | No
**Reasoning:** [1-2 sentence verdict]

---

For each finding include: file:line, what the issue is, why it matters, suggested fix, and confidence N/100.

{{repoToolHint}}"#;

// ─── Built-in presets ────────────────────────────────────────────────────────

fn built_in_presets() -> Vec<Preset> {
    vec![
        Preset {
            id: "review".to_string(),
            name: "Review".to_string(),
            description: "Balanced review — explain changes and surface issues".to_string(),
            template: REVIEW_TEMPLATE.to_string(),
            built_in: true,
            parse_file_markers: true,
        },
        Preset {
            id: "explain".to_string(),
            name: "Explain".to_string(),
            description: "Teaching mode — why this approach, key abstractions, system fit"
                .to_string(),
            template: EXPLAIN_TEMPLATE.to_string(),
            built_in: true,
            parse_file_markers: true,
        },
        Preset {
            id: "security".to_string(),
            name: "Security".to_string(),
            description: "OWASP-focused — injection, auth, secrets, data exposure".to_string(),
            template: SECURITY_TEMPLATE.to_string(),
            built_in: true,
            parse_file_markers: false,
        },
        Preset {
            id: "strict".to_string(),
            name: "Strict".to_string(),
            description: "Priority-ordered findings, confidence scores, merge verdict".to_string(),
            template: STRICT_TEMPLATE.to_string(),
            built_in: true,
            parse_file_markers: false,
        },
    ]
}

// ─── Tauri commands ──────────────────────────────────────────────────────────

#[tauri::command]
pub async fn get_all_presets() -> Result<Vec<Preset>, String> {
    let mut presets = built_in_presets();

    let presets_dir = paths::presets_dir();
    if presets_dir.exists() {
        if let Ok(entries) = fs::read_dir(&presets_dir) {
            for entry in entries.flatten() {
                let path = entry.path();
                if path.extension().and_then(|s| s.to_str()) == Some("json") {
                    if let Ok(content) = fs::read_to_string(&path) {
                        if let Ok(preset) = serde_json::from_str::<Preset>(&content) {
                            presets.push(preset);
                        }
                    }
                }
            }
        }
    }

    Ok(presets)
}

#[tauri::command]
pub async fn save_preset(preset: Preset) -> Result<Preset, String> {
    if preset.built_in {
        return Err("Cannot modify built-in presets".to_string());
    }

    let id = if preset.id.is_empty() {
        Uuid::new_v4().to_string()
    } else {
        preset.id.clone()
    };

    let new_preset = Preset {
        id: id.clone(),
        built_in: false,
        ..preset
    };

    let filename = format!("{}.json", id);
    let preset_path = paths::presets_dir().join(filename);

    let content = serde_json::to_string_pretty(&new_preset)
        .map_err(|e| format!("Failed to serialize preset: {}", e))?;

    fs::write(&preset_path, content)
        .map_err(|e| format!("Failed to write preset: {}", e))?;

    Ok(new_preset)
}

#[tauri::command]
pub async fn delete_preset(id: String) -> Result<(), String> {
    if built_in_presets().iter().any(|p| p.id == id) {
        return Err("Cannot delete built-in presets".to_string());
    }

    let filename = format!("{}.json", id);
    let preset_path = paths::presets_dir().join(filename);

    if !preset_path.exists() {
        return Err("Preset not found".to_string());
    }

    fs::remove_file(&preset_path)
        .map_err(|e| format!("Failed to delete preset: {}", e))?;

    Ok(())
}
