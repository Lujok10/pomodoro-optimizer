"use client";
import * as React from "react";
import { cn } from "@/lib/utils";

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", ...props }, ref) => {
    const variants: Record<string, string> = {
      default: "bg-indigo-600 text-white hover:bg-indigo-700",
      destructive: "bg-red-600 text-white hover:bg-red-700",
      outline: "border border-slate-300 bg-white hover:bg-slate-50",
      secondary: "bg-slate-800 text-white hover:bg-slate-900",
      ghost: "hover:bg-slate-100",
      link: "underline-offset-4 hover:underline text-indigo-600",
    };
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50",
          variants[variant] || variants.default,
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export default Button;
