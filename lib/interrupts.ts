// lib/insights.ts
/* eslint-disable @typescript-eslint/no-unused-vars */

export type FeedbackYN = "yes" | "no";

export type Session = {
  id: string;
  taskId?: number;
  project?: string;
  title?: string;      // task name at time of session
  seconds: number;     // duration in seconds
  date: string;        // ISO string
  feedback?: FeedbackYN;
};

const SESSIONS_KEY = "pom_sessions_v1";

/** Safe load of sessions from localStorage (SSR-proof). */
export function loadSessions(): Session[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(SESSIONS_KEY);
    return raw ? (JSON.parse(raw) as Session[]) : [];
  } catch {
    return [];
  }
}

/** Utility: clamp to [0, +inf) minutes. */
export function secsToMin(secs: number): number {
  return Math.max(0, Math.round((secs || 0) / 60));
}

/** Utility: groupBy for small arrays. */
export function groupBy<T, K extends string | number>(
  items: T[],
  keyFn: (x: T) => K
): Record<K, T[]> {
  return items.reduce((acc, it) => {
    const k = keyFn(it);
    (acc[k] ||= [] as unknown as T[]).push(it);
    return acc;
  }, {} as Record<K, T[]>);
}

/** Sum minutes helper over a list of sessions. */
export function sumMinutes(list: Session[]): number {
  return list.reduce((acc, s) => acc + secsToMin(s.seconds), 0);
}

/** Filter sessions in [startTs, endTs] (epoch ms). */
export function filterRange(
  list: Session[],
  startTs: number,
  endTs: number
): Session[] {
  return list.filter((s) => {
    const ts = new Date(s.date).getTime();
    return ts >= startTs && ts <= endTs;
  });
}

/**
 * Rolling two-week windows ending today (array of {start,end}).
 * NOTE: This returns objects so you can use w0.start / w0.end in your page.
 */
export function getTwoWeekWindows(
  count = 2
): Array<{ start: number; end: number }> {
  const out: Array<{ start: number; end: number }> = [];
  const dayMs = 24 * 60 * 60 * 1000;
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);
  const end0 = endOfToday.getTime();

  for (let i = 0; i < count; i++) {
    const end = end0 - i * 14 * dayMs;
    const start = end - 13 * dayMs; // inclusive 14 days
    out.push({ start, end });
  }
  return out.reverse(); // oldest → newest
}

/** Basic effectiveness stats over a list. */
export function effectivenessStats(list: Session[]) {
  const total = list.length;
  const effective = list.filter((s) => s.feedback === "yes").length;
  const ineffective = list.filter((s) => s.feedback === "no").length;
  const minutes = sumMinutes(list);
  const effectivenessPct = total ? Math.round((effective / total) * 100) : 0;
  return { total, effective, ineffective, minutes, effectivenessPct };
}

/** Recommendations at task/title level: top “do more”, bottom “fix/avoid”. */
export function taskLevelRecommendations(list: Session[]) {
  // Aggregate by title (fallback to project, then "General")
  const keyed = groupBy(list, (s) => s.title?.trim() || s.project || "General");

  type Row = { key: string; total: number; yes: number; rate: number; minutes: number };
  const rows: Row[] = Object.entries(keyed).map(([key, arr]) => {
    const total = arr.length;
    const yes = arr.filter((a) => a.feedback === "yes").length;
    const rate = total ? Math.round((yes / total) * 100) : 0;
    const minutes = sumMinutes(arr);
    return { key, total, yes, rate, minutes };
  });

  const top = [...rows]
    .sort((a, b) => b.rate - a.rate || b.minutes - a.minutes)
    .slice(0, 5);

  const bottom = [...rows]
    .sort((a, b) => a.rate - b.rate || b.minutes - a.minutes)
    .slice(0, 5);

  return { top, bottom };
}

/** Weekly Pareto (last 7 days) grouped by title→project→General. */
export function getWeeklyPareto(
  sessions?: Session[]
): { name: string; minutes: number }[] {
  const src = sessions ?? loadSessions();

  // last 7 calendar days including today
  const today = new Date();
  const endTs = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
    23, 59, 59, 999
  ).getTime();

  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  start.setDate(start.getDate() - 6);
  const startTs = start.getTime();

  const week = filterRange(src, startTs, endTs);

  const bucket = new Map<string, number>();
  for (const s of week) {
    const key = s.title?.trim() || s.project || "General";
    const min = Math.max(0, (s.seconds || 0) / 60);
    bucket.set(key, (bucket.get(key) ?? 0) + min);
  }

  return Array.from(bucket.entries())
    .map(([name, minutes]) => ({ name, minutes: Math.round(minutes) }))
    .sort((a, b) => b.minutes - a.minutes);
}

// lib/interrupts.ts

export type InterruptItem = {
  reason?: string;
  timestamp: number;        // epoch millis (local time)
  source?: "manual" | "auto";
};

const LS_KEY = "pom_interrupts_v1";

/** Safe localStorage read */
function load(): InterruptItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LS_KEY);
    const arr = raw ? (JSON.parse(raw) as InterruptItem[]) : [];
    // sanitize & sort by time ascending
    return arr
      .filter((x) => typeof x?.timestamp === "number")
      .map((x) => ({ reason: x.reason ?? "", timestamp: x.timestamp, source: x.source ?? "manual" }))
      .sort((a, b) => a.timestamp - b.timestamp);
  } catch {
    return [];
  }
}

/** Safe localStorage write */
function save(list: InterruptItem[]) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(list));
  } catch {}
}

/** Public: return all interrupts (oldest → newest) */
export function getInterrupts(): InterruptItem[] {
  return load();
}

/** Public: append a new interrupt (accepts object or reason string) */
export function logInterrupt(i: InterruptItem | string): InterruptItem {
  const item: InterruptItem =
    typeof i === "string"
      ? { reason: i, timestamp: Date.now(), source: "manual" }
      : {
          reason: (i.reason ?? "").trim() || "Interrupt",
          timestamp: typeof i.timestamp === "number" ? i.timestamp : Date.now(),
          source: i.source ?? "manual",
        };

  const list = load();
  list.push(item);
  save(list);
  return item;
}

/** Public: histogram of today’s interrupts by local hour (length 24) */
export function getTodayHistogram(): number[] {
  const buckets = new Array<number>(24).fill(0);

  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0).getTime();
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).getTime();

  for (const it of load()) {
    const ts = it.timestamp;
    if (ts >= start && ts <= end) {
      const h = new Date(ts).getHours(); // 0..23
      buckets[h] += 1;
    }
  }
  return buckets;
}

/** Optional helpers */
export function clearInterrupts() {
  save([]);
}

export function getInterruptsSince(sinceMs: number): InterruptItem[] {
  return load().filter((i) => i.timestamp >= sinceMs);
}

/**
 * Top projects by effectiveness in a time window.
 * Defaults to last 30 days. Returns [{ project, done, effective, rate }].
 */
export function getTopProjects(
  sessions?: Session[],
  opts?: { days?: number; limit?: number; minSamples?: number }
): Array<{ project: string; done: number; effective: number; rate: number }> {
  const src = sessions ?? loadSessions();
  const days = Math.max(1, opts?.days ?? 30);
  const limit = Math.max(1, opts?.limit ?? 3);
  const minSamples = Math.max(1, opts?.minSamples ?? 2);

  const end = new Date();
  const endTs = end.getTime();
  const start = new Date(end);
  start.setDate(end.getDate() - (days - 1));
  start.setHours(0, 0, 0, 0);
  const startTs = start.getTime();

  const windowed = filterRange(src, startTs, endTs);

  const byProject = groupBy(windowed, (s) => s.project || "General");
  const rows = Object.entries(byProject).map(([project, arr]) => {
    const done = arr.length;
    const effective = arr.filter((a) => a.feedback === "yes").length;
    const rate = done ? Math.round((effective / done) * 100) : 0;
    return { project, done, effective, rate };
  });

  return rows
    .filter((r) => r.done >= minSamples)
    .sort((a, b) => b.rate - a.rate || b.done - a.done)
    .slice(0, limit);
}
