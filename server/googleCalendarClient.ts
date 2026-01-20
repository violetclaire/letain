import { google } from 'googleapis';

let connectionSettings: any;

async function getAccessToken() {
  if (connectionSettings && connectionSettings.settings.expires_at && new Date(connectionSettings.settings.expires_at).getTime() > Date.now()) {
    return connectionSettings.settings.access_token;
  }
  
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=google-calendar',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  const accessToken = connectionSettings?.settings?.access_token || connectionSettings?.settings?.oauth?.credentials?.access_token;

  if (!connectionSettings || !accessToken) {
    throw new Error('Google Calendar not connected');
  }
  return accessToken;
}

export async function getGoogleCalendarClient() {
  const accessToken = await getAccessToken();

  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({
    access_token: accessToken
  });

  return google.calendar({ version: 'v3', auth: oauth2Client });
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
