"use client";

import React, { createContext, useCallback, useContext, useMemo, useState } from "react";

type ToastKind = "info" | "success" | "error";
type ToastItem = { id: number; kind: ToastKind; title: string; description?: string };

type ToastCtx = {
  notify: (kind: ToastKind, title: string, description?: string) => void;
};

const Ctx = createContext<ToastCtx | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const notify = useCallback((kind: ToastKind, title: string, description?: string) => {
    const id = Date.now() + Math.random();
    setItems((prev) => [...prev, { id, kind, title, description }]);
    // auto-dismiss
    setTimeout(() => setItems((prev) => prev.filter((t) => t.id !== id)), 4200);
  }, []);

  const value = useMemo(() => ({ notify }), [notify]);

  return (
    <Ctx.Provider value={value}>
      {children}
      {/* Viewport (screen-reader friendly) */}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="fixed bottom-3 right-3 z-[1000] space-y-2 w-[92vw] max-w-sm"
      >
        {items.map((t) => (
          <div
            key={t.id}
            role="status"
            className={`rounded-lg border shadow-sm px-3 py-2 bg-white focus:outline-none
              ${t.kind === "error" ? "border-red-300" : t.kind === "success" ? "border-emerald-300" : "border-gray-200"}`}
            tabIndex={0} /* allow focus */
          >
            <div className="text-sm font-semibold">
              {t.kind === "error" ? "⚠️ " : t.kind === "success" ? "✅ " : "ℹ️ "}
              {t.title}
            </div>
            {t.description && <div className="text-xs text-gray-600 mt-0.5">{t.description}</div>}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export function useToast() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx.notify;
}
