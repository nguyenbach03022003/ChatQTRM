//! Project (workspace) selection and the recent-projects list.
//! The folder picker itself runs on the JS side (plugin-dialog); Rust validates
//! the chosen path, sets it as the sandbox root, and tracks recents.

use chrono::Utc;
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, State};
use uuid::Uuid;

use crate::state::AppState;
use crate::storage;

#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Project {
    pub id: String,
    pub name: String,
    pub root: String,
    pub last_opened: String,
}

fn load(app: &AppHandle) -> Result<Vec<Project>, String> {
    storage::read_json(app, "projects.json")
}

fn save(app: &AppHandle, projects: &[Project]) -> Result<(), String> {
    storage::write_json(app, "projects.json", &projects.to_vec())
}

#[tauri::command]
pub fn list_projects(app: AppHandle) -> Result<Vec<Project>, String> {
    let mut projects = load(&app)?;
    projects.sort_by(|a, b| b.last_opened.cmp(&a.last_opened));
    Ok(projects)
}

#[tauri::command]
pub fn get_active_project(state: State<'_, AppState>) -> Option<String> {
    state
        .active_project
        .lock()
        .unwrap()
        .clone()
        .map(|p| p.to_string_lossy().replace('\\', "/"))
}

/// Open a folder as the active project. Validates it exists and is a directory,
/// makes it the sandbox root, and upserts it into the recent list.
#[tauri::command]
pub fn open_project(
    app: AppHandle,
    state: State<'_, AppState>,
    path: String,
) -> Result<Project, String> {
    let pb = std::path::PathBuf::from(&path);
    if !pb.exists() || !pb.is_dir() {
        return Err(format!("'{path}' is not an existing directory."));
    }
    let abs = pb.canonicalize().unwrap_or(pb);
    state.set_active(abs.clone());

    let name = abs
        .file_name()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_else(|| abs.to_string_lossy().to_string());
    let root = abs.to_string_lossy().replace('\\', "/");

    let mut projects = load(&app)?;
    let now = Utc::now().to_rfc3339();
    if let Some(existing) = projects.iter_mut().find(|p| p.root == root) {
        existing.last_opened = now.clone();
        existing.name = name.clone();
        let result = existing.clone();
        save(&app, &projects)?;
        return Ok(result);
    }

    let project = Project {
        id: Uuid::new_v4().to_string(),
        name,
        root,
        last_opened: now,
    };
    projects.push(project.clone());
    // Keep the 20 most-recent projects.
    projects.sort_by(|a, b| b.last_opened.cmp(&a.last_opened));
    projects.truncate(20);
    save(&app, &projects)?;
    Ok(project)
}

#[tauri::command]
pub fn open_project_by_id(
    app: AppHandle,
    state: State<'_, AppState>,
    id: String,
) -> Result<Project, String> {
    let projects = load(&app)?;
    let project = projects
        .into_iter()
        .find(|p| p.id == id)
        .ok_or("Project not found.")?;
    open_project(app, state, project.root)
}

#[tauri::command]
pub fn remove_project(app: AppHandle, id: String) -> Result<(), String> {
    let mut projects = load(&app)?;
    projects.retain(|p| p.id != id);
    save(&app, &projects)
}
