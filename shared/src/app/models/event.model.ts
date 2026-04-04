/**
 * Represents an event hosted by an amateur radio club.
 */
export interface Event {
  /** Unique identifier for the event */
  id: string;

  /** ID of the club hosting this event */
  clubId: string;

  /** Event name */
  name: string;

  /** Event description */
  description: string;

  /** Start date and time of the event */
  startTime: Date;

  /** End date and time of the event */
  endTime: Date;

  /** Timestamp when the event was created */
  createdAt: Date;

  /** Timestamp when the event was last updated */
  updatedAt: Date;

  /** ID of the user who created the event */
  createdBy: string;
}

/**
 * Represents a user's RSVP to a club event.
 */
export interface EventRsvp {
  /** Unique identifier for the RSVP record */
  id: string;

  /** ID of the event */
  eventId: string;

  /** ID of the user */
  userId: string;

  /** ID of the club (denormalized for easier querying) */
  clubId: string;

  /** Timestamp when the RSVP was created */
  createdAt: Date;

  /** Timestamp when the RSVP was last updated */
  updatedAt: Date;
}

/**
 * Represents an ADIF log uploaded for an event.
 */
export interface EventLog {
  /** Unique identifier for the log */
  id: string;

  /** ID of the event */
  eventId: string;

  /** ID of the club (denormalized for convenience) */
  clubId: string;

  /** ID of the user who uploaded the log */
  uploadedBy: string;

  /** Storage path to the ADIF file */
  storagePath: string;

  /** Download URL for the file */
  downloadUrl: string;

  /** Original filename of the uploaded ADIF file */
  filename: string;

  /** Timestamp when the log was uploaded */
  uploadedAt: Date;
}

/**
 * Represents a document uploaded at club scope (not tied to a specific event).
 */
export interface ClubDocument {
  /** Unique identifier for the document */
  id: string;

  /** ID of the club this document belongs to */
  clubId: string;

  /** ID of the user who uploaded the document */
  uploadedBy: string;

  /** Storage path to the file */
  storagePath: string;

  /** Download URL for the file */
  downloadUrl: string;

  /** Original filename of the uploaded file */
  filename: string;

  /** Timestamp when the document was uploaded */
  uploadedAt: Date;
}

/** Union type covering both event-scoped and club-scoped documents */
export type AnyDocument = EventLog | ClubDocument;

/**
 * Type guard: returns true when the document is an event-scoped EventLog.
 */
export function isEventDocument(doc: AnyDocument): doc is EventLog {
  return 'eventId' in doc && (doc as EventLog).eventId !== undefined;
}
