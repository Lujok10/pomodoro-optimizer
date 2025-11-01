import { asFeedback, FeedbackStr } from "@/lib/feedback";

// /lib/sessions.ts
export type Session = {
  id: string;               // unique session id
  taskId?: number;
  project?: string;
  seconds: number;          // duration in seconds
  date: string;             // ISO string
  feedback?: "yes" | "no";
  title?: string;           // store task name/title if provided
};

const SESSIONS_KEY = "pom_sessions_v1";

/** Safe localStorage read */
function loadSessions(): Session[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(SESSIONS_KEY);
    return raw ? (JSON.parse(raw) as Session[]) : [];
  } catch {
    return [];
  }
}

/** Safe localStorage write */
function saveSessions(list: Session[]) {
  try {
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(list));
  } catch {}
}

/** YYYY-MM-DD in local time */
function dayStr(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Public: append a new focus session */
export function logSession(
  task: { id?: number; project?: string; name?: string } = {}, // accepts name
  seconds: number,
  when: Date = new Date(),
  feedback?: "yes" | "no"
): Session {
  const list = loadSessions();
  const sess: Session = {
    id: `${when.toISOString()}_${task.id ?? "na"}`,
    taskId: task.id,
    project: task.project,
    seconds: Math.max(0, Math.floor(seconds)),
    date: when.toISOString(),
    feedback,
    title: task.name,
  };
  list.push(sess);
  saveSessions(list);
  return sess;
}

/** Normalize various input types to a valid ISO string (UTC). */
function toIso(since: string | number | Date): string {
  if (typeof since === "string") {
    // Accept ISO or YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(since)) {
      const d = new Date(`${since}T00:00:00.000Z`);
      return isNaN(d.getTime()) ? new Date(0).toISOString() : d.toISOString();
    }
    const d = new Date(since);
    return isNaN(d.getTime()) ? new Date(0).toISOString() : d.toISOString();
  }
  if (since instanceof Date) {
    return isNaN(since.getTime()) ? new Date(0).toISOString() : since.toISOString();
  }
  const d = new Date(since); // number (ms)
  return isNaN(d.getTime()) ? new Date(0).toISOString() : d.toISOString();
}

/** Public: sessions from a date forward (inclusive). Accepts string | number | Date. */
export function getSessionsSince(since: string | number | Date): Session[] {
  const list = loadSessions();
  const sinceTs = new Date(toIso(since)).getTime();
  return list.filter((s) => new Date(s.date).getTime() >= sinceTs);
}

/** Public: compute current/best streaks of days with ≥1 session */
export function computeStreaks(): { current: number; best: number } {
  const list = loadSessions();
  // Build a set of day strings with activity
  const days = new Set<string>(list.map((s) => dayStr(new Date(s.date))));

  // Current streak: count back from today
  let cur = 0;
  const today = new Date();
  for (let i = 0; ; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    if (days.has(dayStr(d))) cur++;
    else break;
  }

  // Best streak: longest consecutive run in the set
  const stamps = Array.from(days)
    .map((ds) => new Date(ds + "T00:00:00").getTime())
    .sort((a, b) => a - b);

  let best = 0;
  let chain = 0;
  for (let i = 0; i < stamps.length; i++) {
    if (i === 0 || stamps[i] - stamps[i - 1] === 24 * 60 * 60 * 1000) {
      chain++;
    } else {
      best = Math.max(best, chain);
      chain = 1;
    }
  }
  best = Math.max(best, chain);

  return { current: cur, best };
}

/** Helper used by some pages to log from a Task object quickly */
export function appendSessionFromTask(
  task: { id: number; project?: string; duration?: number; name?: string },
  outcome?: FeedbackStr | boolean
) {
  const fb = asFeedback(outcome);
  const seconds = Math.max(60, Math.round((task.duration ?? 25) * 60));
  return logSession(
    { id: task.id, project: task.project, name: task.name },
    seconds,
    new Date(),
    fb
  );
}

/** Aggregate last 7 days of sessions into minutes per project/title (Pareto data). */
export function getWeeklyParetoData(): { name: string; minutes: number }[] {
  const list =
    typeof window === "undefined"
      ? []
      : (() => {
          try {
            const raw = localStorage.getItem(SESSIONS_KEY);
            return raw
              ? (JSON.parse(raw) as Array<{
                  date: string;
                  seconds: number;
                  project?: string;
                  title?: string;
                }>)
              : [];
          } catch {
            return [];
          }
        })();

  // include today + previous 6 days
  const now = new Date();
  const endTs = now.getTime();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  start.setDate(start.getDate() - 6);
  const startTs = start.getTime();

  // group by session.title -> fall back to project -> "General"
  const bucket = new Map<string, number>();
  for (const s of list) {
    const ts = new Date(s.date).getTime();
    if (ts >= startTs && ts <= endTs) {
      const key = (s.title && s.title.trim()) || (s.project ?? "General");
      const minutes = Math.max(0, (s.seconds ?? 0) / 60);
      bucket.set(key, (bucket.get(key) ?? 0) + minutes);
    }
  }

  // sorted descending by minutes
  return Array.from(bucket.entries())
    .map(([name, minutes]) => ({ name, minutes: Math.round(minutes) }))
    .sort((a, b) => b.minutes - a.minutes);
}

/** Optional: clear all sessions (handy for debugging) */
export function clearSessions() {
  saveSessions([]);
}
