import "server-only";

import { createDAVClient } from "tsdav";
import ICAL from "ical.js";

export class CalendarProviderError extends Error {}
export class InvalidCredentialsError extends CalendarProviderError {
  constructor() {
    super(
      "iCloud rejected that Apple ID / app-specific password. Generate one at appleid.apple.com " +
        "(Sign-In and Security → App-Specific Passwords) — your regular Apple ID password won't work here.",
    );
  }
}

export type RemoteCalendar = { url: string; displayName: string };

export type RemoteEvent = {
  externalId: string;
  title: string;
  description: string | null;
  location: string | null;
  startAt: Date;
  endAt: Date | null;
  allDay: boolean;
  status: "confirmed" | "tentative" | "cancelled";
};

const ICLOUD_SERVER_URL = "https://caldav.icloud.com";

export interface CalendarProvider {
  listCalendars(username: string, password: string): Promise<RemoteCalendar[]>;
  listEvents(username: string, password: string, range: { start: Date; end: Date }): Promise<RemoteEvent[]>;
}

export class ICloudCalDAVProvider implements CalendarProvider {
  private async connect(username: string, password: string) {
    try {
      return await createDAVClient({
        serverUrl: ICLOUD_SERVER_URL,
        credentials: { username, password },
        authMethod: "Basic",
        defaultAccountType: "caldav",
      });
    } catch {
      throw new InvalidCredentialsError();
    }
  }

  async listCalendars(username: string, password: string): Promise<RemoteCalendar[]> {
    const client = await this.connect(username, password);
    const calendars = await client.fetchCalendars();
    return calendars.map((cal) => ({
      url: cal.url,
      displayName: typeof cal.displayName === "string" ? cal.displayName : "Calendar",
    }));
  }

  async listEvents(
    username: string,
    password: string,
    range: { start: Date; end: Date },
  ): Promise<RemoteEvent[]> {
    const client = await this.connect(username, password);
    const calendars = await client.fetchCalendars();

    const events: RemoteEvent[] = [];
    for (const calendar of calendars) {
      const objects = await client.fetchCalendarObjects({
        calendar,
        timeRange: { start: range.start.toISOString(), end: range.end.toISOString() },
      });
      for (const object of objects) {
        if (!object.data) continue;
        events.push(...parseICalEvents(object.data));
      }
    }
    return events;
  }
}

function parseICalEvents(icsData: string): RemoteEvent[] {
  try {
    const jcalData = ICAL.parse(icsData);
    const component = new ICAL.Component(jcalData);

    return component.getAllSubcomponents("vevent").map((vevent) => {
      const event = new ICAL.Event(vevent);
      const rawStatus = vevent.getFirstPropertyValue("status");
      return {
        externalId: event.uid,
        title: event.summary || "Untitled event",
        description: event.description || null,
        location: event.location || null,
        startAt: event.startDate.toJSDate(),
        endAt: event.endDate ? event.endDate.toJSDate() : null,
        allDay: event.startDate.isDate,
        status: normalizeStatus(typeof rawStatus === "string" ? rawStatus : null),
      };
    });
  } catch {
    // A single malformed ICS blob shouldn't take down the whole sync.
    return [];
  }
}

function normalizeStatus(raw: string | null): "confirmed" | "tentative" | "cancelled" {
  const value = raw?.toUpperCase();
  if (value === "TENTATIVE") return "tentative";
  if (value === "CANCELLED") return "cancelled";
  return "confirmed";
}
