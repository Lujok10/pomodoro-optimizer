"use client";

import React from "react";

type Feedback = "yes" | "no";

type TaskLite = {
  id: number;
  name: string;
  project?: string;
};

export default function LearningLoopGlance({
  tasks,
  feedbackMap,
}: {
  tasks: TaskLite[];
  feedbackMap: Record<number, Feedback>;
}) {
  if (!tasks?.length) {
    return (
      <div className="mt-4 text-xs text-gray-500">
        Complete a few focus blocks and give feedback to see insights.
      </div>
    );
  }

  // Aggregate by project
  const byProject = new Map<string, { done: number; effective: number }>();
  tasks.forEach((t) => {
    const key = t.project || "General";
    const rec = byProject.get(key) || { done: 0, effective: 0 };
    rec.done += 1;
    if (feedbackMap[t.id] === "yes") rec.effective += 1;
    byProject.set(key, rec);
  });

  const rows = Array.from(byProject.entries()).map(([project, { done, effective }]) => ({
    project,
    done,
    effective,
    rate: done > 0 ? Math.round((effective / done) * 100) : 0,
  }));

  const top = [...rows].sort((a, b) => b.rate - a.rate).slice(0, 3);

  return (
    <div className="mt-4">
      <div className="text-sm font-medium mb-2">What the model is learning</div>
      {rows.length === 0 ? (
        <div className="text-xs text-gray-500">No feedback yet.</div>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="text-left p-2">Project</th>
                <th className="text-right p-2">Effective / Done</th>
                <th className="text-right p-2">Rate</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.project} className="border-t">
                  <td className="p-2">{r.project}</td>
                  <td className="p-2 text-right">
                    {r.effective}/{r.done}
                  </td>
                  <td className="p-2 text-right">{r.rate}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {top.length > 0 && (
        <div className="mt-3 text-xs text-gray-700">
          <div className="font-medium">Try more of:</div>
          <ul className="list-disc pl-5">
            {top.map((r) => (
              <li key={r.project}>
                <span className="font-medium">{r.project}</span> — {r.rate}% effective
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
