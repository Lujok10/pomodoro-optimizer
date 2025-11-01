"use client";

import { useEffect, useState } from "react";
//import { useSupabaseUser } from "@/lib/supabase/useUser";
import { useSupabaseUser } from "@/lib/supabase/useUser";
export default function TrelloCapturePage() {
  const { user } = useSupabaseUser();
  const [status, setStatus] = useState("Parsing token…");

  useEffect(() => {
    // The token is returned by Trello in the URL hash: #token=...&...
    const hash = window.location.hash || "";
    const params = new URLSearchParams(hash.startsWith("#") ? hash.slice(1) : hash);
    const token = params.get("token");

    if (!token) {
      setStatus("No token found in URL. Did you grant access?");
      return;
    }

    (async () => {
      try {
        setStatus("Saving token…");
        const res = await fetch("/api/integrations/oauth/save/trello", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        const json = await res.json();
        if (!res.ok || !json?.ok) {
          setStatus(`Save failed: ${json?.error || res.statusText}`);
          return;
        }
        setStatus("Connected! Redirecting…");
        // Clean up hash and bounce to home with a hint
        const cleanUrl = `${window.location.origin}/?connected=trello`;
        window.location.replace(cleanUrl);
      } catch (e: any) {
        setStatus(`Error: ${e?.message || "unknown"}`);
      }
    })();
  }, [user]);

  return (
    <div className="min-h-screen grid place-items-center p-6">
      <div className="max-w-sm w-full rounded-xl border dark:border-neutral-800 bg-white/70 dark:bg-neutral-900/60 p-4">
        <div className="text-sm font-semibold mb-1">Trello connection</div>
        <div className="text-sm text-gray-700 dark:text-gray-300">{status}</div>
        {!user && (
          <div className="text-xs text-amber-700 dark:text-amber-300 mt-2">
            You are not signed in. Please sign in and try again.
          </div>
        )}
      </div>
    </div>
  );
}
