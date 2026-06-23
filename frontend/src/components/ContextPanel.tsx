import {
  Activity,
  Bot,
  BrainCircuit,
  FileText,
  Sparkles,
} from "lucide-react";
import type { AgentStats } from "../types";

interface ContextPanelProps {
  activeFiles: string[];
  modelName: string;
  stats: AgentStats | null;
  onQuickAction: (prompt: string) => void;
}

const QUICK_ACTIONS = [
  "Explain the selected code paths and architectural tradeoffs.",
  "Generate focused unit tests for the attached files.",
  "Refactor the highlighted files for readability and reliability.",
  "Find likely bugs, edge cases, and debugging steps.",
];

export function ContextPanel({
  activeFiles,
  modelName,
  stats,
  onQuickAction,
}: ContextPanelProps) {
  return (
    <aside className="flex h-full flex-col gap-4 border-l border-edge bg-slate-950/55 p-4">
      <section className="rounded-[26px] border border-edge bg-panel/80 p-4">
        <div className="mb-4 flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-slate-400">
          <Bot size={14} />
          Agent Status
        </div>
        <div className="space-y-3 text-sm text-slate-300">
          <div className="rounded-2xl border border-edge bg-slate-900/75 p-3">
            <div className="mb-1 flex items-center gap-2 text-slate-400">
              <BrainCircuit size={15} />
              Model
            </div>
            <div className="font-medium text-slate-100">{modelName}</div>
          </div>
          <div className="rounded-2xl border border-edge bg-slate-900/75 p-3">
            <div className="mb-1 flex items-center gap-2 text-slate-400">
              <Activity size={15} />
              Prompt Context
            </div>
            <div className="font-medium text-slate-100">
              {stats?.estimatedPromptTokens ?? 0} estimated tokens
            </div>
            <div className="mt-1 text-xs text-slate-500">
              {stats?.promptEvalCount ?? 0} evaluated prompt tokens
            </div>
          </div>
          <div className="rounded-2xl border border-edge bg-slate-900/75 p-3">
            <div className="mb-1 flex items-center gap-2 text-slate-400">
              <Sparkles size={15} />
              Generation
            </div>
            <div className="font-medium text-slate-100">
              {stats?.evalCount ?? 0} generated tokens
            </div>
            <div className="mt-1 text-xs text-slate-500">
              {stats ? `${(stats.totalDuration / 1_000_000_000).toFixed(2)}s total` : "Waiting for a response"}
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-[26px] border border-edge bg-panel/80 p-4">
        <div className="mb-4 flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-slate-400">
          <FileText size={14} />
          Active Files
        </div>
        <div className="space-y-2">
          {activeFiles.length ? (
            activeFiles.map((file) => (
              <div
                key={file}
                className="rounded-2xl border border-edge bg-slate-900/75 px-3 py-2 text-sm text-slate-300"
              >
                {file}
              </div>
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-edge px-3 py-4 text-sm text-slate-500">
              Select files in the workspace explorer to inject real code context.
            </div>
          )}
        </div>
      </section>

      <section className="rounded-[26px] border border-edge bg-panel/80 p-4">
        <div className="mb-4 text-xs uppercase tracking-[0.22em] text-slate-400">
          Quick Actions
        </div>
        <div className="space-y-2">
          {QUICK_ACTIONS.map((action) => (
            <button
              key={action}
              className="w-full rounded-2xl border border-edge bg-slate-900/75 px-3 py-3 text-left text-sm text-slate-200 transition hover:border-accentSoft hover:bg-emerald-400/10"
              onClick={() => onQuickAction(action)}
              type="button"
            >
              {action}
            </button>
          ))}
        </div>
      </section>
    </aside>
  );
}
