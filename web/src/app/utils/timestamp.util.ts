/**
 * Utility functions for handling Firestore timestamps
 */

export interface FirestoreTimestampLike {
  toDate(): Date;
}

function isValidDate(value: unknown): value is Date {
  return value instanceof Date && !Number.isNaN(value.getTime());
}

function isFirestoreTimestampLike(value: unknown): value is FirestoreTimestampLike {
  return (
    typeof value === 'object' &&
    value !== null &&
    'toDate' in value &&
    typeof value.toDate === 'function'
  );
}

/**
 * Convert Firestore Timestamp to Date for display
 * @param timestamp - A Date object, Firestore Timestamp-like value, date string, or unknown value
 * @returns A Date object or null if the input is invalid
 */
export function toDate(timestamp: unknown): Date | null {
  if (isValidDate(timestamp)) {
    return timestamp;
  }

  if (isFirestoreTimestampLike(timestamp)) {
    try {
      const date = timestamp.toDate();
      return isValidDate(date) ? date : null;
    } catch {
      return null;
    }
  }

  if (typeof timestamp === 'string') {
    const date = new Date(timestamp);
    return isValidDate(date) ? date : null;
  }

  return null;
}
