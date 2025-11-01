import crypto from "crypto";
import type { ExternalTask, Task } from "./types";

export function normalizeForHash(t: ExternalTask) {
  const s = `${(t.title||"").trim().toLowerCase()}|${(t.project||"").trim().toLowerCase()}`;
  return s;
}
export function fingerprint(t: ExternalTask) {
  return crypto.createHash("sha1").update(normalizeForHash(t)).digest("hex");
}

/** Convert ExternalTask[] → your Task[], dedupe with local by name+project. */
export function mapAndDedupe(
  external: ExternalTask[],
  local: Task[]
): { merged: Task[]; added: Task[]; conflicts: { local: Task; incoming: ExternalTask }[] } {
  const localKey = (t: Task) => `${t.name.trim().toLowerCase()}|${(t.project||"").trim().toLowerCase()}`;
  const localMap = new Map(local.map(t => [localKey(t), t]));
  const merged = [...local];
  const added: Task[] = [];
  const conflicts: { local: Task; incoming: ExternalTask }[] = [];

  for (const e of external) {
    const key = `${(e.title||"").trim().toLowerCase()}|${(e.project||"").trim().toLowerCase()}`;
    const exists = localMap.get(key);
    if (exists) {
      // Conflict resolution: prefer newest (by updatedAt), else prefer local.
      const inDur = Math.max(5, Math.round(e.durationMin ?? exists.duration));
      const inImpact = Math.min(5, Math.max(1, Math.round(e.impactHint ?? exists.impact)));
      const incomingAsLocal: Task = { ...exists, name: e.title, duration: inDur, impact: inImpact, project: e.project };
      if (e.updatedAt && (!("updatedAt" in (exists as any)) || e.updatedAt > (exists as any).updatedAt)) {
        const idx = merged.findIndex(t => t.id === exists.id);
        if (idx >= 0) merged[idx] = incomingAsLocal;
      } else {
        conflicts.push({ local: exists, incoming: e });
      }
    } else {
      const t: Task = {
        id: Date.now() + Math.floor(Math.random()*1000000),
        name: e.title,
        impact: Math.min(5, Math.max(1, Math.round(e.impactHint ?? 3))),
        duration: Math.max(5, Math.round(e.durationMin ?? 30)),
        project: e.project
      };
      merged.push(t); added.push(t);
    }
  }
  return { merged, added, conflicts };
}
