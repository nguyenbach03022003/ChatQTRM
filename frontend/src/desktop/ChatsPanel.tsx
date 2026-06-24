import { useState } from "react";
import type { KeyboardEvent } from "react";
import { Check, MessageSquarePlus, Pencil, Pin, PinOff, Trash2, X } from "lucide-react";
import clsx from "clsx";
import type { ChatSummary } from "../types/desktop";

interface Props {
  chats: ChatSummary[];
  activeChatId: string | null;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onRename: (id: string, title: string) => void;
  onDelete: (id: string) => void;
  onPin: (id: string, pinned: boolean) => void;
}

export function ChatsPanel({ chats, activeChatId, onSelect, onCreate, onRename, onDelete, onPin }: Props) {
  return (
    <div className="flex h-full min-h-0 flex-col gap-3 p-3">
      <button
        type="button"
        onClick={onCreate}
        className="inline-flex items-center justify-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-accent-fg transition hover:bg-accent-hover"
      >
        <MessageSquarePlus size={16} /> New Chat
      </button>
      <div className="min-h-0 flex-1 space-y-1 overflow-y-auto pr-0.5">
        {chats.length === 0 && <div className="px-2 py-3 text-xs text-subtle">No chats yet.</div>}
        {chats.map((chat) => (
          <ChatItem
            key={chat.id}
            chat={chat}
            active={activeChatId === chat.id}
            onSelect={onSelect}
            onRename={onRename}
            onDelete={onDelete}
            onPin={onPin}
          />
        ))}
      </div>
    </div>
  );
}

function ChatItem({
  chat,
  active,
  onSelect,
  onRename,
  onDelete,
  onPin,
}: {
  chat: ChatSummary;
  active: boolean;
  onSelect: (id: string) => void;
  onRename: (id: string, title: string) => void;
  onDelete: (id: string) => void;
  onPin: (id: string, pinned: boolean) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(chat.title);

  function commit() {
    const next = draft.trim();
    if (next && next !== chat.title) onRename(chat.id, next);
    setEditing(false);
  }
  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      commit();
    } else if (e.key === "Escape") {
      setDraft(chat.title);
      setEditing(false);
    }
  }

  if (editing) {
    return (
      <div className={clsx("flex items-center gap-1 rounded-xl border px-2 py-1.5", active ? "border-accent-soft bg-accent/10" : "border-border bg-surface-3")}>
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          className="min-w-0 flex-1 bg-transparent text-sm text-content outline-none"
        />
        <button type="button" onClick={commit} title="Save" className="rounded p-1 text-subtle hover:text-accent">
          <Check size={14} />
        </button>
        <button type="button" onClick={() => { setDraft(chat.title); setEditing(false); }} title="Cancel" className="rounded p-1 text-subtle hover:text-content">
          <X size={14} />
        </button>
      </div>
    );
  }

  return (
    <div className={clsx("group flex items-center gap-1 rounded-xl border px-3 py-2 transition", active ? "border-accent-soft bg-accent/10" : "border-transparent hover:border-border hover:bg-surface-3")}>
      <button type="button" onClick={() => onSelect(chat.id)} className="flex min-w-0 flex-1 items-center gap-2 text-left">
        {chat.pinned && <Pin size={12} className="shrink-0 text-accent" />}
        <span className="min-w-0">
          <span className={clsx("block truncate text-sm font-medium", active ? "text-content" : "text-muted")}>{chat.title || "Untitled"}</span>
          <span className="mt-0.5 block text-[11px] text-subtle">{chat.message_count} message{chat.message_count === 1 ? "" : "s"}</span>
        </span>
      </button>
      <div className="flex shrink-0 items-center opacity-0 transition group-hover:opacity-100">
        <button type="button" onClick={() => onPin(chat.id, !chat.pinned)} title={chat.pinned ? "Unpin" : "Pin"} className="rounded p-1 text-subtle hover:text-accent">
          {chat.pinned ? <PinOff size={13} /> : <Pin size={13} />}
        </button>
        <button type="button" onClick={() => { setDraft(chat.title); setEditing(true); }} title="Rename" className="rounded p-1 text-subtle hover:text-content">
          <Pencil size={13} />
        </button>
        <button type="button" onClick={() => onDelete(chat.id)} title="Delete" className="rounded p-1 text-subtle hover:text-danger">
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}
