import { getDefaultCalendarProvider } from './calendar/replitProvider';

export async function getGoogleCalendarClient() {
  return getDefaultCalendarProvider().getCalendarClient();
}

export async function createCalendarEvent(options: {
  title: string;
  description?: string;
  location?: string;
  startTime: Date;
  endTime?: Date;
  attendeeEmail?: string;
}): Promise<{ success: boolean; eventId?: string; eventLink?: string; error?: string }> {
  try {
    const calendar = await getGoogleCalendarClient();
    
    const endTime = options.endTime || new Date(options.startTime.getTime() + 2 * 60 * 60 * 1000);
    
    const event: any = {
      summary: options.title,
      description: options.description || '',
      location: options.location || '',
      start: {
        dateTime: options.startTime.toISOString(),
        timeZone: 'America/Los_Angeles',
      },
      end: {
        dateTime: endTime.toISOString(),
        timeZone: 'America/Los_Angeles',
      },
    };
    
    if (options.attendeeEmail) {
      event.attendees = [{ email: options.attendeeEmail }];
    }
    
    const response = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: event,
    });
    
    console.log('[Google Calendar] Created event:', response.data.id);
    
    return {
      success: true,
      eventId: response.data.id || undefined,
      eventLink: response.data.htmlLink || undefined,
    };
  } catch (err: any) {
    console.error('[Google Calendar] Failed to create event:', err.message);
    return {
      success: false,
      error: err.message,
    };
  }
}

export async function isCalendarConnected(): Promise<boolean> {
  try {
    await getGoogleCalendarClient();
    return true;
  } catch {
    return false;
  }
}
