"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Card, CardContent, CardHeader } from "@/components/ui/card"; // no CardTitle
import { ListChecks, RefreshCcw, Sparkles } from "lucide-react";

import { generateFocusPlan } from "@/lib/focusEngine";
import { Task } from "@/types/task";

type DurationUnit = "minutes" | "seconds";

/** Accepts undefined and normalizes to minutes */
function toDisplayMinutes(v?: number, unit: DurationUnit = "minutes") {
  const raw = v ?? 0;
  if (unit === "seconds") return Math.max(0, Math.round(raw / 60));
  return Math.max(0, Math.round(raw));
}

type Props = {
  tasks: Task[];
  /** Capacity for the plan in MINUTES (UI-friendly). Defaults to 120. */
  availableMinutes?: number;
  /** STRICT: the unit used by Task.duration. */
  durationUnit?: DurationUnit;
};

export function FocusPlanSection({
  tasks,
  availableMinutes = 120,
  durationUnit = "minutes",
}: Props) {
  const [plan, setPlan] = useState<Task[]>([]);
  const { toast } = useToast();

  /** Compute a score without relying on a missing Task.score field */
  const getScore = (t: Task) => {
    const impact = (t as any).impact ?? 0;
    const confidence = (t as any).confidence ?? 1;
    const effort = Math.max(1, (t as any).effort ?? 1);
    return (impact * confidence) / effort;
  };

  const handleCreate = () => {
    try {
      // Convert the available capacity to the unit the engine expects.
      const capacityForEngine =
        durationUnit === "seconds" ? availableMinutes * 60 : availableMinutes;

      const newPlan = generateFocusPlan(tasks, capacityForEngine);
      setPlan(newPlan);

      toast({
        title: "Focus Plan Created",
        description: `We picked ${newPlan.length} task${newPlan.length === 1 ? "" : "s"} for your next session.`,
        duration: 3000,
      });
    } catch (err) {
      console.error(err);
      toast({
        title: "Error",
        description: "Could not generate focus plan.",
        duration: 3000,
      });
    }
  };

  return (
    <Card className="rounded-2xl shadow-md border border-gray-200 bg-white">
      <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-2 text-indigo-600 text-lg font-semibold">
              <Sparkles className="w-5 h-5" />
              <span>Your Focus Plan</span>
            </div>
            {/* NEW: surface the incoming availableMinutes */}
            <div className="text-xs text-gray-500">
              Planning capacity: <strong>{Math.max(0, Math.round(availableMinutes))} min</strong>
            </div>
          </div>

          <Button
            onClick={handleCreate}
            variant="outline"
            className="h-8 px-3 text-sm flex items-center gap-1"
          >
            <RefreshCcw className="w-4 h-4" /> Generate
          </Button>
      </CardHeader>


      <CardContent>
        {plan.length > 0 ? (
          <ul className="list-none space-y-2 text-gray-700">
            {plan.map((task) => {
              const mins = toDisplayMinutes(task.duration, durationUnit);
              const score = getScore(task);
              return (
                <li key={task.id} className="flex items-center gap-2 p-2 border rounded-md">
                  <ListChecks className="w-4 h-4 text-indigo-500" />
                  <span>
                    <span className="font-medium">{task.name}</span> — {mins} min{" "}
                    <span className="text-sm text-gray-500">(score {score.toFixed(2)})</span>
                  </span>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-gray-500 text-sm">No plan yet. Click Generate!</p>
        )}
      </CardContent>
    </Card>
  );
}
