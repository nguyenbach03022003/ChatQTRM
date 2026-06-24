import { useCallback, useEffect, useState } from "react";
import { Check, GitBranch, GitCommit, Plus, RefreshCw } from "lucide-react";
import clsx from "clsx";
import { desktop } from "../lib/desktop";
import type { GitStatus } from "../types/desktop";

interface Props {
  hasProject: boolean;
  refreshKey: number;
  onViewDiff: (title: string, diff: string) => void;
}

export function GitPanel({ hasProject, refreshKey, onViewDiff }: Props) {
  const [status, setStatus] = useState<GitStatus | null>(null);
  const [branches, setBranches] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    if (!hasProject) return;
    try {
      setError(null);
      const s = await desktop.gitStatus();
      setStatus(s);
      if (s.isRepo) setBranches(await desktop.gitBranches());
    } catch (e) {
      setError(String(e));
    }
  }, [hasProject]);

  useEffect(() => {
    void refresh();
  }, [refresh, refreshKey]);

  async function withBusy(fn: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await fn();
      await refresh();
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }

  async function viewDiff(path: string, staged: boolean) {
    try {
      const diff = await desktop.gitDiff(path, staged);
      onViewDiff(`${staged ? "Staged: " : ""}${path}`, diff || "(no changes)");
    } catch (e) {
      setError(String(e));
    }
  }

  if (status && !status.isRepo) {
    return (
      <div className="p-4 text-sm text-subtle">
        This project is not a git repository.
        <button
          type="button"
          onClick={() => withBusy(async () => { await desktop.runCommand("git init"); })}
          className="mt-3 block rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-accent-fg hover:bg-accent-hover"
        >
          git init
        </button>
      </div>
    );
  }

  const staged = status?.files.filter((f) => f.staged) ?? [];
  const unstaged = status?.files.filter((f) => !f.staged) ?? [];

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <span className="flex items-center gap-1.5 text-sm font-medium text-content">
          <GitBranch size={14} className="text-accent" />
          {status?.branch || "—"}
          {status && (status.ahead > 0 || status.behind > 0) && (
            <span className="text-[11px] text-subtle">↑{status.ahead} ↓{status.behind}</span>
          )}
        </span>
        <button type="button" title="Refresh" onClick={refresh} className="rounded-md p-1.5 text-subtle hover:text-content">
          <RefreshCw size={14} />
        </button>
      </div>
      {error && <div className="px-3 py-2 text-xs text-danger">{error}</div>}

      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        <Section title="Staged Changes" count={staged.length} action={staged.length ? { label: "Unstage all", run: () => withBusy(() => desktop.gitUnstage(staged.map((f) => f.path))) } : undefined}>
          {staged.map((f) => (
            <Row key={f.path} code={f.status} path={f.path} onClick={() => viewDiff(f.path, true)} onAct={() => withBusy(() => desktop.gitUnstage([f.path]))} actLabel="−" />
          ))}
        </Section>
        <Section title="Changes" count={unstaged.length} action={unstaged.length ? { label: "Stage all", run: () => withBusy(() => desktop.gitStage(unstaged.map((f) => f.path))) } : undefined}>
          {unstaged.map((f) => (
            <Row key={f.path} code={f.status} path={f.path} onClick={() => viewDiff(f.path, false)} onAct={() => withBusy(() => desktop.gitStage([f.path]))} actLabel="+" />
          ))}
        </Section>
      </div>

      <div className="space-y-2 border-t border-border p-3">
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Commit message"
          rows={2}
          className="w-full resize-none rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-content outline-none focus:border-accent-soft"
        />
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={busy || !message.trim() || staged.length === 0}
            onClick={() => withBusy(async () => { await desktop.gitCommit(message); setMessage(""); })}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-accent-fg transition hover:bg-accent-hover disabled:opacity-40"
          >
            <GitCommit size={15} /> Commit
          </button>
          <select
            value={status?.branch || ""}
            onChange={(e) => withBusy(async () => { await desktop.gitCheckout(e.target.value); })}
            className="rounded-lg border border-border bg-surface-2 px-2 py-2 text-xs text-content outline-none"
          >
            {branches.map((b) => <option key={b} value={b}>{b}</option>)}
          </select>
          <button
            type="button"
            title="New branch"
            onClick={() => {
              const name = window.prompt("New branch name:");
              if (name) void withBusy(async () => { await desktop.gitCreateBranch(name); });
            }}
            className="rounded-lg border border-border bg-surface-2 p-2 text-subtle hover:text-content"
          >
            <Plus size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}

function Section({ title, count, action, children }: { title: string; count: number; action?: { label: string; run: () => void }; children: React.ReactNode }) {
  return (
    <div className="mb-3">
      <div className="flex items-center gap-2 px-1 py-1">
        <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-subtle">{title}</span>
        <span className="rounded-full bg-surface-3 px-1.5 text-[10px] text-subtle">{count}</span>
        {action && (
          <button type="button" onClick={action.run} className="ml-auto text-[11px] text-accent hover:underline">{action.label}</button>
        )}
      </div>
      {count === 0 && <div className="px-2 py-1 text-xs text-subtle">None</div>}
      {children}
    </div>
  );
}

function Row({ code, path, onClick, onAct, actLabel }: { code: string; path: string; onClick: () => void; onAct: () => void; actLabel: string }) {
  return (
    <div className="group flex items-center gap-2 rounded-md px-2 py-1 hover:bg-surface-3">
      <span className={clsx("w-5 shrink-0 text-center font-mono text-[11px]", code.includes("?") ? "text-ember" : "text-accent")}>{code.trim() || "•"}</span>
      <button type="button" onClick={onClick} className="min-w-0 flex-1 truncate text-left font-mono text-xs text-muted hover:text-content">{path}</button>
      <button type="button" onClick={onAct} title={actLabel === "+" ? "Stage" : "Unstage"} className="rounded px-1.5 text-sm text-subtle opacity-0 transition hover:text-accent group-hover:opacity-100">
        {actLabel === "+" ? <Plus size={13} /> : <Check size={13} />}
      </button>
    </div>
  );
}
