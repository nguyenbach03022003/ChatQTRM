//! File-name and full-text search across the active project, honoring
//! `.gitignore` via the `ignore` crate and capping results for responsiveness.

use ignore::WalkBuilder;
use regex::RegexBuilder;
use serde::Serialize;
use tauri::State;

use crate::state::{to_relative, AppState};

const MAX_FILE_HITS: usize = 200;
const MAX_TEXT_HITS: usize = 500;
const MAX_FILE_BYTES: u64 = 2_000_000;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TextMatch {
    pub path: String,
    pub line: usize,
    pub column: usize,
    pub text: String,
}

/// Find files whose path contains `query` (case-insensitive substring).
#[tauri::command]
pub fn search_files(state: State<'_, AppState>, query: String) -> Result<Vec<String>, String> {
    let root = state.active_root()?;
    let needle = query.to_lowercase();
    let mut hits = Vec::new();
    for result in WalkBuilder::new(&root).hidden(false).build() {
        if hits.len() >= MAX_FILE_HITS {
            break;
        }
        let Ok(entry) = result else { continue };
        if !entry.file_type().map(|t| t.is_file()).unwrap_or(false) {
            continue;
        }
        let rel = to_relative(&root, entry.path());
        if needle.is_empty() || rel.to_lowercase().contains(&needle) {
            hits.push(rel);
        }
    }
    Ok(hits)
}

/// Grep-style full-text search. `is_regex` switches between literal and regex.
#[tauri::command]
pub fn search_text(
    state: State<'_, AppState>,
    query: String,
    is_regex: Option<bool>,
    case_sensitive: Option<bool>,
) -> Result<Vec<TextMatch>, String> {
    let root = state.active_root()?;
    if query.is_empty() {
        return Ok(vec![]);
    }
    let pattern = if is_regex.unwrap_or(false) {
        query.clone()
    } else {
        regex::escape(&query)
    };
    let re = RegexBuilder::new(&pattern)
        .case_insensitive(!case_sensitive.unwrap_or(false))
        .build()
        .map_err(|e| format!("Invalid pattern: {e}"))?;

    let mut matches = Vec::new();
    for result in WalkBuilder::new(&root).hidden(false).build() {
        if matches.len() >= MAX_TEXT_HITS {
            break;
        }
        let Ok(entry) = result else { continue };
        if !entry.file_type().map(|t| t.is_file()).unwrap_or(false) {
            continue;
        }
        if entry.metadata().map(|m| m.len()).unwrap_or(0) > MAX_FILE_BYTES {
            continue;
        }
        let Ok(bytes) = std::fs::read(entry.path()) else {
            continue;
        };
        // Skip binary files (NUL byte in the first 8KB).
        if bytes.iter().take(8192).any(|&b| b == 0) {
            continue;
        }
        let content = String::from_utf8_lossy(&bytes);
        let rel = to_relative(&root, entry.path());
        for (i, line) in content.lines().enumerate() {
            if let Some(m) = re.find(line) {
                matches.push(TextMatch {
                    path: rel.clone(),
                    line: i + 1,
                    column: m.start() + 1,
                    text: line.chars().take(400).collect(),
                });
                if matches.len() >= MAX_TEXT_HITS {
                    break;
                }
            }
        }
    }
    Ok(matches)
}
