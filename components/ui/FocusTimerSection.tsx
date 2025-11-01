"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
// ❌ remove CardTitle import
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Timer, Play, Pause, RotateCcw } from "lucide-react";

type Props = {
  /** minutes */
  duration?: number;
};

export function FocusTimerSection({ duration = 25 }: Props) {
  const [isRunning, setIsRunning] = useState(false);
  const [remaining, setRemaining] = useState(duration * 60);
  const startedAtRef = useRef<number | null>(null);
  const carryRef = useRef<number>(remaining); // seconds carried across pauses
  const intervalRef = useRef<number | null>(null);

  // If duration prop changes, reset remaining (only when idle)
  useEffect(() => {
    if (!isRunning) {
      setRemaining(duration * 60);
      carryRef.current = duration * 60;
    }
  }, [duration, isRunning]);

  const start = () => {
    if (isRunning) return;
    setIsRunning(true);
    startedAtRef.current = performance.now();
    // tick at 200ms for smoothness
    intervalRef.current = window.setInterval(() => {
      if (!startedAtRef.current) return;
      const elapsed = (performance.now() - startedAtRef.current) / 1000;
      const next = Math.max(0, Math.ceil(carryRef.current - elapsed));
      setRemaining(next);
      if (next <= 0) pause(); // auto-stop at zero
    }, 200);
  };

  const pause = () => {
    if (intervalRef.current != null) window.clearInterval(intervalRef.current);
    intervalRef.current = null;
    setIsRunning(false);
    if (startedAtRef.current != null) {
      const elapsed = (performance.now() - startedAtRef.current) / 1000;
      carryRef.current = Math.max(0, carryRef.current - elapsed);
      startedAtRef.current = null;
    }
  };

  const reset = () => {
    pause();
    carryRef.current = duration * 60;
    setRemaining(duration * 60);
  };

  useEffect(() => {
    return () => {
      // cleanup on unmount
      if (intervalRef.current != null) window.clearInterval(intervalRef.current);
    };
  }, []);

  const mmss = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  };

  return (
    <Card className="rounded-2xl shadow-md border border-gray-200 bg-white">
      <CardHeader className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Timer className="w-5 h-5 text-gray-500" aria-hidden />
          {/* ✅ Replace CardTitle with a semantic heading */}
          <h3 className="text-base font-semibold leading-6">Focus Timer</h3>
        </div>
      </CardHeader>

      <CardContent className="flex flex-col items-center gap-4">
        <div
          className="w-40 h-40 rounded-full border border-gray-200 grid place-items-center text-3xl font-bold"
          role="timer"
          aria-label={`Time left ${mmss(remaining)}`}
        >
          {mmss(remaining)}
        </div>

        <div className="flex items-center gap-2">
          {isRunning ? (
            <Button variant="outline" onClick={pause} aria-label="Pause">
              <Pause className="w-4 h-4 mr-2" />
              Pause
            </Button>
          ) : (
            <Button onClick={start} aria-label="Start">
              <Play className="w-4 h-4 mr-2" />
              Start
            </Button>
          )}
          <Button variant="outline" onClick={reset} aria-label="Reset">
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
