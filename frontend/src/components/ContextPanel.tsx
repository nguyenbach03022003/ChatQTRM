import {
  Activity,
  Bot,
  BrainCircuit,
  FileText,
  Gauge,
  Sparkles,
  Zap,
} from "lucide-react";
import type { AgentStats } from "../types";

interface ContextPanelProps {
  activeFiles: string[];
  contextWindow: number;
  modelName: string;
  stats: AgentStats | null;
  onQuickAction: (prompt: string) => void;
}

const QUICK_ACTIONS = [
  { label: "Explain code", prompt: "Explain the selected code paths and architectural tradeoffs." },
  { label: "Generate tests", prompt: "Generate focused unit tests for the attached files." },
  { label: "Refactor", prompt: "Refactor the highlighted files for readability and reliability." },
  { label: "Find bugs", prompt: "Find likely bugs, edge cases, and debugging steps." },
];

export function ContextPanel({
  activeFiles,
  contextWindow,
  modelName,
  stats,
  onQuickAction,
}: ContextPanelProps) {
  const estimatedPromptTokens = stats?.estimatedPromptTokens ?? 0;
  const contextUsage =
    contextWindow > 0
      ? Math.min(100, (estimatedPromptTokens / contextWindow) * 100)
      : 0;

  return (
    <aside className="flex h-full min-h-0 flex-col gap-4 overflow-y-auto border-l border-border bg-surface/60 p-4 backdrop-blur">
      <section className="rounded-2xl border border-border bg-surface-2/80 p-3">
        <div className="mb-3 flex items-center gap-2 px-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-subtle">
          <Bot size={13} />
          Agent Status
        </div>
        <div className="grid grid-cols-1 gap-2 text-sm">
          <StatTile
            icon={<BrainCircuit size={15} />}
            label="Model"
            value={modelName}
          />
          <StatTile
            icon={<Activity size={15} />}
            label="Prompt Context"
            value={`${estimatedPromptTokens.toLocaleString()} est. tokens`}
            hint={`${stats?.promptEvalCount ?? 0} evaluated prompt tokens`}
          />
          <StatTile
            icon={<Gauge size={15} />}
            label="Context Window"
            value={
              contextWindow > 0
                ? `${contextWindow.toLocaleString()} tokens`
                : "Unknown"
            }
            hint={`${contextUsage.toFixed(1)}% of configured window`}
          />
          <StatTile
            icon={<Sparkles size={15} />}
            label="Generation"
            value={`${stats?.evalCount ?? 0} generated tokens`}
            hint={
              stats
                ? `${(stats.totalDuration / 1_000_000_000).toFixed(2)}s total`
                : "Waiting for a response"
            }
          />
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-surface-2/80 p-3">
        <div className="mb-3 flex items-center justify-between px-1">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-subtle">
            <FileText size={13} />
            Active Files
          </div>
          {activeFiles.length > 0 && (
            <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[11px] font-medium text-accent">
              {activeFiles.length}
            </span>
          )}
        </div>
        <div className="space-y-1.5">
          {activeFiles.length ? (
            activeFiles.map((file) => (
              <div
                key={file}
                className="truncate rounded-xl border border-border bg-surface-3/70 px-3 py-2 font-mono text-xs text-muted"
                title={file}
              >
                {file}
              </div>
            ))
          ) : (
            <div className="rounded-xl border border-dashed border-border px-3 py-4 text-sm text-subtle">
              Select files in the workspace explorer to inject real code context.
            </div>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-surface-2/80 p-3">
        <div className="mb-3 flex items-center gap-2 px-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-subtle">
          <Zap size={13} />
          Quick Actions
        </div>
        <div className="space-y-1.5">
          {QUICK_ACTIONS.map((action) => (
            <button
              key={action.label}
              className="flex w-full items-center justify-between gap-2 rounded-xl border border-border bg-surface-3/60 px-3 py-2.5 text-left text-sm text-muted transition hover:border-accent-soft hover:bg-accent/10 hover:text-content"
              onClick={() => onQuickAction(action.prompt)}
              type="button"
            >
              <span className="font-medium">{action.label}</span>
              <Sparkles size={13} className="text-subtle" />
            </button>
          ))}
        </div>
      </section>
    </aside>
  );
}

interface StatTileProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
}

function StatTile({ icon, label, value, hint }: StatTileProps) {
  return (
    <div className="rounded-xl border border-border bg-surface-3/70 p-3">
      <div className="mb-1 flex items-center gap-2 text-muted">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <div className="truncate font-medium text-content" title={value}>
        {value}
      </div>
      {hint && <div className="mt-0.5 text-xs text-subtle">{hint}</div>}
    </div>
  );
}
