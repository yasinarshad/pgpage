"use client";

import { useTheme } from "@/lib/theme";

export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const label = theme === "dark" ? "Switch to light" : "Switch to dark";

  return (
    <button
      onClick={toggle}
      className="w-7 h-7 rounded flex items-center justify-center text-xs text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"
      title={label}
      aria-label={label}
    >
      {theme === "dark" ? "☀" : "☾"}
    </button>
  );
}
