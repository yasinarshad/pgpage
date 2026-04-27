"use client";

import { useEffect, useState } from "react";

export type Theme = "light" | "dark";
const STORAGE_KEY = "pgpage-theme";
const DEFAULT_THEME: Theme = "light";

export function getInitialTheme(): Theme {
  if (typeof window === "undefined") return DEFAULT_THEME;
  const saved = window.localStorage.getItem(STORAGE_KEY);
  return saved === "dark" || saved === "light" ? saved : DEFAULT_THEME;
}

export function applyTheme(theme: Theme) {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-theme", theme);
  try {
    window.localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    /* ignore quota / privacy mode */
  }
}

/**
 * Hook for reading + toggling theme.
 * The actual data-theme attribute is set by an inline script in layout.tsx
 * BEFORE paint to avoid flashing the wrong theme on load.
 * This hook just keeps React state in sync.
 */
export function useTheme(): { theme: Theme; toggle: () => void; setTheme: (t: Theme) => void } {
  // Lazy initializer: read the data-theme attribute that the inline pre-paint script already set.
  // Falls back to DEFAULT_THEME during SSR (where document is undefined). React will hydrate
  // with the same value because the inline script runs before React boots, so no flash.
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof document === "undefined") return DEFAULT_THEME;
    const attr = document.documentElement.getAttribute("data-theme");
    return attr === "dark" || attr === "light" ? attr : DEFAULT_THEME;
  });

  // Sync if something external (another tab) changes the theme.
  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key !== STORAGE_KEY) return;
      const next = e.newValue === "dark" || e.newValue === "light" ? e.newValue : DEFAULT_THEME;
      setThemeState(next);
      applyTheme(next);
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const setTheme = (t: Theme) => {
    setThemeState(t);
    applyTheme(t);
  };

  const toggle = () => setTheme(theme === "dark" ? "light" : "dark");

  return { theme, toggle, setTheme };
}

/**
 * Inline script source — paste into layout.tsx <head> via dangerouslySetInnerHTML.
 * Runs before React hydrates; prevents flash-of-wrong-theme.
 */
export const THEME_INIT_SCRIPT = `
(function(){
  try {
    var t = localStorage.getItem("${STORAGE_KEY}");
    if (t !== "dark" && t !== "light") t = "${DEFAULT_THEME}";
    document.documentElement.setAttribute("data-theme", t);
  } catch (e) {
    document.documentElement.setAttribute("data-theme", "${DEFAULT_THEME}");
  }
})();
`.trim();
