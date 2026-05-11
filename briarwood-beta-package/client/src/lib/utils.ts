import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format a date without timezone shift issues.
 * Use this for dates stored in UTC that should display in local time.
 */
export function formatDateLocal(date: Date | string, options?: Intl.DateTimeFormatOptions): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  // Create a new date using UTC components to avoid timezone shift
  const localDate = new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  return localDate.toLocaleDateString('en-US', options || { month: 'short', day: 'numeric', year: 'numeric' });
}

/**
 * Get a Date object corrected for UTC storage.
 * Use this when you need to work with the date (e.g., for comparisons).
 */
export function getLocalDate(date: Date | string): Date {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}
