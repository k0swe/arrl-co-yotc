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
  
  /** ID of the user who uploaded the log */
  uploadedBy: string;
  
  /** Storage path to the ADIF file */
  storagePath: string;
  
  /** Original filename of the uploaded ADIF file */
  filename: string;
  
  /** Timestamp when the log was uploaded */
  uploadedAt: Date;
}
