import type { CalendarEventStatus } from "@/lib/db/schema";

export type EventDTO = {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  startAt: string;
  endAt: string | null;
  allDay: boolean;
  status: CalendarEventStatus;
  source: string;
};
