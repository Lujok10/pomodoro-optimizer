const TOKEN_URL = `https://login.microsoftonline.com/${process.env.MICROSOFT_TENANT_ID || "common"}/oauth2/v2.0/token`;

export async function refreshWithCookie(cookies: Headers): Promise<string> {
  const cookie = cookies.get("cookie") || "";
  const refreshToken = /(?:^|;\s*)ms_refresh_token=([^;]+)/.exec(cookie)?.[1];
  if (!refreshToken) throw new Error("not_signed_in");

  const body = new URLSearchParams({
    client_id: process.env.MICROSOFT_CLIENT_ID!,
    client_secret: process.env.MICROSOFT_CLIENT_SECRET!,
    grant_type: "refresh_token",
    refresh_token: decodeURIComponent(refreshToken),
    redirect_uri: process.env.MICROSOFT_REDIRECT_URI!,
  });

  const r = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
  });
  if (!r.ok) throw new Error(`refresh_failed: ${r.status} ${await r.text()}`);
  const j = await r.json() as any;
  return j.access_token as string;
}
