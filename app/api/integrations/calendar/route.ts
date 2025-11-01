import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { loadToken } from "@/lib/integrations/tokens";
import { createGoogleEvent, createOutlookEvent } from "@/lib/integrations/calendar";
import type { Provider } from "@/lib/integrations/types";

function sb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
}

export async function POST(req: Request) {
  const supabase = sb();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "not_signed_in" }, { status: 401 });

  const body = await req.json();
  const provider = (body.provider || "") as Provider;
  const ev = body.event;

  const token = await loadToken(user.id, provider);
  if (!token) return NextResponse.json({ error: "no_token" }, { status: 400 });

  let out: any;
  if (provider === "google") out = await createGoogleEvent(token, ev);
  if (provider === "outlook") out = await createOutlookEvent(token, ev);
  if (!out) return NextResponse.json({ error: "unsupported_provider" }, { status: 400 });

  return NextResponse.json({ ok: true, provider, data: out });
}
