"use client";

import { isBlocked } from "@/lib/proGate";
import Link from "next/link";
import React from "react";

export default function ProGate({
  feature,
  children,
}: {
  feature: "streaks>7" | "ai-triage" | "weekly-ai" | "export" | "calendar-auto";
  children: React.ReactNode;
}) {
  const blocked = isBlocked?.(feature) ?? false;
  if (!blocked) return <>{children}</>;

  return (
    <div className="relative">
      <div className="pointer-events-none blur-sm opacity-60">{children}</div>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="rounded-xl border bg-white/90 px-4 py-3 shadow">
          <div className="text-sm font-semibold text-indigo-700">Pro Feature</div>
          <div className="mt-1 text-xs text-gray-600">Unlock to continue.</div>
          <Link href="/pro" className="mt-2 inline-block rounded bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white">
            Upgrade
          </Link>
        </div>
      </div>
    </div>
  );
}
