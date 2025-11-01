import type { ExternalTask, TokenRecord } from "../types";

export async function fetchTodoistTasks(token: TokenRecord): Promise<ExternalTask[]> {
  const res = await fetch("https://api.todoist.com/rest/v2/tasks", {
    headers: { Authorization: `Bearer ${token.access_token}` }
  });
  if (!res.ok) return [];
  const arr = await res.json();
  return (arr as any[]).map(t => ({
    id: t.id,
    title: t.content,
    project: t.project_id ? String(t.project_id) : undefined,
    durationMin: (t.duration && t.duration.amount) ? Number(t.duration.amount) : 30,
    updatedAt: t.due?.date ?? t.added_at ?? undefined,
    raw: t
  }));
}
