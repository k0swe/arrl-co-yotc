/**
 * Utility functions for handling Firestore timestamps
 */

/**
 * Convert Firestore Timestamp to Date for display
 * @param timestamp - A Date object, Firestore Timestamp, ISO string, or null/undefined
 * @returns A Date object or null if the input is invalid
 */
export function toDate(
  timestamp: Date | { toDate(): Date } | string | null | undefined,
): Date | null {
  if (!timestamp) {
    return null;
  }
  if (timestamp instanceof Date) {
    return timestamp;
  }
  if (
    typeof timestamp === 'object' &&
    'toDate' in timestamp &&
    typeof timestamp.toDate === 'function'
  ) {
    return timestamp.toDate();
  }
  if (typeof timestamp === 'string') {
    const date = new Date(timestamp);
    return isNaN(date.getTime()) ? null : date;
  }
  return null;
}
