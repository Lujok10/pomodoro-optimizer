"use client";

import React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "./ThemeProvider";

export function ThemeToggle() {
  const { theme, setTheme, resolved } = useTheme();

  const isDark = resolved === "dark";

  const label =
    theme === "system"
      ? `System (${resolved})`
      : resolved; // "light" or "dark" (or system resolved)

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="relative inline-flex items-center gap-2 rounded-full border border-slate-200/80 dark:border-slate-700/80 bg-white/70 dark:bg-slate-900/70 px-2.5 py-1 text-xs font-medium text-slate-700 dark:text-slate-100 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
      aria-label="Toggle theme"
    >
      <span className="relative flex h-5 w-5 items-center justify-center">
        <Sun
          className={`h-4 w-4 absolute transition-opacity duration-200 ${
            isDark ? "opacity-0" : "opacity-100"
          }`}
        />
        <Moon
          className={`h-4 w-4 absolute transition-opacity duration-200 ${
            isDark ? "opacity-100" : "opacity-0"
          }`}
        />
      </span>
      <span className="capitalize">{label}</span>
    </button>
  );
}
