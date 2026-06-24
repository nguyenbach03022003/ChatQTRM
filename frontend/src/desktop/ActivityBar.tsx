import clsx from "clsx";
import {
  GitBranch,
  MessagesSquare,
  Search,
  Settings,
  Sparkles,
  TerminalSquare,
  Files,
} from "lucide-react";

export type View = "chats" | "files" | "search" | "git" | "skills" | "settings";

const ITEMS: { id: View; icon: typeof Files; label: string }[] = [
  { id: "chats", icon: MessagesSquare, label: "Chats" },
  { id: "files", icon: Files, label: "Files" },
  { id: "search", icon: Search, label: "Search" },
  { id: "git", icon: GitBranch, label: "Source Control" },
  { id: "skills", icon: Sparkles, label: "Skills" },
];

interface Props {
  active: View;
  onSelect: (view: View) => void;
  onToggleTerminal: () => void;
  terminalOpen: boolean;
}

export function ActivityBar({ active, onSelect, onToggleTerminal, terminalOpen }: Props) {
  return (
    <nav className="flex h-full w-14 shrink-0 flex-col items-center gap-1 border-r border-border bg-surface/70 py-3">
      <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-accent text-accent-fg">
        <span className="text-sm font-bold">Q</span>
      </div>
      {ITEMS.map(({ id, icon: Icon, label }) => (
        <RailButton key={id} label={label} active={active === id} onClick={() => onSelect(id)}>
          <Icon size={19} />
        </RailButton>
      ))}
      <div className="mt-auto flex flex-col items-center gap-1">
        <RailButton label="Terminal" active={terminalOpen} onClick={onToggleTerminal}>
          <TerminalSquare size={19} />
        </RailButton>
        <RailButton label="Settings" active={active === "settings"} onClick={() => onSelect("settings")}>
          <Settings size={19} />
        </RailButton>
      </div>
    </nav>
  );
}

function RailButton({
  label,
  active,
  onClick,
  children,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      title={label}
      aria-label={label}
      onClick={onClick}
      type="button"
      className={clsx(
        "relative flex h-10 w-10 items-center justify-center rounded-xl transition",
        active ? "bg-accent/15 text-accent" : "text-subtle hover:bg-surface-3 hover:text-content",
      )}
    >
      {active && <span className="absolute left-0 h-5 w-0.5 rounded-full bg-accent" />}
      {children}
    </button>
  );
}
