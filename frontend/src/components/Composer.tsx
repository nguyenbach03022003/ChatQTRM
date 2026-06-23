import type { KeyboardEvent } from "react";
import { Paperclip, SendHorizontal } from "lucide-react";

interface ComposerProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
  attachmentCount: number;
}

export function Composer({
  value,
  onChange,
  onSubmit,
  disabled,
  attachmentCount,
}: ComposerProps) {
  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      if (!disabled && value.trim()) {
        onSubmit();
      }
    }
  }

  return (
    <div className="rounded-[28px] border border-edge bg-slate-900/90 p-4 shadow-panel">
      <textarea
        className="min-h-[110px] w-full resize-none border-none bg-transparent text-sm leading-7 text-slate-100 outline-none placeholder:text-slate-500"
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={onKeyDown}
        placeholder="Ask the local agent to explain, refactor, debug, or generate tests..."
        value={value}
      />
      <div className="mt-4 flex items-center justify-between gap-4">
        <div className="inline-flex items-center gap-2 rounded-full border border-edge bg-slate-800/70 px-3 py-2 text-xs text-slate-300">
          <Paperclip size={14} />
          {attachmentCount} context file{attachmentCount === 1 ? "" : "s"}
        </div>
        <button
          className="inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-[#7bf0c4] disabled:cursor-not-allowed disabled:opacity-50"
          disabled={disabled || !value.trim()}
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
