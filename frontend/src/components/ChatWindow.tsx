import { LoaderCircle, Sparkles } from "lucide-react";
import { useEffect, useRef } from "react";
import type { Message } from "../types";
import { Composer } from "./Composer";
import { MessageBubble } from "./MessageBubble";

interface ChatWindowProps {
  messages: Message[];
  input: string;
  onInputChange: (value: string) => void;
  onSubmit: () => void;
  attachmentCount: number;
  isStreaming: boolean;
}

export function ChatWindow({
  messages,
  input,
  onInputChange,
  onSubmit,
  attachmentCount,
  isStreaming,
}: ChatWindowProps) {
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, isStreaming]);

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden bg-transparent">
      <div className="shrink-0 border-b border-edge px-6 py-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-[0.28em] text-slate-400">
              Local Engineering Agent
            </div>
            <h1 className="mt-2 text-2xl font-semibold text-slate-50">
              Codex-style workspace copilot
            </h1>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-edge bg-slate-900/80 px-4 py-2 text-sm text-slate-300">
            <Sparkles size={16} className="text-accent" />
            Streaming with Ollama
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
        <div className="mx-auto flex max-w-4xl flex-col gap-5">
          {!messages.length && (
            <div className="rounded-[30px] border border-dashed border-edge bg-slate-900/45 p-8 text-slate-400">
              Attach a few files from the workspace explorer, then ask the agent to explain code, generate tests, or debug a failing flow.
            </div>
          )}
          {messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}
          {isStreaming && (
            <div className="inline-flex w-fit items-center gap-3 rounded-full border border-edge bg-slate-900/80 px-4 py-2 text-sm text-slate-300">
              <LoaderCircle size={16} className="animate-spin text-accent" />
              Agent is thinking...
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      <div className="shrink-0 px-6 pb-6">
        <div className="mx-auto max-w-4xl">
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
