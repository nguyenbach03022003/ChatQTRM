import { useEffect, useRef } from "react";
import { FileText, LoaderCircle, Sparkles, X } from "lucide-react";
import { Composer } from "../components/Composer";
import { MessageBubble } from "../components/MessageBubble";
import type { ChatMessage } from "../types/desktop";

const STARTERS = [
  "Summarize the structure of this project.",
  "Review the attached files for bugs and edge cases.",
  "Generate unit tests for the selected code.",
  "Explain how these files fit together.",
];

interface Props {
  messages: ChatMessage[];
  input: string;
  onInput: (v: string) => void;
  onSubmit: () => void;
  isStreaming: boolean;
  attachments: string[];
  onRemoveAttachment: (path: string) => void;
  activeFiles: string[];
  estimatedTokens: number;
  contextWindow: number;
  hasProject: boolean;
}

export function DesktopChat({
  messages,
  input,
  onInput,
  onSubmit,
  isStreaming,
  attachments,
  onRemoveAttachment,
  activeFiles,
  estimatedTokens,
  contextWindow,
  hasProject,
}: Props) {
  const bottomRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, isStreaming]);

  const isEmpty = messages.length === 0;
  const contextPercent =
    contextWindow > 0 ? Math.min(100, (estimatedTokens / contextWindow) * 100) : 0;

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden bg-haze">
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-6">
        <div className="mx-auto flex max-w-3xl flex-col gap-5">
          {isEmpty ? (
            <div className="mt-10 flex flex-col items-center text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-accent-soft/50 bg-accent/12 text-accent">
                <Sparkles size={26} />
              </div>
              <h2 className="text-xl font-semibold text-content">QTRM Chat</h2>
              <p className="mt-2 max-w-md text-sm text-muted">
                {hasProject
                  ? "Attach files from the Files panel, then ask the agent to explain code, refactor, generate tests, or debug."
                  : "Select a project folder to give the agent context, tools, and a working directory."}
              </p>
              <div className="mt-6 flex w-full max-w-md flex-col gap-2">
                {STARTERS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => onInput(s)}
                    className="rounded-xl border border-border bg-surface-2/70 px-4 py-3 text-left text-sm text-muted transition hover:border-accent-soft hover:bg-accent/10 hover:text-content"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((m) => <MessageBubble key={m.id} message={m} />)
          )}
          {isStreaming && (
            <div className="inline-flex w-fit items-center gap-3 rounded-full border border-border bg-surface-2 px-4 py-2 text-sm text-muted">
              <LoaderCircle size={16} className="animate-spin text-accent" />
              Agent is thinking
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      <div className="shrink-0 px-4 pb-5 sm:px-6">
        <div className="mx-auto max-w-3xl">
          <div className="mb-2 rounded-xl border border-border bg-surface-2/80 px-3 py-2">
            <div className="mb-1 flex items-center justify-between gap-3 text-[11px] text-subtle">
              <span>Context window used</span>
              <span className="font-mono text-muted">
                {estimatedTokens.toLocaleString()} /{" "}
                {contextWindow > 0 ? contextWindow.toLocaleString() : "unknown"} tokens
                {contextWindow > 0 && ` (${contextPercent.toFixed(1)}%)`}
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-surface-3">
              <div
                className="h-full rounded-full bg-accent transition-all"
                style={{ width: `${contextPercent}%` }}
              />
            </div>
          </div>
          {(attachments.length > 0 || activeFiles.length > 0) && (
            <div className="mb-2 flex flex-wrap items-center gap-2">
              {attachments.map((p) => (
                <span
                  key={p}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-2 px-2.5 py-1 text-[11px] text-muted"
                >
                  <FileText size={12} className="text-accent" />
                  <span className="max-w-[220px] truncate font-mono">{p}</span>
                  <button type="button" onClick={() => onRemoveAttachment(p)} title="Remove">
                    <X size={12} className="text-subtle hover:text-danger" />
                  </button>
                </span>
              ))}
              {estimatedTokens > 0 && (
                <span className="ml-auto text-[11px] text-subtle">
                  ~{estimatedTokens.toLocaleString()} used
                  {contextWindow > 0 && ` / ${contextWindow.toLocaleString()}`}
                </span>
              )}
            </div>
          )}
          <Composer
            value={input}
            onChange={onInput}
            onSubmit={onSubmit}
            disabled={isStreaming || !hasProject}
            attachmentCount={attachments.length}
          />
        </div>
      </div>
    </section>
  );
}
