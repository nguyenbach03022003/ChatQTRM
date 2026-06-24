import type {
  AppConfig,
  ChatSession,
  ChatSummary,
  ProjectMap,
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

  if (response.status === 204) {
    return undefined as T;
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
  renameChat: (chatId: string, title: string) =>
    request<ChatSummary>(`/api/chats/${chatId}`, {
      method: "PATCH",
      body: JSON.stringify({ title }),
    }),
  deleteChat: (chatId: string) =>
    request<void>(`/api/chats/${chatId}`, { method: "DELETE" }),
  getWorkspaceTree: (path = "") =>
    request<WorkspaceTreeResponse>(
      `/api/workspace/tree?path=${encodeURIComponent(path)}`,
    ),
  getWorkspaceMap: () => request<ProjectMap>("/api/workspace/map"),
  getConfig: () =>
    request<AppConfig>("/api/config"),
};
