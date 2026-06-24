import { useCallback, useEffect, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  File as FileIcon,
  FilePlus,
  Folder,
  FolderPlus,
  RefreshCw,
} from "lucide-react";
import clsx from "clsx";
import { desktop } from "../lib/desktop";
import type { DirEntry } from "../types/desktop";

interface Props {
  hasProject: boolean;
  selected: Set<string>;
  onToggleSelect: (path: string) => void;
  onOpenFile: (path: string) => void;
}

export function FilesPanel({ hasProject, selected, onToggleSelect, onOpenFile }: Props) {
  const [roots, setRoots] = useState<DirEntry[]>([]);
  const [childrenByPath, setChildrenByPath] = useState<Record<string, DirEntry[]>>({});
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const loadRoot = useCallback(async () => {
    if (!hasProject) return;
    try {
      setError(null);
      setRoots(await desktop.listDir(""));
    } catch (e) {
      setError(String(e));
    }
  }, [hasProject]);

  useEffect(() => {
    void loadRoot();
  }, [loadRoot]);

  async function toggleDir(node: DirEntry) {
    const next = new Set(expanded);
    if (next.has(node.path)) {
      next.delete(node.path);
      setExpanded(next);
      return;
    }
    next.add(node.path);
    setExpanded(next);
    if (!childrenByPath[node.path]) {
      try {
        const kids = await desktop.listDir(node.path);
        setChildrenByPath((c) => ({ ...c, [node.path]: kids }));
      } catch (e) {
        setError(String(e));
      }
    }
  }

  async function newFile() {
    const name = window.prompt("New file path (relative to project root):");
    if (!name) return;
    try {
      await desktop.createFile(name, "");
      await loadRoot();
      onOpenFile(name);
    } catch (e) {
      setError(String(e));
    }
  }

  async function newFolder() {
    const name = window.prompt("New folder path (relative to project root):");
    if (!name) return;
    try {
      await desktop.createFolder(name);
      await loadRoot();
    } catch (e) {
      setError(String(e));
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-subtle">Explorer</span>
        <div className="flex items-center gap-0.5">
          <IconBtn title="New file" onClick={newFile}><FilePlus size={14} /></IconBtn>
          <IconBtn title="New folder" onClick={newFolder}><FolderPlus size={14} /></IconBtn>
          <IconBtn title="Refresh" onClick={loadRoot}><RefreshCw size={14} /></IconBtn>
        </div>
      </div>
      {error && <div className="px-3 py-2 text-xs text-danger">{error}</div>}
      <div className="min-h-0 flex-1 overflow-y-auto px-1 py-2">
        {!hasProject && <div className="px-3 py-2 text-xs text-subtle">No project selected.</div>}
        {roots.map((node) => (
          <TreeNode
            key={node.path}
            node={node}
            depth={0}
            expanded={expanded}
            childrenByPath={childrenByPath}
            selected={selected}
            onToggleDir={toggleDir}
            onToggleSelect={onToggleSelect}
            onOpenFile={onOpenFile}
          />
        ))}
      </div>
    </div>
  );
}

function TreeNode({
  node,
  depth,
  expanded,
  childrenByPath,
  selected,
  onToggleDir,
  onToggleSelect,
  onOpenFile,
}: {
  node: DirEntry;
  depth: number;
  expanded: Set<string>;
  childrenByPath: Record<string, DirEntry[]>;
  selected: Set<string>;
  onToggleDir: (n: DirEntry) => void;
  onToggleSelect: (p: string) => void;
  onOpenFile: (p: string) => void;
}) {
  const isDir = node.type === "directory";
  const isOpen = expanded.has(node.path);
  const isSelected = selected.has(node.path);

  return (
    <div>
      <div
        className={clsx(
          "group flex cursor-pointer items-center gap-1 rounded-md py-1 pr-2 text-sm transition hover:bg-surface-3",
          isSelected && "bg-accent/10",
        )}
        style={{ paddingLeft: `${depth * 12 + 6}px` }}
      >
        {isDir ? (
          <button type="button" onClick={() => onToggleDir(node)} className="flex min-w-0 flex-1 items-center gap-1 text-left">
            {isOpen ? <ChevronDown size={13} className="text-subtle" /> : <ChevronRight size={13} className="text-subtle" />}
            <Folder size={14} className="text-ember" />
            <span className="truncate text-muted">{node.name}</span>
          </button>
        ) : (
          <button type="button" onClick={() => onOpenFile(node.path)} className="flex min-w-0 flex-1 items-center gap-1 pl-3.5 text-left">
            <FileIcon size={14} className="text-subtle" />
            <span className={clsx("truncate", isSelected ? "text-content" : "text-muted")}>{node.name}</span>
          </button>
        )}
        {!isDir && (
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onToggleSelect(node.path)}
            title="Attach as context"
            className="h-3.5 w-3.5 accent-[rgb(var(--c-accent))] opacity-0 transition group-hover:opacity-100 checked:opacity-100"
          />
        )}
      </div>
      {isDir && isOpen &&
        (childrenByPath[node.path] || []).map((child) => (
          <TreeNode
            key={child.path}
            node={child}
            depth={depth + 1}
            expanded={expanded}
            childrenByPath={childrenByPath}
            selected={selected}
            onToggleDir={onToggleDir}
            onToggleSelect={onToggleSelect}
            onOpenFile={onOpenFile}
          />
        ))}
    </div>
  );
}

function IconBtn({ title, onClick, children }: { title: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" title={title} onClick={onClick} className="rounded-md p-1.5 text-subtle transition hover:bg-surface-3 hover:text-content">
      {children}
    </button>
  );
}
