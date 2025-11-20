// app/api/integrations/oauth/start/route.ts
import { NextRequest, NextResponse } from "next/server";

// Resolve a base URL safely (works locally + Vercel)
function resolveBase(): string {
  const env =
    process.env.NEXT_PUBLIC_OAUTH_REDIRECT_BASE ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "");
  if (!env) throw new Error("Missing NEXT_PUBLIC_OAUTH_REDIRECT_BASE (or SITE_URL/VERCEL_URL).");
  return env.replace(/\/+$/, "");
}

const BASE = resolveBase();

// tiny helper to omit undefined/empty values from query
function qs(params: Record<string, string | undefined | null>) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && String(v).length > 0) sp.set(k, String(v));
  }
  return sp.toString();
}

/** OAuth configs for simple providers that don't need custom logic here */
const SIMPLE_PROVIDERS: Record<
  string,
  { authUrl: string; params: Record<string, string | undefined> }
> = {
  todoist: {
    authUrl: "https://todoist.com/oauth/authorize",
    params: {
      client_id: process.env.TODOIST_CLIENT_ID,
      scope: "data:read",
      state: "todoist_x",
      redirect_uri: `${BASE}/api/integrations/oauth/callback/todoist`,
    },
  },
  // Trello returns access token in URL hash → send back to a client page
  trello: {
    authUrl: "https://trello.com/1/authorize",
    params: {
      expiration: "never",
      name: "Optimapp",
      scope: "read",
      response_type: "token",
      key: process.env.TRELLO_KEY,
      return_url: `${BASE}/integrations/trello/capture`,
    },
  },
  asana: {
    authUrl: "https://app.asana.com/-/oauth_authorize",
    params: {
      client_id: process.env.ASANA_CLIENT_ID,
      response_type: "code",
      redirect_uri: `${BASE}/api/integrations/oauth/callback/asana`,
      state: "asana_x",
    },
  },
};

/** Microsoft (Entra ID) – needs state cookie, etc. */
const MS = {
  authUrl: (tenant = process.env.MICROSOFT_TENANT_ID || "common") =>
    `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/authorize`,
  scope: [
    "openid",
    "offline_access",
    "email",
    "profile",
    "User.Read",
    "Calendars.Read",
    "Tasks.Read",
  ].join(" "),
  clientId: process.env.MICROSOFT_CLIENT_ID,
  redirectUri:
    process.env.MICROSOFT_REDIRECT_URI ||
    `${BASE}/api/integrations/oauth/callback/microsoft`,
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const provider = (searchParams.get("provider") || "").toLowerCase();

  // Microsoft special flow
  if (provider === "microsoft") {
    if (!MS.clientId) {
      return NextResponse.json(
        { error: "MICROSOFT_CLIENT_ID not set" },
        { status: 400 }
      );
    }
    const state = crypto.randomUUID();
    const url = new URL(MS.authUrl());
    url.search = qs({
      client_id: MS.clientId,
      response_type: "code",
      redirect_uri: MS.redirectUri,
      response_mode: "query",
      scope: MS.scope,
      state,
    });

    const res = NextResponse.redirect(url.toString());
    // httpOnly cookie for CSRF state
    res.cookies.set("oauth_state_ms", state, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 10, // 10 minutes
    });
    return res;
  }

  // Simple providers (Todoist/Trello/Asana)
  const cfg = SIMPLE_PROVIDERS[provider];
  if (!cfg) {
    return NextResponse.json({ error: "Unsupported provider" }, { status: 400 });
  }

  // Make sure required params exist (e.g., client IDs)
  const query = qs(cfg.params);
  if (!query) {
    return NextResponse.json(
      { error: "Provider missing required environment variables" },
      { status: 400 }
    );
  }

  return NextResponse.redirect(`${cfg.authUrl}?${query}`);
}
