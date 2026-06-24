//! Shared application state and the path-sandboxing primitive that keeps every
//! file/git/terminal operation confined to the active project root.

use std::path::{Component, Path, PathBuf};
use std::sync::Mutex;

#[derive(Default)]
pub struct AppState {
    pub active_project: Mutex<Option<PathBuf>>,
}

impl AppState {
    pub fn active_root(&self) -> Result<PathBuf, String> {
        self.active_project
            .lock()
            .unwrap()
            .clone()
            .ok_or_else(|| "No active project selected. Use \"Select Project\" first.".to_string())
    }

    pub fn set_active(&self, root: PathBuf) {
        *self.active_project.lock().unwrap() = Some(root);
    }
}

/// Lexically normalize a path (resolve `.` and `..`) without touching the disk,
/// so we can validate destinations for files that do not exist yet.
pub fn normalize(p: &Path) -> PathBuf {
    let mut out = PathBuf::new();
    for comp in p.components() {
        match comp {
            Component::ParentDir => {
                out.pop();
            }
            Component::CurDir => {}
            other => out.push(other.as_os_str()),
        }
    }
    out
}

/// Resolve a project-relative path and guarantee it cannot escape `root`.
/// This is the single chokepoint enforcing the filesystem sandbox.
pub fn safe_join(root: &Path, relative: &str) -> Result<PathBuf, String> {
    let rel = relative.replace('\\', "/");
    let rel = rel.trim_start_matches('/');
    let candidate = normalize(&root.join(rel));
    let root_norm = normalize(root);
    if candidate == root_norm || candidate.starts_with(&root_norm) {
        Ok(candidate)
    } else {
        Err(format!("Path '{relative}' escapes the project root."))
    }
}

/// Convert an absolute path back to a forward-slashed path relative to root.
pub fn to_relative(root: &Path, path: &Path) -> String {
    let root_norm = normalize(root);
    let path_norm = normalize(path);
    match path_norm.strip_prefix(&root_norm) {
        Ok(rel) => rel.to_string_lossy().replace('\\', "/"),
        Err(_) => path_norm.to_string_lossy().replace('\\', "/"),
    }
}
