import clsx from "clsx";
import { Check, X } from "lucide-react";

interface Props {
  title: string;
  diff: string; // unified-diff text
  onClose: () => void;
  onAccept?: () => void;
  acceptLabel?: string;
}

export function DiffModal({ title, diff, onClose, onAccept, acceptLabel = "Apply" }: Props) {
  const lines = diff.split("\n");
  return (
    <Overlay onClose={onClose}>
      <div className="flex max-h-[80vh] w-[min(900px,92vw)] flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-panel">
        <header className="flex items-center gap-3 border-b border-border px-4 py-3">
          <h3 className="min-w-0 flex-1 truncate font-mono text-sm text-content">{title}</h3>
          <button type="button" onClick={onClose} className="rounded p-1 text-subtle hover:text-content"><X size={16} /></button>
        </header>
        <div className="min-h-0 flex-1 overflow-auto bg-bg/40 font-mono text-xs leading-5">
          {lines.map((line, i) => (
            <div
              key={i}
              className={clsx(
                "whitespace-pre px-4",
                line.startsWith("+") && !line.startsWith("+++") && "bg-accent/10 text-accent",
                line.startsWith("-") && !line.startsWith("---") && "bg-danger/10 text-danger",
                line.startsWith("@@") && "text-ember",
                (line.startsWith("+++") || line.startsWith("---") || line.startsWith("diff ") || line.startsWith("index ")) && "text-subtle",
                !/^[+\-@]/.test(line) && "text-muted",
              )}
            >
              {line || " "}
            </div>
          ))}
        </div>
        {onAccept && (
          <footer className="flex items-center justify-end gap-2 border-t border-border px-4 py-3">
            <button type="button" onClick={onClose} className="rounded-lg border border-border px-4 py-2 text-sm text-muted hover:text-content">Reject</button>
            <button type="button" onClick={onAccept} className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-fg hover:bg-accent-hover">
              <Check size={15} /> {acceptLabel}
            </button>
          </footer>
        )}
      </div>
    </Overlay>
  );
}

export function Overlay({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}>{children}</div>
    </div>
  );
}
