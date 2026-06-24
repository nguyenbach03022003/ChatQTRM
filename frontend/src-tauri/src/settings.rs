//! User settings (persisted as JSON) and secrets (persisted in the OS keychain:
//! Windows Credential Manager on Windows, never written to disk).

use serde::{Deserialize, Serialize};
use serde_json::json;
use std::collections::HashMap;
use std::io::{BufRead, BufReader, Read, Write};
use std::process::{Command, Stdio};
use std::sync::mpsc;
use std::time::Duration;
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
        "project_map",
        "mcp_list_tools",
        "mcp_call_tool",
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
    #[serde(default)]
    pub mcp_servers: Vec<McpServerConfig>,
}

#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct McpServerConfig {
    pub id: String,
    pub name: String,
    pub command: String,
    #[serde(default)]
    pub args: Vec<String>,
    #[serde(default)]
    pub env: HashMap<String, String>,
    #[serde(default = "default_enabled")]
    pub enabled: bool,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct McpTestResult {
    pub ok: bool,
    pub server_name: Option<String>,
    pub protocol_version: Option<String>,
    pub message: String,
}

fn default_enabled() -> bool {
    true
}

fn read_mcp_message<R: Read>(reader: &mut BufReader<R>) -> Result<String, String> {
    loop {
        let mut line = String::new();
        let read = reader
            .read_line(&mut line)
            .map_err(|e| format!("Failed to read MCP response: {e}"))?;
        if read == 0 {
            return Err("MCP server closed stdout before sending a response.".into());
        }

        let header = line.trim_end_matches(['\r', '\n']);
        if header.trim_start().starts_with('{') {
            return Ok(header.to_string());
        }

        if let Some((name, value)) = header.split_once(':') {
            if name.eq_ignore_ascii_case("content-length") {
                let len = value
                        .trim()
                        .parse::<usize>()
                    .map_err(|e| format!("Invalid MCP Content-Length: {e}"))?;

                let mut blank = String::new();
                reader
                    .read_line(&mut blank)
                    .map_err(|e| format!("Failed to read MCP header terminator: {e}"))?;
                let mut body = vec![0u8; len];
                reader
                    .read_exact(&mut body)
                    .map_err(|e| format!("Failed to read MCP response body: {e}"))?;
                return String::from_utf8(body)
                    .map_err(|e| format!("MCP response was not UTF-8: {e}"));
            }
        }
    }
}

fn write_mcp_message<W: Write>(writer: &mut W, value: &serde_json::Value) -> Result<(), String> {
    writeln!(writer, "{value}")
        .map_err(|e| format!("Failed to write MCP request: {e}"))?;
    writer
        .flush()
        .map_err(|e| format!("Failed to flush MCP request: {e}"))
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
            mcp_servers: vec![],
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
pub fn test_mcp_server(server: McpServerConfig) -> Result<McpTestResult, String> {
    if server.command.trim().is_empty() {
        return Err("MCP server command is required.".into());
    }

    let mut child = Command::new(&server.command)
        .args(&server.args)
        .envs(&server.env)
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("Failed to start MCP server: {e}"))?;

    let init = json!({
        "jsonrpc": "2.0",
        "id": 1,
        "method": "initialize",
        "params": {
            "protocolVersion": "2024-11-05",
            "capabilities": {},
            "clientInfo": { "name": "QTRM Chat", "version": env!("CARGO_PKG_VERSION") }
        }
    });

    if let Some(stdin) = child.stdin.as_mut() {
        write_mcp_message(stdin, &init)?;
    }

    let stdout = child.stdout.take().ok_or("MCP server stdout was unavailable.")?;
    let stderr = child.stderr.take();
    let (tx, rx) = mpsc::channel();

    std::thread::spawn(move || {
        let mut reader = BufReader::new(stdout);
        let result = read_mcp_message(&mut reader);
        let _ = tx.send(result);
    });

    let response_body = match rx.recv_timeout(Duration::from_secs(8)) {
        Ok(Ok(body)) => body,
        Ok(Err(e)) => {
            let _ = child.kill();
            return Err(e);
        }
        Err(_) => {
            let _ = child.kill();
            return Ok(McpTestResult {
                ok: false,
                server_name: None,
                protocol_version: None,
                message: "Timed out waiting for initialize response.".into(),
            });
        }
    };

    let _ = child.kill();

    let data: serde_json::Value = serde_json::from_str(response_body.trim()).map_err(|e| {
        let stderr_text = stderr
            .and_then(|s| {
                let mut reader = BufReader::new(s);
                let mut text = String::new();
                reader.read_line(&mut text).ok().map(|_| text)
            })
            .unwrap_or_default();
        format!("MCP server returned invalid JSON: {e}. {stderr_text}")
    })?;

    if let Some(error) = data.get("error") {
        return Ok(McpTestResult {
            ok: false,
            server_name: None,
            protocol_version: None,
            message: error.to_string(),
        });
    }

    let result = data.get("result").cloned().unwrap_or_default();
    let server_name = result
        .get("serverInfo")
        .and_then(|info| info.get("name"))
        .and_then(|value| value.as_str())
        .map(|value| value.to_string());
    let protocol_version = result
        .get("protocolVersion")
        .and_then(|value| value.as_str())
        .map(|value| value.to_string());

    Ok(McpTestResult {
        ok: true,
        server_name,
        protocol_version,
        message: "MCP initialize response received.".into(),
    })
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
    match entry.delete_password() {
        Ok(_) | Err(keyring::Error::NoEntry) => Ok(()),
        Err(e) => Err(e.to_string()),
    }
}

/// Internal helper used by the chat layer to read an API key for outbound calls.
pub fn read_secret(key: &str) -> Option<String> {
    let entry = keyring::Entry::new(KEYRING_SERVICE, key).ok()?;
    entry.get_password().ok()
}
