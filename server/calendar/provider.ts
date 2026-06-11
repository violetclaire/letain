import type { calendar_v3 } from "googleapis";

export interface CalendarProvider {
  getCalendarClient(): Promise<calendar_v3.Calendar>;
}
