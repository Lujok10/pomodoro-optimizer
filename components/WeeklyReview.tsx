"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import type { Task } from "@/lib/types";
import { toHours } from "@/lib/time";
import { getSessionsSince } from "@/lib/sessions";

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042"];

interface WeeklyReviewProps {
  tasks?: Task[];
}

export default function WeeklyReview({ tasks = [] }: WeeklyReviewProps) {
  const [sessions, setSessions] = useState<{ project?: string; seconds: number }[]>([]);

  useEffect(() => {
    const now = Date.now();
    const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
    const list = getSessionsSince(weekAgo);
    if (list.length === 0 && tasks.length > 0) {
      const fallback = tasks
        .filter(t => (t.timeSpent ?? 0) > 0)
        .map(t => ({ project: t.project, seconds: Math.round((t.timeSpent ?? 0) * 60) }));
      setSessions(fallback);
    } else {
      setSessions(list.map(s => ({ project: s.project, seconds: s.seconds })));
    }
  }, [tasks]);

  const projectData = useMemo(() => {
    const grouped: Record<string, number> = {};
    sessions.forEach((s) => {
      const project = s.project ?? "General";
      grouped[project] = (grouped[project] || 0) + (s.seconds || 0);
    });
    return Object.entries(grouped).map(([project, seconds]) => ({
      name: project,
      value: toHours(seconds),
    }));
  }, [sessions]);

  const totalTime = projectData.reduce((acc, p) => acc + p.value, 0);

  return (
    <Card className="w-full mt-6">
      <CardHeader>
        <div className="text-xl font-semibold">Weekly 80/20 Review</div>
      </CardHeader>
      <CardContent>
        {projectData.length === 0 ? (
          <p className="text-muted-foreground">No data yet</p>
        ) : (
          <div className="flex flex-col items-center">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={projectData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                  {projectData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <p className="mt-4 font-medium">
              Total Focus Time: {totalTime.toFixed(1)} hrs
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
