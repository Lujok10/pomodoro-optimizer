"use client";
import React from "react";

export default function JsonImport() {
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const [msg, setMsg] = React.useState<string>("");

  const onPick = () => inputRef.current?.click();
  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (data.tasks) localStorage.setItem("pom_tasks", JSON.stringify(data.tasks));
      if (data.completed || data.sessions) {
        const completed = data.completed || (data.sessions || []).map((s: any) => ({
          id: s.task_id, name: s.name, impact: 3, duration: s.duration, project: s.project
        }));
        localStorage.setItem("pom_completed_v1", JSON.stringify(completed));
      }
      if (data.feedback) localStorage.setItem("pom_feedback_v1", JSON.stringify(data.feedback));
      setMsg("Imported. Refresh to see changes.");
    } catch (e: any) {
      setMsg(`Import failed: ${e?.message || e}`);
    }
  };

  return (
    <div className="inline-flex items-center gap-2">
      <button className="border rounded px-2 py-1 text-sm" onClick={onPick}>Import JSON…</button>
      <input ref={inputRef} type="file" accept="application/json" className="hidden" onChange={onFile} />
      {msg && <span className="text-xs text-gray-600">{msg}</span>}
    </div>
  );
}

