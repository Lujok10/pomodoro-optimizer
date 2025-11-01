"use client";
import { supabase } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

// local keys used by your app
const TASKS_KEY = "pom_tasks";
const COMPLETED_KEY = "pom_completed_v1";
const FEEDBACK_KEY = "pom_feedback_v1";
const MIGRATED_FLAG = "cloud_migrated_v1";

type Task = {
  id: number;
  name: string;
  impact: number;
  duration: number;
  project?: string;
};
type Feedback = "yes" | "no";

function nowIso() {
  return new Date().toISOString();
}

export async function getUser(): Promise<User | null> {
  const { data } = await supabase.auth.getUser();
  return data.user ?? null;
}

export async function ensureUserRow(user: User) {
  // Upsert into users mirror (so FKs work)
  await supabase.from("users").upsert(
    { id: user.id, email: user.email ?? null },
    { onConflict: "id" }
  );
}

export function readLocal(): {
  tasks: Task[];
  completed: Task[];
  feedback: Record<number, Feedback>;
} {
  let tasks: Task[] = [];
  let completed: Task[] = [];
  let feedback: Record<number, Feedback> = {};
  try { tasks = JSON.parse(localStorage.getItem(TASKS_KEY) || "[]"); } catch {}
  try { completed = JSON.parse(localStorage.getItem(COMPLETED_KEY) || "[]"); } catch {}
  try { feedback = JSON.parse(localStorage.getItem(FEEDBACK_KEY) || "{}"); } catch {}
  return { tasks, completed, feedback };
}

/** One-time migrate local → cloud (safe to re-run; guarded by flag per device). */
export async function pushLocalToCloudOnce() {
  const user = await getUser();
  if (!user) return;
  await ensureUserRow(user);

  if (localStorage.getItem(MIGRATED_FLAG) === "1") return;

  const { tasks, completed, feedback } = readLocal();

  // ---- tasks
  if (tasks.length) {
    const rows = tasks.map((t) => ({
      user_id: user.id,
      task_id: t.id,
      name: t.name,
      impact: t.impact,
      duration: t.duration,
      project: t.project ?? null,
      updated_at: nowIso(),
    }));
    // upsert by (user_id, task_id)
    await supabase.from("tasks").upsert(rows, { onConflict: "user_id,task_id" });
  }

  // ---- sessions from completed (best-effort if you don't have a separate session log)
  if (completed.length) {
    const sess = completed.map((t) => ({
      user_id: user.id,
      task_id: t.id,
      name: t.name,
      project: t.project ?? null,
      duration: t.duration,
      feedback: (feedback?.[t.id] ?? null) as "yes" | "no" | null,
      created_at: nowIso(),
    }));
    // insert (no unique constraint)
    await supabase.from("sessions").insert(sess).select().throwOnError();
  }

  // ---- feedback map explicit store
  const fbRows = Object.entries(feedback).map(([taskId, ans]) => ({
    user_id: user.id,
    task_id: Number(taskId),
    answer: ans as Feedback,
    updated_at: nowIso(),
  }));
  if (fbRows.length) {
    await supabase.from("feedback").upsert(fbRows, { onConflict: "user_id,task_id" });
  }

  localStorage.setItem(MIGRATED_FLAG, "1");
}

/** Pull cloud → local (idempotent, prefers cloud values where present). */
export async function pullCloudToLocal() {
  const user = await getUser();
  if (!user) return;

  // tasks
  const { data: tData } = await supabase
    .from("tasks")
    .select("task_id,name,impact,duration,project")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  if (tData) {
    const tasks: Task[] = tData.map((r) => ({
      id: r.task_id,
      name: r.name,
      impact: r.impact,
      duration: r.duration,
      project: r.project ?? undefined,
    }));
    try { localStorage.setItem(TASKS_KEY, JSON.stringify(tasks)); } catch {}
  }

  // feedback
  const { data: fData } = await supabase
    .from("feedback")
    .select("task_id,answer")
    .eq("user_id", user.id);

  if (fData) {
    const fb: Record<number, Feedback> = {};
    fData.forEach((r) => { fb[r.task_id] = r.answer as Feedback; });
    try { localStorage.setItem(FEEDBACK_KEY, JSON.stringify(fb)); } catch {}
  }

  // sessions → best-effort rebuild of completed list (dedupe by most recent per task)
  const { data: sData } = await supabase
    .from("sessions")
    .select("task_id,name,project,duration,created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(200);

  if (sData) {
    const seen = new Set<number>();
    const completed: Task[] = [];
    for (const s of sData) {
      if (seen.has(s.task_id)) continue;
      seen.add(s.task_id);
      completed.push({
        id: s.task_id,
        name: s.name,
        project: s.project ?? undefined,
        duration: s.duration,
        impact: 3, // unknown; doesn’t affect your UI here
      });
    }
    try { localStorage.setItem(COMPLETED_KEY, JSON.stringify(completed)); } catch {}
  }
}

/** Periodic automatic JSON backup → cloud (table `backups`). */
export function scheduleCloudBackups(getLocalExport: () => any, ms = 6 * 60 * 60 * 1000) {
  let timer: number | undefined;
  (async () => {
    const user = await getUser();
    if (!user) return;
    const payload = getLocalExport();
    await supabase.from("backups").insert({ user_id: user.id, payload });
  })();

  timer = window.setInterval(async () => {
    const user = await getUser();
    if (!user) return;
    const payload = getLocalExport();
    await supabase.from("backups").insert({ user_id: user.id, payload });
  }, ms) as unknown as number;

  return () => clearInterval(timer);
}
