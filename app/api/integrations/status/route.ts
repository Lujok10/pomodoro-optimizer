// app/api/integrations/status/route.ts
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export function GET() {
  const jar = cookies();
  const g = !!jar.get("google_refresh_token");
  const m = !!jar.get("ms_refresh_token");
  const googleEmail = jar.get("google_email")?.value ?? null;
  const msEmail = jar.get("ms_email")?.value ?? null;

  return NextResponse.json({
    google: { connected: g, email: googleEmail },
    microsoft: { connected: m, email: msEmail },
  });
}
