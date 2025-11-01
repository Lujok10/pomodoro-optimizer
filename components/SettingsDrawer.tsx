"use client";

import React, { useEffect, useState } from "react";
import { useTheme } from "./ThemeProvider";

type Props = {
  open: boolean;
  onClose: () => void;
};

const SOUND_KEY = "focus_sound_enabled";
const AUTONEXT_KEY = "focus_auto_next";
const BEEP_SRC =
  "data:audio/mp3;base64,//uQZAAAAAAAAAAAAAAAAAAAA..."; // (optional tiny beep) keep or replace

export default function SettingsDrawer({ open, onClose }: Props) {
  const { theme, setTheme, resolved } = useTheme();
  const [sound, setSound] = useState<boolean>(false);
  const [autoNext, setAutoNext] = useState<boolean>(true);

  useEffect(() => {
    try {
      const s = localStorage.getItem(SOUND_KEY);
      setSound(s ? s === "1" : false);
    } catch {}
    try {
      const a = localStorage.getItem(AUTONEXT_KEY);
      setAutoNext(a ? a === "1" : true);
    } catch {}
  }, []);

  useEffect(() => {
    try { localStorage.setItem(SOUND_KEY, sound ? "1" : "0"); } catch {}
  }, [sound]);

  useEffect(() => {
    try { localStorage.setItem(AUTONEXT_KEY, autoNext ? "1" : "0"); } catch {}
  }, [autoNext]);

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/30 transition-opacity duration-200 ${open ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        aria-hidden={!open}
        onClick={onClose}
      />
      {/* Panel */}
      <aside
        className={`fixed right-0 top-0 bottom-0 w-80 max-w-[90%] bg-white dark:bg-zinc-900 shadow-lg border-l border-zinc-200 dark:border-zinc-800
                    transition-transform duration-300 ${open ? "translate-x-0" : "translate-x-full"}`}
        role="dialog"
        aria-modal="true"
        aria-label="Settings"
      >
        <div className="p-4 flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800">
          <h2 className="text-lg font-semibold">Settings</h2>
          <button onClick={onClose} className="rounded border px-3 py-1 text-sm">Close</button>
        </div>

        <div className="p-4 space-y-6">
          <section>
            <h3 className="text-sm font-medium mb-2">Theme</h3>
            <div className="space-y-2">
              <select
                value={theme}
                onChange={(e) => setTheme(e.target.value as any)}
                className="w-full border rounded px-3 py-2"
                aria-label="Theme"
              >
                <option value="system">System</option>
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
              <div className="text-xs text-zinc-500">Resolved: <span className="font-medium">{resolved}</span></div>
            </div>
          </section>

          <section>
            <h3 className="text-sm font-medium mb-2">Focus behavior</h3>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={autoNext}
                onChange={(e) => setAutoNext(e.target.checked)}
              />
              <span>Auto-start next task</span>
            </label>
            <label className="flex items-center gap-2 mt-2">
              <input
                type="checkbox"
                checked={sound}
                onChange={(e) => setSound(e.target.checked)}
              />
              <span>Sound when a block ends</span>
            </label>
            {sound && (
              <button
                onClick={() => {
                  try {
                    const a = new Audio(BEEP_SRC);
                    a.play();
                  } catch {}
                }}
                className="mt-2 text-sm rounded border px-3 py-1"
              >
                Test sound
              </button>
            )}
          </section>

          <section>
            <h3 className="text-sm font-medium mb-2">Shortcuts</h3>
            <ul className="text-sm space-y-1">
              <li><kbd className="px-1.5 py-0.5 border rounded">Space</kbd> Pause/Resume</li>
              <li><kbd className="px-1.5 py-0.5 border rounded">N</kbd> Next task</li>
              <li><kbd className="px-1.5 py-0.5 border rounded">S</kbd> Skip</li>
              <li><kbd className="px-1.5 py-0.5 border rounded">G</kbd> Regenerate plan</li>
            </ul>
          </section>
        </div>
      </aside>
    </>
  );
}
