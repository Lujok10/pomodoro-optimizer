"use client";

import React, { useState } from "react";
import { useSupabaseUser } from "@/lib/supabase/useUser";
import { supabase } from "@/lib/supabase/client";
import { useHydratedState } from "@/lib/hooks";
import { DateTime } from "luxon";

type Task = { id: number; name: string; impact: number; duration: number; project?: string };

export default function IntegrationsPanel() {
  const { user } = useSupabaseUser();
  const sb = supabase;

  const [busy, setBusy] = useState<string | null>(null);
  const [tasks] = useHydratedState<Task[]>([], () => {
    try { return JSON.parse(localStorage.getItem("pom_tasks") || "[]"); } catch { return []; }
  });

  const connectGoogle = async () => {
    const redirectTo = `${window.location.origin}`;
    await sb.auth.signInWithOAuth({
      provider: "google",
      options: {
        scopes: "https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/tasks.readonly",
        redirectTo
      }
    });
  };

  const connectOutlook = async () => {
    const redirectTo = `${window.location.origin}`;
    await sb.auth.signInWithOAuth({
      provider: "azure",
      options: {
        scopes: "offline_access Calendars.ReadWrite User.Read Tasks.Read",
        redirectTo
      }
    });
  };

  const connectCustom = (p: "todoist" | "trello" | "asana") => {
    window.location.href = `/api/integrations/oauth/start?provider=${p}`;
  };

  const syncFrom = async (provider: string) => {
    setBusy(`sync:${provider}`);
    try {
      const res = await fetch("/api/integrations/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, localTasks: tasks })
      });
      const json = await res.json();
      if (json.merged) {
        localStorage.setItem("pom_tasks", JSON.stringify(json.merged));
        alert(`Synced ${provider}. Added ${json.added?.length ?? 0} tasks.`);
        window.location.reload();
      } else {
        alert(`Sync failed: ${json.error || "unknown"}`);
      }
    } finally {
      setBusy(null);
    }
  };

  const writeBlockToCalendar = async (provider: "google" | "outlook") => {
    // demo: create a 25-min event starting now
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    const start = DateTime.now().setZone(tz);
    const end = start.plus({ minutes: 25 });
    const res = await fetch("/api/integrations/calendar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        provider,
        event: {
          title: "Focus block (Optimapp)",
          startISO: start.toISO(),
          endISO: end.toISO(),
          timezone: tz,
          description: "Auto-created focus block"
        }
      })
    });
    const json = await res.json();
    if (json.ok) alert(`Event created on ${provider}`);
    else alert(`Calendar error: ${json.error || "unknown"}`);
  };

  return (
    <section className="rounded-xl border dark:border-neutral-800 bg-white/70 dark:bg-neutral-900/60 backdrop-blur p-4 shadow-sm mb-6">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-indigo-700 dark:text-indigo-400">Integrations</h2>
        {!user && <span className="text-xs text-gray-500">Sign in to connect</span>}
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-3">
        <Card
          title="Google (Tasks + Calendar)"
          onConnect={connectGoogle}
          onSync={() => syncFrom("google")}
          onWrite={() => writeBlockToCalendar("google")}
          busy={busy?.startsWith("sync:google")}
        />
        <Card
          title="Outlook (To Do + Calendar)"
          onConnect={connectOutlook}
          onSync={() => syncFrom("outlook")}
          onWrite={() => writeBlockToCalendar("outlook")}
          busy={busy?.startsWith("sync:outlook")}
        />
        <Card
          title="Todoist"
          onConnect={() => connectCustom("todoist")}
          onSync={() => syncFrom("todoist")}
          busy={busy?.startsWith("sync:todoist")}
        />
        <Card
          title="Trello"
          onConnect={() => connectCustom("trello")}
          onSync={() => syncFrom("trello")}
          busy={busy?.startsWith("sync:trello")}
        />
        <Card
          title="Asana"
          onConnect={() => connectCustom("asana")}
          onSync={() => syncFrom("asana")}
          busy={busy?.startsWith("sync:asana")}
        />
      </div>

      <p className="text-xs text-gray-600 dark:text-gray-300 mt-3">
        Dedupe uses title+project. Conflicts prefer the most recently updated item when available; otherwise your local task wins.
      </p>
    </section>
  );
}

function Card({
  title,
  onConnect,
  onSync,
  onWrite,
  busy
}: {
  title: string;
  onConnect: () => void;
  onSync: () => void;
  onWrite?: () => void;
  busy?: boolean | null;
}) {
  return (
    <div className="rounded-lg border dark:border-neutral-800 p-3 bg-white/60 dark:bg-neutral-900/40">
      <div className="font-medium text-sm mb-2">{title}</div>
      <div className="flex gap-2">
        <button className="border rounded px-3 py-1 text-xs" onClick={onConnect}>Connect</button>
        <button className="border rounded px-3 py-1 text-xs" onClick={onSync} disabled={!!busy}>{busy ? "Sync…" : "Sync"}</button>
        {onWrite && <button className="border rounded px-3 py-1 text-xs" onClick={onWrite}>Write block</button>}
      </div>
    </div>
  );
}
