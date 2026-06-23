import clsx from "clsx";
import { useState } from "react";
import { Bot, Check, Copy, User } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Message } from "../types";
import { CodeBlock } from "./CodeBlock";

interface MessageBubbleProps {
  message: Message;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isAssistant = message.role === "assistant";
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <div
      className={clsx(
        "group flex animate-fade-in-up gap-3",
        isAssistant ? "flex-row" : "flex-row-reverse",
      )}
    >
      <div
        className={clsx(
          "mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border",
          isAssistant
            ? "border-accent-soft/60 bg-accent/15 text-accent"
            : "border-border-strong bg-surface-3 text-muted",
        )}
      >
        {isAssistant ? <Bot size={16} /> : <User size={16} />}
      </div>

      <div
        className={clsx(
          "relative min-w-0 max-w-2xl rounded-2xl border px-5 py-4 shadow-soft",
          isAssistant
            ? "border-border bg-surface text-content"
            : "border-accent-soft/50 bg-accent/10 text-content",
        )}
      >
        <div className="mb-2 flex items-center justify-between gap-3">
          <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-subtle">
            {isAssistant ? "Agent" : "You"}
          </span>
          {Boolean(message.content) && (
            <button
              className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] text-subtle opacity-0 transition hover:text-content group-hover:opacity-100"
              onClick={handleCopy}
              title="Copy message"
              type="button"
            >
              {copied ? <Check size={12} /> : <Copy size={12} />}
              {copied ? "Copied" : "Copy"}
            </button>
          )}
        </div>
        <div className="prose-chat text-sm leading-7 text-content/90">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              code({ className, children, ...props }) {
                const inline = !className && !String(children).includes("\n");
                if (inline) {
                  return (
                    <code
                      className="rounded bg-surface-3 px-1.5 py-0.5 font-mono text-[0.82em] text-accent"
                      {...props}
                    >
                      {children}
                    </code>
                  );
                }

                return <CodeBlock className={className}>{children}</CodeBlock>;
              },
              a({ children, href }) {
                return (
                  <a
                    className="text-accent underline decoration-accent/50 underline-offset-4 hover:decoration-accent"
                    href={href}
                    rel="noreferrer"
                    target="_blank"
                  >
                    {children}
                  </a>
                );
              },
              ul({ children }) {
                return <ul className="list-disc pl-5">{children}</ul>;
              },
              ol({ children }) {
                return <ol className="list-decimal pl-5">{children}</ol>;
              },
            }}
          >
            {message.content}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );
}
