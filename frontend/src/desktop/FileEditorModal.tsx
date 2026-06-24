import { useEffect, useState } from "react";
import { createPatch } from "diff";
import { FileText, Save, SplitSquareHorizontal, X } from "lucide-react";
import clsx from "clsx";
import { desktop } from "../lib/desktop";
import { Overlay } from "./DiffModal";
import type { ApprovalRequest } from "./ApprovalModal";

interface Props {
  path: string;
  onClose: () => void;
  onSaved: () => void;
  requestApproval: (req: ApprovalRequest) => void;
}

export function FileEditorModal({ path, onClose, onSaved, requestApproval }: Props) {
  const [original, setOriginal] = useState("");
  const [content, setContent] = useState("");
  const [showDiff, setShowDiff] = useState(false);
  const [truncated, setTruncated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const f = await desktop.readFile(path);
        setOriginal(f.content);
        setContent(f.content);
        setTruncated(f.truncated);
      } catch (e) {
        setError(String(e));
      } finally {
        setLoading(false);
      }
    })();
  }, [path]);

  const dirty = content !== original;

  async function doSave() {
    try {
      await desktop.writeFile(path, content);
      onSaved();
      onClose();
    } catch (e) {
      setError(String(e));
    }
  }

  function save() {
    if (truncated) {
      setError("File was truncated on load; saving would lose data. Edit aborted.");
      return;
    }
    if (original.length > 50_000) {
      requestApproval({
        title: "Overwrite large file?",
        detail: `${path} is ${(original.length / 1024).toFixed(0)} KB. Saving replaces its contents.`,
        confirmLabel: "Overwrite",
        onConfirm: () => void doSave(),
      });
      return;
    }
    void doSave();
  }

  const patch = dirty ? createPatch(path, original, content, "disk", "edited") : "";

  return (
    <Overlay onClose={onClose}>
      <div className="flex h-[82vh] w-[min(1000px,94vw)] flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-panel">
        <header className="flex items-center gap-3 border-b border-border px-4 py-2.5">
          <FileText size={15} className="text-accent" />
          <h3 className="min-w-0 flex-1 truncate font-mono text-sm text-content">{path}{dirty && <span className="text-ember"> ●</span>}</h3>
          <button type="button" onClick={() => setShowDiff((v) => !v)} title="Toggle diff" className={clsx("rounded-md p-1.5", showDiff ? "bg-accent/15 text-accent" : "text-subtle hover:text-content")}>
            <SplitSquareHorizontal size={16} />
          </button>
          <button type="button" onClick={save} disabled={!dirty} className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-accent-fg transition hover:bg-accent-hover disabled:opacity-40">
            <Save size={14} /> Save
          </button>
          <button type="button" onClick={onClose} className="rounded p-1 text-subtle hover:text-content"><X size={16} /></button>
        </header>
        {error && <div className="border-b border-border bg-danger/10 px-4 py-2 text-xs text-danger">{error}</div>}
        {truncated && <div className="border-b border-border bg-ember/10 px-4 py-2 text-xs text-ember">Large file — loaded a truncated preview (read-only).</div>}
        <div className="min-h-0 flex-1 overflow-hidden">
          {loading ? (
            <div className="p-6 text-sm text-subtle">Loading…</div>
          ) : showDiff ? (
            <div className="h-full overflow-auto bg-bg/40 font-mono text-xs leading-5">
              {(patch || "No changes.").split("\n").map((line, i) => (
                <div key={i} className={clsx("whitespace-pre px-4",
                  line.startsWith("+") && !line.startsWith("+++") && "bg-accent/10 text-accent",
                  line.startsWith("-") && !line.startsWith("---") && "bg-danger/10 text-danger",
                  line.startsWith("@@") && "text-ember")}>{line || " "}</div>
              ))}
            </div>
          ) : (
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              spellCheck={false}
              readOnly={truncated}
              className="h-full w-full resize-none bg-bg/30 p-4 font-mono text-xs leading-5 text-content outline-none"
            />
          )}
        </div>
      </div>
    </Overlay>
  );
}
