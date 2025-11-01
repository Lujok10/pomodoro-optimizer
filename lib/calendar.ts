// /lib/calendar.ts

/** Format a Date to UTC 'YYYYMMDDTHHMMSSZ' (ICS & Google). */
function toUtcStamp(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    d.getUTCFullYear().toString() +
    pad(d.getUTCMonth() + 1) +
    pad(d.getUTCDate()) +
    "T" +
    pad(d.getUTCHours()) +
    pad(d.getUTCMinutes()) +
    pad(d.getUTCSeconds()) +
    "Z"
  );
}

/** Escape text for ICS fields. */
function icsEscape(s?: string): string {
  if (!s) return "";
  return s
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

/**
 * Create an .ics VEVENT string for a focus block.
 * @param title Event title
 * @param start Start time (local Date)
 * @param durationMinutes Duration in minutes
 * @param description Optional description
 * @param location Optional location
 */
export function createIcsEvent(
  title: string,
  start: Date,
  durationMinutes: number,
  description?: string,
  location?: string
): string {
  const dtStart = toUtcStamp(start);
  const dtEnd = toUtcStamp(new Date(start.getTime() + Math.max(1, durationMinutes) * 60000));
  const dtStamp = toUtcStamp(new Date());
  const uid = `${Date.now()}-${Math.random().toString(36).slice(2)}@optimapp`;

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//OptimApp//Focus 20//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${dtStamp}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${icsEscape(title)}`,
    description ? `DESCRIPTION:${icsEscape(description)}` : undefined,
    location ? `LOCATION:${icsEscape(location)}` : undefined,
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean) as string[];

  return lines.join("\r\n");
}

/**
 * Trigger a download of the given ICS content in the browser.
 * @param fileBaseName Used for the filename (e.g. "Focus: My Task")
 * @param ics The ICS file contents from createIcsEvent
 */
export function downloadIcs(fileBaseName: string, ics: string): void {
  if (typeof window === "undefined") return;
  const safe =
    fileBaseName.replace(/[\/\\:*?"<>|]/g, "").slice(0, 60) || "event";
  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${safe}.ics`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

/**
 * Open Google Calendar compose page with prefilled event.
 * (No API keys; just a URL.)
 */
export function openGoogleCalendar(
  title: string,
  start: Date,
  durationMinutes: number,
  details?: string,
  location?: string
): void {
  if (typeof window === "undefined") return;
  const end = new Date(start.getTime() + Math.max(1, durationMinutes) * 60000);

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: title,
    dates: `${toUtcStamp(start)}/${toUtcStamp(end)}`,
  });

  if (details) params.set("details", details);
  if (location) params.set("location", location);

  const href = `https://calendar.google.com/calendar/render?${params.toString()}`;
  // pop-up blockers may block window.open; fallback to same-tab
  const w = window.open(href, "_blank", "noopener,noreferrer");
  if (!w) window.location.href = href;
}
