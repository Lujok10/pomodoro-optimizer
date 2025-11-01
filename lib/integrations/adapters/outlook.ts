import type { ExternalTask, TokenRecord } from "../types";

export async function fetchOutlookTasks(token: TokenRecord): Promise<ExternalTask[]> {
  const base = "https://graph.microsoft.com/v1.0";
  const listsRes = await fetch(`${base}/me/todo/lists`, {
    headers: { Authorization: `Bearer ${token.access_token}` }
  });
  if (!listsRes.ok) return [];
  const lists = await listsRes.json();
  const out: ExternalTask[] = [];
  for (const l of lists.value ?? []) {
    const tasksRes = await fetch(`${base}/me/todo/lists/${l.id}/tasks`, {
      headers: { Authorization: `Bearer ${token.access_token}` }
    });
    if (!tasksRes.ok) continue;
    const tjson = await tasksRes.json();
    for (const t of tjson.value ?? []) {
      out.push({
        id: t.id,
        title: t.title,
        project: l.displayName,
        durationMin: 30,
        updatedAt: t.lastModifiedDateTime,
        raw: t
      });
    }
  }
  return out;
}
