
"use client";
import React, { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import type { Task } from "@/lib/types";

type Props = {
  onComplete: (availableMinutes: number, loadDemo: boolean) => void;
  defaultAvailable?: number;
};

export default function Onboarding({ onComplete, defaultAvailable = 300 }: Props) {
  const [available, setAvailable] = useState<number>(defaultAvailable);
  const [loadDemo, setLoadDemo] = useState<boolean>(true);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded bg-white p-6 shadow-lg">
        <h2 className="text-lg font-bold mb-2">Welcome — set up your day</h2>
        <p className="text-sm text-gray-600 mb-4">Enter how many minutes you have available today. We'll allocate ~20% for deep focus.</p>

        <div className="flex items-center gap-2 mb-4">
          <Input
            type="number"
            value={available}
            onChange={(e) => setAvailable(Number(e.target.value || 0))}
            className="w-32"
          />
          <span className="text-sm text-gray-600">minutes today</span>
        </div>

        <label className="flex items-center gap-2 mb-4">
          <input type="checkbox" checked={loadDemo} onChange={(e) => setLoadDemo(e.target.checked)} />
          <span className="text-sm">Prefill demo tasks (recommended)</span>
        </label>

        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => onComplete(available, loadDemo)}>Skip</Button>
          <Button onClick={() => onComplete(available, loadDemo)}>Start</Button>
        </div>
      </div>
    </div>
  );
}
