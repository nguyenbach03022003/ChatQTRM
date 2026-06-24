import { useEffect, useState } from "react";
import { Check, Eye, KeyRound, Loader, Plus, Save, Server, Settings as SettingsIcon, Trash2, Wifi } from "lucide-react";
import clsx from "clsx";
import { desktop } from "../lib/desktop";
import type { AppSettings, McpServerConfig, McpTestResult } from "../types/desktop";

const ALL_TOOLS = [
  "read_file", "write_file", "edit_file", "list_files", "search_files",
  "search_text", "project_map", "mcp_list_tools", "mcp_call_tool", "create_file", "create_folder", "run_command",
  "git_status", "git_diff", "git_stage", "git_commit", "git_branch",
];

interface Props {
  settings: AppSettings;
  onSaved: (s: AppSettings) => void;
}

export function SettingsView({ settings, onSaved }: Props) {
  const [draft, setDraft] = useState<AppSettings>(settings);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mcpTests, setMcpTests] = useState<Record<string, McpTestResult | { ok: false; message: string }>>({});
  const [testingMcp, setTestingMcp] = useState<string | null>(null);

  useEffect(() => setDraft(settings), [settings]);
  const set = <K extends keyof AppSettings>(k: K, v: AppSettings[K]) => setDraft((d) => ({ ...d, [k]: v }));

  async function save() {
    try {
      const next = await desktop.saveSettings(draft);
      onSaved(next);
      setSaved(true);
      setTimeout(() => setSaved(false), 1800);
    } catch (e) {
      setError(String(e));
    }
  }

  function updateMcp(id: string, patch: Partial<McpServerConfig>) {
    set("mcpServers", (draft.mcpServers || []).map((server) => (server.id === id ? { ...server, ...patch } : server)));
  }

  function addMcpServer() {
    set("mcpServers", [
      ...(draft.mcpServers || []),
      {
        id: crypto.randomUUID(),
        name: "New MCP Server",
        command: "node",
        args: [],
        env: {},
        enabled: true,
      },
    ]);
  }

  function removeMcpServer(id: string) {
    set("mcpServers", (draft.mcpServers || []).filter((server) => server.id !== id));
    setMcpTests((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
  }

  async function testMcp(server: McpServerConfig) {
    setTestingMcp(server.id);
    try {
      const result = await desktop.testMcpServer(server);
      setMcpTests((current) => ({ ...current, [server.id]: result }));
    } catch (e) {
      setMcpTests((current) => ({ ...current, [server.id]: { ok: false, message: String(e) } }));
    } finally {
      setTestingMcp(null);
    }
  }

  return (
    <div className="mx-auto flex h-full max-w-3xl flex-col gap-6 overflow-y-auto p-6">
      <div className="flex items-center gap-3">
        <SettingsIcon size={20} className="text-accent" />
        <h1 className="text-xl font-semibold text-content">Settings</h1>
        <button type="button" onClick={save} className="ml-auto inline-flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-fg hover:bg-accent-hover">
          {saved ? <Check size={15} /> : <Save size={15} />} {saved ? "Saved" : "Save"}
        </button>
      </div>
      {error && <div className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">{error}</div>}

      <Card title="Model">
        <Grid>
          <Field label="Provider">
            <select value={draft.provider} onChange={(e) => set("provider", e.target.value)} className={inputCls}>
              <option value="ollama">Ollama (local)</option>
              <option value="openai">OpenAI-compatible</option>
              <option value="anthropic">Anthropic</option>
            </select>
          </Field>
          <Field label="Model"><input value={draft.model} onChange={(e) => set("model", e.target.value)} className={inputCls} /></Field>
          <Field label="Base URL"><input value={draft.baseUrl} onChange={(e) => set("baseUrl", e.target.value)} className={inputCls} /></Field>
          <Field label="Context window (num_ctx)"><input type="number" value={draft.numCtx} onChange={(e) => set("numCtx", Number(e.target.value))} className={inputCls} /></Field>
          <Field label="Temperature"><input type="number" step="0.1" value={draft.temperature} onChange={(e) => set("temperature", Number(e.target.value))} className={inputCls} /></Field>
        </Grid>
      </Card>

      <Card title="API Keys" subtitle="Stored in the Windows Credential Manager — never written to disk.">
        <SecretField label="OpenAI API key" keyName="openai_api_key" />
        <SecretField label="Anthropic API key" keyName="anthropic_api_key" />
      </Card>

      <Card title="MCP Servers" subtitle="Stdio servers are launched locally from command and arguments.">
        <div className="space-y-3">
          {(draft.mcpServers || []).map((server) => {
            const test = mcpTests[server.id];
            const isTesting = testingMcp === server.id;
            return (
              <div key={server.id} className="rounded-xl border border-border bg-surface-3/50 p-3">
                <div className="mb-3 flex items-center gap-2">
                  <Server size={15} className="text-accent" />
                  <input value={server.name} onChange={(e) => updateMcp(server.id, { name: e.target.value })} className={clsx(inputCls, "font-medium")} />
                  <Switch label="Enabled" checked={server.enabled} onChange={(enabled) => updateMcp(server.id, { enabled })} />
                  <button type="button" title="Delete" onClick={() => removeMcpServer(server.id)} className="rounded-lg border border-border px-2.5 py-2 text-subtle hover:text-danger"><Trash2 size={15} /></button>
                </div>
                <Grid>
                  <Field label="Command">
                    <input value={server.command} onChange={(e) => updateMcp(server.id, { command: e.target.value })} className={inputCls} placeholder="node" />
                  </Field>
                  <Field label="Arguments">
                    <input value={server.args.join(" ")} onChange={(e) => updateMcp(server.id, { args: splitArgs(e.target.value) })} className={inputCls} placeholder={"C:\\path\\server.js --stdio"} />
                  </Field>
                </Grid>
                <Field label="Environment">
                  <textarea value={envToText(server.env)} onChange={(e) => updateMcp(server.id, { env: textToEnv(e.target.value) })} className={clsx(inputCls, "mt-1 min-h-20 font-mono")} placeholder={"KEY=value\nTOKEN=..."} />
                </Field>
                <div className="mt-3 flex items-center gap-2">
                  <button type="button" disabled={isTesting || !server.command.trim()} onClick={() => void testMcp(server)} className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-2 text-xs font-semibold text-muted hover:border-accent-soft hover:text-content disabled:opacity-40">
                    {isTesting ? <Loader size={14} className="animate-spin" /> : <Wifi size={14} />} Test
                  </button>
                  {test && (
                    <span className={clsx("text-xs", test.ok ? "text-accent" : "text-danger")}>
                      {test.ok && "serverName" in test && test.serverName ? `${test.message} (${test.serverName})` : test.message}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
          <button type="button" onClick={addMcpServer} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium text-muted hover:border-accent-soft hover:text-content">
            <Plus size={15} /> Add MCP server
          </button>
        </div>
      </Card>

      <Card title="Workspace & Terminal">
        <Grid>
          <Field label="Default project folder"><input value={draft.defaultProjectDir || ""} onChange={(e) => set("defaultProjectDir", e.target.value || null)} className={inputCls} placeholder="C:\\Users\\you\\projects" /></Field>
          <Field label="Terminal shell">
            <select value={draft.shell} onChange={(e) => set("shell", e.target.value)} className={inputCls}>
              <option value="powershell">PowerShell</option>
              <option value="pwsh">PowerShell 7 (pwsh)</option>
              <option value="cmd">Command Prompt</option>
              <option value="bash">bash</option>
            </select>
          </Field>
          <Field label="Theme">
            <select value={draft.theme} onChange={(e) => set("theme", e.target.value)} className={inputCls}>
              <option value="dark">Dark</option>
              <option value="light">Light</option>
            </select>
          </Field>
        </Grid>
        <div className="mt-3 space-y-1">
          <Switch label="Require approval for destructive actions" checked={draft.requireApproval} onChange={(v) => set("requireApproval", v)} />
          <Switch label="Auto-save file edits" checked={draft.autoSave} onChange={(v) => set("autoSave", v)} />
          <Switch label="Share anonymous telemetry" checked={draft.telemetry} onChange={(v) => set("telemetry", v)} />
        </div>
      </Card>

      <Card title="Enabled Tools" subtitle="Disabled tools are hidden from the assistant.">
        <div className="flex flex-wrap gap-1.5">
          {ALL_TOOLS.map((t) => {
            const on = draft.enabledTools.includes(t);
            return (
              <button key={t} type="button" onClick={() => set("enabledTools", on ? draft.enabledTools.filter((x) => x !== t) : [...draft.enabledTools, t])}
                className={clsx("rounded-full border px-2.5 py-1 font-mono text-[11px] transition", on ? "border-accent-soft bg-accent/15 text-accent" : "border-border text-subtle hover:text-content")}>
                {t}
              </button>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

function SecretField({ label, keyName }: { label: string; keyName: string }) {
  const [value, setValue] = useState("");
  const [exists, setExists] = useState<boolean | null>(null);
  const [show, setShow] = useState(false);

  useEffect(() => { void desktop.hasSecret(keyName).then(setExists).catch(() => setExists(false)); }, [keyName]);

  return (
    <div className="mt-3 first:mt-0">
      <span className="mb-1 flex items-center gap-2 text-xs font-medium text-subtle">
        <KeyRound size={12} /> {label}
        {exists === null ? <Loader size={11} className="animate-spin" /> : exists ? <span className="text-accent">● set</span> : <span className="text-subtle">not set</span>}
      </span>
      <div className="flex gap-2">
        <input type={show ? "text" : "password"} value={value} onChange={(e) => setValue(e.target.value)} placeholder={exists ? "•••••••• (stored)" : "Paste key…"} className={inputCls} />
        <button type="button" title="Show" onClick={() => setShow((v) => !v)} className="rounded-lg border border-border px-2.5 text-subtle hover:text-content"><Eye size={15} /></button>
        <button type="button" disabled={!value} onClick={() => void desktop.setSecret(keyName, value).then(() => { setExists(true); setValue(""); })} className="rounded-lg bg-accent px-3 text-xs font-semibold text-accent-fg hover:bg-accent-hover disabled:opacity-40">Save</button>
        {exists && <button type="button" title="Delete" onClick={() => void desktop.deleteSecret(keyName).then(() => setExists(false))} className="rounded-lg border border-border px-2.5 text-subtle hover:text-danger"><Trash2 size={15} /></button>}
      </div>
    </div>
  );
}

const inputCls = "w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-content outline-none focus:border-accent-soft";

function Card({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-surface-2 p-4">
      <h2 className="text-sm font-semibold text-content">{title}</h2>
      {subtitle && <p className="mb-3 mt-0.5 text-xs text-subtle">{subtitle}</p>}
      <div className={subtitle ? "" : "mt-3"}>{children}</div>
    </section>
  );
}
function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-3 sm:grid-cols-2">{children}</div>;
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1 block text-xs font-medium text-subtle">{label}</span>{children}</label>;
}
function Switch({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center justify-between rounded-lg px-1 py-1.5 hover:bg-surface-3">
      <span className="text-sm text-muted">{label}</span>
      <button type="button" onClick={() => onChange(!checked)} className={clsx("relative h-5 w-9 rounded-full transition", checked ? "bg-accent" : "bg-surface-3 border border-border")}>
        <span className={clsx("absolute top-0.5 h-4 w-4 rounded-full bg-white transition", checked ? "left-4" : "left-0.5")} />
      </button>
    </label>
  );
}

function splitArgs(value: string): string[] {
  const out: string[] = [];
  let current = "";
  let quote: "'" | '"' | null = null;
  for (const char of value) {
    if ((char === "'" || char === '"') && !quote) {
      quote = char;
      continue;
    }
    if (quote === char) {
      quote = null;
      continue;
    }
    if (/\s/.test(char) && !quote) {
      if (current) out.push(current);
      current = "";
      continue;
    }
    current += char;
  }
  if (current) out.push(current);
  return out;
}

function envToText(env: Record<string, string>): string {
  return Object.entries(env).map(([key, value]) => `${key}=${value}`).join("\n");
}

function textToEnv(value: string): Record<string, string> {
  const env: Record<string, string> = {};
  for (const line of value.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx <= 0) continue;
    env[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim();
  }
  return env;
}
