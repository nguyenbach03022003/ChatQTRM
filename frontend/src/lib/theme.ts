import { useCallback, useEffect, useState } from "react";

export type Theme = "dark" | "light";

const STORAGE_KEY = "chatqtrm-theme";

function readInitialTheme(): Theme {
  if (typeof window === "undefined") {
    return "dark";
  }

  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === "light" || stored === "dark") {
    return stored;
  }

  const prefersLight = window.matchMedia?.("(prefers-color-scheme: light)").matches;
  return prefersLight ? "light" : "dark";
}

function applyTheme(theme: Theme) {
  document.documentElement.setAttribute("data-theme", theme);
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(readInitialTheme);

  useEffect(() => {
    applyTheme(theme);
    window.localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((current) => (current === "dark" ? "light" : "dark"));
  }, []);

  return { theme, setTheme, toggleTheme };
}

/**
 * Read the active theme by observing the `data-theme` attribute on <html>.
 * Useful for deeply-nested components (e.g. lazy-loaded code blocks) that
 * aren't passed the theme via props but still need to react to changes.
 */
export function useActiveTheme(): Theme {
  const [theme, setTheme] = useState<Theme>(() =>
    typeof document === "undefined"
      ? "dark"
      : (document.documentElement.getAttribute("data-theme") as Theme) || "dark",
  );

  useEffect(() => {
    const target = document.documentElement;
    const observer = new MutationObserver(() => {
      setTheme((target.getAttribute("data-theme") as Theme) || "dark");
    });
    observer.observe(target, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);

  return theme;
}
