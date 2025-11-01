import { NextResponse } from "next/server";

const base = process.env.NEXT_PUBLIC_OAUTH_REDIRECT_BASE!;

const providers: Record<string, { authUrl: string; params: Record<string, string> }> = {
  todoist: {
    authUrl: "https://todoist.com/oauth/authorize",
    params: {
      client_id: process.env.TODOIST_CLIENT_ID!,
      scope: "data:read",
      state: "todoist_x",
      redirect_uri: `${base}/api/integrations/oauth/callback/todoist`,
    },
  },
  // 👇 Trello uses an implicit flow that returns the token in the URL hash
  trello: {
    authUrl: "https://trello.com/1/authorize",
    params: {
      expiration: "never",
      name: "Optimapp",
      scope: "read",
      response_type: "token",
      key: process.env.TRELLO_KEY!,
      // IMPORTANT: send Trello back to a client page (not an API route) so we can read window.location.hash
      return_url: `${base}/integrations/trello/capture`,
    },
  },
  asana: {
    authUrl: "https://app.asana.com/-/oauth_authorize",
    params: {
      client_id: process.env.ASANA_CLIENT_ID!,
      response_type: "code",
      redirect_uri: `${base}/api/integrations/oauth/callback/asana`,
      state: "asana_x",
    },
  },
};

export async function GET(req: Request) {
  const url = new URL(req.url);
  const provider = url.searchParams.get("provider") || "";
  const p = providers[provider];
  if (!p) return NextResponse.json({ error: "unknown provider" }, { status: 400 });
  const qs = new URLSearchParams(p.params).toString();
  return NextResponse.redirect(`${p.authUrl}?${qs}`);
}
