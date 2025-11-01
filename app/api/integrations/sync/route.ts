import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { loadToken } from "@/lib/integrations/tokens";
import { mapAndDedupe } from "@/lib/integrations/dedupe";
import type { Provider, Task } from "@/lib/integrations/types";
import { fetchGoogleTasks } from "@/lib/integrations/adapters/google";
import { fetchOutlookTasks } from "@/lib/integrations/adapters/outlook";
import { fetchTodoistTasks } from "@/lib/integrations/adapters/todoist";
import { fetchTrelloCards } from "@/lib/integrations/adapters/trello";
import { fetchAsanaTasks } from "@/lib/integrations/adapters/asana";

function sb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
}

export async function POST(req: Request) {
  const supabase = sb();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "not_signed_in" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const provider = (body.provider || "") as Provider;
  const local: Task[] = Array.isArray(body.localTasks) ? body.localTasks : [];

  // Pull from provider
  const token = await loadToken(user.id, provider);
  if (!token) return NextResponse.json({ error: "no_token" }, { status: 400 });

  let external: any[] = [];
  if (provider === "google") external = await fetchGoogleTasks(token);
  if (provider === "outlook") external = await fetchOutlookTasks(token);
  if (provider === "todoist") external = await fetchTodoistTasks(token);
  if (provider === "trello") external = await fetchTrelloCards(token as any);
  if (provider === "asana") external = await fetchAsanaTasks(token);

  const { merged, added, conflicts } = mapAndDedupe(external, local);

  // Persist external_items rows (best-effort)
  try {
    const rows = external.slice(0, 500).map((e: any) => ({
      user_id: user.id,
      provider,
      external_id: e.id,
      fingerprint: `${(e.title||"")}|${(e.project||"")}`.toLowerCase(),
      payload: e.raw ?? e,
      mapped: { title: e.title, project: e.project, durationMin: e.durationMin }
    }));
    await sb().from("external_items").upsert(rows);
  } catch {}

  return NextResponse.json({ merged, added, conflicts });
}
