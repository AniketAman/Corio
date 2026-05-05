# Code Reviewer

A personal CLI-launched web app that reviews GitHub PRs using Claude Code, presenting diffs and AI analysis in a three-column interface.

## Language

**Preset**:
A named prompt template that controls what Claude focuses on during a review (e.g., finding bugs vs. explaining code).
_Avoid_: Mode, profile, config

**Review (preset)**:
The default preset — balanced analysis that explains changes and surfaces issues, edge cases, and improvements.
_Avoid_: Default mode

**Explain (preset)**:
Teaching-focused preset — why an approach was chosen, how it fits the larger system, key abstractions.
_Avoid_: Learn mode, understand mode

**Security (preset)**:
Narrowly scoped preset focused on OWASP-style concerns: injection, auth bypasses, secrets exposure.
_Avoid_: Audit mode

**Strict (preset)**:
Priority-ordered review with confidence scoring (>=80 threshold), mandatory checks (duplication, migration safety, error handling, plan alignment), and an explicit merge verdict.
_Avoid_: Chirag mode, formal review

**Repo mode**:
Operating mode when CWD is a git repo whose remote matches the PR's repo. Claude gets `Read`, `Glob`, `Grep` tool access for deeper context.
_Avoid_: Local mode, full mode

**Standalone mode**:
Operating mode when CWD does not match the PR's repo. Claude reviews based solely on the diff and PR metadata.
_Avoid_: Remote mode, lite mode

**Session**:
A Claude CLI conversation created by `--resume`. Each review creates one session; chat follow-ups resume it. A new review creates a new session (old one is abandoned).
_Avoid_: Conversation, thread

## Relationships

- A **Preset** produces exactly one prompt for Claude per review
- A review operates in exactly one mode: **Repo mode** or **Standalone mode**
- A **Session** is created per review and reused for chat follow-ups within that review
- Built-in **Presets** are hardcoded; custom **Presets** are stored in `~/.code-reviewer/settings.json`

## Example dialogue

> **Dev:** "I want to switch from Review to Strict — do I need to re-review?"
> **Domain expert:** "Switching the preset only affects the next review. Click Review again to re-run with Strict."

> **Dev:** "What happens to my chat when I re-review?"
> **Domain expert:** "The session is abandoned. Chat history clears — it's a fresh slate."

## Flagged ambiguities

- "mode" could mean Repo/Standalone mode OR the preset type — resolved: "mode" refers exclusively to repo/standalone detection. The prompt style is a "preset."
