//! Project-scoped filesystem tools. Every path goes through `safe_join`, so the
//! assistant can never read or write outside the selected project root.

use std::path::Path;

use serde::{Deserialize, Serialize};
use tauri::State;

use crate::state::{safe_join, to_relative, AppState};

const MAX_READ_CHARS: usize = 200_000;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FileContent {
    pub path: String,
    pub content: String,
    pub truncated: bool,
    pub size: u64,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DirEntry {
    pub name: String,
    pub path: String,
    #[serde(rename = "type")]
    pub kind: String,
    pub has_children: bool,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WriteResult {
    pub path: String,
    pub bytes_written: usize,
    pub created: bool,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EditResult {
    pub path: String,
    pub before: String,
    pub after: String,
    pub replacements: usize,
}

fn is_hidden(name: &str) -> bool {
    name.starts_with(".git") || name == "node_modules" || name == "target" || name == "dist"
}

#[tauri::command]
pub fn read_file(state: State<'_, AppState>, path: String) -> Result<FileContent, String> {
    let root = state.active_root()?;
    let target = safe_join(&root, &path)?;
    if !target.is_file() {
        return Err(format!("File not found: {path}"));
    }
    let size = target.metadata().map(|m| m.len()).unwrap_or(0);
    let raw = std::fs::read(&target).map_err(|e| e.to_string())?;
    let mut content = String::from_utf8_lossy(&raw).to_string();
    let truncated = content.chars().count() > MAX_READ_CHARS;
    if truncated {
        content = content.chars().take(MAX_READ_CHARS).collect();
    }
    Ok(FileContent {
        path: path.replace('\\', "/"),
        content,
        truncated,
        size,
    })
}

#[tauri::command]
pub fn list_dir(state: State<'_, AppState>, path: String) -> Result<Vec<DirEntry>, String> {
    let root = state.active_root()?;
    let target = safe_join(&root, &path)?;
    if !target.is_dir() {
        return Err(format!("Folder not found: {path}"));
    }
    let mut entries: Vec<DirEntry> = Vec::new();
    for item in std::fs::read_dir(&target).map_err(|e| e.to_string())? {
        let item = item.map_err(|e| e.to_string())?;
        let name = item.file_name().to_string_lossy().to_string();
        if is_hidden(&name) {
            continue;
        }
        let p = item.path();
        let is_dir = p.is_dir();
        entries.push(DirEntry {
            name,
            path: to_relative(&root, &p),
            kind: if is_dir { "directory" } else { "file" }.into(),
            has_children: is_dir
                && std::fs::read_dir(&p)
                    .map(|mut it| it.next().is_some())
                    .unwrap_or(false),
        });
    }
    entries.sort_by(|a, b| {
        (a.kind == "file")
            .cmp(&(b.kind == "file"))
            .then(a.name.to_lowercase().cmp(&b.name.to_lowercase()))
    });
    Ok(entries)
}

#[tauri::command]
pub fn write_file(
    state: State<'_, AppState>,
    path: String,
    content: String,
) -> Result<WriteResult, String> {
    let root = state.active_root()?;
    let target = safe_join(&root, &path)?;
    let created = !target.exists();
    if let Some(parent) = target.parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    std::fs::write(&target, content.as_bytes()).map_err(|e| e.to_string())?;
    Ok(WriteResult {
        path: path.replace('\\', "/"),
        bytes_written: content.len(),
        created,
    })
}

#[tauri::command]
pub fn create_file(
    state: State<'_, AppState>,
    path: String,
    content: Option<String>,
) -> Result<WriteResult, String> {
    let root = state.active_root()?;
    let target = safe_join(&root, &path)?;
    if target.exists() {
        return Err(format!("File already exists: {path}"));
    }
    if let Some(parent) = target.parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let body = content.unwrap_or_default();
    std::fs::write(&target, body.as_bytes()).map_err(|e| e.to_string())?;
    Ok(WriteResult {
        path: path.replace('\\', "/"),
        bytes_written: body.len(),
        created: true,
    })
}

#[tauri::command]
pub fn create_folder(state: State<'_, AppState>, path: String) -> Result<String, String> {
    let root = state.active_root()?;
    let target = safe_join(&root, &path)?;
    std::fs::create_dir_all(&target).map_err(|e| e.to_string())?;
    Ok(path.replace('\\', "/"))
}

/// String-replacement edit. Returns before/after so the UI can render a diff and
/// the user can accept/reject. `replace_all` controls single vs. global replace.
#[tauri::command]
pub fn edit_file(
    state: State<'_, AppState>,
    path: String,
    old_string: String,
    new_string: String,
    replace_all: Option<bool>,
) -> Result<EditResult, String> {
    let root = state.active_root()?;
    let target = safe_join(&root, &path)?;
    if !target.is_file() {
        return Err(format!("File not found: {path}"));
    }
    let before = std::fs::read_to_string(&target).map_err(|e| e.to_string())?;

    let (after, replacements) = if replace_all.unwrap_or(false) {
        let count = before.matches(&old_string).count();
        (before.replace(&old_string, &new_string), count)
    } else {
        match before.find(&old_string) {
            Some(idx) => {
                let mut s = before.clone();
                s.replace_range(idx..idx + old_string.len(), &new_string);
                (s, 1)
            }
            None => (before.clone(), 0),
        }
    };

    if replacements == 0 {
        return Err("The text to replace was not found in the file.".into());
    }
    std::fs::write(&target, after.as_bytes()).map_err(|e| e.to_string())?;
    Ok(EditResult {
        path: path.replace('\\', "/"),
        before,
        after,
        replacements,
    })
}

/// Delete a file or folder. Refuses to delete the project root itself.
/// Destructive — the UI must obtain user approval before calling this.
#[tauri::command]
pub fn delete_path(state: State<'_, AppState>, path: String) -> Result<String, String> {
    let root = state.active_root()?;
    let target = safe_join(&root, &path)?;
    if target == root {
        return Err("Refusing to delete the project root.".into());
    }
    if !target.exists() {
        return Err(format!("Path not found: {path}"));
    }
    if target.is_dir() {
        std::fs::remove_dir_all(&target).map_err(|e| e.to_string())?;
    } else {
        std::fs::remove_file(&target).map_err(|e| e.to_string())?;
    }
    Ok(path.replace('\\', "/"))
}

/// Reads a set of project-relative files for chat context, applying per-file and
/// total budget caps. Used by the chat layer; exposed for the UI token estimate.
pub fn read_context_files(
    root: &Path,
    paths: &[String],
    max_files: usize,
    max_chars_per_file: usize,
    max_total: usize,
) -> Vec<(String, String, bool)> {
    let mut out = Vec::new();
    let mut total = 0usize;
    for raw in paths.iter().take(max_files) {
        let Ok(target) = safe_join(root, raw) else {
            continue;
        };
        if !target.is_file() {
            continue;
        }
        let Ok(bytes) = std::fs::read(&target) else {
            continue;
        };
        let mut content = String::from_utf8_lossy(&bytes).to_string();
        let mut truncated = false;
        if content.len() > max_chars_per_file {
            content.truncate(max_chars_per_file);
            truncated = true;
        }
        if total + content.len() > max_total {
            let remaining = max_total.saturating_sub(total);
            content.truncate(remaining);
            truncated = true;
        }
        if content.is_empty() {
            continue;
        }
        total += content.len();
        out.push((raw.replace('\\', "/"), content, truncated));
        if total >= max_total {
            break;
        }
    }
    out
}
