"use client";

import React, { useState, useEffect } from "react";
import { X } from "lucide-react";
import {
  useThemeTokens,
  useSetThemeTokens,
} from "@/components/ThemeProvider";

type SettingsDrawerProps = {
  open: boolean;
  onClose: () => void;
};

type EditableKey = "primary" | "accent" | "bg" | "bgCard" | "text";

const EDITABLE_KEYS: { key: EditableKey; label: string; description?: string }[] =
  [
    {
      key: "primary",
      label: "Primary",
      description: "Buttons, highlights, key accents.",
    },
    {
      key: "accent",
      label: "Accent",
      description: "Secondary highlight color for charts and chips.",
    },
    {
      key: "bg",
      label: "Background",
      description: "Overall app background tone.",
    },
    {
      key: "bgCard",
      label: "Card Background",
      description: "Panels, cards, and surfaces.",
    },
    {
      key: "text",
      label: "Text",
      description: "Main text color for content.",
    },
  ];

const FONT_KEY = "optimapp_font_choice";

type FontChoice = "default" | "large" | "serif" | "mono";

function applyFont(choice: FontChoice) {
  if (typeof document === "undefined") return;
  const html = document.documentElement;
  html.dataset.font = choice;
  try {
    localStorage.setItem(FONT_KEY, choice);
  } catch {
    // ignore
  }
}

// match keys used in page.tsx
const SOUND_KEY = "focus_sound_enabled";
const AUTONEXT_KEY = "focus_auto_next";

function normalizeHex(value: string): string {
  let v = value.trim();
  if (!v) return "";
  if (!v.startsWith("#")) v = `#${v}`;
  if (!/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(v)) return value;
  return v.toLowerCase();
}

export default function SettingsDrawer({ open, onClose }: SettingsDrawerProps) {
  const tokens = useThemeTokens();
  const setTokens = useSetThemeTokens();

  // behavior settings
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [autoNextEnabled, setAutoNextEnabled] = useState(true);

  // font settings (moved inside component – hooks must not be at top level)
  const [fontChoice, setFontChoice] = useState<FontChoice>("default");

  useEffect(() => {
    if (!open) return;

    if (typeof window === "undefined") return;
    try {
      const saved = localStorage.getItem(FONT_KEY) as FontChoice | null;
      const validChoices: FontChoice[] = ["default", "large", "serif", "mono"];
      const initial = saved && validChoices.includes(saved) ? saved : "default";
      setFontChoice(initial);
      applyFont(initial);
    } catch {
      applyFont("default");
      setFontChoice("default");
    }
  }, [open]);

  // local color state
  const [localValues, setLocalValues] = useState<Record<EditableKey, string>>({
    primary: tokens.primary,
    accent: tokens.accent,
    bg: tokens.bg,
    bgCard: tokens.bgCard,
    text: tokens.text,
  });

  // sync when drawer opens
  useEffect(() => {
    if (!open) return;

    // sync colors from current tokens
    setLocalValues({
      primary: tokens.primary,
      accent: tokens.accent,
      bg: tokens.bg,
      bgCard: tokens.bgCard,
      text: tokens.text,
    });

    // sync sound / autoNext from localStorage
    if (typeof window !== "undefined") {
      try {
        const s = window.localStorage.getItem(SOUND_KEY) ?? "0";
        const a = window.localStorage.getItem(AUTONEXT_KEY) ?? "1";
        setSoundEnabled(s === "1");
        setAutoNextEnabled(a === "1");
      } catch {
        // ignore
      }
    }
  }, [
    open,
    tokens.primary,
    tokens.accent,
    tokens.bg,
    tokens.bgCard,
    tokens.text,
  ]);

  const handleChangeColor = (key: EditableKey, value: string) => {
    const hex = normalizeHex(value);
    setLocalValues((prev) => ({ ...prev, [key]: hex }));
    const finalHex = normalizeHex(hex);
    if (finalHex && finalHex.startsWith("#")) {
      setTokens({ [key]: finalHex } as any);
    }
  };

  const handleResetColors = () => {
    // clearing overrides – ThemeProvider will fall back to defaults
    setTokens({});
    onClose();
  };

  const handleSoundToggle = (next: boolean) => {
    setSoundEnabled(next);
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(SOUND_KEY, next ? "1" : "0");
      } catch {}
    }
  };

  const handleAutoNextToggle = (next: boolean) => {
    setAutoNextEnabled(next);
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(AUTONEXT_KEY, next ? "1" : "0");
      } catch {}
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end"
      aria-modal="true"
      role="dialog"
      aria-label="Settings"
    >
      {/* Backdrop */}
      <div
        className="flex-1 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="w-full max-w-sm bg-white dark:bg-neutral-950 border-l border-neutral-200 dark:border-neutral-800 shadow-xl flex flex-col">
        {/* Header */}
        <div className="px-4 py-3 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between gap-2">
          <div>
            <div className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">
              Settings
            </div>
            <div className="text-[11px] text-neutral-500 dark:text-neutral-400">
              Focus behavior, appearance, and typography.
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800"
            aria-label="Close settings"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-5">
          {/* Behavior section */}
          <section>
            <div className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-2">
              Focus behavior
            </div>
            <div className="space-y-2">
              <label className="flex items-start gap-2 text-xs">
                <input
                  type="checkbox"
                  className="mt-0.5"
                  checked={soundEnabled}
                  onChange={(e) => handleSoundToggle(e.target.checked)}
                />
                <span>
                  <span className="font-medium text-neutral-800 dark:text-neutral-100">
                    Play sound when a block ends
                  </span>
                  <span className="block text-[11px] text-neutral-500 dark:text-neutral-400">
                    Plays a short chime at the end of each focus block.
                  </span>
                </span>
              </label>

              <label className="flex items-start gap-2 text-xs">
                <input
                  type="checkbox"
                  className="mt-0.5"
                  checked={autoNextEnabled}
                  onChange={(e) => handleAutoNextToggle(e.target.checked)}
                />
                <span>
                  <span className="font-medium text-neutral-800 dark:text-neutral-100">
                    Auto-advance to next block
                  </span>
                  <span className="block text-[11px] text-neutral-500 dark:text-neutral-400">
                    When a block finishes, automatically start the next one.
                  </span>
                </span>
              </label>
            </div>
          </section>

          {/* Colors section */}
          <section>
            <div className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-2">
              Colors
            </div>
            <div className="space-y-3">
              {EDITABLE_KEYS.map(({ key, label, description }) => (
                <div
                  key={key}
                  className="rounded-lg border border-neutral-200 dark:border-neutral-800 p-3 flex flex-col gap-2 bg-neutral-50/70 dark:bg-neutral-900/50"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="text-xs font-medium text-neutral-800 dark:text-neutral-50">
                        {label}
                      </div>
                      {description && (
                        <div className="text-[11px] text-neutral-500 dark:text-neutral-400">
                          {description}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={normalizeHex(localValues[key]) || "#000000"}
                        onChange={(e) =>
                          handleChangeColor(key, e.target.value)
                        }
                        className="h-7 w-7 rounded-md border border-neutral-200 dark:border-neutral-700 bg-transparent cursor-pointer"
                        aria-label={`${label} color`}
                      />
                    </div>
                  </div>
                  <input
                    type="text"
                    value={localValues[key]}
                    onChange={(e) =>
                      handleChangeColor(key, e.target.value)
                    }
                    className="w-full rounded-md border border-neutral-200 dark:border-neutral-700 bg-white/80 dark:bg-neutral-950/80 px-2 py-1 text-xs font-mono text-neutral-800 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/70"
                    placeholder="#6366f1"
                    aria-label={`${label} hex code`}
                  />
                </div>
              ))}
            </div>
          </section>

          {/* Typography section */}
          <section className="mt-4 border-t border-neutral-800/40 pt-4">
            <div className="text-xs font-semibold text-neutral-200 mb-2">
              Typography
            </div>

            <div className="space-y-2 text-xs text-neutral-300">
              <div className="flex flex-wrap gap-2">
                {(["default", "large", "serif", "mono"] as FontChoice[]).map(
                  (choice) => (
                    <button
                      key={choice}
                      type="button"
                      onClick={() => {
                        setFontChoice(choice);
                        applyFont(choice);
                      }}
                      className={`px-2.5 py-1.5 rounded-md border text-[11px] transition
                        ${
                          fontChoice === choice
                            ? "border-indigo-400 bg-indigo-500/10 text-indigo-100"
                            : "border-neutral-700 bg-neutral-900/60 text-neutral-300 hover:bg-neutral-800"
                        }`}
                    >
                      {choice === "default" && "Default"}
                      {choice === "large" && "Larger text"}
                      {choice === "serif" && "Serif"}
                      {choice === "mono" && "Mono"}
                    </button>
                  ),
                )}
              </div>

              <p className="text-[11px] text-neutral-400">
                Use <strong>Default</strong> for a clean UI,{" "}
                <strong>Larger text</strong> for readability, or{" "}
                <strong>Serif/Mono</strong> if you prefer a different feel.
              </p>
            </div>
          </section>

          {/* Preview */}
          <section className="pt-2 border-t border-dashed border-neutral-200 dark:border-neutral-800">
            <div className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-2">
              Preview
            </div>
            <div
              className="rounded-xl p-3 text-xs border border-neutral-200 dark:border-neutral-800"
              style={{
                background: localValues.bgCard || tokens.bgCard,
                color: localValues.text || tokens.text,
              }}
            >
              <div
                className="inline-flex items-center rounded-full px-2 py-1 text-[11px] font-medium mb-2"
                style={{
                  background: localValues.primary || tokens.primary,
                  color: "#ffffff",
                }}
              >
                80/20 Focus
              </div>
              <div className="font-semibold mb-1">
                Your day, tuned to impact
              </div>
              <div className="text-[11px] text-neutral-600 dark:text-neutral-300">
                Adjust the palette and typography here and see it live across the app.
              </div>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={handleResetColors}
            className="text-xs rounded-md border border-neutral-300 dark:border-neutral-700 px-3 py-1.5 text-neutral-700 dark:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800"
          >
            Reset colors to defaults
          </button>
          <button
            type="button"
            onClick={onClose}
            className="text-xs rounded-md bg-indigo-600 text-white px-3 py-1.5 hover:bg-indigo-500"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
