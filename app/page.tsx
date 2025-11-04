"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";

import {
  Clock as ClockIcon,
  Star as StarIcon,
  ListChecks as ListIcon,
  Play as PlayIcon,
  RefreshCw as RefreshIcon,
  Pause as PauseIcon,
  PlayCircle,
  Download as DownloadIcon,
  Flame as FlameIcon,
  HelpCircle,
  ChevronRight,
  Settings as SettingsIcon,
} from "lucide-react";

//import ProGate from "@/components/ProGate";
import ProGate from "../components/ProGate";
import InterruptCatcher from "../components/InterruptCatcher";
import { exportAllPomData } from "@/lib/export";
import { useHydratedState } from "@/lib/hooks";
import { rankTask } from "@/lib/learning";
import { appendSessionFromTask, computeStreaks } from "@/lib/sessions";
import { recordFeedback } from "@/lib/learning";
import { ToastProvider, useToast } from "@/components/Toast";
import { ThemeProvider } from "../components/ThemeProvider";
import SettingsDrawer from "@/components/SettingsDrawer";
import ErrorBoundary from "@/components/ErrorBoundary";
import LearningLoopGlanceExternal from "@/components/LearningLoopGlance";
import CloudSyncBar from "@/components/CloudSyncBar";
//import JsonImport from "@/components/JsonImport";
//import AuthGate from "@/components/AuthGate";
import { pushLocalToCloudOnce, pullCloudToLocal, scheduleCloudBackups } from "@/lib/supabase/cloudSync";
import { useSupabaseUser } from "@/lib/supabase/useUser";
import IntegrationsPanel from "@/components/IntegrationsPanel";
import { supabase, HAS_SUPABASE_ENV } from "@/lib/supabase/client";



// charts (client-only)
const Pareto80 = dynamic(() => import("@/components/Pareto80"), { ssr: false });
const TimeVsValue = dynamic(() => import("@/components/TimeVsValue"), { ssr: false });

/** Minimal Task for this page */
type Task = {
  id: number;
  name: string;
  impact: number; // 1–5
  duration: number; // minutes
  project?: string;
};

/** Feedback store */
const FEEDBACK_KEY = "pom_feedback_v1";
type Feedback = "yes" | "no";

/** Plan-tomorrow store */
const PLAN_TMRW_KEY = "pom_plan_tomorrow_v1";

/** Onboarding key */
const FIRST_RUN_KEY = "pom_onboarded_v1";

/** Settings keys + optional beep */
const SOUND_KEY = "focus_sound_enabled";
const AUTONEXT_KEY = "focus_auto_next";
// a tiny data-URI beep; replace with your asset if you prefer
const BEEP_SRC = "data:audio/mp3;base64,//uQZAAAAAAAAAAAAAAAAAAAA..."; // (truncated)

/** YYYY-MM-DD in local time */
function todayStr(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const SAMPLE_TASKS: Task[] = [
  { id: 101, name: "Write project brief", impact: 5, duration: 45, project: "Strategy" },
  { id: 102, name: "Prep client demo", impact: 4, duration: 40, project: "Growth" },
  { id: 103, name: "Inbox zero sweep", impact: 2, duration: 20, project: "Ops" },
  { id: 104, name: "Mentor 1:1 notes", impact: 3, duration: 25, project: "Team" },
  { id: 105, name: "Ship tiny improvement", impact: 4, duration: 30, project: "Product" },
];

const DEFAULT_TASKS: Task[] = [
  { id: 1, name: "Strategic Planning", impact: 5, duration: 60 },
  { id: 2, name: "Client Meeting", impact: 4, duration: 90 },
  { id: 3, name: "Email Management", impact: 2, duration: 30 },
  { id: 4, name: "Team Development", impact: 4, duration: 45 },
];

/** Split out: Provider wraps; inner uses the toast hook */
export default function Page() {
  return (
    <ThemeProvider>
      <ToastProvider>
       
          <PageInner />
        
      </ToastProvider>
    </ThemeProvider>
  );
}


function PageInner() {
  const notify = useToast();
  const { user } = useSupabaseUser();

  /** ---------- Hydration-safe state ---------- */
  const [hours, setHours] = useHydratedState<number>(8, () => {
    const v = localStorage.getItem("pom_hours");
    return v != null ? Number(v) || 0 : 8;
  });

  const [minutes, setMinutes] = useHydratedState<number>(0, () => {
    const v = localStorage.getItem("pom_minutes");
    return v != null ? Number(v) || 0 : 0;
  });

  const [tasks, setTasks] = useHydratedState<Task[]>(DEFAULT_TASKS, () => {
    const raw = localStorage.getItem("pom_tasks");
    return raw ? (JSON.parse(raw) as Task[]) : DEFAULT_TASKS;
  });

  const [streakDays, setStreakDays] = useHydratedState<number>(0, () => {
    try {
      return computeStreaks().current;
    } catch {
      return 0;
    }
  });

  const [userEnergy, setUserEnergy] = useHydratedState<number>(3, () => {
    try {
      const v = localStorage.getItem("pom_energy");
      return v ? Math.max(1, Math.min(5, Number(v))) : 3;
    } catch {
      return 3;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem("pom_energy", String(userEnergy));
    } catch {}
  }, [userEnergy]);

    // Cloud sync on sign-in: push local once, pull canonical, then schedule backups
  useEffect(() => {
    let stop: (() => void) | undefined;

    (async () => {
      if (!user) return;
      // 1) One-shot local → cloud (guarded inside pushLocalToCloudOnce)
      await pushLocalToCloudOnce();
      // 2) Pull authoritative data back to local
      await pullCloudToLocal();
      // 3) Periodic cloud backups of your JSON export (every ~6h inside scheduleCloudBackups)
      stop = scheduleCloudBackups(() => exportAllPomData() || {});
    })();

    return () => { stop?.(); };
  }, [user]);


  const [feedbackMap, setFeedbackMap] = useHydratedState<Record<number, Feedback>>({}, () => {
    try {
      return JSON.parse(localStorage.getItem(FEEDBACK_KEY) || "{}");
    } catch {
      return {};
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(FEEDBACK_KEY, JSON.stringify(feedbackMap));
    } catch {}
  }, [feedbackMap]);

  const [suggestedPlan, setSuggestedPlan] = useState<Task[]>([]);
  const [focusPlan, setFocusPlan] = useState<Task[]>([]);

  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [isRunning, setIsRunning] = useState<boolean>(false);

  const [completedTasks, setCompletedTasks] = useHydratedState<Task[]>([], () => {
    try {
      return JSON.parse(localStorage.getItem("pom_completed_v1") || "[]");
    } catch {
      return [];
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem("pom_completed_v1", JSON.stringify(completedTasks));
    } catch {}
  }, [completedTasks]);

  /** ---------- Derived values ---------- */
  const totalAvailableMinutes = Math.max(0, hours * 60 + minutes);
  const focusTargetMinutes = Math.round(totalAvailableMinutes * 0.2);
  const [targetPct, setTargetPct] = useState<number>(100);
  const targetMinutes = Math.round((focusTargetMinutes * targetPct) / 100);

  /** ---------- Settings ---------- */
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [autoNext, setAutoNext] = useState<boolean>(true);
  const [soundOnEnd, setSoundOnEnd] = useState<boolean>(false);
  useEffect(() => {
    try {
      setAutoNext((localStorage.getItem(AUTONEXT_KEY) ?? "1") === "1");
    } catch {}
    try {
      setSoundOnEnd((localStorage.getItem(SOUND_KEY) ?? "0") === "1");
    } catch {}
  }, []);

  /** ---------- Plan fitting ---------- */
  function fitPlanToTarget(
    all: Task[],
    minutes: number,
    energy: number,
    opts?: { min?: number; max?: number },
  ) {
    const minItems = Math.max(2, Math.min(5, opts?.min ?? 2));
    const maxItems = Math.max(minItems, Math.min(5, opts?.max ?? 5));

    const ranked = [...all]
      .map((t) => {
        const base = rankTask({ id: t.id, duration: t.duration, impact: t.impact });
        const eBoost = Math.max(0.6, Math.min(1.4, 1 + 0.2 * (energy - 3)));
        return { ...t, __rank: base * eBoost };
      })
      .sort((a, b) => b.__rank! - a.__rank!);

    const plan: Task[] = [];
    let used = 0;
    for (const t of ranked) {
      if (plan.length >= maxItems) break;
      if (used + t.duration <= minutes || plan.length === 0) {
        plan.push(t as Task);
        used += t.duration;
      }
    }

    let i = 0;
    while (plan.length < minItems && i < ranked.length) {
      const t = ranked[i++];
      if (!plan.find((p) => p.id === t.id)) plan.push(t as Task);
    }
    return plan.slice(0, maxItems);
  }

  useEffect(() => {
    try {
      localStorage.setItem("pom_tasks", JSON.stringify(tasks));
    } catch {}
  }, [tasks]);
  useEffect(() => {
    try {
      localStorage.setItem("pom_hours", String(hours));
      localStorage.setItem("pom_minutes", String(minutes));
    } catch {}
  }, [hours, minutes]);

  useEffect(() => {
    setSuggestedPlan(fitPlanToTarget(tasks, targetMinutes, userEnergy));
  }, [tasks, targetMinutes, userEnergy]);

  /** ---------- Timer (no drift) ---------- */
  const startedAtRef = useRef<number | null>(null);
  const remainingRef = useRef<number>(0);
  const wakeLockRef = useRef<any>(null);

  useEffect(() => {
    if (activeIndex !== null && focusPlan[activeIndex]) {
      remainingRef.current = timeLeft || focusPlan[activeIndex].duration * 60;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndex, focusPlan]);

  useEffect(() => {
    let intervalId: number | null = null;

    async function requestWakeLock() {
      try {
        if ("wakeLock" in navigator && (navigator as any).wakeLock?.request) {
          wakeLockRef.current = await (navigator as any).wakeLock.request("screen");
        }
      } catch {}
    }
    function releaseWakeLock() {
      try {
        wakeLockRef.current?.release?.();
      } catch {}
      wakeLockRef.current = null;
    }

    function startTicking() {
      startedAtRef.current = performance.now();
      if (remainingRef.current <= 0 && activeIndex !== null && focusPlan[activeIndex]) {
        remainingRef.current = focusPlan[activeIndex].duration * 60;
      }
      intervalId = window.setInterval(() => {
        if (!startedAtRef.current) return;
        const elapsedSec = (performance.now() - startedAtRef.current) / 1000;
        const remain = Math.max(0, Math.ceil(remainingRef.current - elapsedSec));
        setTimeLeft(remain);
        if (remain <= 0) pauseTicking();
      }, 500);
      requestWakeLock();
    }

    function pauseTicking() {
      if (intervalId != null) clearInterval(intervalId);
      intervalId = null;
      if (startedAtRef.current != null) {
        const elapsedSec = (performance.now() - startedAtRef.current) / 1000;
        remainingRef.current = Math.max(0, remainingRef.current - elapsedSec);
      }
      startedAtRef.current = null;
      releaseWakeLock();
    }

    function onVisibility() {
      if (document.hidden && startedAtRef.current != null) {
        const elapsedSec = (performance.now() - startedAtRef.current) / 1000;
        remainingRef.current = Math.max(0, remainingRef.current - elapsedSec);
        startedAtRef.current = performance.now();
      }
    }

    if (isRunning && activeIndex !== null && focusPlan[activeIndex]) {
      startTicking();
      document.addEventListener("visibilitychange", onVisibility);
    } else {
      pauseTicking();
    }

    return () => {
      pauseTicking();
      document.removeEventListener("visibilitychange", onVisibility);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRunning, activeIndex, focusPlan]);

  /** ---------- A11y live area ---------- */
  const [srMessage, setSrMessage] = useState<string>("");

  /** ---------- Feedback loop ---------- */
  const askFeedback = (task: Task): Feedback => {
    const ok = window.confirm(`Did "${task.name}" move the needle?`);
    const answer: Feedback = ok ? "yes" : "no";
    setFeedbackMap((m) => ({ ...m, [task.id]: answer }));
    try {
      recordFeedback?.(task.id, task.project, answer);
      notify("success", "Feedback saved");
    } catch {
      notify("error", "Learning service failed", "Feedback wasn’t recorded. Try again later.");
    }
    setSrMessage(`Feedback recorded: ${answer === "yes" ? "Moved the needle" : "Not really"}.`);
    return answer;
  };

  /** ---------- On block finish ---------- */
  useEffect(() => {
    if (timeLeft <= 0 && isRunning && activeIndex !== null) {
      const finished = focusPlan[activeIndex];
      if (finished) {
        setCompletedTasks((prev) => [finished, ...prev]);

        if (soundOnEnd) {
          try {
            new Audio(BEEP_SRC).play();
          } catch {}
        }

        const fb = askFeedback(finished);
        try {
          appendSessionFromTask(
            { id: finished.id, project: (finished as any).project, duration: finished.duration, name: finished.name },
            fb,
          );
          const { current } = computeStreaks();
          setStreakDays(current);
        } catch {
          notify("error", "Session log failed", "We couldn’t log this block to history.");
        }
      }
      const nextIndex = (activeIndex ?? 0) + 1;
      if (focusPlan[nextIndex]) {
        setActiveIndex(nextIndex);
        setTimeLeft(focusPlan[nextIndex].duration * 60);
        setIsRunning(true);
      } else {
        setActiveIndex(null);
        setIsRunning(false);
        setTimeLeft(0);
      }
    }
  }, [timeLeft, isRunning, activeIndex, focusPlan, setStreakDays, soundOnEnd]);

  /** ---------- Shortcuts ---------- */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea" || (e.target as HTMLElement)?.isContentEditable) return;

      if (e.code === "Space") {
        e.preventDefault();
        setIsRunning((s) => !s);
        return;
      }
      if ((e.key || "").toLowerCase() === "s") {
        e.preventDefault();
        setTimeLeft(0);
        return;
      }
      if ((e.key || "").toLowerCase() === "n") {
        e.preventDefault();
        const nextIndex = (activeIndex ?? -1) + 1;
        if (focusPlan[nextIndex]) {
          setActiveIndex(nextIndex);
          setTimeLeft(focusPlan[nextIndex].duration * 60);
          setIsRunning(true);
        }
        return;
      }
      if ((e.key || "").toLowerCase() === "g") {
        e.preventDefault();
        handleRegenerate();
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activeIndex, focusPlan]);

  /** ---------- Actions ---------- */
  const handleCreateFocusPlan = () => {
    const selected = fitPlanToTarget(tasks, targetMinutes, userEnergy);
    setFocusPlan(selected);
    setSuggestedPlan(selected);
    if (selected.length > 0) {
      setActiveIndex(0);
      setTimeLeft(selected[0].duration * 60);
      setIsRunning(true);
    } else {
      setActiveIndex(null);
      setTimeLeft(0);
      setIsRunning(false);
    }
  };

  const handleRegenerate = () => {
    setIsRunning(false);
    setActiveIndex(null);
    setTimeLeft(0);
    setFocusPlan([]);
    notify("info", "Plan cleared", "Generate a new plan when ready.");
  };

  /** ---------- Save plan tomorrow ---------- */
  function savePlanTomorrow() {
    const plan = fitPlanToTarget(tasks, targetMinutes, userEnergy);
    const payload = {
      date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      targetMinutes,
      taskIds: plan.map((t) => t.id),
    };
    try {
      localStorage.setItem(PLAN_TMRW_KEY, JSON.stringify(payload));
      notify("success", "Plan saved for today", "Load it from the banner next time.");
    } catch {
      notify("error", "Couldn’t save plan", "localStorage failed.");
    }
  }

  /** ---------- Adaptive 20% + load-tomorrow ---------- */
  const [tomorrowPlanReady, setTomorrowPlanReady] = useState<null | { targetMinutes: number; taskIds: number[] }>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(PLAN_TMRW_KEY);
      if (!raw) return;
      const p = JSON.parse(raw);
      if (p?.date === todayStr()) {
        setTomorrowPlanReady({
          targetMinutes: Math.max(0, Number(p.targetMinutes) || 0),
          taskIds: Array.isArray(p.taskIds) ? p.taskIds : [],
        });
      }
    } catch {}
  }, []);

  const resetToBaseTarget = () => {
    setTargetPct(100);
    setSuggestedPlan(fitPlanToTarget(tasks, Math.round(focusTargetMinutes), userEnergy));
  };

  const loadTomorrowPlan = () => {
    if (!tomorrowPlanReady) return;

    const chosen = tomorrowPlanReady.taskIds
      .map((id: number) => tasks.find((t) => t.id === id))
      .filter(Boolean) as Task[];

    const finalPlan = chosen.length > 0 ? chosen : fitPlanToTarget(tasks, tomorrowPlanReady.targetMinutes, userEnergy);

    const pct =
      focusTargetMinutes > 0
        ? Math.max(50, Math.min(150, Math.round((tomorrowPlanReady.targetMinutes / focusTargetMinutes) * 100)))
        : 100;
    setTargetPct(pct);

    setSuggestedPlan(finalPlan);
    setFocusPlan(finalPlan);
    if (finalPlan.length > 0) {
      setActiveIndex(0);
      setTimeLeft(finalPlan[0].duration * 60);
      setIsRunning(true);
    } else {
      setActiveIndex(null);
      setTimeLeft(0);
      setIsRunning(false);
    }

    setTomorrowPlanReady(null);
    try {
      localStorage.removeItem(PLAN_TMRW_KEY);
    } catch {}
  };

  const dismissTomorrowPlan = () => setTomorrowPlanReady(null);

  /** ---------- Task add/edit ---------- */
  const [newName, setNewName] = useState("");
  const [newImpact, setNewImpact] = useState<number>(3);
  const [newDuration, setNewDuration] = useState<number>(30);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editImpact, setEditImpact] = useState<number>(3);
  const [editDuration, setEditDuration] = useState<number>(30);

  const handleAddTask = () => {
    if (!newName.trim()) return;
    const id = Date.now();
    const t: Task = {
      id,
      name: newName.trim(),
      impact: Math.max(1, Math.min(5, newImpact)),
      duration: Math.max(1, Math.round(newDuration)),
    };
    setTasks((prev) => [...prev, t]);
    setNewName("");
    setNewImpact(3);
    setNewDuration(30);
    notify("success", "Task added");
  };

  const startEditTask = (t: Task) => {
    setEditingId(t.id);
    setEditName(t.name);
    setEditImpact(t.impact);
    setEditDuration(t.duration);
  };
  const cancelEditTask = () => {
    setEditingId(null);
  };
  const handleUpdateTask = () => {
    if (editingId == null) return;
    const name = editName.trim();
    if (!name) return;
    setTasks((prev) =>
      prev.map((t) => (t.id === editingId ? { ...t, name, impact: Math.max(1, Math.min(5, editImpact)), duration: Math.max(1, Math.round(editDuration)) } : t)),
    );
    setEditingId(null);
    notify("success", "Task updated");
  };

  const handleDeleteTask = (id: number) => {
    const wasActive = activeIndex !== null && focusPlan[activeIndex] && focusPlan[activeIndex].id === id;

    setTasks((prev) => prev.filter((t) => t.id !== id));
    setSuggestedPlan((prev) => prev.filter((t) => t.id !== id));
    setFocusPlan((prev) => {
      const next = prev.filter((t) => t.id !== id);

      if (!next.length) {
        setActiveIndex(null);
        setIsRunning(false);
        setTimeLeft(0);
        return next;
      }

      if (wasActive) {
        const nextIdx = Math.min(activeIndex!, next.length - 1);
        setActiveIndex(nextIdx);
        setTimeLeft(next[nextIdx].duration * 60);
        setIsRunning(false);
      } else if (activeIndex !== null) {
        const deletedIdx = prev.findIndex((t) => t.id === id);
        if (deletedIdx !== -1 && deletedIdx < activeIndex!) setActiveIndex((i) => (i ? Math.max(0, i - 1) : 0));
      }
      return next;
    });

    setCompletedTasks((prev) => prev.filter((t) => t.id !== id));
    setFeedbackMap((m) => {
      const { [id]: _, ...rest } = m;
      return rest;
    });
    if (editingId === id) setEditingId(null);

    notify("info", "Task deleted");
  };

  /** ---------- Onboarding & tooltip ---------- */
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showTwentyHelp, setShowTwentyHelp] = useState(false);

  useEffect(() => {
    try {
      const seen = localStorage.getItem(FIRST_RUN_KEY);
      if (!seen) setShowOnboarding(true);
    } catch {
      setShowOnboarding(true);
    }
  }, []);

  const seedSampleTasks = () => {
    const stamped = SAMPLE_TASKS.map((t) => ({ ...t, id: Date.now() + Math.floor(Math.random() * 100000) }));
    setTasks(stamped);
    notify("success", "Sample tasks added", "You can edit or delete them anytime.");
  };

  const completeOnboarding = () => {
    try {
      localStorage.setItem(FIRST_RUN_KEY, "1");
    } catch {}
    setShowOnboarding(false);
    if ((tasks?.length ?? 0) === 0) seedSampleTasks();
    notify("info", "Tip: Space = pause/resume · N = next · S = skip · G = regenerate");
  };


  // ⬇️ Import dialog visibility
const [importOpen, setImportOpen] = useState(false);

// helper: write a payload to localStorage keys + raise React state
const applyBackupToLocal = (payload: any) => {
  // Accept two shapes:
  //  A) { tasks, completed, feedbackMap, hours, minutes, energy, planTomorrow }
  //  B) raw LS-style keys { pom_tasks, pom_completed_v1, pom_feedback_v1, ... }
  const tasksPayload =
    payload?.tasks ?? payload?.pom_tasks ?? [];
  const completedPayload =
    payload?.completed ?? payload?.pom_completed_v1 ?? [];
  const feedbackPayload =
    payload?.feedbackMap ?? payload?.pom_feedback_v1 ?? {};
  const hoursPayload =
    payload?.hours ?? Number(payload?.pom_hours ?? hours ?? 8);
  const minutesPayload =
    payload?.minutes ?? Number(payload?.pom_minutes ?? minutes ?? 0);
  const energyPayload =
    payload?.energy ?? Number(payload?.pom_energy ?? userEnergy ?? 3);
  const planTomorrowPayload =
    payload?.planTomorrow ?? payload?.pom_plan_tomorrow_v1 ?? null;

  try { localStorage.setItem("pom_tasks", JSON.stringify(tasksPayload)); } catch {}
  try { localStorage.setItem("pom_completed_v1", JSON.stringify(completedPayload)); } catch {}
  try { localStorage.setItem("pom_feedback_v1", JSON.stringify(feedbackPayload)); } catch {}
  try { localStorage.setItem("pom_hours", String(hoursPayload)); } catch {}
  try { localStorage.setItem("pom_minutes", String(minutesPayload)); } catch {}
  try { localStorage.setItem("pom_energy", String(energyPayload)); } catch {}
  if (planTomorrowPayload) {
    try { localStorage.setItem("pom_plan_tomorrow_v1", JSON.stringify(planTomorrowPayload)); } catch {}
  }

  // Update in-memory state so UI reflects import immediately
  setTasks(Array.isArray(tasksPayload) ? tasksPayload : []);
  setCompletedTasks(Array.isArray(completedPayload) ? completedPayload : []);
  setFeedbackMap(typeof feedbackPayload === "object" && feedbackPayload ? feedbackPayload : {});
  setHours(Math.max(0, Math.min(24, Number(hoursPayload) || 0)));
  setMinutes(Math.max(0, Math.min(59, Number(minutesPayload) || 0)));
  setUserEnergy(Math.max(1, Math.min(5, Number(energyPayload) || 3)));

  // Recompute suggested plan based on new state (optional)
  setSuggestedPlan(fitPlanToTarget(
    Array.isArray(tasksPayload) ? tasksPayload : [],
    Math.round((Math.max(0, hoursPayload * 60 + minutesPayload) * 0.2) * (targetPct / 100)),
    Math.max(1, Math.min(5, Number(energyPayload) || 3))
  ));
};

// main handler for file input
const handleImportJsonFile = async (file: File) => {
  try {
    const text = await file.text();
    const json = JSON.parse(text);

    // 1) Save JSON into backups (if logged in and env present)
    // 1) Save JSON into backups (if logged in and env present)
if (HAS_SUPABASE_ENV && supabase && user) {
  try {
    await supabase.from("backups").insert({
      user_id: user.id,
      payload: json,
    });
  } catch (e) {
    console.warn("[Import] backup insert failed:", e);
  }
}

    // 2) Apply to local + state
    applyBackupToLocal(json);

    notify("success", "Import complete", "Local data refreshed.");
    setImportOpen(false);
  } catch (e: any) {
    console.error(e);
    notify("error", "Import failed", e?.message || "Bad JSON file.");
  }
};


  /** ---------- Helpers ---------- */
  const formatTime = (secs: number) => {
    if (secs <= 0) return "00:00";
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${String(s).padStart(2, "0")}`;
  };

  const ProgressRing = ({ percent }: { percent: number }) => {
    const r = 16;
    const c = 2 * Math.PI * r;
    const dash = Math.max(0, Math.min(100, percent));
    return (
      <svg width="40" height="40" viewBox="0 0 40 40" aria-hidden>
        <circle cx="20" cy="20" r={r} stroke="#1f2937" className="opacity-10" strokeWidth="6" fill="none" />
        <circle cx="20" cy="20" r={r} stroke="#6366f1" strokeWidth="6" fill="none" strokeLinecap="round" strokeDasharray={`${(dash / 100) * c} ${c}`} transform="rotate(-90 20 20)" />
      </svg>
    );
  };

  const Gauge = ({ percent }: { percent: number }) => {
    const p = Math.max(0, Math.min(100, percent));
    const r = 36;
    const c = 2 * Math.PI * r;
    const dash = (p / 100) * c;
    return (
      <svg viewBox="0 0 100 60" className="w-48 h-auto" aria-label={`Effectiveness ${Math.round(p)} percent`}>
        <path d="M10,60 A40,40 0 0,1 90,60" fill="none" stroke="#E5E7EB" strokeWidth="8" />
        <path d="M10,60 A40,40 0 0,1 90,60" fill="none" stroke="#6366f1" strokeWidth="8" strokeLinecap="round" strokeDasharray={`${dash} ${c}`} />
        <text x="50" y="55" textAnchor="middle" className="fill-indigo-600 dark:fill-indigo-400" style={{ fontSize: 12, fontWeight: 700 }}>
          {Math.round(p)}%
        </text>
      </svg>
    );
  };

  const activeProgress = () => {
    if (activeIndex === null || !focusPlan[activeIndex]) return 0;
    const durationSeconds = focusPlan[activeIndex].duration * 60;
    const elapsed = durationSeconds - Math.max(0, timeLeft);
    return Math.round((elapsed / durationSeconds) * 100);
  };

  const handleExport = () => {
    const href = exportAllPomData();
    if (!href) {
      notify("error", "Export failed", "No data available to export.");
      return;
    }
    const a = document.createElement("a");
    a.href = href;
    a.download = `optimapp-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(href), 2000);
    notify("success", "Export started");
  };

  /** ---------- Insight metrics ---------- */
  const effectiveCount = completedTasks.reduce((acc, t) => acc + (feedbackMap[t.id] === "yes" ? 1 : 0), 0);
  const focusEfficiency = completedTasks.length ? Math.round((effectiveCount / completedTasks.length) * 100) : 0;

  const inputsMin = completedTasks.reduce((acc, t) => acc + t.duration, 0);
  const outputsTasks = completedTasks.length;
  const efficiencyRatePerHour = inputsMin > 0 ? (outputsTasks * 60) / inputsMin : 0;
  const efficiencyNorm = Math.max(0, Math.min(1, efficiencyRatePerHour / 1));
  const outcomesAchieved = completedTasks.filter((t) => feedbackMap[t.id] === "yes").length;
  const outcomesPossible = Math.max(1, completedTasks.length);
  const impactRatio = outcomesAchieved / outcomesPossible;
  const effectiveness = Math.round(efficiencyNorm * impactRatio * 100);

  /** ---------- UI ---------- */
  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,rgba(99,102,241,.08),transparent_60%)] dark:bg-[radial-gradient(ellipse_at_top,rgba(99,102,241,.12),transparent_60%)] text-gray-900 dark:text-gray-100">
      {/* SR-only live announcer */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {srMessage}
      </div>

      {/* Onboarding */}
      {showOnboarding && <OnboardingModal onClose={completeOnboarding} onSeed={() => { seedSampleTasks(); completeOnboarding(); }} />}

      {/* Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[260px,1fr]">
        {/* Sidebar */}
        <aside className="lg:min-h-screen border-b lg:border-b-0 lg:border-r bg-white/70 dark:bg-neutral-900/60 backdrop-blur supports-[backdrop-filter]:bg-white/40 dark:supports-[backdrop-filter]:bg-neutral-900/40">
          <div className="p-4 flex items-center gap-3 border-b dark:border-neutral-800">
            <div className="h-9 w-9 rounded-xl bg-indigo-600 text-white grid place-items-center shadow-sm">
              <PlayIcon className="w-4 h-4" />
            </div>
            <div>
              <div className="text-sm font-semibold">80/20 Focus</div>
              <div className="text-[11px] text-gray-500 dark:text-gray-400 -mt-0.5">Plan · Focus · Learn</div>
            </div>
          </div>

          <nav className="p-3 space-y-1 text-sm">
            <SidebarLink href="#time" icon={<ClockIcon className="w-4 h-4" />}>
              Available Time
            </SidebarLink>
            <SidebarLink href="#tasks" icon={<StarIcon className="w-4 h-4" />}>
              Tasks
            </SidebarLink>
            <SidebarLink href="#plan" icon={<ListIcon className="w-4 h-4" />}>
              Focus Plan
            </SidebarLink>
            <SidebarLink href="#timer" icon={<PlayCircle className="w-4 h-4" />}>
              Timer
            </SidebarLink>
            <SidebarLink href="#effectiveness" icon={<FlameIcon className="w-4 h-4" />}>
              Effectiveness
            </SidebarLink>

            <div className="pt-3 mt-3 border-t dark:border-neutral-800 space-y-2">
              <div className="flex items-center justify-between gap-2">
                  <Link href="/resources" className="inline-flex items-center gap-2 hover:text-indigo-600">
                    <ChevronRight className="w-3.5 h-3.5" /> Resources
                  </Link>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setImportOpen(true)}
                      className="rounded-md border px-2 py-1 text-xs hover:bg-gray-50 dark:hover:bg-neutral-800"
                      title="Import JSON"
                      aria-label="Import data from JSON"
                    >
                      Import
                    </button>
                    <button
                      onClick={handleExport}
                      className="rounded-md border px-2 py-1 text-xs hover:bg-gray-50 dark:hover:bg-neutral-800"
                      title="Export JSON"
                      aria-label="Export data as JSON"
                    >
                      Export
                    </button>
                  </div>
                </div>


              <button
                onClick={() => setSettingsOpen(true)}
                className="w-full inline-flex items-center justify-center gap-2 rounded-md border px-2.5 py-1.5 text-xs hover:bg-gray-50 dark:hover:bg-neutral-800"
                aria-label="Open settings"
              >
                <SettingsIcon className="w-3.5 h-3.5" /> Settings
              </button>

              <div className="flex items-center justify-between">
                <div className="text-xs text-gray-500">Streak</div>
                <StreakBadge streakDays={streakDays} />
              </div>
            </div>
          </nav>
        </aside>

        {/* Main */}
        <main className="px-4 md:px-6 py-4 md:py-6">
        
          {typeof window !== "undefined" && new URLSearchParams(window.location.search).get("connected") === "trello" && (
            <div className="mb-3 rounded border border-green-200 bg-green-50 text-green-800 px-3 py-2 text-sm">
              Trello connected successfully.
            </div>
          )}


          {/* Adaptive 20% bar */}
          {(tomorrowPlanReady || targetPct !== 100) && (
            <div className="mb-5 rounded-xl border dark:border-neutral-800 bg-white/70 dark:bg-neutral-900/60 backdrop-blur p-4 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div className="text-sm relative">
                <div className="flex items-center gap-2">
                  <div className="font-medium text-indigo-700 dark:text-indigo-400">Adaptive 20% Target</div>
                  <button
                    type="button"
                    onClick={() => setShowTwentyHelp((v) => !v)}
                    className="inline-flex items-center text-indigo-600 dark:text-indigo-400 hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded"
                    aria-label="How the 20 percent target works"
                    title="How the 20% works"
                  >
                    <HelpCircle className="w-4 h-4" />
                  </button>
                </div>

                {showTwentyHelp && (
                  <div
                    role="dialog"
                    aria-label="How the 20% works"
                    className="absolute z-20 mt-2 w-80 rounded-lg border dark:border-neutral-700 bg-white dark:bg-neutral-900 p-3 text-xs shadow"
                  >
                    <div className="font-semibold text-indigo-700 dark:text-indigo-400 mb-1">What is the 20%?</div>
                    <p>
                      We suggest focusing about <strong>20% of your day</strong> on your highest-impact tasks. Use the slider to nudge it up/down. Press{" "}
                      <kbd>G</kbd> anytime to regenerate a fresh plan.
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <button className="rounded border px-2 py-1 text-xs" onClick={() => setTargetPct(100)}>
                        Reset to 20%
                      </button>
                      <button className="rounded bg-indigo-600 text-white px-2 py-1 text-xs" onClick={() => setShowTwentyHelp(false)}>
                        Got it
                      </button>
                    </div>
                  </div>
                )}

                <div className="mt-0.5 text-gray-700 dark:text-gray-300">
                  Base 20%: <span className="font-semibold">{Math.floor(focusTargetMinutes / 60)}h {focusTargetMinutes % 60}m</span>
                  {" · "}With slider (<span className="font-semibold">{targetPct}%</span>):{" "}
                  <span className="font-semibold">{Math.floor(targetMinutes / 60)}h {targetMinutes % 60}m</span>
                </div>

                {targetPct !== 100 && (
                  <button
                    onClick={resetToBaseTarget}
                    className="mt-2 border rounded px-2.5 py-1 text-xs hover:bg-gray-50 dark:hover:bg-neutral-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                    aria-label="Reset to base 20 percent"
                  >
                    Reset to base 20%
                  </button>
                )}
              </div>

              {tomorrowPlanReady && (
                <div className="flex items-center gap-2">
                  <div className="text-xs md:text-sm">
                    Plan saved for today ·{" "}
                    <span className="font-semibold">
                      {Math.floor(tomorrowPlanReady.targetMinutes / 60)}h {tomorrowPlanReady.targetMinutes % 60}m
                    </span>
                  </div>
                  <button
                    onClick={loadTomorrowPlan}
                    className="rounded bg-indigo-600 text-white px-3 py-1.5 text-xs md:text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                    aria-label="Load saved plan"
                  >
                    Load now
                  </button>
                  <button
                    onClick={dismissTomorrowPlan}
                    className="rounded border px-3 py-1.5 text-xs md:text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                    aria-label="Dismiss saved plan"
                  >
                    Dismiss
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Cloud sync & backups */}
            <CloudSyncBar />

          {/* Integrations */}
          <IntegrationsPanel />

          {/* Sections */}
          <div id="time" className="grid gap-6 xl:grid-cols-3">
            {/* Available time */}
            <section className="xl:col-span-1 rounded-xl border dark:border-neutral-800 bg-white/70 dark:bg-neutral-900/60 backdrop-blur p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-400">
                  <ClockIcon className="h-5 w-5" />
                  <h2 className="text-base font-semibold">Available Time</h2>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs block mb-1" htmlFor="hours">
                    Hours
                  </label>
                  <input
                    id="hours"
                    type="number"
                    min={0}
                    max={24}
                    value={hours}
                    onChange={(e) => setHours(Math.max(0, Math.min(24, Number(e.target.value) || 0)))}
                    className="w-full border dark:border-neutral-700 bg-white dark:bg-neutral-900 rounded px-2.5 py-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-xs block mb-1" htmlFor="minutes">
                    Minutes
                  </label>
                  <input
                    id="minutes"
                    type="number"
                    min={0}
                    max={59}
                    value={minutes}
                    onChange={(e) => setMinutes(Math.max(0, Math.min(59, Number(e.target.value) || 0)))}
                    className="w-full border dark:border-neutral-700 bg-white dark:bg-neutral-900 rounded px-2.5 py-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="mt-3">
                <label className="text-xs block mb-1" htmlFor="energy">
                  Energy: <span className="font-medium">{userEnergy}</span>{" "}
                  <span className="text-[11px] text-gray-500">(1 low – 5 high)</span>
                </label>
                <input
                  id="energy"
                  type="range"
                  min={1}
                  max={5}
                  step={1}
                  value={userEnergy}
                  onChange={(e) => setUserEnergy(Number(e.target.value))}
                  className="w-full accent-indigo-600"
                />
              </div>

              <div className="mt-3 rounded-lg bg-indigo-50/70 dark:bg-indigo-950/30 p-3 border border-indigo-100 dark:border-indigo-900/40">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Base 20%:</span>
                  <span className="text-sm font-bold text-indigo-700 dark:text-indigo-300">
                    {Math.floor(focusTargetMinutes / 60)}h {focusTargetMinutes % 60}m
                  </span>
                </div>
              </div>

              <div className="mt-3">
                <label className="text-xs block mb-1" htmlFor="targetPct">
                  Adjust Target ({targetPct}% of base) →{" "}
                  <span className="font-semibold">
                    {Math.floor(targetMinutes / 60)}h {targetMinutes % 60}m
                  </span>
                </label>
                <input
                  id="targetPct"
                  type="range"
                  min={50}
                  max={150}
                  step={5}
                  value={targetPct}
                  onChange={(e) => setTargetPct(Number(e.target.value))}
                  className="w-full accent-indigo-600"
                />
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={() => setSuggestedPlan(fitPlanToTarget(tasks, targetMinutes, userEnergy))}
                    className="border dark:border-neutral-700 rounded px-3 py-1 text-xs hover:bg-gray-50 dark:hover:bg-neutral-800"
                  >
                    Re-fit Plan
                  </button>
                  {tasks.length === 0 && (
                    <button
                      onClick={seedSampleTasks}
                      className="border dark:border-neutral-700 rounded px-3 py-1 text-xs hover:bg-gray-50 dark:hover:bg-neutral-800"
                    >
                      Sample tasks
                    </button>
                  )}
                </div>
              </div>
            </section>

            {/* Tasks */}
            <section id="tasks" className="xl:col-span-2 rounded-xl border dark:border-neutral-800 bg-white/70 dark:bg-neutral-900/60 backdrop-blur p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-400">
                  <StarIcon className="h-5 w-5" />
                  <h2 className="text-base font-semibold">Tasks</h2>
                </div>
              </div>

              <div className="space-y-3">
                <label className="sr-only" htmlFor="newTask">
                  What needs to be done?
                </label>
                <input
                  id="newTask"
                  placeholder="What needs to be done?"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full border dark:border-neutral-700 bg-white dark:bg-neutral-900 rounded px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                />

                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <span className="block text-xs mb-1">Impact (1–5)</span>
                    <div className="flex items-center gap-2" role="radiogroup" aria-label="Impact 1 to 5">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <label key={i} className="flex items-center gap-1 text-sm">
                          <input type="radio" checked={newImpact === i} onChange={() => setNewImpact(i)} aria-label={`Impact ${i}`} />
                          <span className="ml-1">{i}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs mb-1" htmlFor="duration">
                      Duration (minutes)
                    </label>
                    <input
                      id="duration"
                      type="number"
                      min={5}
                      max={480}
                      value={newDuration}
                      onChange={(e) => setNewDuration(Number(e.target.value) || 30)}
                      className="w-full border dark:border-neutral-700 bg-white dark:bg-neutral-900 rounded px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                      aria-label="Task duration in minutes"
                    />
                  </div>
                </div>

                <button
                  onClick={handleAddTask}
                  className="w-full bg-indigo-600 text-white rounded py-2 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                  aria-label="Add task"
                >
                  Add Task
                </button>

                {tasks.length === 0 ? (
                  <div className="mt-2 rounded border dark:border-neutral-700 p-3 text-sm text-gray-600 dark:text-gray-300 bg-gray-50/60 dark:bg-neutral-800/40">
                    No tasks yet. Try “Sample tasks” above, or create 3–5 items with impact & duration.
                  </div>
                ) : (
                  <div className="mt-2">
                    <h3 className="font-medium mb-2 text-sm">Current Tasks</h3>
                    <div className="space-y-3 max-h-72 overflow-y-auto pr-2">
                      {tasks.map((t) => {
                        const isEditing = editingId === t.id;
                        return (
                          <div key={t.id} className="rounded border dark:border-neutral-700 p-3 bg-white dark:bg-neutral-900">
                            {isEditing ? (
                              <div className="space-y-2">
                                <input
                                  className="w-full border dark:border-neutral-700 bg-white dark:bg-neutral-900 rounded px-3 py-2"
                                  value={editName}
                                  onChange={(e) => setEditName(e.target.value)}
                                  aria-label="Edit task name"
                                />
                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <span className="block text-xs mb-1">Impact (1–5)</span>
                                    <div className="flex items-center gap-2" role="radiogroup" aria-label="Edit impact">
                                      {[1, 2, 3, 4, 5].map((i) => (
                                        <label key={i} className="flex items-center gap-1 text-sm">
                                          <input type="radio" checked={editImpact === i} onChange={() => setEditImpact(i)} aria-label={`Impact ${i}`} />
                                          <span className="ml-1">{i}</span>
                                        </label>
                                      ))}
                                    </div>
                                  </div>
                                  <div>
                                    <label className="block text-xs mb-1" htmlFor={`edit-duration-${t.id}`}>
                                      Duration (minutes)
                                    </label>
                                    <input
                                      id={`edit-duration-${t.id}`}
                                      type="number"
                                      min={5}
                                      max={480}
                                      value={editDuration}
                                      onChange={(e) => setEditDuration(Number(e.target.value) || 30)}
                                      className="w-full border dark:border-neutral-700 bg-white dark:bg-neutral-900 rounded px-3 py-2"
                                    />
                                  </div>
                                </div>
                                <div className="flex gap-2">
                                  <button onClick={handleUpdateTask} className="rounded bg-indigo-600 text-white px-3 py-1.5 text-xs">
                                    Save
                                  </button>
                                  <button onClick={cancelEditTask} className="rounded border dark:border-neutral-700 px-3 py-1.5 text-xs">
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center justify-between gap-3">
                                <div>
                                  <div className="font-medium text-sm">{t.name}</div>
                                  <div className="text-xs text-gray-600 dark:text-gray-300">Impact: {t.impact}/5 · {t.duration} min</div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <div className="text-xs bg-gray-100 dark:bg-neutral-800 px-2.5 py-1 rounded-full">
                                    {(t.impact / Math.max(1, t.duration)).toFixed(2)} impact/min
                                  </div>
                                  <button onClick={() => startEditTask(t)} className="border dark:border-neutral-700 rounded px-2.5 py-1 text-xs" aria-label={`Edit ${t.name}`}>
                                    Edit
                                  </button>
                                  <button onClick={() => handleDeleteTask(t.id)} className="border dark:border-neutral-700 rounded px-2.5 py-1 text-xs" aria-label={`Delete ${t.name}`}>
                                    Delete
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </section>
          </div>

          {/* Plan + Timer */}
          <div id="plan" className="grid gap-6 lg:grid-cols-2 mt-6">
            {/* Plan */}
            <section className="rounded-xl border dark:border-neutral-800 bg-white/70 dark:bg-neutral-900/60 backdrop-blur p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-400">
                  <ListIcon className="h-5 w-5" />
                  <h2 className="text-base font-semibold">Focus Plan</h2>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={handleRegenerate} className="border dark:border-neutral-700 rounded px-3 py-1 text-xs flex items-center gap-2" aria-label="Regenerate plan">
                    <RefreshIcon className="h-4 w-4" /> Regenerate
                  </button>
                  <button onClick={savePlanTomorrow} className="border dark:border-neutral-700 rounded px-3 py-1 text-xs" aria-label="Save plan for tomorrow">
                    Plan Tomorrow
                  </button>
                </div>
              </div>

              {suggestedPlan.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="text-gray-500 dark:text-gray-300 text-sm">No plan yet. Add tasks, set your 20%, then generate.</p>
                  <button onClick={handleCreateFocusPlan} className="mt-3 bg-indigo-600 text-white rounded px-4 py-2 text-sm" aria-label="Create focus plan">
                    Create Focus Plan
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {suggestedPlan.map((t) => {
                    const isActive = activeIndex !== null && focusPlan[activeIndex] && focusPlan[activeIndex].id === t.id;
                    const percent = isActive ? activeProgress() : 0;
                    const isInPlan = !!focusPlan.find((fp) => fp.id === t.id);

                    return (
                      <div key={t.id} className={`rounded border dark:border-neutral-700 p-3 ${isInPlan ? "bg-indigo-50/50 dark:bg-indigo-950/20" : "bg-white dark:bg-neutral-900"} flex items-center justify-between`}>
                        <div className="flex items-center gap-3">
                          <div>{isActive ? <ProgressRing percent={percent} /> : <div className="w-10 h-10" aria-hidden />}</div>
                          <div>
                            <div className="font-medium text-sm">{t.name}</div>
                            <div className="text-xs text-gray-600 dark:text-gray-300">Impact: {t.impact} · {t.duration} min</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {isInPlan ? (
                            focusPlan[activeIndex ?? -1]?.id === t.id ? (
                              <button
                                onClick={() => setIsRunning((s) => !s)}
                                className="border dark:border-neutral-700 rounded px-3 py-1 text-xs flex items-center gap-2"
                                aria-label={isRunning ? "Pause current task" : "Resume current task"}
                              >
                                {isRunning ? <PauseIcon className="w-4 h-4" /> : <PlayIcon className="w-4 h-4" />} {isRunning ? "Pause" : "Resume"}
                              </button>
                            ) : (
                              <div className="text-[11px] text-gray-500 dark:text-gray-400 px-2 py-1 rounded" aria-label="Planned task">
                                Planned
                              </div>
                            )
                          ) : (
                            <button
                              onClick={() => {
                                setFocusPlan([t]);
                                setActiveIndex(0);
                                setTimeLeft(t.duration * 60);
                                setIsRunning(true);
                              }}
                              className="border dark:border-neutral-700 rounded px-3 py-1 text-xs"
                              aria-label={`Start task ${t.name}`}
                            >
                              Start
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Timer */}
            <section id="timer" className="rounded-xl border dark:border-neutral-800 bg-white/70 dark:bg-neutral-900/60 backdrop-blur p-4 shadow-sm">
              <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-400 mb-3">
                <PlayCircle className="h-5 w-5" />
                <h2 className="text-base font-semibold">Focus Timer</h2>
              </div>

              <div className="text-center py-6">
                {activeIndex !== null && focusPlan[activeIndex] ? (
                  <>
                    <div
                      className="mx-auto mb-4 w-40 h-40 rounded-full flex items-center justify-center bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-100/70 dark:border-indigo-900/50"
                      role="timer"
                      aria-live="polite"
                      aria-atomic="true"
                      aria-label={`Time left ${formatTime(timeLeft)}`}
                    >
                      <div className="text-3xl font-bold text-indigo-700 dark:text-indigo-300">{formatTime(timeLeft)}</div>
                    </div>
                    <div className="text-sm mb-4">{focusPlan[activeIndex].name}</div>
                    <div className="flex justify-center gap-2">
                      <button onClick={() => setIsRunning((s) => !s)} className="border dark:border-neutral-700 rounded px-3 py-1.5 text-sm" aria-label={isRunning ? "Pause timer" : "Resume timer"}>
                        {isRunning ? "Pause" : "Resume"}
                      </button>
                      <button onClick={() => setTimeLeft(0)} className="border dark:border-neutral-700 rounded px-3 py-1.5 text-sm" aria-label="Skip current block">
                        Skip
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="py-6 text-center">
                    <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-indigo-100/70 dark:bg-indigo-900/40">
                      <ClockIcon className="h-8 w-8 text-indigo-600 dark:text-indigo-300" aria-hidden />
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-300">Start a focus block to begin your timer</p>
                    {suggestedPlan.length > 0 && (
                      <button
                        className="mt-3 border dark:border-neutral-700 rounded px-3 py-1.5 text-sm"
                        onClick={() => {
                          setFocusPlan(suggestedPlan);
                          setActiveIndex(0);
                          setTimeLeft(suggestedPlan[0].duration * 60);
                          setIsRunning(true);
                        }}
                      >
                        Start first block
                      </button>
                    )}
                  </div>
                )}
              </div>
            </section>
          </div>

          {/* Effectiveness */}
          <section id="effectiveness" className="rounded-xl border dark:border-neutral-800 bg-white/70 dark:bg-neutral-900/60 backdrop-blur p-4 shadow-sm mt-6">
            <h2 className="text-base font-semibold text-indigo-700 dark:text-indigo-400 mb-3">Effectiveness</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-center justify-center">
                <Gauge percent={effectiveness} />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <Tile label="Efficiency (tasks/hr)" value={efficiencyRatePerHour.toFixed(2)} />
                <Tile label="Impact (achieved/possible)" value={`${Math.round(impactRatio * 100)}%`} />
                <Tile label="Effectiveness" value={`${effectiveness}%`} />
              </div>
            </div>

            {/* Charts */}
            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="border dark:border-neutral-800 rounded-lg p-3" role="group" aria-label="Pareto 80 20 chart">
                <div className="text-sm font-medium mb-2">Pareto (80/20)</div>
                <ErrorBoundary
                  onError={(e) => notify("error", "Pareto chart failed", String(e instanceof Error ? e.message : e))}
                  fallback={<div className="text-xs text-red-500">Couldn’t render chart.</div>}
                >
                  <Pareto80 />
                </ErrorBoundary>
              </div>

              <div className="border dark:border-neutral-800 rounded-lg p-3">
                <div className="text-sm font-medium mb-2">Flow</div>
                <div className="h-32 flex items-center justify-center text-xs text-gray-600 dark:text-gray-300" aria-hidden>
                  Inputs → Efficiency × Impact → Effectiveness
                </div>
              </div>

              <div className="border dark:border-neutral-800 rounded-lg p-3" role="group" aria-label="Time versus value chart">
                <div className="text-sm font-medium mb-2">Time vs Value</div>
                <ErrorBoundary
                  onError={(e) => notify("error", "Time vs Value failed", String(e instanceof Error ? e.message : e))}
                  fallback={<div className="text-xs text-red-500">Couldn’t render chart.</div>}
                >
                  <TimeVsValue tasks={tasks} />
                </ErrorBoundary>
              </div>
            </div>

            {/* Insights */}
            <div className="rounded-xl border dark:border-neutral-800 bg-white/60 dark:bg-neutral-900/40 mt-6 p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <ListIcon className="text-indigo-600 dark:text-indigo-300 h-5 w-5" aria-hidden />
                <h3 className="text-base font-semibold">Learning Insights</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <MiniTile label="Tasks Completed" value={completedTasks.length} tone="indigo" />
                <MiniTile label="Effective Tasks" value={effectiveCount} tone="green" />
                <MiniTile label="Focus Efficiency" value={`${focusEfficiency}%`} tone="amber" />
              </div>

              {/* New, local “What the model learned” surface */}
              <LearningLoopPanel tasks={completedTasks} feedbackMap={feedbackMap} />

              {/* Keep your existing glance if you like; otherwise you can remove this line */}
              <LearningLoopGlanceExternal tasks={completedTasks} feedbackMap={feedbackMap} />
            </div>
          </section>

          {/* Mobile footer controls */}
          {activeIndex !== null && focusPlan[activeIndex] && (
            <div className="fixed bottom-0 left-0 right-0 z-40 lg:hidden">
              <div className="mx-auto max-w-7xl px-4 pb-safe">
                <div className="mb-3 rounded-xl shadow-lg border dark:border-neutral-800 bg-white dark:bg-neutral-900 p-3 flex items-center justify-between">
                  <div className="text-sm font-medium truncate pr-2" aria-live="polite">
                    {focusPlan[activeIndex].name}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setIsRunning((s) => !s)}
                      className="px-3 py-1.5 rounded-md border dark:border-neutral-700 text-sm"
                      aria-label="Pause or resume"
                    >
                      {isRunning ? "Pause" : "Resume"}
                    </button>
                    <button onClick={() => setTimeLeft(0)} className="px-3 py-1.5 rounded-md border dark:border-neutral-700 text-sm" aria-label="Skip block">
                      Skip
                    </button>
                    <button
                      onClick={() => {
                        const nextIndex = (activeIndex ?? -1) + 1;
                        if (focusPlan[nextIndex]) {
                          setActiveIndex(nextIndex);
                          setTimeLeft(focusPlan[nextIndex].duration * 60);
                          setIsRunning(true);
                        }
                      }}
                      className="px-3 py-1.5 rounded-md bg-indigo-600 text-white text-sm"
                      aria-label="Start next"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Settings drawer mount */}
      <SettingsDrawer open={settingsOpen} onClose={() => setSettingsOpen(false)} />

      {/* Interrupt catcher */}
      <InterruptCatcher />

      {/* Import dialog */}
      <ImportJsonDialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onPick={(file) => handleImportJsonFile(file)}
      />

    </div>
  );
}

/** Sidebar link */
function SidebarLink({ href, icon, children }: { href: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <a href={href} className="flex items-center gap-2 px-2.5 py-2 rounded-md hover:bg-gray-50 dark:hover:bg-neutral-800/70">
      <span className="text-gray-500">{icon}</span>
      <span>{children}</span>
    </a>
  );
}

/** KPI tiles */
function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-gray-50/70 dark:bg-neutral-800/40 p-3 text-center border dark:border-neutral-800">
      <div className="text-xs text-gray-600 dark:text-gray-300">{label}</div>
      <div className="text-xl font-bold mt-0.5">{value}</div>
    </div>
  );
}
function MiniTile({ label, value, tone }: { label: string; value: number | string; tone: "indigo" | "green" | "amber" }) {
  const tones = {
    indigo: "text-indigo-700 bg-indigo-50 dark:text-indigo-300 dark:bg-indigo-950/30",
    green: "text-green-700 bg-green-50 dark:text-green-300 dark:bg-green-950/30",
    amber: "text-amber-800 bg-amber-50 dark:text-amber-300 dark:bg-amber-950/30",
  } as const;
  return (
    <div className={`rounded-lg p-4 text-center ${tones[tone]} border border-transparent dark:border-white/10`}>
      <div className="text-sm opacity-90">{label}</div>
      <div className="text-2xl font-bold mt-0.5">{value}</div>
    </div>
  );
}

/** Streak badge */
function StreakBadge({ streakDays }: { streakDays: number }) {
  const content = (
    <div
      className="inline-flex items-center gap-1 rounded-full bg-orange-50 dark:bg-orange-900/30 px-2 py-1 text-[11px] font-medium text-orange-700 dark:text-orange-300 border border-orange-200/70 dark:border-orange-800/40"
      aria-label={`Current streak ${streakDays} days`}
    >
      <FlameIcon className="h-4 w-4" aria-hidden />
      <span suppressHydrationWarning>{streakDays}</span>
    </div>
  );
  return streakDays > 7 ? <ProGate feature="streaks>7">{content}</ProGate> : content;
}

/** Onboarding modal */
function OnboardingModal({ onClose, onSeed }: { onClose: () => void; onSeed: () => void }) {
  return (
    <div role="dialog" aria-modal="true" aria-label="Welcome to 80/20 Focus" className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-xl bg-white dark:bg-neutral-900 p-5 shadow-xl border dark:border-neutral-800">
        <div className="text-lg font-semibold text-indigo-700 dark:text-indigo-300">Welcome 👋</div>
        <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
          Spend about <strong>20%</strong> of your day on the tasks that drive <strong>80%</strong> of your results. Add a few tasks (impact + minutes), set your 20%, and hit “Create Focus Plan”.
        </p>
        <ul className="mt-3 text-sm text-gray-700 dark:text-gray-300 list-disc pl-4 space-y-1">
          <li>
            <kbd>Space</kbd> to pause/resume
          </li>
          <li>
            <kbd>N</kbd> = next · <kbd>S</kbd> = skip · <kbd>G</kbd> = regenerate
          </li>
        </ul>
        <div className="mt-4 flex gap-2">
          <button onClick={onSeed} className="rounded bg-indigo-600 text-white px-3 py-2 text-sm">
            Start with sample tasks
          </button>
          <button onClick={onClose} className="rounded border dark:border-neutral-700 px-3 py-2 text-sm">
            I’ll add my own
          </button>
        </div>
      </div>
    </div>
  );
}

  /** Tiny Import JSON dialog */
  function ImportJsonDialog({
    open,
    onClose,
    onPick,
  }: {
    open: boolean;
    onClose: () => void;
    onPick: (file: File) => void;
  }) {
    if (!open) return null;
    return (
      <div role="dialog" aria-modal="true" aria-label="Import JSON" className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/40" onClick={onClose} />
        <div className="relative w-full max-w-sm rounded-xl bg-white dark:bg-neutral-900 p-5 shadow-xl border dark:border-neutral-800">
          <div className="text-base font-semibold mb-1">Import JSON</div>
          <p className="text-xs text-gray-600 dark:text-gray-300 mb-3">
            Choose a previously exported backup. This will update your tasks, completed list, feedback, and preferences.
          </p>
          <input
            type="file"
            accept="application/json"
            onChange={(e) => {
              const f = e.currentTarget.files?.[0];
              if (f) onPick(f);
            }}
            className="block w-full text-sm file:mr-3 file:rounded-md file:border file:px-3 file:py-1.5 file:text-sm file:bg-gray-50 dark:file:bg-neutral-800 file:border-gray-300 dark:file:border-neutral-700 hover:file:bg-gray-100 dark:hover:file:bg-neutral-700"
          />
          <div className="mt-3 flex justify-end gap-2">
            <button onClick={onClose} className="rounded border dark:border-neutral-700 px-3 py-1.5 text-xs">
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }


/* -------------------------------------------------------------------------- */
/*  New: Local learning loop visibility panel                                 */
/* -------------------------------------------------------------------------- */
function LearningLoopPanel({
  tasks,
  feedbackMap,
}: {
  tasks: Task[];
  feedbackMap: Record<number, Feedback>;
}) {
  const { rows, top3, strengths, opportunities } = React.useMemo(() => {
    const byProject = new Map<string, { done: number; effective: number }>();
    tasks.forEach((t) => {
      const project = t.project || "General";
      const rec = byProject.get(project) || { done: 0, effective: 0 };
      rec.done += 1;
      if (feedbackMap[t.id] === "yes") rec.effective += 1;
      byProject.set(project, rec);
    });

    const rows = Array.from(byProject.entries()).map(([project, { done, effective }]) => {
      const rate = done > 0 ? Math.round((effective / done) * 100) : 0;
      return { project, done, effective, rate };
    });

    const top3 = [...rows].sort((a, b) => b.rate - a.rate).slice(0, 3);
    const strengths = rows.filter((r) => r.rate >= 60).sort((a, b) => b.rate - a.rate);
    const opportunities = rows.filter((r) => r.rate < 60).sort((a, b) => a.rate - b.rate);

    return { rows, top3, strengths, opportunities };
  }, [tasks, feedbackMap]);

  if (!tasks?.length) {
    return (
      <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">Complete a few focus blocks and give feedback to see insights.</div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">No feedback yet — click “Yes/No” after blocks to help the model learn.</div>
    );
  }

  return (
    <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Projects table */}
      <div className="lg:col-span-2 rounded-lg border dark:border-neutral-800 overflow-hidden bg-white/60 dark:bg-neutral-900/40">
        <div className="px-3 py-2 border-b dark:border-neutral-800 text-sm font-medium">Projects by effectiveness</div>
        <div className="max-h-64 overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50/70 dark:bg-neutral-800/40 text-gray-600 dark:text-gray-300">
              <tr>
                <th className="text-left p-2">Project</th>
                <th className="text-right p-2">Effective / Done</th>
                <th className="text-right p-2">Rate</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.project} className="border-t dark:border-neutral-800">
                  <td className="p-2">{r.project}</td>
                  <td className="p-2 text-right">
                    {r.effective}/{r.done}
                  </td>
                  <td className="p-2 text-right">{r.rate}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* “Try more of …” + chips */}
      <div className="rounded-lg border dark:border-neutral-800 p-3 bg-white/60 dark:bg-neutral-900/40">
        <div className="text-sm font-medium mb-2">What the model learned</div>

        {top3.length > 0 ? (
          <>
            <div className="text-xs text-gray-600 dark:text-gray-300 mb-2">Try more of:</div>
            <ul className="list-disc pl-5 text-sm mb-3">
              {top3.map((r) => (
                <li key={r.project}>
                  <span className="font-medium">{r.project}</span> — {r.rate}% effective
                </li>
              ))}
            </ul>
          </>
        ) : (
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-3">No strong signals yet.</div>
        )}

        <div className="text-xs text-gray-600 dark:text-gray-300 mb-1">Strengths</div>
        <div className="flex flex-wrap gap-1 mb-3">
          {strengths.length ? (
            strengths.slice(0, 6).map((r) => (
              <span
                key={`s-${r.project}`}
                className="text-[11px] rounded-full px-2 py-1 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border border-green-200/60 dark:border-green-800/40"
              >
                {r.project} · {r.rate}%
              </span>
            ))
          ) : (
            <span className="text-[11px] text-gray-500 dark:text-gray-400">—</span>
          )}
        </div>

        <div className="text-xs text-gray-600 dark:text-gray-300 mb-1">Opportunities</div>
        <div className="flex flex-wrap gap-1">
          {opportunities.length ? (
            opportunities.slice(0, 6).map((r) => (
              <span
                key={`o-${r.project}`}
                className="text-[11px] rounded-full px-2 py-1 bg-amber-50 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/40"
              >
                {r.project} · {r.rate}%
              </span>
            ))
          ) : (
            <span className="text-[11px] text-gray-500 dark:text-gray-400">—</span>
          )}
        </div>
      </div>
    </div>
  );
}
