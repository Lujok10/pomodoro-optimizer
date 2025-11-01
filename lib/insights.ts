// lib/insights.ts
// Lightweight analytics helpers that read from localStorage sessions.
// Works with the /lib/sessions.ts format you already use.

export type Session = {
  id: string;
  taskId?: number;
  project?: string;
  seconds: number;     // duration in seconds (canonical in /lib/sessions.ts)
  date: string;        // ISO string
  feedback?: "yes" | "no";
  title?: string;
};

const SESSIONS_KEY = "pom_sessions_v1";

/** Load all sessions from localStorage safely */
export function loadSessions(): Session[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(SESSIONS_KEY);
    return raw ? (JSON.parse(raw) as Session[]) : [];
  } catch {
    return [];
  }
}

/** Filter sessions within [start, end] inclusive (epoch ms) */
export function filterRange(
  list: Session[],
  startMs: number,
  endMs: number
): Session[] {
  return list.filter((s) => {
    const t = new Date(s.date).getTime();
    return t >= startMs && t <= endMs;
  });
}

/** Return rolling two-week [start,end] windows (epoch ms). Default: last 4 windows. */
export function getTwoWeekWindows(
  count = 4,
  until = Date.now()
): Array<{ start: number; end: number }> {
  const DAY = 24 * 60 * 60 * 1000;
  const TWO_WEEKS = 14 * DAY;
  const windows: Array<{ start: number; end: number }> = [];
  let end = until;
  for (let i = 0; i < count; i++) {
    const start = end - TWO_WEEKS + 1;
    windows.push({ start, end });
    end = start - 1;
  }
  return windows.reverse();
}

/** Sum minutes from a session array */
export function sumMinutes(list: Array<Session | { seconds?: number; duration?: number }>): number {
  const totalMinutes = list.reduce((acc, s: any) => {
    // accept either seconds (canonical) or duration (minutes)
    if (typeof s.duration === "number") return acc + Math.max(0, s.duration);
    if (typeof s.seconds === "number") return acc + Math.max(0, s.seconds / 60);
    return acc;
  }, 0);
  return Math.round(totalMinutes);
}

/** Generic groupBy helper */
export function groupBy<T, K extends string | number>(
  arr: T[],
  key: (x: T) => K
): Record<K, T[]> {
  return arr.reduce((acc, item) => {
    const k = key(item);
    (acc[k] ||= [] as T[]).push(item);
    return acc;
  }, {} as Record<K, T[]>);
}

/* -------------------------------------------------------------------------- */
/*                         Effectiveness & Confidence                          */
/* -------------------------------------------------------------------------- */

export type EffectivenessStats = {
  total: number;             // sessions considered
  effective: number;         // count with feedback === "yes"
  minutes: number;           // total minutes across sessions
  effectiveness: number;     // 0..1 fraction
  effectivenessPct: number;  // 0..100 convenience field
  low: number;               // Wilson CI low (0..1)
  high: number;              // Wilson CI high (0..1)
  samples: number;           // alias of total
};

// Wilson score helper
function wilsonCI(successes: number, trials: number, z = 1.96) {
  if (trials === 0) return { low: 0, high: 0 };
  const p = successes / trials;
  const denom = 1 + (z * z) / trials;
  const centre = p + (z * z) / (2 * trials);
  const margin = z * Math.sqrt((p * (1 - p) + (z * z) / (4 * trials)) / trials);
  return {
    low: Math.max(0, (centre - margin) / denom),
    high: Math.min(1, (centre + margin) / denom),
  };
}

// Accept either sessions with seconds (canonical) or duration (minutes)
export function effectivenessStats(
  sessions: Array<{ feedback?: "yes" | "no"; duration?: number; seconds?: number }>
): EffectivenessStats {
  const total = sessions.length;
  const effective = sessions.reduce((acc, s) => acc + (s.feedback === "yes" ? 1 : 0), 0);

  // minutes: prefer duration (already minutes) else seconds/60
  const minutes = Math.round(
    sessions.reduce((acc, s: any) => {
      if (typeof s.duration === "number") return acc + Math.max(0, s.duration);
      if (typeof s.seconds === "number") return acc + Math.max(0, s.seconds / 60);
      return acc;
    }, 0)
  );

  const effectiveness = total > 0 ? effective / total : 0;
  const { low, high } = wilsonCI(effective, total);
  const samples = total;

  return {
    total,
    effective,
    minutes,
    effectiveness,
    effectivenessPct: effectiveness * 100,
    low,
    high,
    samples,
  };
}

/* -------------------------------------------------------------------------- */
/*                              Weekly Pareto (7d)                             */
/* -------------------------------------------------------------------------- */

/**
 * Aggregate last 7 days of sessions into minutes per project/title (Pareto).
 * Returns sorted descending by minutes: [{ name, minutes }]
 */
export function getWeeklyParetoData(
  sessions?: Session[]
): { name: string; minutes: number }[] {
  const list = sessions ?? loadSessions();

  // include today + previous 6 days
  const now = new Date();
  const endTs = now.getTime();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  start.setDate(start.getDate() - 6);
  const startTs = start.getTime();

  const bucket = new Map<string, number>();
  for (const s of list) {
    const ts = new Date(s.date).getTime();
    if (ts >= startTs && ts <= endTs) {
      const key = (s.title && s.title.trim()) || s.project || "General";
      const minutes = Math.max(0, (s.seconds ?? 0) / 60);
      bucket.set(key, (bucket.get(key) ?? 0) + minutes);
    }
  }

  return Array.from(bucket.entries())
    .map(([name, minutes]) => ({ name, minutes: Math.round(minutes) }))
    .sort((a, b) => b.minutes - a.minutes);
}

/** Convenience: top N project/title buckets by minutes in last 7 days */
export function getTopProjects(n = 5, sessions?: Session[]): string[] {
  return getWeeklyParetoData(sessions).slice(0, n).map((r) => r.name);
}

/* -------------------------------------------------------------------------- */
/*                         Task-level recommendations                          */
/* -------------------------------------------------------------------------- */

export type RecommendationItem = {
  title: string;
  detail?: string;
  project?: string;  // add
  rate?: number;     // add (0..1)
};


export type RecommendationBundle = {
  top: RecommendationItem[];       // high-priority “do more”
  bottom: RecommendationItem[];    // low-performers to review (alias)
  tryMoreOf: string[];             // legacy fields (kept for compatibility)
  review: string[];
};

export function taskLevelRecommendations(
  sessions: Array<{ project?: string; feedback?: "yes" | "no"; duration?: number; seconds?: number }>
): RecommendationBundle {
  // group sessions by project (fallback to "General")
  const groups = groupBy(sessions, (s) => (s.project && s.project.trim()) || "General");

  // compute effectiveness per project
  const rows = Object.entries(groups).map(([project, list]) => {
    const stats = effectivenessStats(list);
    return {
      project,
      rate: stats.effectiveness, // 0..1
      samples: stats.samples,
      minutes: stats.minutes,
    };
  });

  // heuristics
  const MIN_SAMPLES = 2;
  const HIGH = 0.60;
  const LOW = 0.40;

  const strong = rows
    .filter((r) => r.samples >= MIN_SAMPLES && r.rate >= HIGH)
    .sort((a, b) => b.rate - a.rate)
    .slice(0, 5);

  const weak = rows
    .filter((r) => r.samples >= MIN_SAMPLES && r.rate < LOW)
    .sort((a, b) => a.rate - b.rate)
    .slice(0, 5);

  const tryMoreOf = strong.map((r) => r.project);
  const review = weak.map((r) => r.project);

const top: RecommendationItem[] = strong.map((r) => ({
  title: `Do more: ${r.project}`,
  detail: "High recent effectiveness — schedule more of this work.",
  project: r.project,
  rate: r.rate, // 0..1
}));

const bottom: RecommendationItem[] = weak.map((r) => ({
  title: `Review: ${r.project}`,
  detail: "Low effectiveness — consider breaking it down or changing approach.",
  project: r.project,
  rate: r.rate, // 0..1
}));

  return { top, bottom, tryMoreOf, review };
}
