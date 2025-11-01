// lib/focusEngine.ts
import { Task } from "@/types/task";

export type PlanOptions = {
  /** user energy 1..5 (used as a tie-breaker only; optional) */
  userEnergy?: number;
  /** minimum item duration to consider (minutes) */
  min?: number;
  /** maximum item duration to consider (minutes) */
  max?: number;
  /** cap number of items in the plan */
  maxItems?: number;
};

function safeDurationMinutes(t: Partial<Task>, opts?: PlanOptions): number {
  const raw = Number((t as any).duration ?? 25);      // default to 25m if missing
  const min = Math.max(1, Math.floor(opts?.min ?? 1));
  const max = Math.max(min, Math.floor(opts?.max ?? 240));
  const clamped = Math.max(min, Math.min(max, Math.round(raw)));
  return clamped;
}

function scoreTask(t: Partial<Task>): number {
  // fallbacks so we can score even if some fields are missing
  const impact = Number((t as any).impact ?? 1);        // 1..3 (or 1..5)
  const confidence = Number((t as any).confidence ?? 1);
  const effort = Math.max(1, Number((t as any).effort ?? 1));
  return (impact * confidence) / effort;
}

/**
 * Pick a set of tasks that fit within `availableMinutes` (best-effort).
 * Always selects at least one task, even if it slightly exceeds capacity.
 */
export function generateFocusPlan(
  tasks: Task[],
  availableMinutes: number,
  opts: PlanOptions = {}
): Task[] {
  const maxItems = Math.max(1, Math.floor(opts.maxItems ?? 10));

  // Rank tasks by score desc, then by shorter duration first
  const ranked = [...tasks]
    .map((t) => {
      const duration = safeDurationMinutes(t, opts);
      const score = scoreTask(t);
      return { ...t, duration, score };
    })
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.duration - b.duration;
    });

  const plan: Task[] = [];
  let used = 0;

  for (const t of ranked) {
    if (plan.length >= maxItems) break;

    const dur = safeDurationMinutes(t, opts); // ✅ guaranteed number
    // take it if it fits OR if it's the very first pick (ensure at least one)
    if (used + dur <= availableMinutes || plan.length === 0) {
      plan.push({
        ...t,
        duration: dur,          // ✅ ensure defined
        // the Task type doesn't include runtime fields; UI can add those later
      } as Task);
      used += dur;
    }
  }

  return plan;
}
