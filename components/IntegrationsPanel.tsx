"use client";

import React, { useState } from "react";
import { DateTime } from "luxon";

import { useSupabaseUser } from "@/lib/supabase/useUser";
import { supabase } from "@/lib/supabase/client";
import { useHydratedState } from "@/lib/hooks";

type Task = {
  id: number;
  name: string;
  impact: number;
  duration: number;
  project?: string;
};

export default function IntegrationsPanel() {
  const { user } = useSupabaseUser();
  const sb = supabase;

  const [busy, setBusy] = useState<string | null>(null);

  const [tasks] = useHydratedState<Task[]>([], () => {
    try {
      return JSON.parse(localStorage.getItem("pom_tasks") || "[]");
    } catch {
      return [];
    }
  });

  /* ---------------------------- CONNECT HANDLERS ---------------------------- */

  const connectGoogle = async () => {
    if (typeof window === "undefined") return;

    const redirectTo = window.location.origin;
    await sb.auth.signInWithOAuth({
      provider: "google",
      options: {
        // Include identity scopes so Supabase can get email
        scopes: [
          "openid",
          "email",
          "profile",
          "https://www.googleapis.com/auth/calendar.readonly",
          "https://www.googleapis.com/auth/tasks.readonly",
        ].join(" "),
        redirectTo,
        // Encourage refresh token issuance
        queryParams: { access_type: "offline", prompt: "consent" },
      },
    });
  };

  const connectOutlook = async () => {
    if (typeof window === "undefined") return;

    const redirectTo = window.location.origin;
    await sb.auth.signInWithOAuth({
      provider: "azure", // Supabase Azure provider key
      options: {
        // Identity + Graph scopes so Supabase can read email + calendar + tasks
        scopes: [
          "openid",
          "email",
          "profile",
          "offline_access",
          "User.Read",
          "Calendars.Read",
          "Tasks.Read",
        ].join(" "),
        redirectTo,
      },
    });
  };

  const connectCustom = (p: "todoist" | "trello" | "asana") => {
    if (typeof window === "undefined") return;
    window.location.href = `/api/integrations/oauth/start?provider=${p}`;
  };

  /* ------------------------------ SYNC HANDLERS ----------------------------- */

  const syncFrom = async (provider: string) => {
    setBusy(`sync:${provider}`);
    try {
      const res = await fetch("/api/integrations/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, localTasks: tasks }),
      });

      const json = await res.json();

      if (json.merged) {
        try {
          localStorage.setItem("pom_tasks", JSON.stringify(json.merged));
        } catch {
          // ignore localStorage errors
        }
        alert(`Synced ${provider}. Added ${json.added?.length ?? 0} tasks.`);
        if (typeof window !== "undefined") {
          window.location.reload();
        }
      } else {
        alert(`Sync failed: ${json.error || "unknown"}`);
      }
    } catch (e: any) {
      alert(`Sync error: ${e?.message || "unknown"}`);
    } finally {
      setBusy(null);
    }
  };

  const writeBlockToCalendar = async (provider: "google" | "outlook") => {
    const tz =
      Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

    const start = DateTime.now().setZone(tz);
    const end = start.plus({ minutes: 25 });

    try {
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
            description: "Auto-created focus block",
          },
        }),
      });

      const json = await res.json();
      if (json.ok) {
        alert(`Event created on ${provider}`);
      } else {
        alert(`Calendar error: ${json.error || "unknown"}`);
      }
    } catch (e: any) {
      alert(`Calendar error: ${e?.message || "unknown"}`);
    }
  };

  /* --------------------------------- RENDER --------------------------------- */

  return (
    <section className="rounded-xl border dark:border-neutral-800 bg-white/70 dark:bg-neutral-900/60 backdrop-blur p-4 shadow-sm mb-6">
   <div className="flex items-center justify-between">
  <div className="flex items-center gap-2">
    <h2 className="text-base font-semibold text-indigo-700 dark:text-indigo-400">
      Integrations
    </h2>

    {/* Resources pill */}
    <a
      href="#resources"
      className="text-[11px] inline-flex items-center gap-1 rounded-full border px-2 py-0.5 
                 border-indigo-300/70 text-indigo-700 dark:border-indigo-500/60 
                 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/40 
                 transition-colors"
    >
      Resources
    </a>
  </div>

  {!user && (
    <span className="text-xs text-gray-500 dark:text-gray-400">
      Sign in to connect
    </span>
  )}
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
        Dedupe uses title + project. Conflicts prefer the most recently
        updated item when available; otherwise your local task wins.
      </p>
    </section>
  );
}

/* --------------------------------- CARD UI --------------------------------- */

function Card({
  title,
  onConnect,
  onSync,
  onWrite,
  busy,
}: {
  title: string;
  onConnect: () => void;
  onSync: () => void;
  onWrite?: () => void;
  busy?: boolean | null;
}) {
  const syncing = !!busy;

  return (
    <div className="rounded-lg border dark:border-neutral-800 p-3 bg-white/60 dark:bg-neutral-900/40">
      <div className="font-medium text-sm mb-2">{title}</div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="border rounded px-3 py-1 text-xs hover:bg-gray-50 dark:hover:bg-neutral-800"
          onClick={onConnect}
        >
          Connect
        </button>

        <button
          type="button"
          className="border rounded px-3 py-1 text-xs hover:bg-gray-50 dark:hover:bg-neutral-800 disabled:opacity-60"
          onClick={onSync}
          disabled={syncing}
        >
          {syncing ? "Sync…" : "Sync"}
        </button>

        {onWrite && (
          <button
            type="button"
            className="border rounded px-3 py-1 text-xs hover:bg-gray-50 dark:hover:bg-neutral-800"
            onClick={onWrite}
          >
            Write block
          </button>
        )}
      </div>
    </div>
  );
}
