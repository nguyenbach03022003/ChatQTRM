// TypeScript mirrors of the Rust command payloads (see src-tauri/src/*.rs).

export interface AppSettings {
  provider: string; // "ollama" | "openai" | "anthropic"
  model: string;
  baseUrl: string;
  numCtx: number;
  temperature: number;
  defaultProjectDir: string | null;
  shell: string; // "powershell" | "pwsh" | "cmd" | "bash"
  theme: string; // "dark" | "light"
  telemetry: boolean;
  autoSave: boolean;
  requireApproval: boolean;
  enabledTools: string[];
}

export interface Project {
  id: string;
  name: string;
  root: string;
  lastOpened: string;
}

export interface FileContent {
  path: string;
  content: string;
  truncated: boolean;
  size: number;
}

export interface DirEntry {
  name: string;
  path: string;
  type: "file" | "directory";
  hasChildren: boolean;
}

export interface WriteResult {
  path: string;
  bytesWritten: number;
  created: boolean;
}

export interface EditResult {
  path: string;
  before: string;
  after: string;
  replacements: number;
}

export interface TextMatch {
  path: string;
  line: number;
  column: number;
  text: string;
}

export interface GitFile {
  path: string;
  status: string;
  staged: boolean;
}

export interface GitStatus {
  branch: string;
  ahead: number;
  behind: number;
  files: GitFile[];
  isRepo: boolean;
}

export interface CommandResult {
  stdout: string;
  stderr: string;
  code: number;
}

export interface Skill {
  id: string;
  name: string;
  description: string;
  instructions: string;
  filePatterns: string[];
  tools: string[];
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SkillInput {
  id?: string;
  name: string;
  description: string;
  instructions: string;
  filePatterns: string[];
  tools: string[];
  enabled: boolean;
}

// Chat models use snake_case to match the existing web types in types/index.ts.
export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

export interface ChatSession {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  pinned: boolean;
  project_id: string | null;
  messages: ChatMessage[];
}

export interface ChatSummary {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  pinned: boolean;
  message_count: number;
}

// Streaming event payloads (chat:// channel).
export interface ChatContextEvent {
  chatId: string;
  activeFiles: string[];
  estimatedPromptTokens: number;
}
export interface ChatTokenEvent {
  chatId: string;
  content: string;
}
export interface ChatDoneEvent {
  chatId: string;
  model: string;
  evalCount: number;
  promptEvalCount: number;
  totalDuration: number;
}
export interface ChatErrorEvent {
  chatId: string;
  message: string;
}

export interface TerminalOutputEvent {
  id: string;
  data: string;
}
export interface TerminalExitEvent {
  id: string;
  code: number | null;
}
