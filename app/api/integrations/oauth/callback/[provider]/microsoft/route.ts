import { NextRequest, NextResponse } from "next/server";

const TOKEN_URL = `https://login.microsoftonline.com/${process.env.MICROSOFT_TENANT_ID || "common"}/oauth2/v2.0/token`;

async function exchangeCode(code: string) {
  const body = new URLSearchParams({
    client_id: process.env.MICROSOFT_CLIENT_ID!,
    client_secret: process.env.MICROSOFT_CLIENT_SECRET!,
    grant_type: "authorization_code",
    code,
    redirect_uri: process.env.MICROSOFT_REDIRECT_URI!,
  });

  const r = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!r.ok) throw new Error(`Token exchange failed: ${r.status} ${await r.text()}`);
  return r.json() as Promise<{
    token_type: string;
    scope: string;
    expires_in: number;
    ext_expires_in: number;
    access_token: string;
    refresh_token: string;
    id_token?: string;
  }>;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const cookieState = req.cookies.get("oauth_state_ms")?.value;

  if (!code || !state || !cookieState || state !== cookieState) {
    return NextResponse.json({ error: "invalid_state_or_code" }, { status: 400 });
  }

  try {
    const tokens = await exchangeCode(code);

    // ⬇️ store refresh token securely; simplest: HttpOnly cookie (or Supabase table)
    const res = NextResponse.redirect(new URL("/?connected=microsoft", req.url));
    res.cookies.set("ms_refresh_token", tokens.refresh_token, {
      httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 90,
    });
    // (Optional) short-lived access token cookie to avoid an extra refresh on first call
    res.cookies.set("ms_access_token", tokens.access_token, {
      httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 60 * 60,
    });
    res.cookies.delete("oauth_state_ms");
    return res;
  } catch (e: any) {
    return NextResponse.json({ error: "callback_failed", detail: String(e?.message || e) }, { status: 400 });
  }
}
