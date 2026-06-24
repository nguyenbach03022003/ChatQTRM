import { useEffect, useRef } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { ChevronDown, TerminalSquare } from "lucide-react";
import "@xterm/xterm/css/xterm.css";
import { desktop, onEvent } from "../lib/desktop";
import type { TerminalExitEvent, TerminalOutputEvent } from "../types/desktop";

interface Props {
  shell: string;
  projectKey: string; // changes when active project changes -> restart shell
  onClose: () => void;
}

export function TerminalPanel({ shell, projectKey, onClose }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let sessionId: string | null = null;
    let disposed = false;
    const unlisteners: Array<() => void> = [];

    const term = new Terminal({
      fontFamily: "'IBM Plex Mono', monospace",
      fontSize: 13,
      cursorBlink: true,
      theme: { background: "#0b1016", foreground: "#eef4fb", cursor: "#61e6b5" },
    });
    const fit = new FitAddon();
    term.loadAddon(fit);
    term.open(container);
    fit.fit();

    (async () => {
      try {
        const id = await desktop.terminalCreate({
          shell,
          cols: term.cols,
          rows: term.rows,
        });
        if (disposed) {
          await desktop.terminalKill(id);
          return;
        }
        sessionId = id;

        unlisteners.push(
          await onEvent<TerminalOutputEvent>("terminal://output", (p) => {
            if (p.id === id) term.write(p.data);
          }),
        );
        unlisteners.push(
          await onEvent<TerminalExitEvent>("terminal://exit", (p) => {
            if (p.id === id) term.write("\r\n\x1b[2m[process exited]\x1b[0m\r\n");
          }),
        );

        term.onData((data) => void desktop.terminalWrite(id, data));
        term.onResize(({ cols, rows }) => void desktop.terminalResize(id, cols, rows));
      } catch (e) {
        term.write(`\x1b[31mFailed to start terminal: ${String(e)}\x1b[0m\r\n`);
      }
    })();

    const onResize = () => {
      try {
        fit.fit();
      } catch {
        /* container detached */
      }
    };
    window.addEventListener("resize", onResize);

    return () => {
      disposed = true;
      window.removeEventListener("resize", onResize);
      unlisteners.forEach((u) => u());
      if (sessionId) void desktop.terminalKill(sessionId);
      term.dispose();
    };
  }, [shell, projectKey]);

  return (
    <div className="flex h-full min-h-0 flex-col border-t border-border bg-[#0b1016]">
      <div className="flex h-8 shrink-0 items-center gap-2 border-b border-border bg-surface/70 px-3">
        <TerminalSquare size={13} className="text-accent" />
        <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-subtle">Terminal — {shell}</span>
        <button type="button" onClick={onClose} title="Hide terminal" className="ml-auto rounded p-1 text-subtle hover:text-content">
          <ChevronDown size={15} />
        </button>
      </div>
      <div ref={containerRef} className="min-h-0 flex-1 overflow-hidden p-1" />
    </div>
  );
}
