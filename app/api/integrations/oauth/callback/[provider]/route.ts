import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { saveToken } from "@/lib/integrations/tokens";

function sb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
}

export async function GET(req: Request, { params }: { params: { provider: string }}) {
  const provider = params.provider;
  const url = new URL(req.url);
  const supabase = sb();
  const { data: { user } } = await supabase.auth.getUser();
  // Not signed in → send home
  if (!user) return NextResponse.redirect("/");

  if (provider === "todoist") {
    const code = url.searchParams.get("code");
    // Todoist uses standard auth code
    const tokenRes = await fetch("https://todoist.com/oauth/access_token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.TODOIST_CLIENT_ID!,
        client_secret: process.env.TODOIST_CLIENT_SECRET!,
        code: code || ""
      })
    });
    const tok = await tokenRes.json();
    await saveToken(user.id, "todoist", { access_token: tok.access_token });
    return NextResponse.redirect("/?connected=todoist");
  }

  if (provider === "trello") {
    // Trello implicit flow returns token in URL hash; cannot be captured server-side.
    // Dev note: prompt to paste token or run client-side start; we just bounce home.
    return NextResponse.redirect("/?trello_token_in_hash=1");
  }

  if (provider === "asana") {
    const code = url.searchParams.get("code");
    const tokenRes = await fetch("https://app.asana.com/-/oauth_token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: process.env.ASANA_CLIENT_ID!,
        client_secret: process.env.ASANA_CLIENT_SECRET!,
        redirect_uri: `${process.env.NEXT_PUBLIC_OAUTH_REDIRECT_BASE}/api/integrations/oauth/callback/asana`,
        code: code || ""
      })
    });
    const tok = await tokenRes.json();
    await saveToken(user.id, "asana", {
      access_token: tok.access_token,
      refresh_token: tok.refresh_token,
      expires_at: tok.expires_in ? new Date(Date.now()+tok.expires_in*1000).toISOString() : undefined
    });
    return NextResponse.redirect("/?connected=asana");
  }

  return NextResponse.redirect("/");
}
