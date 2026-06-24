//! User settings (persisted as JSON) and secrets (persisted in the OS keychain:
//! Windows Credential Manager on Windows, never written to disk).

use serde::{Deserialize, Serialize};
use tauri::AppHandle;

use crate::storage;

const KEYRING_SERVICE: &str = "com.qtrm.chat";

pub fn default_tools() -> Vec<String> {
    [
        "read_file",
        "write_file",
        "edit_file",
        "list_files",
        "search_files",
        "search_text",
        "create_file",
        "create_folder",
        "run_command",
        "git_status",
        "git_diff",
        "git_stage",
        "git_commit",
        "git_branch",
    ]
    .iter()
    .map(|s| s.to_string())
    .collect()
}

#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Settings {
    pub provider: String, // "ollama" | "openai" | "anthropic"
    pub model: String,
    pub base_url: String,
    pub num_ctx: u32,
    pub temperature: f32,
    pub default_project_dir: Option<String>,
    pub shell: String, // "powershell" | "pwsh" | "cmd" | "bash"
    pub theme: String, // "dark" | "light"
    pub telemetry: bool,
    pub auto_save: bool,
    pub require_approval: bool,
    pub enabled_tools: Vec<String>,
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            provider: "ollama".into(),
            model: "gemma3:4b".into(),
            base_url: "http://localhost:11434".into(),
            num_ctx: 8192,
            temperature: 0.2,
            default_project_dir: None,
            shell: if cfg!(windows) {
                "powershell".into()
            } else {
                "bash".into()
            },
            theme: "dark".into(),
            telemetry: false,
            auto_save: true,
            require_approval: true,
            enabled_tools: default_tools(),
        }
    }
}

#[tauri::command]
pub fn get_settings(app: AppHandle) -> Result<Settings, String> {
    storage::read_json(&app, "settings.json")
}

#[tauri::command]
pub fn save_settings(app: AppHandle, settings: Settings) -> Result<Settings, String> {
    storage::write_json(&app, "settings.json", &settings)?;
    Ok(settings)
}

#[tauri::command]
pub fn set_secret(key: String, value: String) -> Result<(), String> {
    let entry = keyring::Entry::new(KEYRING_SERVICE, &key).map_err(|e| e.to_string())?;
    entry.set_password(&value).map_err(|e| e.to_string())
}

/// Returns whether a secret exists, without ever returning the value to the UI.
#[tauri::command]
pub fn has_secret(key: String) -> Result<bool, String> {
    let entry = keyring::Entry::new(KEYRING_SERVICE, &key).map_err(|e| e.to_string())?;
    match entry.get_password() {
        Ok(_) => Ok(true),
        Err(keyring::Error::NoEntry) => Ok(false),
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
pub fn delete_secret(key: String) -> Result<(), String> {
    let entry = keyring::Entry::new(KEYRING_SERVICE, &key).map_err(|e| e.to_string())?;
    match entry.delete_credential() {
        Ok(_) | Err(keyring::Error::NoEntry) => Ok(()),
        Err(e) => Err(e.to_string()),
    }
}

/// Internal helper used by the chat layer to read an API key for outbound calls.
pub fn read_secret(key: &str) -> Option<String> {
    let entry = keyring::Entry::new(KEYRING_SERVICE, key).ok()?;
    entry.get_password().ok()
}
