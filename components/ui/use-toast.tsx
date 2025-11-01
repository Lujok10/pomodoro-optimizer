// @/components/ui/use-toast.tsx
"use client";

import * as React from "react";

export type ToastItem = {
  id: string;
  title?: React.ReactNode;
  description?: React.ReactNode; // ✅ allow JSX
  action?: React.ReactNode;
  duration?: number;             // ms (auto close)
  variant?: "default" | "destructive" | string; // optional, for shadcn variants
};

export type ToastOptions = Omit<ToastItem, "id">;

type ToastContextValue = {
  toasts: ToastItem[];
  toast: (opts: ToastOptions) => { id: string };
  dismiss: (id: string) => void;
};

const ToastContext = React.createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastItem[]>([]);

  const dismiss = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = React.useCallback(
    (opts: ToastOptions) => {
      const id =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? (crypto as any).randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

      const item: ToastItem = { id, duration: 4000, ...opts };
      setToasts((prev) => [...prev, item]);

      if (item.duration && item.duration > 0) {
        const tid = setTimeout(() => dismiss(id), item.duration);
        // no-op cleanup; timeout ends when toast is dismissed
        void tid;
      }

      return { id };
    },
    [dismiss]
  );

  const value = React.useMemo<ToastContextValue>(
    () => ({ toasts, toast, dismiss }),
    [toasts, toast, dismiss]
  );

  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>;
}

export function useToast() {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within <ToastProvider>");
  // ✅ expose toasts so <Toaster/> can map safely
  return {
    toast: ctx.toast,
    dismiss: ctx.dismiss,
    toasts: ctx.toasts,
  };
}
