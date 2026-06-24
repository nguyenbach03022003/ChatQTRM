import { useState } from "react";
import { LoaderCircle, Regex, Search } from "lucide-react";
import clsx from "clsx";
import { desktop } from "../lib/desktop";
import type { TextMatch } from "../types/desktop";

interface Props {
  hasProject: boolean;
  onOpenFile: (path: string) => void;
}

export function SearchPanel({ hasProject, onOpenFile }: Props) {
  const [query, setQuery] = useState("");
  const [isRegex, setIsRegex] = useState(false);
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [results, setResults] = useState<TextMatch[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    try {
      setResults(await desktop.searchText(query, isRegex, caseSensitive));
    } catch (e) {
      setError(String(e));
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  const grouped = results.reduce<Record<string, TextMatch[]>>((acc, m) => {
    (acc[m.path] ||= []).push(m);
    return acc;
  }, {});

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="space-y-2 border-b border-border p-3">
        <div className="flex items-center gap-2 rounded-lg border border-border bg-surface-2 px-2.5 py-1.5 focus-within:border-accent-soft">
          <Search size={14} className="text-subtle" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && run()}
            placeholder="Search in project…"
            disabled={!hasProject}
            className="min-w-0 flex-1 bg-transparent text-sm text-content outline-none placeholder:text-subtle"
          />
        </div>
        <div className="flex items-center gap-1">
          <Toggle active={isRegex} onClick={() => setIsRegex((v) => !v)} title="Regex"><Regex size={14} /></Toggle>
          <Toggle active={caseSensitive} onClick={() => setCaseSensitive((v) => !v)} title="Match case">
            <span className="text-[11px] font-bold">Aa</span>
          </Toggle>
          <button
            type="button"
            onClick={run}
            disabled={!hasProject || loading}
            className="ml-auto rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-accent-fg transition hover:bg-accent-hover disabled:opacity-40"
          >
            {loading ? <LoaderCircle size={13} className="animate-spin" /> : "Search"}
          </button>
        </div>
      </div>
      {error && <div className="px-3 py-2 text-xs text-danger">{error}</div>}
      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {!loading && results.length === 0 && (
          <div className="px-2 py-2 text-xs text-subtle">{hasProject ? "No results." : "No project selected."}</div>
        )}
        {Object.entries(grouped).map(([path, matches]) => (
          <div key={path} className="mb-2">
            <button type="button" onClick={() => onOpenFile(path)} className="flex w-full items-center gap-2 rounded-md px-2 py-1 text-left text-xs font-medium text-muted hover:bg-surface-3 hover:text-content">
              <span className="truncate font-mono">{path}</span>
              <span className="ml-auto shrink-0 rounded-full bg-surface-3 px-1.5 text-[10px] text-subtle">{matches.length}</span>
            </button>
            {matches.slice(0, 50).map((m, i) => (
              <button
                key={i}
                type="button"
                onClick={() => onOpenFile(path)}
                className="flex w-full items-baseline gap-2 rounded-md px-2 py-0.5 text-left hover:bg-surface-3"
              >
                <span className="shrink-0 font-mono text-[10px] text-subtle">{m.line}</span>
                <span className="truncate font-mono text-[11px] text-muted">{m.text.trim()}</span>
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function Toggle({ active, onClick, title, children }: { active: boolean; onClick: () => void; title: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={clsx("flex h-7 w-7 items-center justify-center rounded-md border transition", active ? "border-accent-soft bg-accent/15 text-accent" : "border-border text-subtle hover:text-content")}
    >
      {children}
    </button>
  );
}
