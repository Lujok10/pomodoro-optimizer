export function cn(...classes: Array<string | undefined | null | false>) {
  return classes.filter(Boolean).join(" ");
}

// Optional helpers used throughout the app
export function computeFocusMinutes(availableMinutes: number) {
  const baseRatio = availableMinutes < 60 ? 0.85 : 0.8;
  const adjustment = availableMinutes < 30 ? -0.05 : availableMinutes > 120 ? 0.05 : 0;
  const result = Math.round(availableMinutes * (baseRatio + adjustment));
  return Math.max(5, Math.min(result, availableMinutes));
}

export function adjustImpact(oldImpact: number, feedback: "yes" | "no", factor = 0.1) {
  const change = feedback === "yes" ? factor : -factor;
  return Math.max(1, Math.min(10, Math.round((oldImpact + change) * 10) / 10));
}
