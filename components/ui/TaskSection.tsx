"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
// ✅ no CardTitle here
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ListTodo, Plus } from "lucide-react";

export type Task = {
  id: number;
  name: string;
  impact: number;     // 1–5
  duration: number;   // minutes
  project?: string;
};

type Props = {
  tasks: Task[];
  onAddTask?: (t: Task) => void;
  onEditTask?: (t: Task) => void;
  onDeleteTask?: (id: number) => void;
};

export function TaskSection({ tasks, onAddTask, onEditTask, onDeleteTask }: Props) {
  const [name, setName] = useState("");
  const [impact, setImpact] = useState(3);
  const [duration, setDuration] = useState(30);

  const add = () => {
    const n = name.trim();
    if (!n) return;
    const t: Task = {
      id: Date.now(),
      name: n,
      impact: Math.max(1, Math.min(5, impact)),
      duration: Math.max(1, Math.round(duration)),
    };
    onAddTask?.(t);
    setName("");
    setImpact(3);
    setDuration(30);
  };

  return (
    <Card className="rounded-2xl shadow-md border border-gray-200 bg-white">
      <CardHeader className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ListTodo className="w-5 h-5 text-gray-500" />
          {/* ✅ replace <CardTitle> with a semantic heading */}
          <h3 className="text-base font-semibold leading-6">Tasks</h3>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Add form */}
        <div className="grid sm:grid-cols-[1fr,100px,120px,auto] gap-2">
          <Input
            placeholder="What needs to be done?"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Input
            type="number"
            min={1}
            max={5}
            value={impact}
            onChange={(e) => setImpact(Number(e.target.value) || 3)}
            aria-label="Impact 1–5"
          />
          <Input
            type="number"
            min={5}
            max={480}
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value) || 30)}
            aria-label="Duration (minutes)"
          />
          <Button onClick={add} aria-label="Add task">
            <Plus className="w-4 h-4 mr-2" />
            Add
          </Button>
        </div>

        {/* List */}
        <div className="space-y-2">
          {tasks.length === 0 ? (
            <div className="text-sm text-gray-500">No tasks yet.</div>
          ) : (
            tasks.map((t) => (
              <div
                key={t.id}
                className="flex items-center justify-between rounded border border-gray-200 px-3 py-2"
              >
                <div>
                  <div className="text-sm font-medium">{t.name}</div>
                  <div className="text-xs text-gray-500">
                    Impact: {t.impact}/5 · {t.duration} min
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    onClick={() => onEditTask?.(t)}
                    className="text-xs"
                  >
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => onDeleteTask?.(t.id)}
                    className="text-xs"
                  >
                    Delete
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default TaskSection;
