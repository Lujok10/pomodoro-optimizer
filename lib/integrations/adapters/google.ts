import type { ExternalTask, TokenRecord } from "../types";

export async function fetchGoogleTasks(token: TokenRecord): Promise<ExternalTask[]> {
  const items: ExternalTask[] = [];
  // Google Tasks: list all tasklists, then tasks in each
  const listsRes = await fetch("https://www.googleapis.com/tasks/v1/users/@me/lists", {
    headers: { Authorization: `Bearer ${token.access_token}` }
  });
  if (!listsRes.ok) return items;
  const lists = await listsRes.json();
  for (const l of lists.items ?? []) {
    const tasksRes = await fetch(`https://www.googleapis.com/tasks/v1/lists/${l.id}/tasks`, {
      headers: { Authorization: `Bearer ${token.access_token}` }
    });
    if (!tasksRes.ok) continue;
    const tjson = await tasksRes.json();
    for (const t of tjson.items ?? []) {
      items.push({
        id: t.id,
        title: t.title,
        project: l.title,
        durationMin: 30,
        updatedAt: t.updated ?? t.completed ?? t.due ?? undefined,
        raw: t
      });
    }
  }
  return items;
}
