// components/IntegrationsDiagram.tsx
"use client";

import React from "react";
import {
  CalendarDays,
  LayoutDashboard,
  ListTodo,
  PlugZap,
} from "lucide-react";

export default function IntegrationsDiagram() {
  return (
    <div className="rounded-xl border dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 p-4 shadow-sm h-full flex flex-col">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <PlugZap className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
            Integrations map
          </h2>
        </div>
        <span className="text-[11px] text-slate-500 dark:text-slate-400">
          Conceptual view
        </span>
      </div>

      <p className="text-xs text-slate-600 dark:text-slate-300 mb-3">
        Focus 20 overlays Efficiency + Impact on top of tools you already use.
      </p>

      <div className="flex-1 grid grid-rows-[auto,1fr] gap-2">
        <div className="flex flex-wrap gap-2 justify-center">
          <Pill icon={<CalendarDays className="w-3 h-3" />}>
            Google Calendar
          </Pill>
          <Pill icon={<CalendarDays className="w-3 h-3" />}>Outlook</Pill>
          <Pill icon={<ListTodo className="w-3 h-3" />}>Task apps</Pill>
          <Pill>Meetings</Pill>
        </div>

        <div className="relative flex-1 mt-1">
          {/* Inputs Layer */}
          <div className="absolute inset-x-4 top-0 flex flex-col items-center gap-1">
            <div className="text-[11px] text-slate-500 dark:text-slate-400">
              Inputs
            </div>
            <div className="h-8 w-full max-w-xs rounded-full border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 flex items-center justify-center gap-2 text-[11px] text-slate-600 dark:text-slate-300">
              <CalendarDays className="w-3 h-3" />
              Time · Events · Tasks
            </div>
          </div>

          {/* Arrow */}
          <div className="absolute inset-x-0 top-10 flex justify-center">
            <div className="w-px h-8 bg-gradient-to-b from-slate-300/80 to-indigo-400/80" />
          </div>

          {/* Focus 20 brain */}
          <div className="absolute inset-x-4 top-20 flex flex-col items-center gap-1">
            <div className="text-[11px] text-slate-500 dark:text-slate-400">
              Focus 20 engine
            </div>
            <div className="rounded-xl border border-indigo-200/80 dark:border-indigo-800/80 bg-indigo-50/70 dark:bg-indigo-950/40 px-4 py-2 text-[11px] text-slate-900 dark:text-slate-50 max-w-xs text-center">
              Efficiency = outputs ÷ inputs
              <br />
              Impact = outcomes ÷ possible
              <br />
              Effectiveness = Efficiency × Impact
            </div>
          </div>

          {/* Arrow */}
          <div className="absolute inset-x-0 top-36 flex justify-center">
            <div className="w-px h-8 bg-gradient-to-b from-indigo-400/80 to-emerald-400/80" />
          </div>

          {/* Dashboard output */}
          <div className="absolute inset-x-4 bottom-0 flex flex-col items-center gap-1">
            <div className="text-[11px] text-slate-500 dark:text-slate-400">
              Output
            </div>
            <div className="flex items-center gap-2 rounded-xl border border-emerald-200/80 dark:border-emerald-800/80 bg-emerald-50/70 dark:bg-emerald-950/40 px-4 py-2 text-[11px] text-emerald-900 dark:text-emerald-50">
              <LayoutDashboard className="w-3 h-3" />
              <span>Effectiveness dashboard · Top 20% tasks · Proof of impact</span>
            </div>
          </div>
        </div>
      </div>

      <p className="mt-3 text-[10px] text-slate-500 dark:text-slate-400">
        Current live integrations: Google &amp; Outlook. Others (Todoist,
        Trello, Asana, Notion) are part of the larger roadmap.
      </p>
    </div>
  );
}

function Pill({
  icon,
  children,
}: {
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900/80 px-2.5 py-1 text-[11px] text-slate-700 dark:text-slate-200">
      {icon}
      {children}
    </span>
  );
}
