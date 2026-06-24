import { useEffect, useState } from "react";
import { Download, Pencil, Plus, Power, Sparkles, Trash2, Upload } from "lucide-react";
import clsx from "clsx";
import { desktop } from "../lib/desktop";
import type { Skill, SkillInput } from "../types/desktop";
import type { ApprovalRequest } from "./ApprovalModal";

const ALL_TOOLS = [
  "read_file", "write_file", "edit_file", "list_files", "search_files",
  "search_text", "project_map", "mcp_list_tools", "mcp_call_tool", "create_file", "create_folder", "run_command",
  "git_status", "git_diff", "git_stage", "git_commit", "git_branch",
];

const EMPTY: SkillInput = {
  name: "", description: "", instructions: "", filePatterns: [], tools: [], enabled: true,
};

interface Props {
  requestApproval: (req: ApprovalRequest) => void;
  onChanged: () => void;
}

export function SkillsView({ requestApproval, onChanged }: Props) {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [editing, setEditing] = useState<SkillInput | null>(null);
  const [patternsText, setPatternsText] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      setSkills(await desktop.listSkills());
    } catch (e) {
      setError(String(e));
    }
  }
  useEffect(() => { void load(); }, []);

  function startEdit(s?: Skill) {
    if (s) {
      setEditing({ id: s.id, name: s.name, description: s.description, instructions: s.instructions, filePatterns: s.filePatterns, tools: s.tools, enabled: s.enabled });
      setPatternsText(s.filePatterns.join(", "));
    } else {
      setEditing({ ...EMPTY });
      setPatternsText("");
    }
  }

  async function save() {
    if (!editing) return;
    try {
      const input: SkillInput = { ...editing, filePatterns: patternsText.split(",").map((s) => s.trim()).filter(Boolean) };
      await desktop.saveSkill(input);
      setEditing(null);
      await load();
      onChanged();
    } catch (e) {
      setError(String(e));
    }
  }

  async function importSkill() {
    const json = window.prompt("Paste skill JSON to import:");
    if (!json) return;
    try {
      await desktop.importSkill(json);
      await load();
      onChanged();
    } catch (e) {
      setError(String(e));
    }
  }

  function exportSkill(s: Skill) {
    const json = JSON.stringify({ name: s.name, description: s.description, instructions: s.instructions, filePatterns: s.filePatterns, tools: s.tools, enabled: s.enabled }, null, 2);
    void navigator.clipboard.writeText(json);
  }

  return (
    <div className="mx-auto flex h-full max-w-4xl flex-col gap-4 overflow-y-auto p-6">
      <div className="flex items-center gap-3">
        <Sparkles size={20} className="text-accent" />
        <h1 className="text-xl font-semibold text-content">Skills</h1>
        <div className="ml-auto flex gap-2">
          <button type="button" onClick={importSkill} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm text-muted hover:text-content">
            <Upload size={14} /> Import
          </button>
          <button type="button" onClick={() => startEdit()} className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-sm font-semibold text-accent-fg hover:bg-accent-hover">
            <Plus size={15} /> Add Skill
          </button>
        </div>
      </div>
      <p className="-mt-2 text-sm text-muted">Skills are trusted instruction bundles injected into the assistant's system prompt when enabled.</p>
      {error && <div className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">{error}</div>}

      {editing && (
        <div className="rounded-2xl border border-accent-soft/50 bg-surface-2 p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Name">
              <input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} className={inputCls} placeholder="e.g. Python Reviewer" />
            </Field>
            <Field label="File patterns (comma-separated)">
              <input value={patternsText} onChange={(e) => setPatternsText(e.target.value)} className={inputCls} placeholder="*.py, src/**" />
            </Field>
          </div>
          <Field label="Description">
            <input value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })} className={inputCls} placeholder="What this skill does and when to use it" />
          </Field>
          <Field label="Instructions">
            <textarea value={editing.instructions} onChange={(e) => setEditing({ ...editing, instructions: e.target.value })} rows={5} className={clsx(inputCls, "resize-y font-mono")} placeholder="Detailed instructions for the assistant…" />
          </Field>
          <Field label="Allowed tools">
            <div className="flex flex-wrap gap-1.5">
              {ALL_TOOLS.map((t) => {
                const on = editing.tools.includes(t);
                return (
                  <button key={t} type="button" onClick={() => setEditing({ ...editing, tools: on ? editing.tools.filter((x) => x !== t) : [...editing.tools, t] })}
                    className={clsx("rounded-full border px-2.5 py-1 font-mono text-[11px] transition", on ? "border-accent-soft bg-accent/15 text-accent" : "border-border text-subtle hover:text-content")}>
                    {t}
                  </button>
                );
              })}
            </div>
          </Field>
          <div className="mt-3 flex justify-end gap-2">
            <button type="button" onClick={() => setEditing(null)} className="rounded-lg border border-border px-4 py-2 text-sm text-muted hover:text-content">Cancel</button>
            <button type="button" onClick={save} className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-fg hover:bg-accent-hover">Save Skill</button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {skills.length === 0 && !editing && <div className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-subtle">No skills yet. Create one to extend the assistant.</div>}
        {skills.map((s) => (
          <div key={s.id} className="flex items-start gap-3 rounded-xl border border-border bg-surface-2 p-3">
            <button type="button" onClick={() => void desktop.setSkillEnabled(s.id, !s.enabled).then(load).then(onChanged)} title={s.enabled ? "Disable" : "Enable"}
              className={clsx("mt-0.5 flex h-7 w-7 items-center justify-center rounded-lg border transition", s.enabled ? "border-accent-soft bg-accent/15 text-accent" : "border-border text-subtle")}>
              <Power size={14} />
            </button>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate font-medium text-content">{s.name}</span>
                {!s.enabled && <span className="rounded-full bg-surface-3 px-2 text-[10px] text-subtle">disabled</span>}
              </div>
              <p className="truncate text-sm text-muted">{s.description}</p>
              {s.filePatterns.length > 0 && <p className="mt-1 truncate font-mono text-[11px] text-subtle">{s.filePatterns.join(", ")}</p>}
            </div>
            <div className="flex shrink-0 items-center gap-0.5">
              <Icon title="Export to clipboard" onClick={() => exportSkill(s)}><Download size={14} /></Icon>
              <Icon title="Edit" onClick={() => startEdit(s)}><Pencil size={14} /></Icon>
              <Icon title="Delete" danger onClick={() => requestApproval({ title: "Delete skill?", detail: `"${s.name}" will be permanently removed.`, confirmLabel: "Delete", onConfirm: () => void desktop.deleteSkill(s.id).then(load).then(onChanged) })}>
                <Trash2 size={14} />
              </Icon>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const inputCls = "w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-content outline-none focus:border-accent-soft";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="mt-3 block first:mt-0">
      <span className="mb-1 block text-xs font-medium text-subtle">{label}</span>
      {children}
    </label>
  );
}

function Icon({ title, onClick, danger, children }: { title: string; onClick: () => void; danger?: boolean; children: React.ReactNode }) {
  return (
    <button type="button" title={title} onClick={onClick} className={clsx("rounded-md p-1.5 text-subtle transition hover:bg-surface-3", danger ? "hover:text-danger" : "hover:text-content")}>
      {children}
    </button>
  );
}
