// components/ConnectedChip.tsx
"use client";
import { useEffect, useState } from "react";

type Status = {
  google: { connected: boolean; email: string | null };
  microsoft: { connected: boolean; email: string | null };
};

export default function ConnectedChip() {
  const [s, setS] = useState<Status | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/integrations/status", { cache: "no-store" });
      setS(await res.json());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); }, []);

  const disconnect = async (provider: "google" | "microsoft") => {
    await fetch("/api/integrations/disconnect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider }),
    });
    refresh();
  };

  if (loading) return null;

  const items = [
    s?.google?.connected && {
      label: `Google: ${s?.google?.email ?? "connected"}`,
      action: () => disconnect("google"),
    },
    s?.microsoft?.connected && {
      label: `Microsoft: ${s?.microsoft?.email ?? "connected"}`,
      action: () => disconnect("microsoft"),
    },
  ].filter(Boolean) as Array<{ label: string; action: () => void }>;

  if (!items.length) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {items.map((it, i) => (
        <span key={i} className="inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs bg-white/70 dark:bg-neutral-900/50">
          <span>{it.label}</span>
          <button onClick={it.action} className="rounded border px-1.5 py-0.5 text-[11px] hover:bg-gray-50 dark:hover:bg-neutral-800">
            Disconnect
          </button>
        </span>
      ))}
    </div>
  );
}
