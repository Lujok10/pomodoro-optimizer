"use client";
import React from "react";
import { useCloudSync } from "@/lib/useCloudSync";

export default function CloudSyncBar() {
  const { state, signInWith, signOut, pull, push, backupNow, listBackups, restoreBackup } = useCloudSync();
  const [backups, setBackups] = React.useState<{ id: number; created_at: string }[]>([]);
  const [show, setShow] = React.useState(false);

  return (
    <div className="mb-3 rounded-xl border dark:border-neutral-800 bg-white/70 dark:bg-neutral-900/60 backdrop-blur p-3 flex flex-wrap items-center gap-2 text-sm">
      {!state.signedIn ? (
        <>
          <span className="text-gray-700 dark:text-gray-300">Sync is off.</span>
          <button onClick={() => signInWith("github")} className="border rounded px-2 py-1">Sign in with GitHub</button>
          <button onClick={() => signInWith("google")} className="border rounded px-2 py-1">Google</button>
          <button onClick={() => signInWith("anonymous")} className="border rounded px-2 py-1">Continue anonymously</button>
        </>
      ) : (
        <>
          <span className="text-gray-700 dark:text-gray-300">
            Cloud sync {state.syncing ? "…syncing" : "ready"} {state.lastSyncedAt ? `· ${new Date(state.lastSyncedAt).toLocaleTimeString()}` : ""}
          </span>
          <button onClick={pull} className="border rounded px-2 py-1">Pull</button>
          <button onClick={push} className="border rounded px-2 py-1">Push</button>
          <button onClick={async () => { await backupNow(); }} className="border rounded px-2 py-1">Backup now</button>
          <button
            onClick={async () => {
              setShow((s) => !s);
              if (!show) setBackups(await listBackups());
            }}
            className="border rounded px-2 py-1"
          >
            {show ? "Hide backups" : "Restore…"}
          </button>
          <button onClick={signOut} className="border rounded px-2 py-1">Sign out</button>
          {state.error && <span className="text-red-600"> · {state.error}</span>}
          {show && (
            <div className="basis-full">
              <ul className="mt-2 space-y-1">
                {backups.map((b) => (
                  <li key={String(b.id)} className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">{new Date(b.created_at).toLocaleString()}</span>
                    <button className="border rounded px-2 py-1 text-xs" onClick={() => restoreBackup(b.id)}>Restore</button>
                  </li>
                ))}
                {backups.length === 0 && <li className="text-xs text-gray-500">No backups yet.</li>}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}

