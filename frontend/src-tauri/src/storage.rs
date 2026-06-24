//! Tiny JSON document store rooted in the OS app-data directory.
//! On Windows this resolves to `%APPDATA%\com.qtrm.chat`.

use std::path::PathBuf;

use serde::{de::DeserializeOwned, Serialize};
use tauri::{AppHandle, Manager};

pub fn data_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir)
}

pub fn read_json<T: DeserializeOwned + Default>(app: &AppHandle, name: &str) -> Result<T, String> {
    let path = data_dir(app)?.join(name);
    if !path.exists() {
        return Ok(T::default());
    }
    let raw = std::fs::read_to_string(&path).map_err(|e| e.to_string())?;
    if raw.trim().is_empty() {
        return Ok(T::default());
    }
    serde_json::from_str(&raw).map_err(|e| format!("Failed to parse {name}: {e}"))
}

pub fn write_json<T: Serialize>(app: &AppHandle, name: &str, value: &T) -> Result<(), String> {
    let path = data_dir(app)?.join(name);
    let raw = serde_json::to_string_pretty(value).map_err(|e| e.to_string())?;
    // Write atomically via a temp file then rename to avoid partial writes.
    let tmp = path.with_extension("tmp");
    std::fs::write(&tmp, raw).map_err(|e| e.to_string())?;
    std::fs::rename(&tmp, &path).map_err(|e| e.to_string())?;
    Ok(())
}
