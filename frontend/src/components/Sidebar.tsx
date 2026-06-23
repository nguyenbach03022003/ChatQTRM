import { FolderTree, MessageSquarePlus, MessagesSquare } from "lucide-react";
import type { ChatSummary } from "../types";
import type { ExplorerNode } from "./WorkspaceExplorer";
import { WorkspaceExplorer } from "./WorkspaceExplorer";

interface SidebarProps {
  chats: ChatSummary[];
  activeChatId: string | null;
  onCreateChat: () => void;
  onSelectChat: (chatId: string) => void;
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
  workspaceRoot,
  nodes,
  expandedPaths,
  selectedFiles,
  onToggleExpand,
  onToggleSelect,
}: SidebarProps) {
  return (
    <aside className="flex h-full flex-col gap-6 border-r border-edge bg-slate-950/55 p-4">
      <button
        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-[#7bf0c4]"
        onClick={onCreateChat}
        type="button"
      >
        <MessageSquarePlus size={16} />
        New Chat
      </button>

      <section className="rounded-[26px] border border-edge bg-panel/80 p-4">
        <div className="mb-4 flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-slate-400">
          <MessagesSquare size={14} />
          Chats
        </div>
        <div className="space-y-2">
          {chats.map((chat) => (
            <button
              key={chat.id}
              className={`w-full rounded-2xl border px-3 py-3 text-left transition ${
                activeChatId === chat.id
                  ? "border-accentSoft bg-emerald-400/10 text-slate-50"
                  : "border-transparent bg-slate-900/60 text-slate-300 hover:border-edge hover:bg-slate-800/70"
              }`}
              onClick={() => onSelectChat(chat.id)}
              type="button"
            >
              <div className="truncate text-sm font-medium">{chat.title}</div>
              <div className="mt-1 text-xs text-slate-500">
                {chat.message_count} messages
              </div>
            </button>
          ))}
        </div>
      </section>

      <section className="min-h-0 flex-1 rounded-[26px] border border-edge bg-panel/80 p-4">
        <div className="mb-3 flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-slate-400">
          <FolderTree size={14} />
          Workspace Explorer
        </div>
        <div className="mb-3 rounded-2xl border border-edge bg-slate-900/75 px-3 py-2 text-xs text-slate-400">
          {workspaceRoot}
        </div>
        <div className="max-h-[calc(100vh-24rem)] overflow-y-auto pr-1">
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
