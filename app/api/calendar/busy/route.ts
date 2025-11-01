// app/api/calendar/busy/route.ts
import { NextResponse } from "next/server";

type BusySlot = { start: string; end: string };
type FreeBusyReply = {
  calendarId: string;
  timeZone: string;
  timeRange: { start: string; end: string };
  busy: BusySlot[];
  busyMinutes: number;
  busyHours: number;
  source: "google" | "no-auth" | "error";
  error?: string;
};

function hasGoogleEnv() {
  return (
    !!process.env.GOOGLE_CLIENT_ID &&
    !!process.env.GOOGLE_CLIENT_SECRET &&
    !!process.env.GOOGLE_REFRESH_TOKEN &&
    !!process.env.GOOGLE_CALENDAR_ID
  );
}

function isoOrDefault(d: string | null | undefined, fallback: Date) {
  if (!d) return fallback.toISOString();
  if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return new Date(`${d}T00:00:00.000Z`).toISOString();
  const dt = new Date(d);
  return Number.isNaN(dt.getTime()) ? fallback.toISOString() : dt.toISOString();
}

function minutesBetween(aISO: string, bISO: string) {
  const a = new Date(aISO).getTime();
  const b = new Date(bISO).getTime();
  return Math.max(0, Math.round((b - a) / 60000));
}

async function getAccessToken(): Promise<string> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN!,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Failed to refresh token (${res.status}): ${text || res.statusText}`);
  }
  const json = (await res.json()) as { access_token?: string };
  if (!json.access_token) throw new Error("No access_token from Google");
  return json.access_token;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const tz = url.searchParams.get("tz") || "America/New_York";

  // default: today → +7 days
  const now = new Date();
  const startOfTodayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
  const defaultStart = startOfTodayUTC;
  const defaultEnd = new Date(startOfTodayUTC.getTime() + 7 * 24 * 60 * 60 * 1000 - 1);

  const timeMin = isoOrDefault(url.searchParams.get("start"), defaultStart);
  const timeMax = isoOrDefault(url.searchParams.get("end"), defaultEnd);

  // If Google env is missing, return the stub payload you saw — but clearly marked.
  if (!hasGoogleEnv()) {
    return NextResponse.json<FreeBusyReply>({
      calendarId: "unknown",
      timeZone: tz,
      timeRange: { start: timeMin, end: timeMax },
      busy: [],
      busyMinutes: 0,
      busyHours: 0,
      source: "no-auth",
      error: "Missing Google env vars on server runtime",
    });
  }

  try {
    const accessToken = await getAccessToken();

    const fbRes = await fetch("https://www.googleapis.com/calendar/v3/freeBusy", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        timeMin,
        timeMax,
        timeZone: tz,
        items: [{ id: process.env.GOOGLE_CALENDAR_ID }],
      }),
    });

    if (!fbRes.ok) {
      const text = await fbRes.text().catch(() => "");
      throw new Error(`freeBusy failed (${fbRes.status}): ${text || fbRes.statusText}`);
    }

    const json = (await fbRes.json()) as {
      timeMin: string;
      timeMax: string;
      calendars: Record<string, { busy?: BusySlot[] }>;
    };

    const calId = process.env.GOOGLE_CALENDAR_ID!;
    const busy = json.calendars?.[calId]?.busy ?? [];
    const busyMinutes = busy.reduce((sum, b) => sum + minutesBetween(b.start, b.end), 0);
    const busyHours = Math.round((busyMinutes / 60) * 100) / 100;

    return NextResponse.json<FreeBusyReply>({
      calendarId: calId,
      timeZone: tz,
      timeRange: { start: json.timeMin || timeMin, end: json.timeMax || timeMax },
      busy,
      busyMinutes,
      busyHours,
      source: "google",
    });
  } catch (err: any) {
    return NextResponse.json<FreeBusyReply>(
      {
        calendarId: process.env.GOOGLE_CALENDAR_ID || "unknown",
        timeZone: tz,
        timeRange: { start: timeMin, end: timeMax },
        busy: [],
        busyMinutes: 0,
        busyHours: 0,
        source: "error",
        error: err?.message || "Unknown error",
      },
      { status: 500 }
    );
  }
}
