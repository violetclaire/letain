import { format } from "date-fns";

export function parseDateOnly(dateString: string | Date | null | undefined): Date | null {
  if (!dateString) return null;
  
  if (dateString instanceof Date) {
    return dateString;
  }
  
  const dateOnly = dateString.split('T')[0];
  const [year, month, day] = dateOnly.split('-').map(Number);
  
  if (!year || !month || !day) return null;
  
  return new Date(year, month - 1, day, 12, 0, 0);
}

export function formatDateOnly(
  dateString: string | Date | null | undefined, 
  formatStr: string = "EEEE, MMMM d, yyyy"
): string {
  const date = parseDateOnly(dateString);
  if (!date) return "Date TBD";
  return format(date, formatStr);
}

export function compareDates(a: string | Date, b: string | Date): number {
  const dateA = parseDateOnly(a);
  const dateB = parseDateOnly(b);
  if (!dateA || !dateB) return 0;
  return dateA.getTime() - dateB.getTime();
}
