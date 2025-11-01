"use client";

import React, { useState } from "react";

export type InterruptItem = { reason?: string; timestamp?: number };

export default function InterruptCatcher({
  onLog,
  className,
}: {
  onLog?: (i: InterruptItem) => void;
  className?: string;
}) {
  const [reason, setReason] = useState("");

  const handleLog = () => {
    const item: InterruptItem = { reason: reason.trim() || "Interrupt", timestamp: Date.now() };
    onLog?.(item);
    setReason("");
    try { (navigator as any)?.vibrate?.(15); } catch {}
  };

  return (
    <div className={className ?? ""}>
      <div className="flex items-center gap-2">
        <input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="What interrupted you?"
          className="border rounded px-2 py-1 text-sm w-56"
        />
        <button onClick={handleLog} className="px-3 py-1.5 rounded bg-rose-600 text-white text-sm" title="Log interrupt">
          Log
        </button>
      </div>
    </div>
  );
}
