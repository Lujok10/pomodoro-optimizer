// app/pro/page.tsx
"use client";

import { useEffect, useState } from "react";
import { isPro, setProActive } from "@/lib/proGate";

export default function ProPage() {
  const [active, setActive] = useState(false);

  useEffect(() => setActive(isPro()), []);

  return (
    <div className="mx-auto max-w-3xl p-6">
      <h1 className="text-2xl font-bold text-indigo-800">Go Pro</h1>
      <p className="mt-1 text-gray-600">
        Unlimited streaks, AI triage, weekly insights, exports & sync, calendar auto-blocking.
      </p>

      <div className="mt-6 rounded-xl border bg-white p-4 shadow-sm">
        <h2 className="font-semibold text-indigo-700">Your plan</h2>
        <p className="mt-1 text-sm text-gray-600">Status: {active ? "Pro (dev)" : "Free"}</p>
        <div className="mt-3 flex items-center gap-2">
          <button
            onClick={() => {
              setProActive(true);
              setActive(true);
            }}
            className="rounded bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white"
          >
            Activate Pro (dev)
          </button>
          <button
            onClick={() => {
              setProActive(false);
              setActive(false);
            }}
            className="rounded border px-3 py-1.5 text-sm"
          >
            Revert to Free
          </button>
        </div>
        <p className="mt-3 text-xs text-gray-500">
          This switches a local flag for development. Hook to real billing later.
        </p>
      </div>
    </div>
  );
}
