import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  addMonths, 
  subMonths, 
  isSameDay, 
  isToday, 
  isBefore, 
  startOfDay,
  parseISO
} from "date-fns";

export const getMonthDays = (date: Date) => {
  const start = startOfMonth(date);
  const end = endOfMonth(date);
  return eachDayOfInterval({ start, end });
};

export const getEmptyDays = (date: Date) => {
  const startDay = startOfMonth(date).getDay();
  return Array(startDay).fill(null);
};

export const toLocalDateKey = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const parseToLocalDate = (dateString: string): string => {
  if (dateString.includes('T')) {
    return dateString.split('T')[0];
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    return dateString;
  }
  const d = new Date(dateString);
  return toLocalDateKey(d);
};

export const parseDateAtNoon = (dateStr: string): Date => {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day, 12, 0, 0);
};

export const generateTimeOptions = (startHour = 4, endHour = 23, stepMinutes = 15): string[] => {
  const times: string[] = [];
  for (let h = startHour; h <= endHour; h++) {
    for (let m = 0; m < 60; m += stepMinutes) {
      const hour = h % 12 || 12;
      const ampm = h >= 12 ? "PM" : "AM";
      const mins = m.toString().padStart(2, "0");
      times.push(`${hour}:${mins} ${ampm}`);
    }
  }
  return times;
};

export const timeToMinutes = (time: string): number => {
  const cleaned = time.trim().replace(/\./g, '').toUpperCase();
  const match = cleaned.match(/^(\d{1,2}):?(\d{2})?\s*(AM|PM)?$/);
  if (!match) {
    // Fallback to simple split if possible
    const parts = time.split(':').map(Number);
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    throw new Error("Invalid time format");
  }
  
  let h = parseInt(match[1]);
  const m = parseInt(match[2] || '0');
  const ampm = match[3];
  
  if (ampm === 'PM' && h < 12) h += 12;
  if (ampm === 'AM' && h === 12) h = 0;
  // Heuristic for missing AM/PM: 1-7 is PM, 8-11 is AM
  if (!ampm && h < 7) h += 12;
  
  return h * 60 + m;
};

export const minutesToTime = (minutes: number, format12h = true): string => {
  const normalizedMinutes = minutes % (24 * 60);
  const h = Math.floor(normalizedMinutes / 60);
  const m = normalizedMinutes % 60;
  
  if (format12h) {
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${m.toString().padStart(2, '0')} ${ampm}`;
  }
  
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
};
