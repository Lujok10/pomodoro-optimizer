// components/FlowDiagram.tsx
"use client";

import React from "react";
import { ArrowRight, Gauge, Rocket } from "lucide-react";

export default function FlowDiagram() {
  return (
    <div
      className="mt-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 px-3 py-3 text-xs
                 flex flex-col gap-3"
    >
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <Bubble label="Inputs" sub="Time · Energy · Focus blocks">
          <span className="text-[10px] text-slate-500 dark:text-slate-400">
            Minutes invested
          </span>
        </Bubble>

        <ArrowRight className="w-4 h-4 text-slate-400 hidden sm:block" />

        <Bubble
          label="Efficiency"
          sub="Outputs ÷ Inputs"
          accent="bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300"
        >
          <span className="text-[10px] text-slate-500 dark:text-slate-400">
            How many blocks you complete per hour
          </span>
        </Bubble>

        <ArrowRight className="w-4 h-4 text-slate-400 hidden sm:block" />

        <Bubble
          label="Impact"
          sub="Outcomes Achieved ÷ Outcomes Possible"
          accent="bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300"
        >
          <span className="text-[10px] text-slate-500 dark:text-slate-400">
            How many blocks actually move the needle
          </span>
        </Bubble>

        <ArrowRight className="w-4 h-4 text-slate-400 hidden sm:block" />

        <Bubble
          label="Effectiveness"
          sub="Efficiency × Impact"
          accent="bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300"
        >
          <span className="text-[10px] text-slate-500 dark:text-slate-400">
            True value from your time
          </span>
        </Bubble>
      </div>

      <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 mt-1">
        <Gauge className="w-3 h-3" />
        <span>
          Focus 20 turns raw{" "}
          <span className="font-medium text-slate-700 dark:text-slate-200">
            time data
          </span>{" "}
          into an{" "}
          <span className="font-medium text-slate-700 dark:text-slate-200">
            effectiveness score
          </span>{" "}
          you can track.
        </span>
      </div>
    </div>
  );
}

function Bubble({
  label,
  sub,
  accent,
  children,
}: {
  label: string;
  sub: string;
  accent?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex-1 min-w-[150px] rounded-lg bg-white dark:bg-slate-950 px-3 py-2 shadow-sm border border-slate-200 dark:border-slate-800">
      <div className="flex items-center justify-between gap-1">
        <div className="text-[11px] font-semibold text-slate-800 dark:text-slate-100">
          {label}
        </div>
        <div
          className={`text-[10px] px-1.5 py-0.5 rounded-full ${
            accent ||
            "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200"
          }`}
        >
          {sub}
        </div>
      </div>
      {children && <div className="mt-1">{children}</div>}
    </div>
  );
}
