// app/api/microsoft/busy/route.ts
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const MS_TOKEN_URL = "https://login.microsoftonline.com/common/oauth2/v2.0/token";
// Scope needs Calendars.Read or equivalent consent during your OAuth flow
const SCOPE = "https://graph.microsoft.com/.default";
const GRAPH = "https://graph.microsoft.com/v1.0";

async function refreshAccessToken(refreshToken: string, clientId: string, clientSecret: string) {
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    scope: SCOPE,
  });
  const r = await fetch(MS_TOKEN_URL, { method: "POST", body });
  if (!r.ok) throw new Error(`refresh failed ${r.status}`);
  return r.json() as Promise<{ access_token: string; expires_in: number }>;
}

export async function GET() {
  // We expect you set these envs in Vercel/locally
  const clientId = process.env.MICROSOFT_CLIENT_ID!;
  const clientSecret = process.env.MICROSOFT_CLIENT_SECRET!;
  if (!clientId || !clientSecret) {
    return NextResponse.json({ busyMinutes: 0, busyHours: 0, source: "missing-env" });
  }

  const jar = cookies();
  const refreshToken = jar.get("ms_refresh_token")?.value;
  if (!refreshToken) {
    return NextResponse.json({ busyMinutes: 0, busyHours: 0, source: "no-auth" });
  }

  try {
    const tok = await refreshAccessToken(refreshToken, clientId, clientSecret);

    // Pull today's events and compute busy minutes quickly
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    const url =
      `${GRAPH}/me/calendarView?startDateTime=${start.toISOString()}&endDateTime=${end.toISOString()}&$select=subject,start,end,isAllDay,showAs&$top=1000`;

    const r = await fetch(url, {
      headers: { Authorization: `Bearer ${tok.access_token}` },
      cache: "no-store",
    });

    if (!r.ok) throw new Error(`graph ${r.status}`);
    const data = await r.json() as { value: Array<{ start: { dateTime: string }, end: { dateTime: string }, showAs?: string }> };

    let minutes = 0;
    for (const ev of data.value ?? []) {
      // Only count busy/showAs != "free"
      if ((ev.showAs || "").toLowerCase() === "free") continue;
      const s = new Date(ev.start?.dateTime || "").getTime();
      const e = new Date(ev.end?.dateTime || "").getTime();
      if (!isFinite(s) || !isFinite(e) || e <= s) continue;
      minutes += Math.max(0, Math.round((e - s) / 60000));
    }

    return NextResponse.json({ busyMinutes: minutes, busyHours: Math.round((minutes / 60) * 100) / 100, source: "microsoft" });
  } catch (e: any) {
    return NextResponse.json({ busyMinutes: 0, busyHours: 0, source: "error", error: e?.message || "graph-failed" }, { status: 200 });
  }
}
