import clsx from "clsx";
import { ChevronDown, ChevronRight, FileCode2, Folder } from "lucide-react";
import type { WorkspaceNode } from "../types";

export interface ExplorerNode extends WorkspaceNode {
  children?: ExplorerNode[];
  loading?: boolean;
}

interface WorkspaceExplorerProps {
  nodes: ExplorerNode[];
  expandedPaths: Set<string>;
  selectedFiles: Set<string>;
  onToggleExpand: (node: ExplorerNode) => void;
  onToggleSelect: (node: ExplorerNode) => void;
  level?: number;
}

export function WorkspaceExplorer({
  nodes,
  expandedPaths,
  selectedFiles,
  onToggleExpand,
  onToggleSelect,
  level = 0,
}: WorkspaceExplorerProps) {
  return (
    <div className="space-y-1">
      {nodes.map((node) => {
        const isDirectory = node.type === "directory";
        const expanded = expandedPaths.has(node.path);
        const selected = selectedFiles.has(node.path);

        return (
          <div key={node.path || node.name}>
            <button
              className={clsx(
                "flex w-full items-center gap-2 rounded-xl px-3 py-1.5 text-left text-sm transition",
                selected
                  ? "bg-accent/12 text-accent"
                  : "text-muted hover:bg-surface-3 hover:text-content",
              )}
              onClick={() =>
                isDirectory ? onToggleExpand(node) : onToggleSelect(node)
              }
              style={{ paddingLeft: `${level * 14 + 12}px` }}
              type="button"
            >
              {isDirectory ? (
                expanded ? (
                  <ChevronDown size={14} className="shrink-0 text-subtle" />
                ) : (
                  <ChevronRight size={14} className="shrink-0 text-subtle" />
                )
              ) : (
                <span className="w-[14px]" />
              )}
              {isDirectory ? (
                <Folder size={15} className="shrink-0 text-ember" />
              ) : (
                <FileCode2
                  size={15}
                  className={clsx(
                    "shrink-0",
                    selected ? "text-accent" : "text-muted",
                  )}
                />
              )}
              <span className="truncate">{node.name}</span>
            </button>
            {isDirectory && expanded && node.children && (
              <WorkspaceExplorer
                expandedPaths={expandedPaths}
                nodes={node.children}
                onToggleExpand={onToggleExpand}
                onToggleSelect={onToggleSelect}
                selectedFiles={selectedFiles}
                level={level + 1}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
