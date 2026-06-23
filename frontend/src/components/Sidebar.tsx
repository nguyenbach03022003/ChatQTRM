import { useState } from "react";
import type { KeyboardEvent } from "react";
import {
  Check,
  FolderTree,
  MessageSquarePlus,
  MessagesSquare,
  Pencil,
  Trash2,
  X,
} from "lucide-react";
import clsx from "clsx";
import type { ChatSummary } from "../types";
import type { ExplorerNode } from "./WorkspaceExplorer";
import { WorkspaceExplorer } from "./WorkspaceExplorer";

interface SidebarProps {
  chats: ChatSummary[];
  activeChatId: string | null;
  onCreateChat: () => void;
  onSelectChat: (chatId: string) => void;
  onRenameChat: (chatId: string, title: string) => void;
  onDeleteChat: (chatId: string) => void;
  workspaceRoot: string;
  nodes: ExplorerNode[];
  expandedPaths: Set<string>;
  selectedFiles: Set<string>;
  onToggleExpand: (node: ExplorerNode) => void;
  onToggleSelect: (node: ExplorerNode) => void;
}

export function Sidebar({
  chats,
  activeChatId,
  onCreateChat,
  onSelectChat,
  onRenameChat,
  onDeleteChat,
  workspaceRoot,
  nodes,
  expandedPaths,
  selectedFiles,
  onToggleExpand,
  onToggleSelect,
}: SidebarProps) {
  return (
    <aside className="flex h-full min-h-0 flex-col gap-4 border-r border-border bg-surface/60 p-4 backdrop-blur">
      <button
        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-accent-fg transition hover:bg-accent-hover"
        onClick={onCreateChat}
        type="button"
      >
        <MessageSquarePlus size={16} />
        New Chat
      </button>

      <section className="rounded-2xl border border-border bg-surface-2/80 p-3">
        <div className="mb-3 flex items-center gap-2 px-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-subtle">
          <MessagesSquare size={13} />
          Chats
        </div>
        <div className="max-h-56 space-y-1 overflow-y-auto pr-0.5">
          {chats.length === 0 && (
            <div className="px-2 py-3 text-xs text-subtle">No chats yet.</div>
          )}
          {chats.map((chat) => (
            <ChatListItem
              key={chat.id}
              active={activeChatId === chat.id}
              chat={chat}
              onDelete={onDeleteChat}
              onRename={onRenameChat}
              onSelect={onSelectChat}
            />
          ))}
        </div>
      </section>

      <section className="flex min-h-0 flex-1 flex-col rounded-2xl border border-border bg-surface-2/80 p-3">
        <div className="mb-2 flex items-center gap-2 px-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-subtle">
          <FolderTree size={13} />
          Workspace Explorer
        </div>
        <div className="mb-3 truncate rounded-xl border border-border bg-surface-3/70 px-3 py-2 font-mono text-xs text-muted">
          {workspaceRoot}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
          <WorkspaceExplorer
            expandedPaths={expandedPaths}
            nodes={nodes}
            onToggleExpand={onToggleExpand}
            onToggleSelect={onToggleSelect}
            selectedFiles={selectedFiles}
          />
        </div>
      </section>
    </aside>
  );
}

interface ChatListItemProps {
  chat: ChatSummary;
  active: boolean;
  onSelect: (chatId: string) => void;
  onRename: (chatId: string, title: string) => void;
  onDelete: (chatId: string) => void;
}

function ChatListItem({
  chat,
  active,
  onSelect,
  onRename,
  onDelete,
}: ChatListItemProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(chat.title);

  function commit() {
    const next = draft.trim();
    if (next && next !== chat.title) {
      onRename(chat.id, next);
    }
    setEditing(false);
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      commit();
    } else if (event.key === "Escape") {
      setDraft(chat.title);
      setEditing(false);
    }
  }

  if (editing) {
    return (
      <div
        className={clsx(
          "flex items-center gap-1 rounded-xl border px-2 py-1.5",
          active ? "border-accent-soft bg-accent/10" : "border-border bg-surface-3",
        )}
      >
        <input
          autoFocus
          className="min-w-0 flex-1 bg-transparent text-sm text-content outline-none"
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={onKeyDown}
          value={draft}
        />
        <button
          className="rounded p-1 text-subtle transition hover:text-accent"
          onClick={commit}
          title="Save"
          type="button"
        >
          <Check size={14} />
        </button>
        <button
          className="rounded p-1 text-subtle transition hover:text-content"
          onClick={() => {
            setDraft(chat.title);
            setEditing(false);
          }}
          title="Cancel"
          type="button"
        >
          <X size={14} />
        </button>
      </div>
    );
  }

  return (
    <div
      className={clsx(
        "group flex items-center gap-1 rounded-xl border px-3 py-2 transition",
        active
          ? "border-accent-soft bg-accent/10"
          : "border-transparent hover:border-border hover:bg-surface-3",
      )}
    >
      <button
        className="min-w-0 flex-1 text-left"
        onClick={() => onSelect(chat.id)}
        type="button"
      >
        <div
          className={clsx(
            "truncate text-sm font-medium",
            active ? "text-content" : "text-muted",
          )}
        >
          {chat.title}
        </div>
        <div className="mt-0.5 text-[11px] text-subtle">
          {chat.message_count} message{chat.message_count === 1 ? "" : "s"}
        </div>
      </button>
      <div className="flex shrink-0 items-center opacity-0 transition group-hover:opacity-100">
        <button
          className="rounded p-1 text-subtle transition hover:text-content"
          onClick={() => {
            setDraft(chat.title);
            setEditing(true);
          }}
          title="Rename"
          type="button"
        >
          <Pencil size={13} />
        </button>
        <button
          className="rounded p-1 text-subtle transition hover:text-danger"
          onClick={() => onDelete(chat.id)}
          title="Delete"
          type="button"
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}
