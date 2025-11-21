// components/ImpactComparisonTable.tsx
"use client";

import React from "react";
import { Scale, Sparkles } from "lucide-react";

export default function ImpactComparisonTable() {
  return (
    <div className="rounded-xl border dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 p-4 shadow-sm h-full flex flex-col">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Scale className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
            Why Focus 20 is different
          </h2>
        </div>
      </div>

      <p className="text-xs text-slate-600 dark:text-slate-300 mb-3">
        Old tools track time or tasks. Focus 20 adds{" "}
        <span className="font-semibold">Efficiency + Impact</span> so you can
        see which work actually matters.
      </p>

      <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800 text-xs flex-1">
        <table className="w-full border-collapse">
          <thead className="bg-slate-50 dark:bg-slate-900/70">
            <tr>
              <th className="text-left p-2 text-slate-500 dark:text-slate-400 w-[40%]">
                Feature
              </th>
              <th className="text-left p-2 text-slate-700 dark:text-slate-100">
                Old tools
              </th>
              <th className="text-left p-2 text-indigo-700 dark:text-indigo-300">
                Focus 20
              </th>
            </tr>
          </thead>
          <tbody>
            <Row
              feature="Track time"
              old="Basic timers or timesheets"
              modern="Time is one input into effectiveness"
            />
            <Row
              feature="Task lists"
              old="Long, flat lists"
              modern="Tasks ranked by impact & feedback"
            />
            <Row
              feature="Meetings & calendar"
              old="Only events on a grid"
              modern="Meetings counted as inputs to effectiveness"
            />
            <Row
              feature="Impact visibility"
              old="Usually not measured"
              modern="Each block tagged as 'moved the needle?'"
            />
            <Row
              feature="Effectiveness score"
              old="Not available"
              modern="Efficiency × Impact gauge on dashboard"
            />
            <Row
              feature="Top 20% tasks"
              old="You guess"
              modern="Automatically surfaced from your history"
            />
            <Row
              feature="Output for managers"
              old="Screenshots or manual reports"
              modern="Shareable evidence: blocks, impact rate, top work"
            />
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
        <Sparkles className="w-3 h-3 text-amber-500" />
        <span>
          This is more than time tracking — it&apos;s{" "}
          <span className="font-medium">impact productivity</span>.
        </span>
      </div>
    </div>
  );
}

function Row({
  feature,
  old,
  modern,
}: {
  feature: string;
  old: string;
  modern: string;
}) {
  return (
    <tr className="border-t border-slate-100 dark:border-slate-800">
      <td className="p-2 align-top text-slate-600 dark:text-slate-300">
        {feature}
      </td>
      <td className="p-2 align-top text-slate-500 dark:text-slate-400">
        {old}
      </td>
      <td className="p-2 align-top text-slate-800 dark:text-slate-100">
        {modern}
      </td>
    </tr>
  );
}
