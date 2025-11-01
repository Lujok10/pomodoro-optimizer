"use client";

import React, { useMemo } from "react";
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ZAxis,
} from "recharts";
import type { Payload } from "recharts/types/component/DefaultTooltipContent"; // ✅ key line

type Task = {
  id: number;
  name: string;
  impact: number;   // 1–5
  duration: number; // minutes
  project?: string;
};

export type TimeVsValueProps = {
  bubbleColor?: string;
  gridColor?: string;
  axisColor?: string;
  textColor?: string;
  dotSizeRange?: [number, number];
  className?: string;
  tasks: Task[];
};

const DEFAULTS = {
  bubbleColor: "rgba(129, 140, 248, 0.9)",
  gridColor: "#E5E7EB",
  axisColor: "#CBD5E1",
  textColor: "#334155",
  dotSizeRange: [6, 16] as [number, number],
};

export default function TimeVsValue({
  tasks,
  bubbleColor = DEFAULTS.bubbleColor,
  gridColor = DEFAULTS.gridColor,
  axisColor = DEFAULTS.axisColor,
  textColor = DEFAULTS.textColor,
  dotSizeRange = DEFAULTS.dotSizeRange,
  className,
}: TimeVsValueProps) {
  const points = useMemo(
    () =>
      (tasks ?? [])
        .filter((t) => Number.isFinite(t.duration) && Number.isFinite(t.impact))
        .map((t) => ({
          x: Math.max(0, Number(t.duration) || 0),
          y: Math.max(0, Number(t.impact) || 0),
          z: Math.max(6, Math.min(16, 4 + (t.impact || 0) * 2)),
          name: t.name,
        })),
    [tasks]
  );

  if (points.length === 0) {
    return (
      <div className={`h-40 grid place-items-center text-xs text-gray-500 ${className ?? ""}`}>
        Add tasks to see the chart.
      </div>
    );
  }

  return (
    <div className={`h-64 w-full ${className ?? ""}`}>
      <ResponsiveContainer>
        <ScatterChart margin={{ top: 10, right: 16, bottom: 10, left: 0 }}>
          <CartesianGrid stroke={gridColor} strokeDasharray="3 3" />
          <XAxis
            type="number"
            dataKey="x"
            name="Time"
            unit="m"
            tick={{ fontSize: 12, fill: textColor }}
            axisLine={{ stroke: axisColor }}
            tickLine={{ stroke: axisColor }}
          />
          <YAxis
            type="number"
            dataKey="y"
            name="Impact"
            domain={[0, 5]}
            tick={{ fontSize: 12, fill: textColor }}
            axisLine={{ stroke: axisColor }}
            tickLine={{ stroke: axisColor }}
          />
          <ZAxis type="number" dataKey="z" range={dotSizeRange} />
          <Tooltip
            contentStyle={{
              borderRadius: 8,
              border: "1px solid #E5E7EB",
              boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
              fontSize: 12,
            }}
            formatter={(value: unknown, name: string) => {
              if (name === "x") return [`${value as number} min`, "Time"];
              if (name === "y") return [value as number, "Impact"];
              return [undefined, undefined];
            }}
            // ✅ Note the readonly Payload[] type here:
            labelFormatter={(_label: any, payload: readonly Payload<any, string>[]) => {
              const p0 = payload?.[0];
              const taskName = (p0 && (p0.payload as any)?.name) || "";
              return taskName; // must return a ReactNode
            }}
          />
          <Scatter name="Tasks" data={points} fill={bubbleColor} />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}
