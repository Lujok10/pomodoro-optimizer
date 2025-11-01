// lib/export.ts
export function exportAllPomData(): string {
  if (typeof window === "undefined") return "";
  const dump: Record<string, unknown> = {};
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)!;
    if (k.startsWith("pom_")) {
      try { dump[k] = JSON.parse(localStorage.getItem(k) as string); }
      catch { dump[k] = localStorage.getItem(k); }
    }
  }
  const blob = new Blob([JSON.stringify(dump, null, 2)], { type: "application/json" });
  return URL.createObjectURL(blob);
}
