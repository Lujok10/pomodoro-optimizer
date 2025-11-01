import * as React from "react";
import { cn } from "@/lib/utils";

export interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number;
}

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(({ className, value = 0, ...props }, ref) => {
  const v = Math.min(100, Math.max(0, value));
  return (
    <div ref={ref} className={cn("h-2 w-full overflow-hidden rounded-full bg-slate-200", className)} {...props}>
      <div className="h-full bg-indigo-600" style={{ width: `${v}%` }} />
    </div>
  );
});
Progress.displayName = "Progress";

export { Progress };
export default Progress;
