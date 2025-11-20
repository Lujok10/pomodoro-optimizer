// app/api/inputs/summary/route.ts
import { NextResponse } from "next/server";

// Helper: call your own routes locally without hardcoding domain
async function callLocal(path: string) {
  const res = await fetch(path, { cache: "no-store" });
  if (!res.ok) throw new Error(`${path} failed: ${res.status}`);
  return res.json();
}

/**
 * Returns a unified view:
 * {
 *   google: { busyMinutes, busyHours, source },
 *   microsoft: { busyMinutes, busyHours, source },
 *   total: { busyMinutes, busyHours },
 * }
 */
export async function GET() {
  try {
    // Google busy (existing)
    const g = await callLocal(`${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/calendar/busy`).catch(() => ({
      busyMinutes: 0,
      busyHours: 0,
      source: "no-auth",
    }));

    // Microsoft busy (new route below)
    const m = await callLocal(`${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/microsoft/busy`).catch(() => ({
      busyMinutes: 0,
      busyHours: 0,
      source: "no-auth",
    }));

    const totalBusyMinutes = Math.max(0, Number(g.busyMinutes || 0) + Number(m.busyMinutes || 0));
    return NextResponse.json({
      google: g,
      microsoft: m,
      total: { busyMinutes: totalBusyMinutes, busyHours: Math.round((totalBusyMinutes / 60) * 100) / 100 },
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "failed", google: null, microsoft: null, total: { busyMinutes: 0, busyHours: 0 } },
      { status: 500 }
    );
  }
}
