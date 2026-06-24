mod chat;
mod fs_tools;
mod git;
mod projects;
mod search;
mod settings;
mod skills;
mod state;
mod storage;
mod terminal;

use state::AppState;
use terminal::TerminalState;

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AppInfo {
    pub platform: String,
    pub version: String,
    pub is_desktop: bool,
}

#[tauri::command]
fn app_info() -> AppInfo {
    AppInfo {
        platform: std::env::consts::OS.to_string(),
        version: env!("CARGO_PKG_VERSION").to_string(),
        is_desktop: true,
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(AppState::default())
        .manage(TerminalState::default())
        .invoke_handler(tauri::generate_handler![
            app_info,
            // settings + secrets
            settings::get_settings,
            settings::save_settings,
            settings::set_secret,
            settings::has_secret,
            settings::delete_secret,
            // projects
            projects::list_projects,
            projects::get_active_project,
            projects::open_project,
            projects::open_project_by_id,
            projects::remove_project,
            // filesystem tools
            fs_tools::read_file,
            fs_tools::list_dir,
            fs_tools::write_file,
            fs_tools::create_file,
            fs_tools::create_folder,
            fs_tools::edit_file,
            fs_tools::delete_path,
            // search
            search::search_files,
            search::search_text,
            // git
            git::git_status,
            git::git_diff,
            git::git_stage,
            git::git_unstage,
            git::git_commit,
            git::git_branches,
            git::git_create_branch,
            git::git_checkout,
            // terminal
            terminal::terminal_create,
            terminal::terminal_write,
            terminal::terminal_resize,
            terminal::terminal_kill,
            terminal::run_command,
            // skills
            skills::list_skills,
            skills::save_skill,
            skills::set_skill_enabled,
            skills::delete_skill,
            skills::import_skill,
            // chat
            chat::list_chats,
            chat::create_chat,
            chat::get_chat,
            chat::rename_chat,
            chat::pin_chat,
            chat::delete_chat,
            chat::chat_send,
        ])
        .run(tauri::generate_context!())
        .expect("error while running QTRM Chat");
}
