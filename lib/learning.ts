// /lib/learning.ts
"use client";

export type Feedback = "yes" | "no";
const FB_TASK_KEY = "pom_fb_task_v1";
const FB_PROJ_KEY = "pom_fb_proj_v1";

type FBCounts = Record<string, { yes: number; no: number }>;

function read(key: string): FBCounts {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as FBCounts) : {};
  } catch {
    return {};
  }
}
function write(key: string, val: FBCounts) {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch {}
}

export function recordFeedback(taskId: number, project: string | undefined, answer: Feedback) {
  const t = read(FB_TASK_KEY);
  const p = read(FB_PROJ_KEY);

  const tid = String(taskId);
  t[tid] = t[tid] || { yes: 0, no: 0 };
  t[tid][answer] += 1;

  if (project) {
    const k = project;
    p[k] = p[k] || { yes: 0, no: 0 };
    p[k][answer] += 1;
  }

  write(FB_TASK_KEY, t);
  write(FB_PROJ_KEY, p);
}

function liftFromCounts(c?: { yes: number; no: number }) {
  if (!c) return 1.0;
  const total = c.yes + c.no;
  if (!total) return 1.0;
  const ratio = c.yes / total; // 0..1
  // map ratio to a gentle lift 0.85 .. 1.15
  return 0.85 + ratio * 0.30;
}

/** rankTask blends base score with learned lifts + simple energy / project weights */
export function rankTask(
  task: { impact?: number; confidence?: number; effort?: number; duration: number; id: number; project?: string },
  opts?: { userEnergy?: number; projectWeights?: Record<string, number> }
) {
  const impact = Math.max(1, task.impact ?? 3);
  const conf = Math.max(1, task.confidence ?? 3);
  const eff = Math.max(0, task.effort ?? 2);

  // Base: ICE-like over time
  const base = (impact * conf) / Math.sqrt(eff + 1);
  const perMinute = base / Math.max(5, task.duration);

  // Lifts
  const tCounts = read(FB_TASK_KEY)[String(task.id)];
  const pCounts = task.project ? read(FB_PROJ_KEY)[task.project] : undefined;
  const lift = liftFromCounts(tCounts) * liftFromCounts(pCounts);

  // Energy (3 => 1.0, >3 slight boost, <3 slight drop)
  const e = opts?.userEnergy ?? 3;
  const energyMult = e >= 4 ? 1.08 : e <= 2 ? 0.92 : 1;

  // Project weights (manual)
  const pWeight = task.project ? (opts?.projectWeights?.[task.project] ?? 1) : 1;

  return perMinute * lift * energyMult * pWeight;
}
