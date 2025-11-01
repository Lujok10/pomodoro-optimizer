export const toHours = (seconds: number) => seconds / 3600;
export const toMinutes = (seconds: number) => seconds / 60;
export const clamp = (n: number, min = 0, max = 1) => Math.max(min, Math.min(max, n));
