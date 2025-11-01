// lib/proGate.ts
// Minimal “pro gate” with a toggle persisted in localStorage.

const KEY = "focus_pro_active_v1";

/** Is Pro active (unlocked)? */
export function isPro(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

/** Programmatically enable/disable Pro (used by /pro page) */
export function setProActive(on: boolean) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY, on ? "1" : "0");
  } catch {}
}

/** Gate a specific feature string */
export function isBlocked(
  feature:
    | "streaks>7"
    | "ai-triage"
    | "weekly-ai"
    | "export"
    | "calendar-auto"
): boolean {
  // If pro is on, nothing is blocked.
  if (isPro()) return false;

  // Otherwise, define which features are gated.
  const gated = new Set([
    "streaks>7",
    "ai-triage",
    "weekly-ai",
    "export",
    "calendar-auto",
  ]);
  return gated.has(feature);
}
