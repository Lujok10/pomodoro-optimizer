import { DateTime } from "luxon";
import type { TokenRecord } from "./types";

export type FocusEvent = {
  title: string;
  startISO: string; // UTC or TZ'd ISO
  endISO: string;
  timezone: string; // IANA tz of the user, e.g. "America/New_York"
  description?: string;
};

export async function createGoogleEvent(token: TokenRecord, ev: FocusEvent) {
  const start = DateTime.fromISO(ev.startISO).setZone(ev.timezone);
  const end = DateTime.fromISO(ev.endISO).setZone(ev.timezone);
  const body = {
    summary: ev.title,
    description: ev.description ?? "",
    start: { dateTime: start.toISO(), timeZone: ev.timezone },
    end: { dateTime: end.toISO(), timeZone: ev.timezone }
  };
  const res = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token.access_token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });
  return res.ok ? await res.json() : await res.text();
}

export async function createOutlookEvent(token: TokenRecord, ev: FocusEvent) {
  const start = DateTime.fromISO(ev.startISO).setZone(ev.timezone);
  const end = DateTime.fromISO(ev.endISO).setZone(ev.timezone);
  const body = {
    subject: ev.title,
    body: { contentType: "HTML", content: ev.description ?? "" },
    start: { dateTime: start.toISO(), timeZone: ev.timezone },
    end: { dateTime: end.toISO(), timeZone: ev.timezone }
  };
  const res = await fetch("https://graph.microsoft.com/v1.0/me/events", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token.access_token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });
  return res.ok ? await res.json() : await res.text();
}
