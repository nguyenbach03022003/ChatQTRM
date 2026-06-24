// Typed bridge over the Tauri native layer. Every desktop capability the UI
// needs is funneled through here so components never touch `invoke` directly.

import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { open as openDialog } from "@tauri-apps/plugin-dialog";

import type {
  AppSettings,
  ChatSession,
  ChatSummary,
  CommandResult,
  DirEntry,
  EditResult,
  FileContent,
  GitStatus,
  Project,
  ProjectMap,
  McpServerConfig,
  McpTestResult,
  Skill,
  SkillInput,
  TextMatch,
  WriteResult,
} from "../types/desktop";

export function isDesktop(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

const call = <T>(cmd: string, args?: Record<string, unknown>) => invoke<T>(cmd, args);

export const desktop = {
  appInfo: () => call<{ platform: string; version: string; isDesktop: boolean }>("app_info"),

  // ----- Settings + secrets (secrets live in the OS keychain) -----
  getSettings: () => call<AppSettings>("get_settings"),
  saveSettings: (settings: AppSettings) => call<AppSettings>("save_settings", { settings }),
  setSecret: (key: string, value: string) => call<void>("set_secret", { key, value }),
  hasSecret: (key: string) => call<boolean>("has_secret", { key }),
  deleteSecret: (key: string) => call<void>("delete_secret", { key }),
  testMcpServer: (server: McpServerConfig) =>
    call<McpTestResult>("test_mcp_server", { server }),

  // ----- Projects -----
  pickFolder: () => openDialog({ directory: true, multiple: false, title: "Select Project Folder" }),
  listProjects: () => call<Project[]>("list_projects"),
  activeProject: () => call<string | null>("get_active_project"),
  openProject: (path: string) => call<Project>("open_project", { path }),
  openProjectById: (id: string) => call<Project>("open_project_by_id", { id }),
  removeProject: (id: string) => call<void>("remove_project", { id }),

  // ----- Filesystem tools -----
  readFile: (path: string) => call<FileContent>("read_file", { path }),
  listDir: (path = "") => call<DirEntry[]>("list_dir", { path }),
  writeFile: (path: string, content: string) => call<WriteResult>("write_file", { path, content }),
  createFile: (path: string, content?: string) => call<WriteResult>("create_file", { path, content }),
  createFolder: (path: string) => call<string>("create_folder", { path }),
  editFile: (path: string, oldString: string, newString: string, replaceAll = false) =>
    call<EditResult>("edit_file", { path, oldString, newString, replaceAll }),
  deletePath: (path: string) => call<string>("delete_path", { path }),
  projectMap: () => call<ProjectMap>("project_map"),

  // ----- Search -----
  searchFiles: (query: string) => call<string[]>("search_files", { query }),
  searchText: (query: string, isRegex = false, caseSensitive = false) =>
    call<TextMatch[]>("search_text", { query, isRegex, caseSensitive }),

  // ----- Git -----
  gitStatus: () => call<GitStatus>("git_status"),
  gitDiff: (path?: string, staged = false) => call<string>("git_diff", { path, staged }),
  gitStage: (paths: string[]) => call<void>("git_stage", { paths }),
  gitUnstage: (paths: string[]) => call<void>("git_unstage", { paths }),
  gitCommit: (message: string) => call<string>("git_commit", { message }),
  gitBranches: () => call<string[]>("git_branches"),
  gitCreateBranch: (name: string) => call<string>("git_create_branch", { name }),
  gitCheckout: (name: string) => call<string>("git_checkout", { name }),

  // ----- Terminal (PTY) -----
  terminalCreate: (opts: { shell?: string; cwd?: string; cols?: number; rows?: number }) =>
    call<string>("terminal_create", opts),
  terminalWrite: (id: string, data: string) => call<void>("terminal_write", { id, data }),
  terminalResize: (id: string, cols: number, rows: number) =>
    call<void>("terminal_resize", { id, cols, rows }),
  terminalKill: (id: string) => call<void>("terminal_kill", { id }),
  runCommand: (command: string, shell?: string) =>
    call<CommandResult>("run_command", { command, shell }),

  // ----- Skills -----
  listSkills: () => call<Skill[]>("list_skills"),
  saveSkill: (input: SkillInput) => call<Skill>("save_skill", { input }),
  setSkillEnabled: (id: string, enabled: boolean) =>
    call<void>("set_skill_enabled", { id, enabled }),
  deleteSkill: (id: string) => call<void>("delete_skill", { id }),
  importSkill: (json: string) => call<Skill>("import_skill", { json }),

  // ----- Chat -----
  listChats: () => call<ChatSummary[]>("list_chats"),
  createChat: (title?: string, projectId?: string) =>
    call<ChatSession>("create_chat", { title, projectId }),
  getChat: (chatId: string) => call<ChatSession>("get_chat", { chatId }),
  renameChat: (chatId: string, title: string) => call<void>("rename_chat", { chatId, title }),
  pinChat: (chatId: string, pinned: boolean) => call<void>("pin_chat", { chatId, pinned }),
  deleteChat: (chatId: string) => call<void>("delete_chat", { chatId }),
  chatSend: (chatId: string, message: string, attachments: string[]) =>
    call<void>("chat_send", { chatId, message, attachments }),
};

// ---- Event helpers ----
export const onEvent = <T>(name: string, handler: (payload: T) => void): Promise<UnlistenFn> =>
  listen<T>(name, (e) => handler(e.payload));

export type { UnlistenFn };
