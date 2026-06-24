import { useState } from "react";
import { ChevronDown, FolderOpen, Plus, TerminalSquare } from "lucide-react";
import clsx from "clsx";
import type { Project } from "../types/desktop";
import { ThemeToggle } from "../components/ThemeToggle";
import type { Theme } from "../lib/theme";

interface Props {
  active: Project | null;
  recents: Project[];
  model: string;
  theme: Theme;
  onToggleTheme: () => void;
  onPick: () => void;
  onOpenRecent: (id: string) => void;
  onToggleTerminal: () => void;
}

export function ProjectBar({
  active,
  recents,
  model,
  theme,
  onToggleTheme,
  onPick,
  onOpenRecent,
  onToggleTerminal,
}: Props) {
  const [open, setOpen] = useState(false);

  return (
    <header className="relative z-20 flex h-12 shrink-0 items-center gap-3 border-b border-border bg-surface/80 px-3 backdrop-blur">
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-2 rounded-lg border border-border bg-surface-2 px-3 py-1.5 text-sm text-content transition hover:border-border-strong"
        >
          <FolderOpen size={15} className="text-accent" />
          <span className="max-w-[260px] truncate font-medium">
            {active ? active.name : "No project selected"}
          </span>
          <ChevronDown size={14} className="text-subtle" />
        </button>
        {open && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
            <div className="absolute left-0 top-full z-20 mt-1 w-80 rounded-xl border border-border bg-surface-2 p-2 shadow-panel">
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  onPick();
                }}
                className="mb-1 flex w-full items-center gap-2 rounded-lg bg-accent/12 px-3 py-2 text-sm font-medium text-accent transition hover:bg-accent/20"
              >
                <Plus size={15} /> Select Project Folder…
              </button>
              <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-subtle">
                Recent
              </div>
              <div className="max-h-72 overflow-y-auto">
                {recents.length === 0 && (
                  <div className="px-3 py-2 text-xs text-subtle">No recent projects.</div>
                )}
                {recents.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      onOpenRecent(p.id);
                    }}
                    className={clsx(
                      "flex w-full flex-col rounded-lg px-3 py-2 text-left transition hover:bg-surface-3",
                      active?.id === p.id && "bg-surface-3",
                    )}
                  >
                    <span className="truncate text-sm text-content">{p.name}</span>
                    <span className="truncate font-mono text-[11px] text-subtle">{p.root}</span>
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {active && (
        <span className="truncate font-mono text-[11px] text-subtle">{active.root}</span>
      )}

      <div className="ml-auto flex items-center gap-2">
        <span className="hidden items-center gap-2 rounded-full border border-border bg-surface-2 px-3 py-1 text-xs text-muted md:inline-flex">
          <span className="h-1.5 w-1.5 rounded-full bg-accent" />
          {model}
        </span>
        <button
          type="button"
          title="Toggle terminal"
          onClick={onToggleTerminal}
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-surface-2 text-muted transition hover:text-content"
        >
          <TerminalSquare size={16} />
        </button>
        <ThemeToggle theme={theme} onToggle={onToggleTheme} />
      </div>
    </header>
  );
}
