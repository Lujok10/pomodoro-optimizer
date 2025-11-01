"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Task } from "@/types/task"; // resolves to components/types/task.d.ts
import { Task as BaseTask } from "@/types/task";
// Learning + Planning + Sessions + Interrupts + Calendar
import { generateFocusPlan } from "@/lib/focusEngine";
import { recordFeedback } from "@/lib/learning";
import { logSession, computeStreaks } from "@/lib/sessions";
import { getInterrupts, logInterrupt } from "@/lib/interrupts";
import { createIcsEvent, downloadIcs, openGoogleCalendar } from "@/lib/calendar";
import { FocusPlanSection } from "@/components/FocusPlanSection";

// Small local components
import InterruptCatcher from "./InterruptCatcher";
import InterruptSparkline from "./InterruptSparkline";
import EnergyPicker from "./EnergyPicker";

type Status = "planned" | "active" | "completed";
type UITask = BaseTask & {
  status?: Status;
  isRunning?: boolean;
  remaining?: number;
  timeSpent?: number;
  feedback?: "yes" | "no";
};

type InterruptItem = { reason?: string; timestamp?: number };

export default function PomodoroOptimizer() {
  // ------------------------------
  // STATE
  // ------------------------------
  const [tasks, setTasks] = useState<UITask[]>([]);
  const [focusRatio, setFocusRatio] = useState<number>(0.2);
  const [sleepHours, setSleepHours] = useState<number>(8);
  const [workHours, setWorkHours] = useState<number>(8);
  const [focusPlan, setFocusPlan] = useState<Task[]>([]);
  const [activeTask, setActiveTask] = useState<UITask | null>(null);

  // New: energy + interrupts + streaks
  const [userEnergy, setUserEnergy] = useState<number>(3);
  const [todayInterrupts, setTodayInterrupts] = useState<number>(0);
  const [currentStreak, setCurrentStreak] = useState<number>(0);
  const [bestStreak, setBestStreak] = useState<number>(0);

  // Calendar busy time (minutes) from API
  const [busyMinutes, setBusyMinutes] = useState(0);

  // ------------------------------
  // EFFECTS: load/save energy, init interrupts, init streaks, fetch busy
  // ------------------------------
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const v = localStorage.getItem("pareto_userEnergy");
      if (v != null && v !== "") setUserEnergy(Number(v));
    } catch {}
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem("pareto_userEnergy", String(userEnergy));
    } catch {}
  }, [userEnergy]);

  useEffect(() => {
    try {
      const list = (getInterrupts?.() ?? []) as InterruptItem[];
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      const count = list.filter((i) => Number(i.timestamp ?? 0) >= start).length;
      setTodayInterrupts(count);
    } catch {
      setTodayInterrupts(0);
    }
  }, []);

  useEffect(() => {
    try {
      const s = computeStreaks?.();
      if (s) {
        setCurrentStreak(Number(s.current || 0));
        setBestStreak(Number(s.best || 0));
      }
    } catch {}
  }, []);

  // Fetch Google Calendar busy minutes
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/calendar/busy");
        const data = await res.json();
        setBusyMinutes(Number(data?.busyMinutes ?? 0));
      } catch {
        setBusyMinutes(0);
      }
    })();
  }, []);

  // ------------------------------
  // DERIVED VALUES
  // ------------------------------
  // Baseline available minutes (from sleep/work inputs)
  const baselineAvailableMinutes = useMemo(
    () => Math.max(0, (24 - Number(sleepHours || 0) - Number(workHours || 0)) * 60),
    [sleepHours, workHours]
  );

  // Subtract calendar busy minutes
  const availableMinutes = useMemo(
    () => Math.max(0, baselineAvailableMinutes - busyMinutes),
    [baselineAvailableMinutes, busyMinutes]
  );

  const targetMinutes = useMemo(
    () => Math.max(0, Math.round(availableMinutes * Number(focusRatio || 0))),
    [availableMinutes, focusRatio]
  );

  // ------------------------------
  // HELPERS
  // ------------------------------
  const startTask = (task: UITask) => {
    setActiveTask({ ...task, status: "active", isRunning: true });
    setTasks((prev) =>
      prev.map((t) =>
        t.id === task.id ? { ...t, status: "active", isRunning: true } : t
      )
    );
  };

  const togglePauseResume = () => {
    if (!activeTask) return;
    const running = !activeTask.isRunning;
    setActiveTask({ ...activeTask, isRunning: running });
    setTasks((prev) =>
      prev.map((t) =>
        t.id === activeTask.id ? { ...t, isRunning: running } : t
      )
    );
  };

  const startNext = () => {
    if (!focusPlan.length) return;

    if (!activeTask) {
      const next0 = tasks.find((t) => t.id === focusPlan[0].id) ?? focusPlan[0];
      startTask(next0 as UITask);
      return;
    }

    const idx = focusPlan.findIndex((p) => p.id === activeTask.id);
    if (idx >= 0 && idx + 1 < focusPlan.length) {
      const nextId = focusPlan[idx + 1].id;
      const next = tasks.find((t) => t.id === nextId) ?? focusPlan[idx + 1];
      startTask(next as UITask);
    }
  };

  const skipActive = () => {
    if (!activeTask) return;
    const currentId = activeTask.id;

    setTasks((prev) =>
      prev.map((t) =>
        t.id === currentId ? { ...t, isRunning: false, status: "planned" } : t
      )
    );

    const idx = focusPlan.findIndex((p) => p.id === currentId);
    const next =
      idx >= 0 && idx + 1 < focusPlan.length
        ? tasks.find((t) => t.id === focusPlan[idx + 1].id) ?? focusPlan[idx + 1]
        : undefined;

    setActiveTask(null);
    if (next) startTask(next as UITask);
  };

  // ------------------------------
  // HANDLERS
  // ------------------------------
  const generatePlan = () => {
    const plan = generateFocusPlan(tasks, targetMinutes, {
      userEnergy,
      min: 2,
      max: 5,
    });
    setFocusPlan(plan);
    setTasks((prev) =>
      prev.map((t) =>
        plan.some((p) => p.id === t.id) ? { ...t, status: "planned" } : t
      )
    );
  };

  const completeTask = (task: UITask, feedback: "yes" | "no") => {
    const planned = Math.round(task.duration ?? 0);
    const remaining = Math.max(0, Math.round(task.remaining ?? 0));
    const spentMinutes = Math.max(
      0,
      planned > 0 ? Math.max(0, planned - remaining) : Math.round(task.timeSpent ?? 0)
    );
    const seconds = Math.max(60, Math.round(spentMinutes * 60));

    setTasks((prev) =>
      prev.map((t) =>
        t.id === task.id
          ? {
              ...t,
              status: "completed",
              isRunning: false,
              completed: true,
              feedback,
              timeSpent: (t.timeSpent ?? 0) + spentMinutes,
              remaining: 0,
            }
          : t
      )
    );

    try {
      logSession?.({ id: task.id, project: task.project } as any, seconds);
    } catch {}
    try {
      recordFeedback?.(task.id, task.project, feedback);
    } catch {}
    try {
      const s = computeStreaks?.();
      if (s) {
        setCurrentStreak(Number(s.current || 0));
        setBestStreak(Number(s.best || 0));
      }
    } catch {}

    setActiveTask(null);
  };

  // ------------------------------
  // KEYBOARD SHORTCUTS
  // ------------------------------
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tgt = e.target as HTMLElement | null;
      if (
        e.metaKey ||
        e.ctrlKey ||
        e.altKey ||
        (tgt &&
          (tgt.tagName === "INPUT" ||
            tgt.tagName === "TEXTAREA" ||
            (tgt as any).isContentEditable))
      ) {
        return;
      }

      if ((e.code === "Space" || e.key === " ") && !e.repeat) {
        e.preventDefault();
        togglePauseResume();
        return;
      }

      const key = e.key.toLowerCase();
      if (key === "n") {
        startNext();
      } else if (key === "s") {
        skipActive();
      } else if (key === "g") {
        generatePlan();
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activeTask, focusPlan, tasks]);

  // ------------------------------
  // UI
  // ------------------------------
  return (
    <div className="p-4 pb-24 space-y-6">
      {/* Top bar header with streak badge */}
      <div className="flex items-center justify-between">
        <div className="text-xl font-semibold">Pareto Optimizer</div>
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-800 text-xs font-semibold px-2 py-1">
          <span role="img" aria-label="fire">🔥</span>
          Streak: {currentStreak}
          <span className="opacity-70"> (best {bestStreak})</span>
        </span>
      </div>

      {/* Inputs */}
      <div className="flex flex-wrap gap-4 mb-4">
        <div>
          <label className="block text-sm mb-1">Sleep Hours</label>
          <input
            type="number"
            min={0}
            max={24}
            value={sleepHours}
            onChange={(e) => setSleepHours(Number(e.target.value || 0))}
            className="border p-2 rounded w-24"
          />
        </div>
        <div>
          <label className="block text-sm mb-1">Work Hours</label>
          <input
            type="number"
            min={0}
            max={24}
            value={workHours}
            onChange={(e) => setWorkHours(Number(e.target.value || 0))}
            className="border p-2 rounded w-24"
          />
        </div>
        <div>
          <label className="block text-sm mb-1">Focus %</label>
          <input
            type="number"
            min={0}
            max={1}
            step={0.05}
            value={focusRatio}
            onChange={(e) => setFocusRatio(Number(e.target.value || 0))}
            className="border p-2 rounded w-24"
          />
        </div>
        <div>
          <label className="block text-sm mb-1">Energy</label>
          <EnergyPicker value={userEnergy} onChange={(v: number) => setUserEnergy(v)} />
        </div>
      </div>

      {/* Target Display */}
      <div className="space-y-1">
        <p>
          Baseline Available Minutes: <strong>{baselineAvailableMinutes}</strong>
        </p>
        <p>
          Calendar Busy Minutes: <strong>{busyMinutes}</strong>
        </p>
        <p>
          Available Minutes (minus busy): <strong>{availableMinutes}</strong>
        </p>
        <p>
          Target Focus Minutes ({Math.round(focusRatio * 100)}%):{" "}
          <strong>{targetMinutes}</strong>
        </p>
      </div>

      {/* Plan Button */}
      <button onClick={generatePlan} className="px-4 py-2 bg-blue-600 text-white rounded">
        Create Focus Plan
      </button>

      {/* Suggested Plan (replace your current usage if you render this component) */}
        <FocusPlanSection
          tasks={tasks}
          availableMinutes={availableMinutes}   // ← calendar-adjusted value you already compute
          durationUnit="minutes"
        />


      {/* Suggested Plan */}
      <div>
        <h2 className="text-lg font-bold mt-4">Suggested Plan</h2>
        <ul className="space-y-2">
          {focusPlan.map((task) => (
            <li key={task.id} className="border p-2 rounded flex justify-between items-center">
              <span>
                {task.name} ({Math.max(0, Math.round(task.duration ?? 0))}m) — score {(task.score ?? 0).toFixed(2)}
              </span>
              {task.status === "planned" && (
                <button
                  onClick={() => startTask(task as UITask)}
                  className="px-2 py-1 bg-green-600 text-white rounded"
                >
                  Start
                </button>
              )}
            </li>
          ))}
        </ul>
      </div>

      {/* Active Task */}
      {activeTask && (
        <div className="mt-6 p-4 border rounded bg-gray-50">
          <h2 className="font-bold">Active Task</h2>
          <p className="mt-1">
            {activeTask.name}{" "}
            <span className="text-sm text-gray-600">
              (
              {typeof activeTask.remaining === "number"
                ? Math.max(0, Math.round(activeTask.remaining))
                : Math.max(0, Math.round(activeTask.duration ?? 0))}
              m left)
            </span>
          </p>

          <div className="flex flex-wrap gap-2 mt-3">
            <button
              onClick={togglePauseResume}
              className="px-3 py-1 border rounded"
            >
              {activeTask.isRunning ? "Pause" : "Resume"}
            </button>
            <button
              onClick={skipActive}
              className="px-3 py-1 bg-gray-600 text-white rounded"
            >
              Skip
            </button>
            <button
              onClick={() => completeTask(activeTask, "yes")}
              className="px-3 py-1 bg-blue-600 text-white rounded"
            >
              ✅ Moved the Needle
            </button>
            <button
              onClick={() => completeTask(activeTask, "no")}
              className="px-3 py-1 bg-gray-700 text-white rounded"
            >
              ❌ Not Really
            </button>

            {/* Calendar helpers */}
            <button
              onClick={() => {
                const mins = Math.max(
                  1,
                  Math.round(
                    Number(
                      typeof activeTask.remaining === "number"
                        ? activeTask.remaining
                        : activeTask.duration ?? 25
                    )
                  )
                );
                const now = new Date();
                const title = `Focus: ${activeTask.name}`;
                const ics = createIcsEvent?.(title, now, mins, "Pareto Focus Block");
                if (ics) downloadIcs?.(title, ics);
              }}
              className="px-3 py-1 bg-indigo-600 text-white rounded"
            >
              📅 Add .ics
            </button>
            <button
              onClick={() => {
                const mins = Math.max(
                  1,
                  Math.round(
                    Number(
                      typeof activeTask.remaining === "number"
                        ? activeTask.remaining
                        : activeTask.duration ?? 25
                    )
                  )
                );
                const now = new Date();
                openGoogleCalendar?.(
                  `Focus: ${activeTask.name}`,
                  now,
                  mins,
                  "Pareto Focus Block"
                );
              }}
              className="px-3 py-1 bg-purple-600 text-white rounded"
            >
              🔗 Google Calendar
            </button>
          </div>
        </div>
      )}

      {/* Interrupts */}
      <div className="mt-6 p-4 border rounded bg-gray-50">
        <h2 className="font-bold mb-2">Interrupts Today</h2>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="text-sm mb-1">
              Today: <span className="font-semibold">{todayInterrupts}</span>
            </div>
            <InterruptSparkline refreshKey={todayInterrupts} height={64} />
          </div>
          <InterruptCatcher
            onLog={(i: InterruptItem) => {
              try {
                const note =
                  // @ts-ignore – accept various shapes/fallbacks
                  i?.note ??
                  (typeof (i as any) === "string" ? (i as unknown as string) : undefined) ??
                  // @ts-ignore
                  i?.label ??
                  i?.reason ??
                  undefined;

                logInterrupt(note);
                setTodayInterrupts((c) => c + 1);
              } catch {}
            }}
          />
        </div>
      </div>

      {/* Mobile action bar */}
      <div className="md:hidden">
        {activeTask ? (
          <div className="fixed bottom-0 inset-x-0 border-t bg-white/90 backdrop-blur px-4 py-3 flex gap-3">
            <button
              onClick={togglePauseResume}
              className="flex-1 rounded-lg border px-4 py-2 font-medium"
            >
              {activeTask.isRunning ? "Pause" : "Resume"}
            </button>
            <button
              onClick={skipActive}
              className="flex-1 rounded-lg bg-indigo-600 text-white px-4 py-2 font-medium"
            >
              Skip
            </button>
          </div>
        ) : focusPlan.length > 0 ? (
          <div className="fixed bottom-0 inset-x-0 border-t bg-white/90 backdrop-blur px-4 py-3 flex gap-3">
            <button
              onClick={startNext}
              className="flex-1 rounded-lg bg-indigo-600 text-white px-4 py-2 font-medium"
            >
              Start Next
            </button>
            <button
              onClick={generatePlan}
              className="rounded-lg border px-4 py-2 font-medium"
            >
              Regenerate
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
