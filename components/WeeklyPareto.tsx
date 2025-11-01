"use client";

import React, { useEffect, useState } from "react";
import { getWeeklyParetoData } from "@/lib/sessions";
import dynamic from "next/dynamic";

/** Change this to whatever shape your getWeeklyParetoData() returns */
type ParetoItem = {
  name: string;
  minutes: number;   // time spent (x)
  value?: number;    // optional “value” score (y)
};

const Pareto80 = dynamic(() => import("@/components/Pareto80"), { ssr: false });
const TimeVsValue = dynamic(() => import("@/components/TimeVsValue"), { ssr: false });

export default function WeeklyPareto() {
  // null = not yet hydrated; [] = hydrated but no data
  const [data, setData] = useState<ParetoItem[] | null>(null);

  useEffect(() => {
    try {
      const d = getWeeklyParetoData() as ParetoItem[];
      setData(Array.isArray(d) ? d : []);
    } catch {
      setData([]);
    }
  }, []);

  if (data === null) {
    // render a stable placeholder on the server and the client
    return <div className="text-sm text-gray-500">Loading…</div>;
  }

  if (data.length === 0) {
    return <div className="text-sm text-gray-500">No sessions this week yet.</div>;
  }

  // simple column chart using the data you have
  return (
    <div className="grid grid-cols-6 gap-1 items-end h-40">
      {data.slice(0, 6).map((d, i) => {
        const heightPct = Math.min(100, (d.value ?? d.minutes)); // adjust if needed
        return (
          <div
            key={`${d.name}-${i}`}
            className="bg-indigo-300"
            title={`${d.name}: ${d.minutes}m`}
            style={{ height: `${heightPct}%` }}
          />
        );
      })}
    </div>
  );
}
