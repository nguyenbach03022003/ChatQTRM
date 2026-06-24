//! Git tools. We shell out to the user's `git` (scoped with `-C <root>`) rather
//! than linking libgit2 — predictable, and `git` is a hard dependency anyway.

use std::process::Command;

use serde::Serialize;
use tauri::State;

use crate::state::AppState;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GitFile {
    pub path: String,
    pub status: String, // two-char porcelain code, e.g. " M", "??", "A "
    pub staged: bool,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GitStatus {
    pub branch: String,
    pub ahead: i32,
    pub behind: i32,
    pub files: Vec<GitFile>,
    pub is_repo: bool,
}

fn run_git(root: &std::path::Path, args: &[&str]) -> Result<String, String> {
    let output = Command::new("git")
        .arg("-C")
        .arg(root)
        .args(args)
        .output()
        .map_err(|e| format!("Failed to run git: {e}"))?;
    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).trim().to_string());
    }
    Ok(String::from_utf8_lossy(&output.stdout).to_string())
}

#[tauri::command]
pub fn git_status(state: State<'_, AppState>) -> Result<GitStatus, String> {
    let root = state.active_root()?;
    let inside = run_git(&root, &["rev-parse", "--is-inside-work-tree"]).is_ok();
    if !inside {
        return Ok(GitStatus {
            branch: String::new(),
            ahead: 0,
            behind: 0,
            files: vec![],
            is_repo: false,
        });
    }

    let raw = run_git(&root, &["status", "--porcelain=v1", "--branch"])?;
    let mut branch = String::new();
    let (mut ahead, mut behind) = (0, 0);
    let mut files = Vec::new();

    for line in raw.lines() {
        if let Some(rest) = line.strip_prefix("## ") {
            branch = rest
                .split("...")
                .next()
                .unwrap_or(rest)
                .split(' ')
                .next()
                .unwrap_or("")
                .to_string();
            if let Some(a) = capture(rest, "ahead ") {
                ahead = a;
            }
            if let Some(b) = capture(rest, "behind ") {
                behind = b;
            }
            continue;
        }
        if line.len() < 3 {
            continue;
        }
        let code = &line[..2];
        let path = line[3..].to_string();
        let staged = code.chars().next().map(|c| c != ' ' && c != '?').unwrap_or(false);
        files.push(GitFile {
            path,
            status: code.to_string(),
            staged,
        });
    }

    Ok(GitStatus {
        branch,
        ahead,
        behind,
        files,
        is_repo: true,
    })
}

fn capture(text: &str, marker: &str) -> Option<i32> {
    let idx = text.find(marker)? + marker.len();
    let num: String = text[idx..].chars().take_while(|c| c.is_ascii_digit()).collect();
    num.parse().ok()
}

#[tauri::command]
pub fn git_diff(state: State<'_, AppState>, path: Option<String>, staged: Option<bool>) -> Result<String, String> {
    let root = state.active_root()?;
    let mut args = vec!["diff", "--no-color"];
    if staged.unwrap_or(false) {
        args.push("--cached");
    }
    if let Some(ref p) = path {
        args.push("--");
        args.push(p);
    }
    run_git(&root, &args)
}

#[tauri::command]
pub fn git_stage(state: State<'_, AppState>, paths: Vec<String>) -> Result<(), String> {
    let root = state.active_root()?;
    let mut args = vec!["add", "--"];
    let refs: Vec<&str> = paths.iter().map(|s| s.as_str()).collect();
    args.extend(refs);
    run_git(&root, &args).map(|_| ())
}

#[tauri::command]
pub fn git_unstage(state: State<'_, AppState>, paths: Vec<String>) -> Result<(), String> {
    let root = state.active_root()?;
    let mut args = vec!["restore", "--staged", "--"];
    let refs: Vec<&str> = paths.iter().map(|s| s.as_str()).collect();
    args.extend(refs);
    run_git(&root, &args).map(|_| ())
}

#[tauri::command]
pub fn git_commit(state: State<'_, AppState>, message: String) -> Result<String, String> {
    let root = state.active_root()?;
    if message.trim().is_empty() {
        return Err("Commit message cannot be empty.".into());
    }
    run_git(&root, &["commit", "-m", &message])
}

#[tauri::command]
pub fn git_branches(state: State<'_, AppState>) -> Result<Vec<String>, String> {
    let root = state.active_root()?;
    let raw = run_git(&root, &["branch", "--format=%(refname:short)"])?;
    Ok(raw.lines().map(|s| s.trim().to_string()).filter(|s| !s.is_empty()).collect())
}

#[tauri::command]
pub fn git_create_branch(state: State<'_, AppState>, name: String) -> Result<String, String> {
    let root = state.active_root()?;
    run_git(&root, &["checkout", "-b", &name])
}

#[tauri::command]
pub fn git_checkout(state: State<'_, AppState>, name: String) -> Result<String, String> {
    let root = state.active_root()?;
    run_git(&root, &["checkout", &name])
}
