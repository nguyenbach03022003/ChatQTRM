import { useEffect, useRef } from "react";
import type { KeyboardEvent } from "react";
import { CornerDownLeft, Paperclip, SendHorizontal } from "lucide-react";

interface ComposerProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
  attachmentCount: number;
}

const MAX_TEXTAREA_HEIGHT = 220;

export function Composer({
  value,
  onChange,
  onSubmit,
  disabled,
  attachmentCount,
}: ComposerProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    const node = textareaRef.current;
    if (!node) {
      return;
    }
    node.style.height = "auto";
    node.style.height = `${Math.min(node.scrollHeight, MAX_TEXTAREA_HEIGHT)}px`;
  }, [value]);

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      if (!disabled && value.trim()) {
        onSubmit();
      }
    }
  }

  const canSend = !disabled && Boolean(value.trim());

  return (
    <div className="rounded-3xl border border-border bg-surface/95 p-3 shadow-soft backdrop-blur transition focus-within:border-accent-soft focus-within:shadow-glow">
      <textarea
        ref={textareaRef}
        className="block max-h-[220px] min-h-[64px] w-full resize-none border-none bg-transparent px-2 py-1 text-sm leading-7 text-content outline-none placeholder:text-subtle"
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={onKeyDown}
        placeholder="Ask the local agent to explain, refactor, debug, or generate tests..."
        rows={2}
        value={value}
      />
      <div className="mt-2 flex items-center justify-between gap-4 px-1">
        <div className="flex items-center gap-3 text-xs text-subtle">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-2 px-3 py-1.5 text-muted">
            <Paperclip size={13} />
            {attachmentCount} context file{attachmentCount === 1 ? "" : "s"}
          </span>
          <span className="hidden items-center gap-1 sm:inline-flex">
            <CornerDownLeft size={12} /> to send · Shift+Enter for newline
          </span>
        </div>
        <button
          className="inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-accent-fg transition hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-40"
          disabled={!canSend}
          onClick={onSubmit}
          type="button"
        >
          <SendHorizontal size={16} />
          Send
        </button>
      </div>
    </div>
  );
}
