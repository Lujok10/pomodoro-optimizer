import type { ExternalTask, TokenRecord } from "../types";

export async function fetchAsanaTasks(token: TokenRecord): Promise<ExternalTask[]> {
  // Get workspaces, then tasks assigned to me
  const me = await fetch("https://app.asana.com/api/1.0/users/me", {
    headers: { Authorization: `Bearer ${token.access_token}` }
  }).then(r => r.ok ? r.json() : null);
  if (!me) return [];
  const gid = me?.data?.gid;
  const res = await fetch(`https://app.asana.com/api/1.0/tasks?assignee=${gid}&workspace=${me?.data?.workspaces?.[0]?.gid}&completed_since=now&opt_fields=name,projects.name,modified_at`, {
    headers: { Authorization: `Bearer ${token.access_token}` }
  });
  if (!res.ok) return [];
  const data = await res.json();
  return (data.data ?? []).map((t: any) => ({
    id: t.gid,
    title: t.name,
    project: t.projects?.[0]?.name,
    durationMin: 45,
    updatedAt: t.modified_at,
    raw: t
  }));
}
