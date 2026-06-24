//! Integrated terminal backed by a real PTY (portable-pty). Each session spawns
//! a shell in the project directory; output is streamed to the UI via events:
//!   `terminal://output` { id, data }   and   `terminal://exit` { id, code }

use std::collections::HashMap;
use std::io::{Read, Write};
use std::sync::Mutex;

use portable_pty::{native_pty_system, CommandBuilder, MasterPty, PtySize};
use serde::Serialize;
use tauri::{AppHandle, Emitter, State};
use uuid::Uuid;

use crate::state::AppState;

pub struct Session {
    master: Box<dyn MasterPty + Send>,
    writer: Box<dyn Write + Send>,
    child: Box<dyn portable_pty::Child + Send + Sync>,
}

#[derive(Default)]
pub struct TerminalState {
    pub sessions: Mutex<HashMap<String, Session>>,
}

#[derive(Clone, Serialize)]
struct OutputEvent {
    id: String,
    data: String,
}

#[derive(Clone, Serialize)]
struct ExitEvent {
    id: String,
    code: Option<u32>,
}

fn default_shell() -> String {
    if cfg!(windows) {
        "powershell.exe".into()
    } else {
        std::env::var("SHELL").unwrap_or_else(|_| "/bin/bash".into())
    }
}

fn resolve_shell(shell: Option<String>) -> String {
    match shell.as_deref() {
        Some("powershell") => "powershell.exe".into(),
        Some("pwsh") => "pwsh.exe".into(),
        Some("cmd") => "cmd.exe".into(),
        Some("bash") => "/bin/bash".into(),
        Some(other) if !other.is_empty() => other.to_string(),
        _ => default_shell(),
    }
}

#[tauri::command]
pub fn terminal_create(
    app: AppHandle,
    app_state: State<'_, AppState>,
    term: State<'_, TerminalState>,
    shell: Option<String>,
    cwd: Option<String>,
    cols: Option<u16>,
    rows: Option<u16>,
) -> Result<String, String> {
    let pty_system = native_pty_system();
    let pair = pty_system
        .openpty(PtySize {
            rows: rows.unwrap_or(24),
            cols: cols.unwrap_or(80),
            pixel_width: 0,
            pixel_height: 0,
        })
        .map_err(|e| e.to_string())?;

    let working_dir = cwd
        .map(std::path::PathBuf::from)
        .or_else(|| app_state.active_root().ok())
        .or_else(dirs_home)
        .unwrap_or_else(|| std::path::PathBuf::from("."));

    let mut cmd = CommandBuilder::new(resolve_shell(shell));
    cmd.cwd(&working_dir);

    let child = pair.slave.spawn_command(cmd).map_err(|e| e.to_string())?;
    let mut reader = pair.master.try_clone_reader().map_err(|e| e.to_string())?;
    let writer = pair.master.take_writer().map_err(|e| e.to_string())?;

    let id = Uuid::new_v4().to_string();

    // Stream PTY output to the webview.
    {
        let app = app.clone();
        let id = id.clone();
        std::thread::spawn(move || {
            let mut buf = [0u8; 8192];
            loop {
                match reader.read(&mut buf) {
                    Ok(0) | Err(_) => {
                        let _ = app.emit("terminal://exit", ExitEvent { id: id.clone(), code: None });
                        break;
                    }
                    Ok(n) => {
                        let data = String::from_utf8_lossy(&buf[..n]).to_string();
                        let _ = app.emit("terminal://output", OutputEvent { id: id.clone(), data });
                    }
                }
            }
        });
    }

    term.sessions.lock().unwrap().insert(
        id.clone(),
        Session {
            master: pair.master,
            writer,
            child,
        },
    );
    Ok(id)
}

#[tauri::command]
pub fn terminal_write(term: State<'_, TerminalState>, id: String, data: String) -> Result<(), String> {
    let mut sessions = term.sessions.lock().unwrap();
    let session = sessions.get_mut(&id).ok_or("Terminal session not found.")?;
    session.writer.write_all(data.as_bytes()).map_err(|e| e.to_string())?;
    session.writer.flush().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn terminal_resize(
    term: State<'_, TerminalState>,
    id: String,
    cols: u16,
    rows: u16,
) -> Result<(), String> {
    let sessions = term.sessions.lock().unwrap();
    let session = sessions.get(&id).ok_or("Terminal session not found.")?;
    session
        .master
        .resize(PtySize {
            rows,
            cols,
            pixel_width: 0,
            pixel_height: 0,
        })
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn terminal_kill(term: State<'_, TerminalState>, id: String) -> Result<(), String> {
    let mut sessions = term.sessions.lock().unwrap();
    if let Some(mut session) = sessions.remove(&id) {
        let _ = session.child.kill();
    }
    Ok(())
}

fn dirs_home() -> Option<std::path::PathBuf> {
    std::env::var_os("HOME")
        .or_else(|| std::env::var_os("USERPROFILE"))
        .map(std::path::PathBuf::from)
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CommandResult {
    pub stdout: String,
    pub stderr: String,
    pub code: i32,
}

/// One-shot command execution in the project directory, capturing output.
/// Used for assistant-suggested commands; the UI must approve before calling.
#[tauri::command]
pub fn run_command(
    app_state: State<'_, AppState>,
    command: String,
    shell: Option<String>,
) -> Result<CommandResult, String> {
    let root = app_state.active_root()?;
    let shell_name = resolve_shell(shell);

    let mut cmd = std::process::Command::new(&shell_name);
    if shell_name.contains("powershell") || shell_name.contains("pwsh") {
        cmd.args(["-NoProfile", "-Command", &command]);
    } else if shell_name.contains("cmd") {
        cmd.args(["/C", &command]);
    } else {
        cmd.args(["-c", &command]);
    }
    cmd.current_dir(&root);

    let output = cmd.output().map_err(|e| format!("Failed to run command: {e}"))?;
    Ok(CommandResult {
        stdout: String::from_utf8_lossy(&output.stdout).to_string(),
        stderr: String::from_utf8_lossy(&output.stderr).to_string(),
        code: output.status.code().unwrap_or(-1),
    })
}
