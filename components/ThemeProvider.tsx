"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

// -------------------------- THEME CORE --------------------------

type Theme = "light" | "dark" | "system";

type ThemeCtx = {
  theme: Theme;
  setTheme: (t: Theme) => void;
  resolved: "light" | "dark";
};

const ThemeContext = createContext<ThemeCtx | null>(null);
const THEME_KEY = "focus_theme";

export function ClientOnly({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return <>{children}</>;
}

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
      return window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
    }
    return theme;
  }, [theme]);

  useEffect(() => {
    if (typeof localStorage === "undefined") return;
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
      <TokensProvider>
        {/* Everything inside is client-only, so no hydration mismatch */}
        <ClientOnly>{children}</ClientOnly>
      </TokensProvider>
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside ThemeProvider");
  return ctx;
}

// -------------------------- THEME TOKENS --------------------------

export type ThemeTokens = {
  primary: string;
  primaryAlt: string;
  accent: string;
  success: string;
  warning: string;
  danger: string;

  ok: string;
  warn: string;
  err: string;

  text: string;
  muted: string;
  grid: string;
  bg: string;
  bgCard: string;
  ring: string;
  label: string;
  line: string;
};

const LIGHT: ThemeTokens = {
  primary: "#6366f1",
  primaryAlt: "#a78bfa",
  accent: "#22c55e",
  success: "#16a34a",
  warning: "#f59e0b",
  danger: "#ef4444",

  ok: "#16a34a",
  warn: "#f59e0b",
  err: "#ef4444",

  text: "#111827",
  muted: "#6b7280",
  grid: "#e5e7eb",
  bg: "#f8fafc",
  bgCard: "#ffffff",
  ring: "#4f46e5",
  label: "#374151",
  line: "#6366f1",
};

const DARK: ThemeTokens = {
  primary: "#818cf8",
  primaryAlt: "#c4b5fd",
  accent: "#34d399",
  success: "#22c55e",
  warning: "#fbbf24",
  danger: "#f87171",

  ok: "#22c55e",
  warn: "#fbbf24",
  err: "#f87171",

  text: "#e5e7eb",
  muted: "#9ca3af",
  grid: "#374151",
  bg: "#0b1220",
  bgCard: "#111827",
  ring: "#818cf8",
  label: "#9ca3af",
  line: "#818cf8",
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

  const base = resolved === "dark" ? DARK : LIGHT;

  const merged = useMemo<ThemeTokens>(() => {
    const out = { ...base, ...overrides } as ThemeTokens;
    out.ok = overrides.ok ?? out.success;
    out.warn = overrides.warn ?? out.warning;
    out.err = overrides.err ?? out.danger;
    out.label = overrides.label ?? out.label ?? out.muted;
    out.line = overrides.line ?? out.line ?? out.primary;
    return out;
  }, [base, overrides]);

  const value = useMemo(
    () => ({
      tokens: merged,
      setTokens: (next: Partial<ThemeTokens>) =>
        setOverrides((prev) => ({ ...prev, ...next })),
    }),
    [merged]
  );

  return (
    <TokensContext.Provider value={value}>{children}</TokensContext.Provider>
  );
}

export function useThemeTokens() {
  const ctx = useContext(TokensContext);
  return ctx?.tokens ?? LIGHT;
}

export function useSetThemeTokens() {
  const ctx = useContext(TokensContext);
  return ctx?.setTokens ?? (() => {});
}
