// app/dashboard/page.tsx
"use client";

import React from "react";
import { useHydratedState } from "@/lib/hooks";
import QuoteCarousel from "@/components/QuoteCarousel";
import {
  Activity,
  CheckCircle2,
  Clock,
  Flame,
  HeartPulse,
  ListChecks,
} from "lucide-react";
import FlowDiagram from "@/components/FlowDiagram";
import IntegrationsDiagram from "@/components/IntegrationsDiagram";
import ImpactComparisonTable from "@/components/ImpactComparisonTable";
import WeeklyReportSummary from "@/components/WeeklyReportSummary";

type Task = {
  id: number;
  name: string;
  impact: number;
  duration: number; // minutes
  project?: string;
};

type Feedback = "yes" | "no";

export default function DashboardPage() {
  const [completedTasks] = useHydratedState<Task[]>([], () => {
    try {
      const raw =
        typeof window !== "undefined"
          ? localStorage.getItem("pom_completed_v1")
          : null;
      return raw ? (JSON.parse(raw) as Task[]) : [];
    } catch {
      return [];
    }
  });

  const [feedbackMap] = useHydratedState<Record<number, Feedback>>({}, () => {
    try {
      const raw =
        typeof window !== "undefined"
          ? localStorage.getItem("pom_feedback_v1")
          : null;
      return raw ? (JSON.parse(raw) as Record<number, Feedback>) : {};
    } catch {
      return {};
    }
  });

  // ---- Metrics: Efficiency + Impact = Effectiveness ----
  const totalMinutes = completedTasks.reduce(
    (acc, t) => acc + (t.duration || 0),
    0,
  );
  const totalBlocks = completedTasks.length;
  const effectiveBlocks = completedTasks.filter(
    (t) => feedbackMap[t.id] === "yes",
  ).length;

  const efficiencyTasksPerHour =
    totalMinutes > 0 ? (totalBlocks * 60) / totalMinutes : 0;
  const outcomesAchieved = effectiveBlocks;
  const outcomesPossible = Math.max(1, totalBlocks);
  const impactRatio = outcomesAchieved / outcomesPossible;

  const efficiencyNorm = Math.max(0, Math.min(1, efficiencyTasksPerHour / 1)); // 1 task/hr baseline
  const effectiveness = Math.round(efficiencyNorm * impactRatio * 100);
  const effectivenessClamped = Math.max(0, Math.min(100, effectiveness));

  return (
    <div className="mx-auto max-w-6xl px-4 md:px-6 py-6 space-y-6">
      {/* Header / hero */}
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
            Your 80/20 effectiveness dashboard
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            See how your{" "}
            <span className="font-medium">top 20% of effort</span> turns into{" "}
            <span className="font-medium">80% of results</span>. We overlay{" "}
            <span className="font-semibold">Efficiency × Impact</span> on your
            focus blocks so you can move from{" "}
            <span className="font-medium">busy</span> →{" "}
            <span className="font-medium">productive</span> →{" "}
            <span className="font-medium">impactful</span>.
          </p>
        </div>

        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300/70 dark:border-emerald-500/60 bg-emerald-50/70 dark:bg-emerald-900/30 px-3 py-1 text-xs text-emerald-800 dark:text-emerald-200">
          <HeartPulse className="w-4 h-4" />
          <span>Impact productivity · Focus 20</span>
        </div>
      </header>

      {/* Focus quote / cue */}
      <section
        aria-label="Focus cue"
        className="rounded-xl border dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 p-4 shadow-sm"
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-amber-600 dark:text-amber-300" />
            <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
              Today&apos;s focus cue
            </h2>
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            One small reminder to protect your 20% time.
          </span>
        </div>
        <QuoteCarousel />
      </section>

      {/* STEP 1 — Today at a glance */}
      <section aria-label="Today summary" className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Step 1 · Today at a glance
          </h2>
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            How much focus time you’ve invested, and how effective it was.
          </span>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 p-4 shadow-sm flex flex-col justify-between">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                Focus time (recent)
              </h3>
            </div>
            <div className="text-2xl font-bold text-slate-900 dark:text-slate-50">
              {Math.floor(totalMinutes / 60)}h {totalMinutes % 60}m
            </div>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Based on your latest completed focus blocks.
            </p>
          </div>

          <div className="rounded-xl border dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 p-4 shadow-sm flex flex-col justify-between">
            <div className="flex items-center gap-2 mb-2">
              <ListChecks className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                Completed blocks
              </h3>
            </div>
            <div className="text-2xl font-bold text-slate-900 dark:text-slate-50">
              {totalBlocks}
            </div>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {effectiveBlocks} marked as{" "}
              <span className="font-medium">“moved the needle”</span>.
            </p>
          </div>

          <div className="rounded-xl border dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 p-4 shadow-sm flex items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Flame className="w-4 h-4 text-amber-600 dark:text-amber-300" />
                <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                  Effectiveness score
                </h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Efficiency × Impact from your recent focus blocks.
              </p>
            </div>
            <EffectivenessDonut value={effectivenessClamped} />
          </div>
        </div>
      </section>

      {/* STEP 2 & 3 — Top 20% tasks + Time vs value */}
      <section className="space-y-3">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-1">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Step 2 · Top 20% tasks &nbsp;·&nbsp; Step 3 · Time vs value
          </h2>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Which tasks keep paying off, and how your time lines up with their
            potential value.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <TopTwentyTasksPanel
            completedTasks={completedTasks}
            feedbackMap={feedbackMap}
          />
          <TimeVsValuePanel tasks={completedTasks} />
        </div>
      </section>

      {/* STEP 4 — How we calculate Effectiveness (formulas + flow) */}
      <section className="space-y-3">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-1">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Step 4 · How Focus 20 measures Effectiveness
          </h2>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            We don&apos;t just track hours. We track how well those hours become
            outcomes.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr),minmax(0,0.9fr)]">
          <div className="rounded-xl border dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                Efficiency + Impact → Effectiveness
              </h3>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 mb-3">
              Focus 20 layers simple formulas on top of your day:
              <br />
              <span className="font-medium">Efficiency</span> (outputs ÷ inputs)
              and <span className="font-medium">Impact</span> (outcomes achieved
              ÷ outcomes possible). Multiply them to get your{" "}
              <span className="font-medium">Effectiveness</span>.
            </p>

            <div className="grid gap-3 md:grid-cols-3 mb-4">
              <FormulaCard
                label="Efficiency"
                desc="Outputs ÷ Inputs"
                detail={`${totalBlocks || 0} blocks ÷ ${totalMinutes || 0} minutes`}
                value={`${efficiencyTasksPerHour.toFixed(2)} tasks/hr`}
              />
              <FormulaCard
                label="Impact"
                desc="Outcomes Achieved ÷ Outcomes Possible"
                detail={`${outcomesAchieved}/${outcomesPossible} blocks moved the needle`}
                value={`${Math.round(impactRatio * 100) || 0}%`}
              />
              <FormulaCard
                label="Effectiveness"
                desc="Efficiency × Impact"
                detail="Normalized against a 1 task/hr baseline"
                value={`${effectivenessClamped || 0}%`}
                highlight
              />
            </div>

            <FlowDiagram />
          </div>

          {/* Right column left open for future “explainers” / tips if you want */}
          <div className="rounded-xl border dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 p-4 shadow-sm text-xs text-slate-600 dark:text-slate-300 flex flex-col gap-2">
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-1">
              How to read this
            </h3>
            <ul className="list-disc list-inside space-y-1">
              <li>
                <span className="font-medium">Efficiency</span> goes up when you
                complete more blocks per hour.
              </li>
              <li>
                <span className="font-medium">Impact</span> goes up when more
                blocks are marked “moved the needle”.
              </li>
              <li>
                <span className="font-medium">Effectiveness</span> rewards both
                quality and volume — not just being busy.
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* STEP 5 — Where this data comes from (integrations + comparison) */}
      <section className="space-y-3">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-1">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Step 5 · Where your effectiveness data comes from
          </h2>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Focus 20 overlays Efficiency + Impact on top of the tools you
            already use.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr),minmax(0,0.9fr)]">
          <IntegrationsDiagram />
          <ImpactComparisonTable />
        </div>
      </section>

      {/* Weekly impact report — screenshot friendly */}
      <section className="space-y-3" aria-label="Weekly impact report">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-1">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            This week&apos;s impact report
          </h2>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            A snapshot of your week you can screenshot or share with your team.
          </p>
        </div>

        <div className="rounded-xl border dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 p-4 shadow-sm">
          <WeeklyReportSummary
            completedTasks={completedTasks}
            feedbackMap={feedbackMap}
          />

          <p className="mt-3 text-[11px] text-slate-500 dark:text-slate-400">
            Tip: Zoom your browser out a bit and screenshot this card to share
            your weekly 80/20 impact.
          </p>
        </div>
      </section>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Small reusable pieces                                                     */
/* -------------------------------------------------------------------------- */

function EffectivenessDonut({ value }: { value: number }) {
  const r = 28;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, value));
  const dash = (clamped / 100) * c;

  return (
    <div className="relative w-20 h-20">
      <svg viewBox="0 0 80 80" className="w-20 h-20">
        <circle
          cx="40"
          cy="40"
          r={r}
          stroke="#E5E7EB"
          strokeWidth="8"
          fill="none"
        />
        <circle
          cx="40"
          cy="40"
          r={r}
          stroke="url(#effectivenessGradient)"
          strokeWidth="8"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c}`}
          transform="rotate(-90 40 40)"
        />
        <defs>
          <linearGradient
            id="effectivenessGradient"
            x1="0"
            y1="0"
            x2="80"
            y2="80"
          >
            <stop offset="0%" stopColor="#6366f1" />
            <stop offset="50%" stopColor="#22c55e" />
            <stop offset="100%" stopColor="#f97316" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xs font-semibold text-slate-900 dark:text-slate-50">
          {Math.round(clamped)}%
        </span>
      </div>
    </div>
  );
}

function FormulaCard({
  label,
  desc,
  detail,
  value,
  highlight,
}: {
  label: string;
  desc: string;
  detail: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border text-xs p-3 bg-white/80 dark:bg-slate-900/80 ${
        highlight
          ? "border-emerald-300/70 dark:border-emerald-500/70"
          : "border-slate-200 dark:border-slate-800"
      }`}
    >
      <div className="text-[11px] font-semibold text-slate-700 dark:text-slate-200">
        {label}
      </div>
      <div className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
        {desc}
      </div>
      <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
        {detail}
      </div>
      <div
        className={`mt-2 text-sm font-semibold ${
          highlight
            ? "text-emerald-700 dark:text-emerald-300"
            : "text-indigo-700 dark:text-indigo-300"
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function TopTwentyTasksPanel({
  completedTasks,
  feedbackMap,
}: {
  completedTasks: Task[];
  feedbackMap: Record<number, Feedback>;
}) {
  // Rank tasks by “effectiveness”: impact + positive feedback
  const byTask = new Map<
    number,
    { name: string; project?: string; impact: number; count: number; yes: number }
  >();

  completedTasks.forEach((t) => {
    const rec =
      byTask.get(t.id) || {
        name: t.name,
        project: t.project,
        impact: t.impact,
        count: 0,
        yes: 0,
      };
    rec.count += 1;
    if (feedbackMap[t.id] === "yes") rec.yes += 1;
    byTask.set(t.id, rec);
  });

  const rows = Array.from(byTask.values()).map((r) => ({
    ...r,
    rate: r.count > 0 ? r.yes / r.count : 0,
    score: r.impact * (r.count > 0 ? r.yes / r.count : 0),
  }));

  const top20 = rows
    .sort((a, b) => b.score - a.score)
    .slice(0, 5); // "Top 20%" ~ top 5 tasks for now

  return (
    <div className="rounded-xl border dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 p-4 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
            Top 20% tasks
          </h3>
        </div>
        <span className="text-[11px] text-slate-500 dark:text-slate-400">
          Based on impact + “moved the needle”.
        </span>
      </div>

      {top20.length === 0 ? (
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Complete a few focus blocks and mark whether they moved the needle to
          see your top 20% tasks.
        </p>
      ) : (
        <div className="space-y-2 mt-1">
          {top20.map((t) => (
            <div
              key={t.name}
              className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 p-3 flex items-center justify-between"
            >
              <div>
                <div className="text-sm font-medium text-slate-900 dark:text-slate-50">
                  {t.name}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  Impact {t.impact}/5 · {t.yes}/{t.count} blocks effective
                  {t.project ? ` · ${t.project}` : ""}
                </div>
              </div>
              <div className="text-xs rounded-full px-2 py-1 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300">
                {(t.rate * 100).toFixed(0)}% hit rate
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TimeVsValuePanel({ tasks }: { tasks: Task[] }) {
  const totalDuration = tasks.reduce((acc, t) => acc + t.duration, 0);
  const totalImpact = tasks.reduce((acc, t) => acc + t.impact, 0);
  const avgImpact = tasks.length ? totalImpact / tasks.length : 0;

  return (
    <div className="rounded-xl border dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 p-4 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
            Time vs value (recent)
          </h3>
        </div>
        <span className="text-[11px] text-slate-500 dark:text-slate-400">
          Conceptual view of effort vs potential.
        </span>
      </div>

      <p className="text-xs text-slate-600 dark:text-slate-300 mb-3">
        A rough sense of how your time is spread versus the potential value of
        your tasks.
      </p>

      <div className="grid gap-3 text-xs">
        <div className="flex items-center justify-between">
          <span className="text-slate-500 dark:text-slate-400">
            Total time (completed)
          </span>
          <span className="font-medium text-slate-900 dark:text-slate-50">
            {Math.floor(totalDuration / 60)}h {totalDuration % 60}m
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-500 dark:text-slate-400">
            Average impact score
          </span>
          <span className="font-medium text-slate-900 dark:text-slate-50">
            {avgImpact.toFixed(2)} / 5
          </span>
        </div>
      </div>

      {/* Simple horizontal bar "chart" */}
      <div className="mt-4 space-y-2">
        <div className="text-[11px] text-slate-500 dark:text-slate-400">
          Time spent
        </div>
        <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
          <div
            className="h-full bg-indigo-500"
            style={{
              width: `${Math.min(100, totalDuration)}%`,
            }}
          />
        </div>

        <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
          Value potential (avg impact)
        </div>
        <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
          <div
            className="h-full bg-emerald-500"
            style={{
              width: `${Math.min(100, (avgImpact / 5) * 100)}%`,
            }}
          />
        </div>
      </div>
    </div>
  );
}
