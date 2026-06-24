export type Role = "user" | "assistant";

export interface Message {
  id: string;
  role: Role;
  content: string;
  created_at: string;
}

export interface ChatSession {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  messages: Message[];
}

export interface ChatSummary {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  message_count: number;
}

export interface WorkspaceNode {
  name: string;
  path: string;
  type: "file" | "directory";
  hasChildren: boolean;
}

export interface WorkspaceTreeResponse {
  path: string;
  name: string;
  children: WorkspaceNode[];
}

export interface ProjectGraphEdge {
  from: string;
  to: string;
  kind: string;
}

export interface ProjectMap {
  root: string;
  githubRemote: string | null;
  stack: string[];
  fileCount: number;
  directoryCount: number;
  totalBytes: number;
  importantFiles: string[];
  files: string[];
  graph: ProjectGraphEdge[];
  truncated: boolean;
}

export interface AppConfig {
  workspaceRoot: string;
  model: string;
  ollamaBaseUrl: string;
  ollamaNumCtx: string;
}

export interface AgentStats {
  model: string;
  evalCount: number;
  promptEvalCount: number;
  totalDuration: number;
  estimatedPromptTokens: number;
}
