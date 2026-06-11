import { getDefaultCalendarProvider } from './calendar/replitProvider';

// Always create a fresh client - access tokens expire
async function getUncachableGoogleCalendarClient() {
  return getDefaultCalendarProvider().getCalendarClient();
}

// Get busy times from vendor's Google Calendar
export async function getVendorBusyTimes(
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<{ start: Date; end: Date }[]> {
  try {
    const calendar = await getUncachableGoogleCalendarClient();
    
    const response = await calendar.freebusy.query({
      requestBody: {
        timeMin: startDate.toISOString(),
        timeMax: endDate.toISOString(),
        items: [
          {
            id: 'primary' // Use their primary calendar
          }
        ]
      }
    });

    const busyTimes: { start: Date; end: Date }[] = [];
    const calendars = response.data.calendars;
    
    if (calendars?.primary?.busy) {
      calendars.primary.busy.forEach((slot: any) => {
        busyTimes.push({
          start: new Date(slot.start),
          end: new Date(slot.end)
        });
      });
    }

    return busyTimes;
  } catch (error) {
    console.error('[Google Calendar] Error fetching busy times:', error);
    return [];
  }
}

// Get available time slots (opposite of busy times)
export async function getVendorAvailableSlots(
  userId: string,
  date: Date,
  workingHoursStart: number = 9, // 9 AM
  workingHoursEnd: number = 18,  // 6 PM
  slotDuration: number = 60 // 60 minutes
): Promise<{ start: Date; end: Date }[]> {
  const dayStart = new Date(date);
  dayStart.setHours(workingHoursStart, 0, 0, 0);
  
  const dayEnd = new Date(date);
  dayEnd.setHours(workingHoursEnd, 0, 0, 0);

  const busyTimes = await getVendorBusyTimes(userId, dayStart, dayEnd);
  
  const availableSlots: { start: Date; end: Date }[] = [];
  let currentTime = new Date(dayStart);

  while (currentTime < dayEnd) {
    const slotEnd = new Date(currentTime);
    slotEnd.setMinutes(slotEnd.getMinutes() + slotDuration);

    // Check if this slot overlaps with any busy time
    const isBooked = busyTimes.some(busy => {
      return currentTime < busy.end && slotEnd > busy.start;
    });

    if (!isBooked && slotEnd <= dayEnd) {
      availableSlots.push({
        start: new Date(currentTime),
        end: new Date(slotEnd)
      });
    }

    currentTime = new Date(slotEnd);
  }

  return availableSlots;
}

// Sync Google Calendar availability to database
export async function syncAvailabilityToDatabase(
  storage: any,
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<void> {
  try {
    const availableSlots = await getVendorAvailableSlots(userId, startDate);
    
    // Store in database
    for (const slot of availableSlots) {
      await storage.createOrUpdateAvailability({
        vendorId: userId,
        date: slot.start.toISOString().split('T')[0],
        startTime: slot.start.toISOString(),
        endTime: slot.end.toISOString(),
        available: true
      });
    }
  } catch (error) {
    console.error('[Google Calendar] Error syncing availability:', error);
  }
}
