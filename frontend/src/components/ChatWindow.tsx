import {
  LoaderCircle,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  Sparkles,
} from "lucide-react";
import { useEffect, useRef } from "react";
import type { Message } from "../types";
import type { Theme } from "../lib/theme";
import { Composer } from "./Composer";
import { MessageBubble } from "./MessageBubble";
import { ThemeToggle } from "./ThemeToggle";

interface ChatWindowProps {
  messages: Message[];
  input: string;
  onInputChange: (value: string) => void;
  onSubmit: () => void;
  attachmentCount: number;
  isStreaming: boolean;
  modelName: string;
  theme: Theme;
  onToggleTheme: () => void;
  sidebarOpen: boolean;
  contextOpen: boolean;
  onToggleSidebar: () => void;
  onToggleContext: () => void;
}

const STARTERS = [
  "Explain how the selected files fit together.",
  "Generate unit tests for the attached code.",
  "Review this code for bugs and edge cases.",
];

export function ChatWindow({
  messages,
  input,
  onInputChange,
  onSubmit,
  attachmentCount,
  isStreaming,
  modelName,
  theme,
  onToggleTheme,
  sidebarOpen,
  contextOpen,
  onToggleSidebar,
  onToggleContext,
}: ChatWindowProps) {
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, isStreaming]);

  const isEmpty = messages.length === 0;

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden bg-transparent">
      <header className="shrink-0 border-b border-border px-5 py-3.5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <IconButton
              label={sidebarOpen ? "Hide sidebar" : "Show sidebar"}
              onClick={onToggleSidebar}
            >
              {sidebarOpen ? (
                <PanelLeftClose size={16} />
              ) : (
                <PanelLeftOpen size={16} />
              )}
            </IconButton>
            <div className="min-w-0">
              <div className="text-[10px] font-semibold uppercase tracking-[0.28em] text-subtle">
                Local Engineering Agent
              </div>
              <h1 className="truncate text-lg font-semibold text-content">
                Workspace Copilot
              </h1>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className="hidden items-center gap-2 rounded-full border border-border bg-surface-2 px-3 py-1.5 text-xs text-muted md:inline-flex">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" />
              {modelName}
            </span>
            <ThemeToggle onToggle={onToggleTheme} theme={theme} />
            <IconButton
              label={contextOpen ? "Hide context panel" : "Show context panel"}
              onClick={onToggleContext}
            >
              {contextOpen ? (
                <PanelRightClose size={16} />
              ) : (
                <PanelRightOpen size={16} />
              )}
            </IconButton>
          </div>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-6">
        <div className="mx-auto flex max-w-3xl flex-col gap-5">
          {isEmpty ? (
            <div className="mt-10 flex flex-col items-center text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-accent-soft/50 bg-accent/12 text-accent">
                <Sparkles size={26} />
              </div>
              <h2 className="text-xl font-semibold text-content">
                Start a conversation
              </h2>
              <p className="mt-2 max-w-md text-sm text-muted">
                Attach files from the workspace explorer, then ask the agent to
                explain code, generate tests, or debug a failing flow.
              </p>
              <div className="mt-6 flex w-full max-w-md flex-col gap-2">
                {STARTERS.map((starter) => (
                  <button
                    key={starter}
                    className="rounded-xl border border-border bg-surface-2/70 px-4 py-3 text-left text-sm text-muted transition hover:border-accent-soft hover:bg-accent/10 hover:text-content"
                    onClick={() => onInputChange(starter)}
                    type="button"
                  >
                    {starter}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))
          )}
          {isStreaming && (
            <div className="inline-flex w-fit items-center gap-3 rounded-full border border-border bg-surface-2 px-4 py-2 text-sm text-muted">
              <LoaderCircle size={16} className="animate-spin text-accent" />
              Agent is thinking
              <span className="flex gap-1">
                <span className="h-1 w-1 animate-pulse-dot rounded-full bg-accent" />
                <span className="h-1 w-1 animate-pulse-dot rounded-full bg-accent [animation-delay:0.2s]" />
                <span className="h-1 w-1 animate-pulse-dot rounded-full bg-accent [animation-delay:0.4s]" />
              </span>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      <div className="shrink-0 px-4 pb-5 sm:px-6">
        <div className="mx-auto max-w-3xl">
          <Composer
            attachmentCount={attachmentCount}
            disabled={isStreaming}
            onChange={onInputChange}
            onSubmit={onSubmit}
            value={input}
          />
        </div>
      </div>
    </section>
  );
}

interface IconButtonProps {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}

function IconButton({ label, onClick, children }: IconButtonProps) {
  return (
    <button
      aria-label={label}
      className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface-2 text-muted transition hover:border-border-strong hover:text-content"
      onClick={onClick}
      title={label}
      type="button"
    >
      {children}
    </button>
  );
}
