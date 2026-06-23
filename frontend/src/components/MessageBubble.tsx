import clsx from "clsx";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Message } from "../types";
import { CodeBlock } from "./CodeBlock";

interface MessageBubbleProps {
  message: Message;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isAssistant = message.role === "assistant";

  return (
    <div
      className={clsx(
        "max-w-4xl rounded-[28px] border px-5 py-4 shadow-panel backdrop-blur",
        isAssistant
          ? "border-edge bg-slate-900/70 text-slate-100"
          : "ml-auto border-accentSoft bg-emerald-500/10 text-slate-50",
      )}
    >
      <div className="mb-3 flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-slate-400">
        <span>{isAssistant ? "Agent" : "You"}</span>
      </div>
      <div className="prose-chat text-sm leading-7 text-slate-200">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            code({ className, children, ...props }) {
              const inline = !className && !String(children).includes("\n");
              if (inline) {
                return (
                  <code
                    className="rounded bg-slate-800 px-1.5 py-0.5 text-emerald-200"
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
                  className="text-accent underline decoration-accent/60 underline-offset-4"
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
  );
}
