// components/WeeklyReportSummary.tsx
"use client";

import React from "react";
import { CalendarRange, Sparkles } from "lucide-react";

type Task = {
  id: number;
  name: string;
  impact: number;
  duration: number;
  project?: string;
};

type Feedback = "yes" | "no";

export default function WeeklyReportSummary({
  completedTasks,
  feedbackMap,
}: {
  completedTasks: Task[];
  feedbackMap: Record<number, Feedback>;
}) {
  const totalMinutes = completedTasks.reduce(
    (acc, t) => acc + (t.duration || 0),
    0,
  );
  const totalBlocks = completedTasks.length;
  const effectiveBlocks = completedTasks.filter(
    (t) => feedbackMap[t.id] === "yes",
  ).length;

  const byProject = new Map<
    string,
    { minutes: number; effective: number; blocks: number }
  >();

  completedTasks.forEach((t) => {
    const project = t.project || "General";
    const rec =
      byProject.get(project) || { minutes: 0, effective: 0, blocks: 0 };
    rec.minutes += t.duration || 0;
    rec.blocks += 1;
    if (feedbackMap[t.id] === "yes") rec.effective += 1;
    byProject.set(project, rec);
  });

  const topProjects = Array.from(byProject.entries())
    .map(([project, stats]) => ({
      project,
      ...stats,
      rate: stats.blocks ? stats.effective / stats.blocks : 0,
    }))
    .sort((a, b) => b.minutes - a.minutes)
    .slice(0, 3);

  return (
    <>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <CalendarRange className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
            Weekly-style summary
          </h2>
        </div>
        <span className="text-[11px] text-slate-500 dark:text-slate-400">
          Use this as &quot;proof of productivity&quot;
        </span>
      </div>

      {totalBlocks === 0 ? (
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Once you&apos;ve completed a few focus blocks, you&apos;ll see a
          simple summary you can share with a manager, client, or just keep for
          yourself.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3 text-xs mb-3">
            <SummaryTile
              label="Focus blocks"
              value={String(totalBlocks)}
              hint={`${effectiveBlocks} marked effective`}
            />
            <SummaryTile
              label="Time invested"
              value={`${Math.floor(totalMinutes / 60)}h ${
                totalMinutes % 60
              }m`}
              hint="Across all logged blocks"
            />
            <SummaryTile
              label="Hit rate"
              value={
                totalBlocks
                  ? `${Math.round((effectiveBlocks / totalBlocks) * 100)}%`
                  : "0%"
              }
              hint="Blocks that moved the needle"
            />
          </div>

          <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 p-3 text-xs">
            <div className="font-semibold text-slate-800 dark:text-slate-100 mb-1">
              Talking points
            </div>
            <ul className="list-disc list-inside space-y-1 text-slate-600 dark:text-slate-300">
              <li>
                <strong>{totalBlocks}</strong> focused work blocks completed (
                <strong>{effectiveBlocks}</strong> clearly moved the needle).
              </li>
              <li>
                Invested{" "}
                <strong>
                  {Math.floor(totalMinutes / 60)}h {totalMinutes % 60}m
                </strong>{" "}
                into high-impact tasks.
              </li>
              {topProjects.length > 0 && (
                <li>
                  Main themes:{" "}
                  {topProjects
                    .map(
                      (p) =>
                        `${p.project} (${Math.round(
                          (p.effective / Math.max(1, p.blocks)) * 100,
                        )}% effective)`,
                    )
                    .join(", ")}
                  .
                </li>
              )}
            </ul>
          </div>

          <p className="mt-2 text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            <span>
              Copy these bullets into a weekly email, 1:1 doc, or performance
              review — they&apos;re backed by your actual focus blocks.
            </span>
          </p>
        </>
      )}
    </>
  );
}

function SummaryTile({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-lg bg-white/80 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 p-2">
      <div className="text-[11px] text-slate-500 dark:text-slate-400">
        {label}
      </div>
      <div className="text-sm font-semibold text-slate-900 dark:text-slate-50">
        {value}
      </div>
      {hint && (
        <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
          {hint}
        </div>
      )}
    </div>
  );
}
