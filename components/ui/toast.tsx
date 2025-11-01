"use client";

import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

// A very small, Radix-free toast UI to pair with use-toast.tsx

export const ToastProvider: React.FC<React.PropsWithChildren<{}>> = ({ children }) => {
  return <>{children}</>;
};

export const ToastViewport = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "fixed top-4 right-4 z-50 flex w-96 max-w-[100vw] flex-col gap-2",
        className
      )}
      {...props}
    />
  )
);
ToastViewport.displayName = "ToastViewport";

type ToastProps = React.HTMLAttributes<HTMLDivElement> & {
  variant?: "default" | "destructive";
  onOpenChange?: (open: boolean) => void;
};

export const Toast = React.forwardRef<HTMLDivElement, ToastProps>(
  ({ className, variant = "default", children, ...props }, ref) => (
    <div
      ref={ref}
      role="status"
      className={cn(
        "group relative pointer-events-auto flex w-full items-start gap-3 rounded-lg border p-4 shadow-lg bg-white",
        variant === "destructive" ? "border-red-300 bg-red-50" : "border-slate-200",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
);
Toast.displayName = "Toast";

export const ToastTitle: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, ...props }) => (
  <div className={cn("text-sm font-semibold", className)} {...props} />
);

export const ToastDescription: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, ...props }) => (
  <div className={cn("text-sm text-slate-600", className)} {...props} />
);

type ToastCloseProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  onClose?: () => void;
};

export const ToastClose = React.forwardRef<HTMLButtonElement, ToastCloseProps>(
  ({ className, onClose, ...props }, ref) => (
    <button
      ref={ref}
      aria-label="Close"
      onClick={onClose}
      className={cn(
        "absolute right-2 top-2 inline-flex h-6 w-6 items-center justify-center rounded-md hover:bg-slate-100",
        className
      )}
      {...props}
    >
      <X className="h-4 w-4" />
    </button>
  )
);
ToastClose.displayName = "ToastClose";
