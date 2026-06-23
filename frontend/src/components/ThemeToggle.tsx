import { Moon, Sun } from "lucide-react";
import type { Theme } from "../lib/theme";

interface ThemeToggleProps {
  theme: Theme;
  onToggle: () => void;
}

export function ThemeToggle({ theme, onToggle }: ThemeToggleProps) {
  const isDark = theme === "dark";
  return (
    <button
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface-2 text-muted transition hover:border-border-strong hover:text-content"
      onClick={onToggle}
      title={isDark ? "Switch to light theme" : "Switch to dark theme"}
      type="button"
    >
      {isDark ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  );
}
