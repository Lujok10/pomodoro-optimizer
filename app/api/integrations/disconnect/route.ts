// app/api/integrations/disconnect/route.ts
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { provider } = await req.json().catch(() => ({}));
  const jar = cookies();
  const expire = new Date(0).toUTCString();

  if (provider === "google" || provider === "all") {
    jar.set("google_refresh_token", "", { path: "/", expires: new Date(0) });
    jar.set("google_email", "", { path: "/", expires: new Date(0) });
  }
  if (provider === "microsoft" || provider === "all") {
    jar.set("ms_refresh_token", "", { path: "/", expires: new Date(0) });
    jar.set("ms_email", "", { path: "/", expires: new Date(0) });
  }

  // Optional: you can also revoke tokens at each provider here if you store access tokens.

  return NextResponse.json({ ok: true });
}
