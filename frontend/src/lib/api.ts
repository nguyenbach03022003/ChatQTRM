import type {
  ChatSession,
  ChatSummary,
  WorkspaceTreeResponse,
} from "../types";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.toString() || "http://localhost:8000";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
    ...init,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || "Request failed.");
  }

  return response.json() as Promise<T>;
}

export const api = {
  baseUrl: API_BASE_URL,
  getChats: () => request<ChatSummary[]>("/api/chats"),
  createChat: (title?: string) =>
    request<ChatSession>("/api/chats", {
      method: "POST",
      body: JSON.stringify({ title }),
    }),
  getChat: (chatId: string) => request<ChatSession>(`/api/chats/${chatId}`),
  getWorkspaceTree: (path = "") =>
    request<WorkspaceTreeResponse>(
      `/api/workspace/tree?path=${encodeURIComponent(path)}`,
    ),
  getConfig: () =>
    request<{ workspaceRoot: string; model: string; ollamaBaseUrl: string }>(
      "/api/config",
    ),
};
