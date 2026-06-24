# QTRM Chat — Windows Desktop

A native-feeling Windows desktop build of QTRM Chat: a Codex/Claude-Code-style
local AI engineering assistant with project-scoped file tools, an integrated
terminal, git, a skill system, and streaming local models — all running on the
user's machine.

The desktop app **reuses the existing React UI** and adds a native **Tauri v2
(Rust)** layer. The original Docker/web app (FastAPI + Ollama) still works
unchanged; the same frontend detects whether it is running inside the native
shell and renders the full desktop IDE (`DesktopApp.tsx`) or the web app
(`App.tsx`).

---

## 1. Stack decision

| Concern | **Tauri v2 (chosen)** | Electron | .NET MAUI |
| --- | --- | --- | --- |
| Reuse existing React UI | ✅ as-is | ✅ | ❌ rewrite |
| Installer size | ~6–12 MB | ~150 MB | ~60 MB |
| Native secure storage | ✅ Credential Manager (`keyring`) | manual | DPAPI |
| FS sandbox primitive | ✅ capabilities + per-call `safe_join` | manual | manual |
| Bundles a runtime? | ❌ uses system WebView2 | bundles Chromium | bundles .NET |
| Tools language | Rust (no Python shipped) | Node | C# |

Tauri wins on size, security, and reuse. File/search/git/terminal tools are
ported to Rust so **no Python is shipped** with the desktop app.

## 2. Architecture

```
┌───────────────────────────────────────────────────────────┐
│  WebView2 (Edge)  ── React UI (Vite build, dist/)          │
│   DesktopApp.tsx → panels, chat, terminal, modals          │
│        │  invoke()/listen()  via src/lib/desktop.ts         │
└────────┼──────────────────────────────────────────────────┘
         │ Tauri IPC (capabilities-gated)
┌────────▼──────────────────────────────────────────────────┐
│  Rust core (src-tauri)                                      │
│   state(safe_join sandbox) · settings(+keychain) ·         │
│   projects · fs_tools · search · git · terminal(PTY) ·     │
│   skills · chat(Ollama streaming → events)                 │
└────────┬──────────────────────────────────────────────────┘
         │ HTTP        │ std::process / git / PTY
┌────────▼─────┐  ┌────▼───────────────────────┐
│ Ollama :11434│  │ project files / shell / git │
└──────────────┘  └─────────────────────────────┘
```

Data lives in `%APPDATA%\com.qtrm.chat\` as JSON (`settings.json`,
`projects.json`, `chats.json`, `skills.json`). Secrets live in **Windows
Credential Manager**, never on disk.

## 3. Folder structure (added)

```
frontend/
  src/
    DesktopApp.tsx              # native shell orchestrator
    lib/desktop.ts             # typed invoke/event bridge
    types/desktop.ts           # TS mirrors of Rust payloads
    desktop/
      ActivityBar.tsx ProjectBar.tsx
      ChatsPanel.tsx FilesPanel.tsx SearchPanel.tsx GitPanel.tsx
      SkillsView.tsx SettingsView.tsx TerminalPanel.tsx
      DesktopChat.tsx DiffModal.tsx FileEditorModal.tsx ApprovalModal.tsx
  scripts/make-icon.cjs        # zero-dep placeholder icon generator
  src-tauri/
    Cargo.toml build.rs tauri.conf.json
    capabilities/default.json
    src/{main,lib,state,storage,settings,projects,
         fs_tools,search,git,terminal,skills,chat}.rs
```

## 4. Core data models

- **Settings** (`settings.rs`): provider, model, baseUrl, numCtx, temperature,
  defaultProjectDir, shell, theme, telemetry, autoSave, requireApproval,
  enabledTools[].
- **Project** (`projects.rs`): id, name, root, lastOpened. Recents capped at 20.
- **Skill** (`skills.rs`): id, name, description, instructions, filePatterns[],
  tools[], enabled, timestamps.
- **ChatSession / Message** (`chat.rs`): snake_case to match the web types;
  Chat adds `pinned` and `project_id`.

## 5. Tool execution design

Every tool is a `#[tauri::command]` invoked from `src/lib/desktop.ts`. All
file/search/git/terminal commands resolve paths through `state::safe_join`,
which lexically normalizes and rejects anything escaping the active project
root — the single filesystem chokepoint.

- **Files:** read/list/write/create/createFolder/edit/delete. `edit_file`
  returns `{before, after, replacements}` so the UI can render a diff and the
  user can accept/reject (`FileEditorModal` + `DiffModal`).
- **Search:** `search_files` (name) and `search_text` (grep, literal/regex),
  both honoring `.gitignore` and capped for responsiveness.
- **Git:** status/diff/stage/unstage/commit/branches/checkout/create-branch via
  `git -C <root>`.
- **Terminal:** real PTY (`portable-pty`) streaming `terminal://output` events to
  xterm.js; plus one-shot `run_command` that captures stdout/stderr/code.

## 6. Security model

1. **Sandbox** — `safe_join` confines all FS/git/terminal ops to the project root.
2. **Approval** — destructive actions (delete, overwrite >50 KB, dangerous shell,
   skill/chat deletion) route through `ApprovalModal`; nothing runs automatically.
   `delete_path` refuses to delete the project root.
3. **Secrets** — API keys go to the OS keychain via `keyring`; the UI can set/
   check/delete but never reads a key back to JS.
4. **Trust boundary** — the system prompt (base instructions + enabled skills) is
   TRUSTED; project file content is injected between explicit
   `BEGIN/END UNTRUSTED WORKSPACE CONTEXT` markers and labeled as data, never
   instructions (`chat.rs::build_system_prompt`).
5. **CSP** — `tauri.conf.json` restricts `connect-src` to localhost Ollama and the
   declared API hosts.

## 7. Implementation roadmap

- **v1 (this commit, working):** project selection + recents, chat with streaming,
  chat management (pin/rename/delete), file explorer + context attach, file
  editor with diff/save, search, git panel + diff viewer, integrated PTY
  terminal, skills CRUD/import/export, settings + secure keys, approval modal.
- **v1.1:** agentic tool-calling loop (assistant proposes multi-file edits as
  tool calls → diff review → apply), `delete`/rename from the explorer,
  per-skill auto-activation by file pattern.
- **v1.2:** OpenAI/Anthropic streaming providers (keys already stored), command
  allow/deny lists, syntax-highlighted editor (Monaco/CodeMirror), auto-updater.
- **v1.3:** workspace indexing/summarization for large repos, MCP tool support.

---

## 8. Windows build & packaging

### Prerequisites (on the Windows machine)
- **Rust** (stable): https://rustup.rs
- **Node.js 18+**
- **WebView2 runtime** (preinstalled on Windows 10/11; otherwise the Evergreen
  bootstrapper)
- **Microsoft C++ Build Tools** (Desktop development with C++)
- **git** on `PATH`
- **Ollama** running locally with a model pulled (e.g. `ollama pull gemma3:4b`)

### One-time setup
```powershell
cd frontend
npm install
# Generate app icons (placeholder art; replace app-icon.png with real art later)
node scripts/make-icon.cjs
npm run tauri icon app-icon.png   # writes src-tauri/icons/* incl. icon.ico
```

### Develop (hot-reload)
```powershell
npm run desktop        # = tauri dev  (launches Vite + native window)
```

### Build installers
```powershell
npm run desktop:build  # = tauri build
```
Output (NSIS `.exe` + MSI) lands in:
```
frontend/src-tauri/target/release/bundle/nsis/QTRM Chat_1.0.0_x64-setup.exe
frontend/src-tauri/target/release/bundle/msi/QTRM Chat_1.0.0_x64_en-US.msi
```
The NSIS installer defaults to per-user install (no admin required). App data is
written to `%APPDATA%\com.qtrm.chat\`; secrets to Windows Credential Manager.

### First run
1. Launch QTRM Chat → **Select Project Folder**.
2. Open **Settings**, confirm provider `ollama`, model, and base URL
   (`http://localhost:11434`), then **Save**.
3. Attach files in **Files**, ask in chat, use the **Terminal** / **Git** /
   **Skills** panels as needed.

> Note: the Rust layer must be built on Windows (or cross-compiled). The frontend
> (`npm run build`) and TypeScript are validated; Cargo resolves exact crate
> patch versions on first build.
