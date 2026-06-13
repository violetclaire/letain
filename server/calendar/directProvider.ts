import type { calendar_v3 } from "googleapis";
import type { CalendarProvider } from "./provider";

export interface DirectGoogleCalendarCredentials {
  operatorId: string;
  accessToken?: string | null;
  refreshToken?: string | null;
  expiryDate?: number | null;
  calendarId?: string | null;
  googleAccountEmail?: string | null;
  scope?: string | null;
  tokenType?: string | null;
}

export interface DirectCalendarBusySlot {
  start: Date;
  end: Date;
}

export interface DirectCalendarEventOptions {
  title: string;
  description?: string;
  location?: string;
  startTime: Date;
  endTime?: Date;
  attendeeEmail?: string;
  calendarId?: string;
}

interface DirectGoogleCalendarProviderOptions {
  credentials?: DirectGoogleCalendarCredentials | null;
  createCalendarClient?: (credentials: DirectGoogleCalendarCredentials) => calendar_v3.Calendar;
  refreshCredentials?: (
    credentials: DirectGoogleCalendarCredentials,
  ) => Promise<DirectGoogleCalendarCredentials>;
  now?: () => number;
}

function defaultCreateCalendarClient(): calendar_v3.Calendar {
  throw new Error(
    "DirectGoogleCalendarProvider requires an injected Google Calendar client until OAuth wiring is implemented",
  );
}

export function validateDirectGoogleCalendarCredentials(
  credentials?: DirectGoogleCalendarCredentials | null,
): DirectGoogleCalendarCredentials {
  if (!credentials?.operatorId) {
    throw new Error("Direct Google Calendar credentials must be scoped to an operator");
  }

  if (!credentials.accessToken && !credentials.refreshToken) {
    throw new Error("Direct Google Calendar credentials require an access token or refresh token");
  }

  return credentials;
}

function shouldRefreshCredentials(
  credentials: DirectGoogleCalendarCredentials,
  now: () => number,
): boolean {
  if (!credentials.accessToken) {
    return true;
  }

  if (!credentials.expiryDate) {
    return false;
  }

  return credentials.expiryDate <= now() + 60_000;
}

export class DirectGoogleCalendarProvider implements CalendarProvider {
  private credentials: DirectGoogleCalendarCredentials;
  private readonly createCalendarClient: (credentials: DirectGoogleCalendarCredentials) => calendar_v3.Calendar;
  private readonly refreshCredentials?: (
    credentials: DirectGoogleCalendarCredentials,
  ) => Promise<DirectGoogleCalendarCredentials>;
  private readonly now: () => number;

  constructor({
    credentials,
    createCalendarClient = defaultCreateCalendarClient,
    refreshCredentials,
    now = () => Date.now(),
  }: DirectGoogleCalendarProviderOptions = {}) {
    this.credentials = validateDirectGoogleCalendarCredentials(credentials);
    this.createCalendarClient = createCalendarClient;
    this.refreshCredentials = refreshCredentials;
    this.now = now;
  }

  private async getFreshCredentials(): Promise<DirectGoogleCalendarCredentials> {
    if (!shouldRefreshCredentials(this.credentials, this.now)) {
      return this.credentials;
    }

    if (!this.refreshCredentials) {
      throw new Error("Direct Google Calendar credentials are missing a usable access token");
    }

    this.credentials = validateDirectGoogleCalendarCredentials(
      await this.refreshCredentials(this.credentials),
    );
    return this.credentials;
  }

  async getCalendarClient(): Promise<calendar_v3.Calendar> {
    return this.createCalendarClient(await this.getFreshCredentials());
  }

  async getBusySlots(
    startDate: Date,
    endDate: Date,
    calendarId = this.credentials.calendarId || "primary",
  ): Promise<DirectCalendarBusySlot[]> {
    const calendar = await this.getCalendarClient();
    const response = await calendar.freebusy.query({
      requestBody: {
        timeMin: startDate.toISOString(),
        timeMax: endDate.toISOString(),
        items: [{ id: calendarId }],
      },
    });

    return (response.data.calendars?.[calendarId]?.busy ?? []).map((slot) => ({
      start: new Date(slot.start || ""),
      end: new Date(slot.end || ""),
    }));
  }

  async createEvent({
    title,
    description = "",
    location = "",
    startTime,
    endTime = new Date(startTime.getTime() + 2 * 60 * 60 * 1000),
    attendeeEmail,
    calendarId = this.credentials.calendarId || "primary",
  }: DirectCalendarEventOptions): Promise<{
    eventId?: string;
    eventLink?: string;
  }> {
    const event: calendar_v3.Schema$Event = {
      summary: title,
      description,
      location,
      start: {
        dateTime: startTime.toISOString(),
        timeZone: "America/Los_Angeles",
      },
      end: {
        dateTime: endTime.toISOString(),
        timeZone: "America/Los_Angeles",
      },
    };

    if (attendeeEmail) {
      event.attendees = [{ email: attendeeEmail }];
    }

    const response = await (await this.getCalendarClient()).events.insert({
      calendarId,
      requestBody: event,
    });

    return {
      eventId: response.data.id || undefined,
      eventLink: response.data.htmlLink || undefined,
    };
  }
}
