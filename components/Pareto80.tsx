"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from "recharts";

type WeeklyRow =
  | { task?: string; name?: string; minutes?: number; duration?: number }
  | Record<string, any>;

let getWeeklyParetoDataFn:
  | undefined
  | (() => WeeklyRow[] | { rows?: WeeklyRow[] } | null);
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const sessions = require("@/lib/sessions");
  getWeeklyParetoDataFn = sessions.getWeeklyParetoData as typeof getWeeklyParetoDataFn;
} catch {}

export type Pareto80Props = {
  /** Bars color */
  barColor?: string;
  /** Cumulative line color */
  lineColor?: string;
  /** Grid line color */
  gridColor?: string;
  /** Axis/ticks color */
  axisColor?: string;
  /** Text/ticks label color */
  textColor?: string;
  /** Max tasks to display */
  maxItems?: number;
  className?: string;
};

const DEFAULTS = {
  barColor: "#6366F1",  // indigo-500
  lineColor: "#10B981", // emerald-500
  gridColor: "#E5E7EB", // slate-200
  axisColor: "#CBD5E1", // slate-300
  textColor: "#334155", // slate-700
};

function normalize(rows: WeeklyRow[]): { label: string; minutes: number }[] {
  return rows
    .map((r) => {
      const label = (r.task ?? r.name ?? "Unknown Task") as string;
      const minutes = Number(r.minutes ?? r.duration ?? 0) || 0;
      return { label, minutes };
    })
    .filter((r) => r.minutes > 0);
}

export default function Pareto80({
  barColor = DEFAULTS.barColor,
  lineColor = DEFAULTS.lineColor,
  gridColor = DEFAULTS.gridColor,
  axisColor = DEFAULTS.axisColor,
  textColor = DEFAULTS.textColor,
  maxItems = 10,
  className,
}: Pareto80Props) {
  const [raw, setRaw] = useState<WeeklyRow[]>([]);

  useEffect(() => {
    try {
      const out = getWeeklyParetoDataFn?.();
      if (!out) return;
      const rows = Array.isArray(out) ? out : Array.isArray(out?.rows) ? out.rows : [];
      setRaw(rows);
    } catch {}
  }, []);

  const data = useMemo(() => {
    const base = normalize(raw);
    const sorted = [...base].sort((a, b) => b.minutes - a.minutes);
    const trimmed = sorted.slice(0, maxItems);
    const total = trimmed.reduce((acc, r) => acc + r.minutes, 0) || 1;
    let running = 0;

    return trimmed.map((r) => {
      running += r.minutes;
      return {
        task: r.label,
        minutes: r.minutes,
        cumulativePct: Math.round((running / total) * 100),
      };
    });
  }, [raw, maxItems]);

  if (data.length === 0) {
    return (
      <div className={`h-40 grid place-items-center text-xs text-gray-500 ${className ?? ""}`}>
        No weekly focus data yet.
      </div>
    );
    }

  return (
    <div className={`h-64 w-full ${className ?? ""}`}>
      <ResponsiveContainer>
        <ComposedChart data={data} margin={{ top: 10, right: 16, bottom: 10, left: 0 }}>
          <CartesianGrid stroke={gridColor} strokeDasharray="3 3" />
          <XAxis
            dataKey="task"
            tick={{ fontSize: 12, fill: textColor }}
            interval={0}
            height={40}
            angle={-25}
            textAnchor="end"
            axisLine={{ stroke: axisColor }}
            tickLine={{ stroke: axisColor }}
          />
          <YAxis
            yAxisId="left"
            tick={{ fontSize: 12, fill: textColor }}
            width={40}
            axisLine={{ stroke: axisColor }}
            tickLine={{ stroke: axisColor }}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            tickFormatter={(v) => `${v}%`}
            tick={{ fontSize: 12, fill: textColor }}
            width={40}
            domain={[0, 100]}
            axisLine={{ stroke: axisColor }}
            tickLine={{ stroke: axisColor }}
          />
          <Tooltip
            contentStyle={{
              borderRadius: 8,
              border: "1px solid #E5E7EB",
              boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
              fontSize: 12,
            }}
            formatter={(value: any, name) =>
              name === "cumulativePct"
                ? [`${value}%`, "Cumulative"]
                : [`${value} min`, "Minutes"]
            }
          />
          <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
          <Bar yAxisId="left" dataKey="minutes" name="Minutes" fill={barColor} radius={[4, 4, 0, 0]} />
          <Line yAxisId="right" type="monotone" dataKey="cumulativePct" name="Cumulative" dot={false} stroke={lineColor} strokeWidth={2.5} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
