"use client";

import React, { useState } from "react";
import { ThemeToggle } from "./ThemeToggle";
import { useThemeTokens } from "./ThemeProvider";
import { useSupabaseUser } from "@/lib/supabase/useUser";
import SettingsDrawer from "@/components/SettingsDrawer";
import { Settings as SettingsIcon } from "lucide-react";

export function AppShell({ children }: { children: React.ReactNode }) {
  const tokens = useThemeTokens();
  const { user } = useSupabaseUser();
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <>
      <div
        className="min-h-screen flex flex-col"
        style={{
          background:
            "radial-gradient(circle at top, rgba(129,140,248,0.18) 0, transparent 55%), radial-gradient(circle at bottom, rgba(45,212,191,0.12) 0, transparent 60%)",
        }}
      >
        {/* Header */}
        <header className="border-b border-slate-200/70 dark:border-slate-800/70 bg-white/75 dark:bg-slate-950/70 backdrop-blur">
          <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div
                className="h-8 w-8 rounded-xl text-white grid place-items-center text-xs font-semibold shadow-sm"
                style={{ backgroundColor: tokens.primary }}
              >
                80/20
              </div>
              <div className="leading-tight">
                <div className="text-sm font-semibold">
                  OptimApp · Focus Planner
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  Plan · Focus · Learn from your day
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {user && (
                <div className="hidden sm:flex flex-col items-end text-[11px] text-slate-500 dark:text-slate-400">
                  <span className="font-medium text-slate-700 dark:text-slate-200">
                    {user.email}
                  </span>
                  <span>Signed in</span>
                </div>
              )}

              <ThemeToggle />

              {/* Settings icon button */}
              <button
                type="button"
                onClick={() => setSettingsOpen(true)}
                className="ml-1 inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200/80 dark:border-slate-700/80 bg-white/70 dark:bg-slate-900/70 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                aria-label="Open appearance settings"
              >
                <SettingsIcon className="h-4 w-4 text-slate-600 dark:text-slate-200" />
              </button>
            </div>
          </div>
        </header>

        {/* Main content container */}
        <main className="flex-1">
          <div className="mx-auto max-w-6xl px-4 md:px-6 py-4 md:py-6">
            <div className="rounded-3xl border border-slate-200/60 dark:border-slate-800/70 bg-white/75 dark:bg-slate-950/70 shadow-sm backdrop-blur-md">
              <div className="p-4 md:p-6">{children}</div>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="border-t border-slate-200/70 dark:border-slate-800/70 text-[11px] text-slate-500 dark:text-slate-400 bg-white/70 dark:bg-slate-950/70 backdrop-blur">
          <div className="mx-auto max-w-6xl px-4 py-2 flex items-center justify-between">
            <span>OptimApp · 80/20 Focus</span>
            <span>Space = pause · N = next · S = skip · G = regenerate</span>
          </div>
        </footer>
      </div>

      {/* Settings drawer wired to theme tokens */}
      <SettingsDrawer
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </>
  );
}
