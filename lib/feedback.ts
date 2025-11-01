// /lib/feedback.ts

export type FeedbackStr = "yes" | "no";

export function asFeedback(
  v?: boolean | FeedbackStr
): FeedbackStr | undefined {
  if (v === undefined) return undefined;
  return v === true || v === "yes" ? "yes" : "no";
}
