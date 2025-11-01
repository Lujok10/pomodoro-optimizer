"use client";

import { useEffect, useMemo, useState } from "react";
import { ResponsiveContainer, LineChart, Line, Tooltip } from "recharts";
import { getTodayHistogram } from "@/lib/interrupts";

type Props = { refreshKey?: number; height?: number };

export default function InterruptSparkline({ refreshKey = 0, height = 42 }: Props) {
  // Keep state as number[]
  const [buckets, setBuckets] = useState<number[]>(Array(24).fill(0));

  useEffect(() => {
    const hist = getTodayHistogram(); // returns number[]
    setBuckets(Array.isArray(hist) ? hist : Array(24).fill(0));
  }, [refreshKey]);

  // recharts expects an array of objects
  const data = useMemo(() => buckets.map((c, h) => ({ h, c })), [buckets]);

  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 6, right: 8, bottom: 0, left: 0 }}>
          <Line type="monotone" dataKey="c" dot={false} strokeWidth={2} isAnimationActive={false} />
          <Tooltip
            formatter={(v: number) => `${v} interrupts`}
            labelFormatter={(h) => `${h}:00`}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
