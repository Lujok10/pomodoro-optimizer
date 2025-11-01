"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

type Theme = "light" | "dark" | "system";
type ThemeCtx = {
  theme: Theme;
  setTheme: (t: Theme) => void;
  resolved: "light" | "dark";
};

const ThemeContext = createContext<ThemeCtx | null>(null);
const THEME_KEY = "focus_theme";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === "undefined") return "system";
    try {
      return (localStorage.getItem(THEME_KEY) as Theme) || "system";
    } catch {
      return "system";
    }
  });

  const resolved: "light" | "dark" = useMemo(() => {
    if (theme === "system") {
      if (typeof window === "undefined") return "light";
      return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
    return theme;
  }, [theme]);

  useEffect(() => {
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {}
  }, [theme]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(resolved);
    (root.style as any).colorScheme = resolved;
  }, [resolved]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, resolved }}>
      <TokensProvider>{children}</TokensProvider>
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside ThemeProvider");
  return ctx;
}

/* ------------------------------ THEME TOKENS ------------------------------ */

export type ThemeTokens = {
  primary: string;
  primaryAlt: string;
  accent: string;
  success: string;
  warning: string;
  danger: string;
  ok: string;    // alias of success
  warn: string;  // alias of warning
  err: string;   // alias of danger
  text: string;
  muted: string;
  grid: string;
  bg: string;
  bgCard: string;
  ring: string;
  label: string;
  line: string;
};

const DEFAULT_TOKENS_LIGHT: ThemeTokens = {
  primary:    "#6366f1",
  primaryAlt: "#a78bfa",
  accent:     "#22c55e",
  success:    "#16a34a",
  warning:    "#f59e0b",
  danger:     "#ef4444",
  ok:         "#16a34a",
  warn:       "#f59e0b",
  err:        "#ef4444",
  text:       "#111827",
  muted:      "#6b7280",
  grid:       "#e5e7eb",
  bg:         "#f8fafc",
  bgCard:     "#ffffff",
  ring:       "#4f46e5",
  label:      "#374151",
  line:       "#6366f1",
};

const DEFAULT_TOKENS_DARK: ThemeTokens = {
  primary:    "#818cf8",
  primaryAlt: "#c4b5fd",
  accent:     "#34d399",
  success:    "#22c55e",
  warning:    "#fbbf24",
  danger:     "#f87171",
  ok:         "#22c55e",
  warn:       "#fbbf24",
  err:        "#f87171",
  text:       "#e5e7eb",
  muted:      "#9ca3af",
  grid:       "#374151",
  bg:         "#0b1220",
  bgCard:     "#111827",
  ring:       "#818cf8",
  label:      "#9ca3af",
  line:       "#818cf8",
};

type TokensCtx = {
  tokens: ThemeTokens;
  setTokens: (next: Partial<ThemeTokens>) => void;
};

const TokensContext = createContext<TokensCtx | null>(null);
const TOKENS_KEY = "focus_theme_tokens_v1";

function TokensProvider({ children }: { children: React.ReactNode }) {
  const { resolved } = useTheme();

  const [overrides, setOverrides] = useState<Partial<ThemeTokens>>(() => {
    if (typeof window === "undefined") return {};
    try {
      const raw = localStorage.getItem(TOKENS_KEY);
      return raw ? (JSON.parse(raw) as Partial<ThemeTokens>) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(TOKENS_KEY, JSON.stringify(overrides));
    } catch {}
  }, [overrides]);

  const base = resolved === "dark" ? DEFAULT_TOKENS_DARK : DEFAULT_TOKENS_LIGHT;

  const merged = useMemo<ThemeTokens>(() => {
    const m = { ...base, ...overrides } as ThemeTokens;
    m.ok   = overrides.ok   ?? m.success;
    m.warn = overrides.warn ?? m.warning;
    m.err  = overrides.err  ?? m.danger;
    m.label = overrides.label ?? m.label ?? m.muted;
    m.line  = overrides.line  ?? m.line  ?? m.primary;
    return m;
  }, [base, overrides]);

  const value = useMemo<TokensCtx>(
    () => ({
      tokens: merged,
      setTokens: (next) => setOverrides((prev) => ({ ...prev, ...next })),
    }),
    [merged]
  );

  return <TokensContext.Provider value={value}>{children}</TokensContext.Provider>;
}

/** 👉 Named export your page expects */
export function useThemeTokens(): ThemeTokens {
  const ctx = useContext(TokensContext);
  return ctx?.tokens ?? DEFAULT_TOKENS_LIGHT;
}

export function useSetThemeTokens(): (next: Partial<ThemeTokens>) => void {
  const ctx = useContext(TokensContext);
  return ctx?.setTokens ?? (() => {});
}
