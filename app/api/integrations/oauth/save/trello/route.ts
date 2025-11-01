import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { saveToken } from "@/lib/integrations/tokens";

function sb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export async function POST(req: Request) {
  const supabase = sb();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "not_signed_in" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const token = body?.token as string | undefined;
  if (!token) return NextResponse.json({ error: "missing_token" }, { status: 400 });

  try {
    await saveToken(user.id, "trello", { access_token: token });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "save_failed" }, { status: 500 });
  }
}
