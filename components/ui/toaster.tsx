// components/ui/toaster.tsx
"use client";

import * as React from "react";
import {
  Toast,
  ToastTitle,
  ToastDescription,
  ToastViewport,
  ToastProvider as ToastUIProvider,
  ToastClose,
} from "@/components/ui/toast";
import { useToast } from "@/components/ui/use-toast";

function ToasterInner() {
  const { toasts, dismiss } = useToast();
  const items = toasts ?? []; // defensive

  return (
    <ToastUIProvider>
      {items.map(({ id, title, description, action, variant, ...props }) => (
        <Toast
          key={id}
          {...props}
          variant={variant as any}
          // Radix sends open=false when the toast is closed
          onOpenChange={(open) => {
            if (!open) dismiss(id);
          }}
        >
          <div className="grid gap-1 pr-6">
            {title ? <ToastTitle>{title}</ToastTitle> : null}
            {description ? <ToastDescription>{description}</ToastDescription> : null}
            {action ? <div className="mt-2">{action}</div> : null}
          </div>
          <ToastClose />
        </Toast>
      ))}
      <ToastViewport />
    </ToastUIProvider>
  );
}

// Export both default and named so either import style works
export default function Toaster() {
  return <ToasterInner />;
}
export { Toaster };
