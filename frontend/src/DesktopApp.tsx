import { useCallback, useEffect, useRef, useState } from "react";
import { desktop, onEvent, type UnlistenFn } from "./lib/desktop";
import { useTheme } from "./lib/theme";
import type {
  AppSettings,
  ChatContextEvent,
  ChatErrorEvent,
  ChatMessage,
  ChatSummary,
  ChatTokenEvent,
  Project,
} from "./types/desktop";
import { ActivityBar, type View } from "./desktop/ActivityBar";
import { ProjectBar } from "./desktop/ProjectBar";
import { ChatsPanel } from "./desktop/ChatsPanel";
import { FilesPanel } from "./desktop/FilesPanel";
import { SearchPanel } from "./desktop/SearchPanel";
import { GitPanel } from "./desktop/GitPanel";
import { SkillsView } from "./desktop/SkillsView";
import { SettingsView } from "./desktop/SettingsView";
import { TerminalPanel } from "./desktop/TerminalPanel";
import { DesktopChat } from "./desktop/DesktopChat";
import { DiffModal } from "./desktop/DiffModal";
import { FileEditorModal } from "./desktop/FileEditorModal";
import { ApprovalModal, type ApprovalRequest } from "./desktop/ApprovalModal";

export default function DesktopApp() {
  const { theme, setTheme, toggleTheme } = useTheme();
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [view, setView] = useState<View>("chats");

  const [chats, setChats] = useState<ChatSummary[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);

  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [activeFiles, setActiveFiles] = useState<string[]>([]);
  const [estimatedTokens, setEstimatedTokens] = useState(0);

  const [terminalOpen, setTerminalOpen] = useState(false);
  const [gitRefreshKey, setGitRefreshKey] = useState(0);

  const [editorPath, setEditorPath] = useState<string | null>(null);
  const [diff, setDiff] = useState<{ title: string; diff: string } | null>(null);
  const [approval, setApproval] = useState<ApprovalRequest | null>(null);

  const activeChatRef = useRef<string | null>(null);
  const pendingRef = useRef<string | null>(null);
  useEffect(() => {
    activeChatRef.current = activeChatId;
  }, [activeChatId]);

  // ---- bootstrap ----
  useEffect(() => {
    (async () => {
      try {
        const s = await desktop.getSettings();
        setSettings(s);
        setTheme(s.theme === "light" ? "light" : "dark");
        const [list, activePath] = await Promise.all([desktop.listProjects(), desktop.activeProject()]);
        setProjects(list);
        if (activePath) {
          setActiveProject(list.find((p) => p.root === activePath) ?? null);
        } else if (list[0]) {
          const project = await desktop.openProjectById(list[0].id);
          setActiveProject(project);
          setProjects(await desktop.listProjects());
        }
        await refreshChats(true);
      } catch (e) {
        console.error(e);
      }
    })();
  }, []);

  // ---- streaming listeners (registered once) ----
  useEffect(() => {
    const subs: UnlistenFn[] = [];
    (async () => {
      subs.push(
        await onEvent<ChatTokenEvent>("chat://token", (p) => {
          if (p.chatId !== activeChatRef.current) return;
          setMessages((cur) => cur.map((m) => (m.id === pendingRef.current ? { ...m, content: m.content + p.content } : m)));
        }),
      );
      subs.push(
        await onEvent<ChatContextEvent>("chat://context", (p) => {
          if (p.chatId !== activeChatRef.current) return;
          setActiveFiles(p.activeFiles);
          setEstimatedTokens(p.estimatedPromptTokens);
        }),
      );
      subs.push(
        await onEvent<ChatErrorEvent>("chat://error", (p) => {
          if (p.chatId !== activeChatRef.current) return;
          setMessages((cur) => cur.map((m) => (m.id === pendingRef.current ? { ...m, content: `**Error:** ${p.message}` } : m)));
        }),
      );
    })();
    return () => subs.forEach((u) => u());
  }, []);

  async function refreshChats(selectFirst = false) {
    const list = await desktop.listChats();
    setChats(list);
    if (selectFirst) {
      if (list[0]) await selectChat(list[0].id);
      else await createChat();
    }
  }

  async function selectChat(id: string) {
    const chat = await desktop.getChat(id);
    setActiveChatId(chat.id);
    setMessages(chat.messages);
    setActiveFiles([]);
    setEstimatedTokens(0);
  }

  async function createChat() {
    const chat = await desktop.createChat(undefined, activeProject?.id);
    setChats(await desktop.listChats());
    setActiveChatId(chat.id);
    setMessages([]);
  }

  async function openProjectPath(path: string) {
    const project = await desktop.openProject(path);
    setActiveProject(project);
    setProjects(await desktop.listProjects());
    setSelectedFiles(new Set());
    setGitRefreshKey((k) => k + 1);
  }

  async function pickProject() {
    const picked = await desktop.pickFolder();
    if (typeof picked === "string") await openProjectPath(picked);
  }

  async function handleSubmit() {
    if (!activeChatId || !input.trim() || isStreaming || !activeProject) return;
    const text = input.trim();
    const user: ChatMessage = { id: crypto.randomUUID(), role: "user", content: text, created_at: new Date().toISOString() };
    const pending: ChatMessage = { id: crypto.randomUUID(), role: "assistant", content: "", created_at: new Date().toISOString() };
    pendingRef.current = pending.id;
    setMessages((cur) => [...cur, user, pending]);
    setInput("");
    setIsStreaming(true);
    setActiveFiles([]);
    setEstimatedTokens(0);
    try {
      await desktop.chatSend(activeChatId, text, Array.from(selectedFiles));
      const [chat, list] = await Promise.all([desktop.getChat(activeChatId), desktop.listChats()]);
      setMessages(chat.messages);
      setChats(list);
    } catch (e) {
      console.error(e);
    } finally {
      setIsStreaming(false);
    }
  }

  function toggleSelectFile(path: string) {
    setSelectedFiles((cur) => {
      const next = new Set(cur);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }

  const onToggleTheme = useCallback(() => {
    const next = theme === "dark" ? "light" : "dark";
    toggleTheme();
    if (settings) {
      const s = { ...settings, theme: next };
      setSettings(s);
      void desktop.saveSettings(s);
    }
  }, [theme, settings, toggleTheme]);

  const hasProject = Boolean(activeProject);
  const fullView = view === "skills" || view === "settings";

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-bg text-content">
      <ProjectBar
        active={activeProject}
        recents={projects}
        model={settings?.model || "model"}
        theme={theme}
        onToggleTheme={onToggleTheme}
        onPick={pickProject}
        onOpenRecent={(id) => desktop.openProjectById(id).then((p) => { setActiveProject(p); setSelectedFiles(new Set()); setGitRefreshKey((k) => k + 1); return desktop.listProjects(); }).then(setProjects)}
        onToggleTerminal={() => setTerminalOpen((v) => !v)}
      />
      <div className="flex min-h-0 flex-1">
        <ActivityBar active={view} onSelect={setView} onToggleTerminal={() => setTerminalOpen((v) => !v)} terminalOpen={terminalOpen} />

        {fullView ? (
          <main className="min-w-0 flex-1 overflow-hidden">
            {view === "skills" ? (
              <SkillsView requestApproval={setApproval} onChanged={() => undefined} />
            ) : (
              settings && <SettingsView settings={settings} onSaved={(s) => { setSettings(s); setTheme(s.theme === "light" ? "light" : "dark"); }} />
            )}
          </main>
        ) : (
          <>
            <aside className="w-[300px] shrink-0 overflow-hidden border-r border-border bg-surface/40">
              {view === "chats" && (
                <ChatsPanel
                  chats={chats}
                  activeChatId={activeChatId}
                  onSelect={selectChat}
                  onCreate={createChat}
                  onRename={(id, title) => desktop.renameChat(id, title).then(() => refreshChats())}
                  onDelete={(id) => setApproval({ title: "Delete chat?", detail: "This conversation will be permanently removed.", confirmLabel: "Delete", onConfirm: () => void desktop.deleteChat(id).then(async () => { if (id === activeChatId) { await refreshChats(true); } else { await refreshChats(); } }) })}
                  onPin={(id, pinned) => desktop.pinChat(id, pinned).then(() => refreshChats())}
                />
              )}
              {view === "files" && (
                <FilesPanel key={activeProject?.id} hasProject={hasProject} selected={selectedFiles} onToggleSelect={toggleSelectFile} onOpenFile={setEditorPath} />
              )}
              {view === "search" && <SearchPanel key={activeProject?.id} hasProject={hasProject} onOpenFile={setEditorPath} />}
              {view === "git" && <GitPanel key={activeProject?.id} hasProject={hasProject} refreshKey={gitRefreshKey} onViewDiff={(title, d) => setDiff({ title, diff: d })} />}
            </aside>

            <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
              <div className="min-h-0 flex-1 overflow-hidden">
                <DesktopChat
                  messages={messages}
                  input={input}
                  onInput={setInput}
                  onSubmit={handleSubmit}
                  isStreaming={isStreaming}
                  attachments={Array.from(selectedFiles)}
                  onRemoveAttachment={toggleSelectFile}
                  activeFiles={activeFiles}
                  estimatedTokens={estimatedTokens}
                  contextWindow={settings?.numCtx || 0}
                  hasProject={hasProject}
                />
              </div>
              {terminalOpen && (
                <div className="h-72 shrink-0">
                  <TerminalPanel shell={settings?.shell || "powershell"} projectKey={activeProject?.id || "none"} onClose={() => setTerminalOpen(false)} />
                </div>
              )}
            </main>
          </>
        )}
      </div>

      {editorPath && <FileEditorModal path={editorPath} onClose={() => setEditorPath(null)} onSaved={() => setGitRefreshKey((k) => k + 1)} requestApproval={setApproval} />}
      {diff && <DiffModal title={diff.title} diff={diff.diff} onClose={() => setDiff(null)} />}
      {approval && <ApprovalModal request={approval} onClose={() => setApproval(null)} />}
    </div>
  );
}
