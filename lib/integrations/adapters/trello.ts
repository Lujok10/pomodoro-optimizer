import type { ExternalTask, TokenRecord } from "../types";

export async function fetchTrelloCards(token: TokenRecord & { key?: string }): Promise<ExternalTask[]> {
  // Trello uses key + token query params
  const key = process.env.TRELLO_KEY!;
  const res = await fetch(`https://api.trello.com/1/members/me/boards?key=${key}&token=${token.access_token}`);
  if (!res.ok) return [];
  const boards = await res.json();
  const out: ExternalTask[] = [];
  for (const b of boards ?? []) {
    const listsRes = await fetch(`https://api.trello.com/1/boards/${b.id}/lists?cards=open&key=${key}&token=${token.access_token}`);
    if (!listsRes.ok) continue;
    const lists = await listsRes.json();
    for (const l of lists ?? []) {
      for (const c of l.cards ?? []) {
        out.push({
          id: c.id,
          title: c.name,
          project: b.name,
          durationMin: 30,
          updatedAt: c.dateLastActivity,
          raw: c
        });
      }
    }
  }
  return out;
}
