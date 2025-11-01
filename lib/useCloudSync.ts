// lib/useCloudSync.ts
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase, ensureUserRow } from "./supabaseClient";

/** LocalStorage keys used by the app */
const LS_TASKS = "pom_tasks";
const LS_COMPLETED = "pom_completed_v1";
const LS_FEEDBACK = "pom_feedback_v1";
const LS_HOURS = "pom_hours";
const LS_MINUTES = "pom_minutes";
const LS_ENERGY = "pom_energy";

/** Bump when you change the shape of what you persist */
export const SCHEMA_VERSION = 1;

export type CloudState = {
  signedIn: boolean;
  syncing: boolean;
  lastSyncedAt?: number;
  error?: string | null;
};

/** Minimal task/session shapes we use for moving data */
type AnyTask = {
  id?: number;          // local shape
  task_id?: number;     // DB shape
  name: string;
  impact: number;
  duration: number;
  project?: string | null;
};

type DBSessionInsert = {
  task_id: number | null;
  name: string;
  project: string | null;
  duration: number;               // minutes
  feedback: "yes" | "no" | null;
};

function getTaskId(t: AnyTask): number | null {
  const v = t.id ?? t.task_id;
  return typeof v === "number" ? v : null;
}

export function useCloudSync() {
  const [state, setState] = useState<CloudState>({ signedIn: false, syncing: false });
  const syncingRef = useRef(false);

  /** Read a local snapshot for migration/backup */
  const readLocal = useCallback(() => {
    try {
      const tasks = JSON.parse(localStorage.getItem(LS_TASKS) || "[]") as AnyTask[];
      const completed = JSON.parse(localStorage.getItem(LS_COMPLETED) || "[]") as AnyTask[];
      const feedback = JSON.parse(localStorage.getItem(LS_FEEDBACK) || "{}") as Record<number, "yes" | "no">;
      const hours = Number(localStorage.getItem(LS_HOURS) || "8");
      const minutes = Number(localStorage.getItem(LS_MINUTES) || "0");
      const energy = Number(localStorage.getItem(LS_ENERGY) || "3");
      return { tasks, completed, feedback, hours, minutes, energy };
    } catch {
      return { tasks: [], completed: [], feedback: {}, hours: 8, minutes: 0, energy: 3 };
    }
  }, []);

  /** Auth helpers */
  const signInWith = useCallback(
    async (provider: "github" | "google" | "anonymous") => {
      if (provider === "anonymous") {
        // Supabase-js v2 supports anonymous sign-in; if your project doesn’t, this will throw.
        const { error } = await supabase.auth.signInAnonymously();
        if (error) throw error;
        await ensureUserRow();
        setState((s) => ({ ...s, signedIn: true }));
        return;
      }
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: typeof window !== "undefined" ? window.location.href : undefined },
      });
      if (error) throw error;
    },
    []
  );

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setState({ signedIn: false, syncing: false });
  }, []);

  /** Pull cloud → local */
  const pull = useCallback(async () => {
    if (syncingRef.current) return;
    syncingRef.current = true;
    setState((s) => ({ ...s, syncing: true, error: null }));

    try {
      const user = await ensureUserRow();
      if (!user) {
        setState((s) => ({ ...s, signedIn: false, syncing: false }));
        return;
      }
      setState((s) => ({ ...s, signedIn: true }));

      const [tasksQ, sessionsQ, fbQ] = await Promise.all([
        supabase.from("tasks").select("task_id,name,impact,duration,project,updated_at"),
        supabase
          .from("sessions")
          .select("task_id,name,project,duration,feedback,created_at")
          .order("created_at", { ascending: false })
          .limit(250),
        supabase.from("feedback").select("task_id,answer"),
      ]);

      const tasks = tasksQ.data ?? [];
      const sessions = sessionsQ.data ?? [];
      const fb = fbQ.data ?? [];

      // Write tasks (as-is) to local
      localStorage.setItem(LS_TASKS, JSON.stringify(tasks));

      // For “completed”, convert sessions → Task-like rows your UI already understands
      const completedAsTasks: AnyTask[] = sessions.map((s: any) => ({
        id: s.task_id ?? undefined,
        task_id: s.task_id ?? undefined,
        name: s.name,
        impact: 3,
        duration: s.duration,
        project: s.project ?? null,
      }));
      localStorage.setItem(LS_COMPLETED, JSON.stringify(completedAsTasks));

      // Feedback map
      const fMap: Record<number, "yes" | "no"> = {};
      for (const r of fb) {
        if (typeof r.task_id === "number" && (r.answer === "yes" || r.answer === "no")) {
          fMap[r.task_id] = r.answer;
        }
      }
      localStorage.setItem(LS_FEEDBACK, JSON.stringify(fMap));

      setState((s) => ({ ...s, syncing: false, lastSyncedAt: Date.now(), error: null }));
    } catch (e: any) {
      setState((s) => ({ ...s, syncing: false, error: e?.message || String(e) }));
    } finally {
      syncingRef.current = false;
    }
  }, []);

  /** Push/migrate local → cloud */
  const push = useCallback(async () => {
    if (syncingRef.current) return;
    syncingRef.current = true;
    setState((s) => ({ ...s, syncing: true, error: null }));

    try {
      const user = await ensureUserRow();
      if (!user) return;

      const { tasks, completed, feedback } = readLocal();

      // Upsert tasks
      if (tasks.length) {
        const rows = tasks.map((t) => {
          const taskId = getTaskId(t);
          if (taskId == null) {
            // Skip rows without a usable id
            return null;
          }
          return {
            user_id: user.id,
            task_id: taskId,
            name: t.name,
            impact: t.impact,
            duration: t.duration,
            project: t.project ?? null,
            updated_at: new Date().toISOString(),
          };
        }).filter(Boolean) as any[];

        if (rows.length) {
          await supabase.from("tasks").upsert(rows);
        }
      }

      // Insert sessions for completed (best-effort; RLS ensures per-user)
      if (completed.length) {
        const rows: DBSessionInsert[] = completed.slice(0, 250).map((t) => {
          const taskId = getTaskId(t);
          return {
            task_id: taskId,
            name: t.name,
            project: (t.project ?? null) as string | null,
            duration: t.duration,
            feedback: (feedback as any)[taskId ?? -1] ?? null,
          };
        });

        if (rows.length) {
          await supabase
            .from("sessions")
            .insert(rows.map((r) => ({ ...r, user_id: user.id })))
            .select();
        }
      }

      // Upsert feedback map
      const entries = Object.entries(feedback || {});
      if (entries.length) {
        await supabase.from("feedback").upsert(
          entries.map(([taskId, ans]) => ({
            user_id: user.id,
            task_id: Number(taskId),
            answer: ans as "yes" | "no",
            updated_at: new Date().toISOString(),
          }))
        );
      }

      setState((s) => ({ ...s, syncing: false, lastSyncedAt: Date.now(), error: null }));
    } catch (e: any) {
      setState((s) => ({ ...s, syncing: false, error: e?.message || String(e) }));
    } finally {
      syncingRef.current = false;
    }
  }, [readLocal]);

  /** Periodic backup every 30 min when signed in */
  useEffect(() => {
    let id: any;
    (async () => {
      const { data } = await supabase.auth.getSession();
      const session = data?.session;
      if (!session) return;
      const userId = session.user.id;

      id = setInterval(async () => {
        const payload = readLocal();
        try {
          await supabase.from("backups").insert({ user_id: userId, payload });
        } catch {
          // ignore background backup failures
        }
      }, 30 * 60 * 1000);
    })();
    return () => id && clearInterval(id);
  }, [readLocal]);

  /** React to auth changes */
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setState((s) => ({ ...s, signedIn: !!data?.session }));
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setState((s) => ({ ...s, signedIn: !!session }));
      if (session) pull(); // initial pull after sign-in
    });
    return () => {
    
      sub?.subscription?.unsubscribe?.();
    };
  }, [pull]);

  return useMemo(
    () => ({
      state,
      signInWith,
      signOut,
      pull,
      push,
      backupNow: async () => {
        const { data } = await supabase.auth.getSession();
        const userId = data?.session?.user?.id;
        if (!userId) throw new Error("Not signed in");
        const payload = readLocal();
        await supabase.from("backups").insert({ user_id: userId, payload });
      },
      restoreBackup: async (id: number) => {
        const { data, error } = await supabase
          .from("backups")
          .select("payload")
          .eq("id", id)
          .single();
        if (error) throw error;
        const p = (data?.payload as any) || {};
        localStorage.setItem(LS_TASKS, JSON.stringify(p.tasks || []));
        localStorage.setItem(LS_COMPLETED, JSON.stringify(p.completed || []));
        localStorage.setItem(LS_FEEDBACK, JSON.stringify(p.feedback || {}));
      },
      listBackups: async () => {
        const { data } = await supabase
          .from("backups")
          .select("id,created_at")
          .order("created_at", { ascending: false })
          .limit(20);
        return data || [];
      },
    }),
    [pull, push, signInWith, signOut, readLocal, state]
  );
}
