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

export interface AgentStats {
  model: string;
  evalCount: number;
  promptEvalCount: number;
  totalDuration: number;
  estimatedPromptTokens: number;
}
