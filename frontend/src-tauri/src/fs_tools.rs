//! Project-scoped filesystem tools. Every path goes through `safe_join`, so the
//! assistant can never read or write outside the selected project root.

use std::collections::BTreeSet;
use std::path::Path;
use std::process::Command;

use serde::Serialize;
use tauri::State;
use walkdir::WalkDir;

use crate::state::{safe_join, to_relative, AppState};

const MAX_READ_CHARS: usize = 200_000;
const MAX_PROJECT_MAP_FILES: usize = 220;
const MAX_PROJECT_GRAPH_EDGES: usize = 140;

const IMPORTANT_PROJECT_FILES: &[&str] = &[
    "cargo.toml",
    "docker-compose.yml",
    "dockerfile",
    "go.mod",
    "package.json",
    "pyproject.toml",
    "readme.md",
    "requirements.txt",
    "tauri.conf.json",
    "vite.config.ts",
];

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

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ProjectGraphEdge {
    pub from: String,
    pub to: String,
    pub kind: String,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ProjectMap {
    pub root: String,
    pub github_remote: Option<String>,
    pub stack: Vec<String>,
    pub file_count: usize,
    pub directory_count: usize,
    pub total_bytes: u64,
    pub important_files: Vec<String>,
    pub files: Vec<String>,
    pub graph: Vec<ProjectGraphEdge>,
    pub truncated: bool,
}

fn is_hidden(name: &str) -> bool {
    name.starts_with(".git") || name == "node_modules" || name == "target" || name == "dist"
}

fn is_code_graph_file(path: &Path) -> bool {
    matches!(
        path.extension()
            .and_then(|ext| ext.to_str())
            .unwrap_or("")
            .to_lowercase()
            .as_str(),
        "js" | "jsx" | "ts" | "tsx" | "py" | "rs"
    )
}

fn github_remote(root: &Path) -> Option<String> {
    let mut remote = Command::new("git")
        .arg("-C")
        .arg(root)
        .arg("remote")
        .arg("get-url")
        .arg("origin")
        .output()
        .ok()
        .filter(|output| output.status.success())
        .map(|output| String::from_utf8_lossy(&output.stdout).trim().to_string())
        .unwrap_or_default();
    if remote.is_empty() {
        let git_config = root.join(".git").join("config");
        if let Ok(config) = std::fs::read_to_string(git_config) {
            let mut in_origin = false;
            for line in config.lines() {
                let trimmed = line.trim();
                if trimmed.starts_with("[remote ") {
                    in_origin = trimmed == "[remote \"origin\"]";
                    continue;
                }
                if in_origin && trimmed.starts_with("url") {
                    if let Some((_, value)) = trimmed.split_once('=') {
                        remote = value.trim().to_string();
                        break;
                    }
                }
            }
        }
    }
    if remote.is_empty() {
        return None;
    }
    if let Some(rest) = remote.strip_prefix("git@github.com:") {
        return Some(format!(
            "https://github.com/{}",
            rest.trim_end_matches(".git")
        ));
    }
    if remote.starts_with("https://github.com/") {
        return Some(remote.trim_end_matches(".git").to_string());
    }
    Some(remote)
}

fn detect_stack(paths: &[std::path::PathBuf]) -> Vec<String> {
    let names: BTreeSet<String> = paths
        .iter()
        .filter_map(|path| {
            path.file_name()
                .and_then(|n| n.to_str())
                .map(|n| n.to_lowercase())
        })
        .collect();
    let exts: BTreeSet<String> = paths
        .iter()
        .filter_map(|path| {
            path.extension()
                .and_then(|e| e.to_str())
                .map(|e| e.to_lowercase())
        })
        .collect();
    let mut stack = Vec::new();
    if names.contains("package.json") {
        stack.push("Node/JavaScript".into());
    }
    if names.contains("vite.config.ts") || names.contains("vite.config.js") {
        stack.push("Vite".into());
    }
    if names.contains("tauri.conf.json") || names.contains("cargo.toml") {
        stack.push("Rust/Tauri".into());
    }
    if names.contains("docker-compose.yml") || names.contains("dockerfile") {
        stack.push("Docker".into());
    }
    if names.contains("requirements.txt") || names.contains("pyproject.toml") || exts.contains("py")
    {
        stack.push("Python".into());
    }
    if exts.contains("tsx") || exts.contains("jsx") {
        stack.push("React".into());
    }
    stack
}

fn extract_graph_edges(root: &Path, path: &Path) -> Vec<ProjectGraphEdge> {
    if !is_code_graph_file(path) {
        return Vec::new();
    }
    let Ok(content) = std::fs::read_to_string(path) else {
        return Vec::new();
    };
    let from = to_relative(root, path);
    let mut edges = Vec::new();
    for line in content.lines().take(260) {
        let trimmed = line.trim();
        let target = if trimmed.starts_with("import ") || trimmed.starts_with("export ") {
            trimmed
                .split(" from ")
                .nth(1)
                .or_else(|| trimmed.strip_prefix("import "))
                .and_then(|value| {
                    value
                        .trim()
                        .trim_matches(';')
                        .trim_matches('"')
                        .trim_matches('\'')
                        .split_whitespace()
                        .last()
                })
                .map(|value| value.trim_matches('"').trim_matches('\'').to_string())
        } else if let Some(rest) = trimmed.strip_prefix("from ") {
            rest.split_whitespace()
                .next()
                .map(|value| value.to_string())
        } else if let Some(rest) = trimmed.strip_prefix("use ") {
            rest.split(';').next().map(|value| value.to_string())
        } else if let Some(rest) = trimmed.strip_prefix("mod ") {
            rest.split(';').next().map(|value| value.to_string())
        } else {
            None
        };
        if let Some(to) = target {
            if !to.is_empty() {
                edges.push(ProjectGraphEdge {
                    from: from.clone(),
                    to,
                    kind: "imports".into(),
                });
            }
        }
        if edges.len() >= 12 {
            break;
        }
    }
    edges
}

pub fn build_project_map(root: &Path) -> ProjectMap {
    let mut files = Vec::new();
    let mut dirs = BTreeSet::new();
    let mut total_bytes = 0u64;

    for entry in WalkDir::new(root).into_iter().filter_entry(|entry| {
        let name = entry.file_name().to_string_lossy();
        !is_hidden(&name)
    }) {
        let Ok(entry) = entry else {
            continue;
        };
        let path = entry.path();
        if path == root {
            continue;
        }
        if path.is_dir() {
            dirs.insert(to_relative(root, path));
            continue;
        }
        if !path.is_file() {
            continue;
        }
        total_bytes += path.metadata().map(|m| m.len()).unwrap_or(0);
        files.push(path.to_path_buf());
        if files.len() >= MAX_PROJECT_MAP_FILES {
            break;
        }
    }

    let mut graph = Vec::new();
    for path in &files {
        graph.extend(extract_graph_edges(root, path));
        if graph.len() >= MAX_PROJECT_GRAPH_EDGES {
            graph.truncate(MAX_PROJECT_GRAPH_EDGES);
            break;
        }
    }

    let important_files = files
        .iter()
        .filter_map(|path| {
            let name = path.file_name()?.to_str()?.to_lowercase();
            IMPORTANT_PROJECT_FILES
                .contains(&name.as_str())
                .then(|| to_relative(root, path))
        })
        .take(40)
        .collect();

    ProjectMap {
        root: root.to_string_lossy().to_string(),
        github_remote: github_remote(root),
        stack: detect_stack(&files),
        file_count: files.len(),
        directory_count: dirs.len(),
        total_bytes,
        important_files,
        files: files
            .iter()
            .take(MAX_PROJECT_MAP_FILES)
            .map(|path| to_relative(root, path))
            .collect(),
        graph,
        truncated: files.len() >= MAX_PROJECT_MAP_FILES,
    }
}

pub fn project_map_context(map: &ProjectMap) -> String {
    let important = if map.important_files.is_empty() {
        "- none detected".into()
    } else {
        map.important_files
            .iter()
            .map(|path| format!("- {path}"))
            .collect::<Vec<_>>()
            .join("\n")
    };
    let files = map
        .files
        .iter()
        .take(120)
        .map(|path| format!("- {path}"))
        .collect::<Vec<_>>()
        .join("\n");
    let graph = if map.graph.is_empty() {
        "- no import graph detected".into()
    } else {
        map.graph
            .iter()
            .take(80)
            .map(|edge| format!("- {} -> {} ({})", edge.from, edge.to, edge.kind))
            .collect::<Vec<_>>()
            .join("\n")
    };
    format!(
        "PROJECT MAP (trusted metadata generated by QTRM Chat)\n\
         Root: {}\n\
         GitHub remote: {}\n\
         Detected stack: {}\n\
         Files: {} files, {} directories, {} bytes\n\
         Important files:\n{}\n\
         Project files sample:\n{}\n\
         Dependency/import graph sample:\n{}\n",
        map.root,
        map.github_remote.as_deref().unwrap_or("not detected"),
        if map.stack.is_empty() {
            "unknown".into()
        } else {
            map.stack.join(", ")
        },
        map.file_count,
        map.directory_count,
        map.total_bytes,
        important,
        files,
        graph
    )
}

#[tauri::command]
pub fn project_map(state: State<'_, AppState>) -> Result<ProjectMap, String> {
    let root = state.active_root()?;
    Ok(build_project_map(&root))
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
