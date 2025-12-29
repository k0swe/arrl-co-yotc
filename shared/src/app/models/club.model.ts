/**
 * Represents an amateur radio club in the ARRL Colorado Section.
 */
export interface Club {
  /** Unique identifier for the club */
  id: string;

  /** Club name */
  name: string;

  /** Club description */
  description: string;

  /** Club's main callsign */
  callsign: string;

  /** Physical location or meeting location */
  location: string;

  /** Club website URL */
  website?: string;

  /** URL-friendly slug for the club (used in routes) */
  slug?: string;

  /** Whether the club is currently active */
  isActive: boolean;

  /** User ID who suggested this club (if it was user-submitted) */
  suggestedBy?: string;

  /** Array of user IDs who are leaders of this club (for permission checks) */
  leaderIds: string[];

  /** Timestamp when the club was created */
  createdAt: Date;

  /** Timestamp when the club was last updated */
  updatedAt: Date;
}
