/**
 * Represents a user in the ARRL Colorado Year Of The Club application.
 */
export interface User {
  /** Unique identifier for the user */
  id: string;
  
  /** User's full name */
  name: string;
  
  /** User's amateur radio callsign */
  callsign: string;
  
  /** Email address for the user */
  email: string;
  
  /** Whether this user is an application administrator */
  isAdmin: boolean;
  
  /** Timestamp when the user account was created */
  createdAt: Date;
  
  /** Timestamp when the user account was last updated */
  updatedAt: Date;
}

/**
 * A user's relationship with a club.
 */
export interface ClubMembership {
  /** Unique identifier for the membership record */
  id: string;
  
  /** ID of the user */
  userId: string;
  
  /** ID of the club */
  clubId: string;
  
  /** The user's role in this club */
  role: MembershipRole;
  
  /** Current status of the membership */
  status: MembershipStatus;
  
  /** Timestamp when the membership was requested */
  appliedAt: Date;
  
  /** Timestamp when the membership was approved (if applicable) */
  approvedAt?: Date;
  
  /** ID of the user who approved the membership */
  approvedBy?: string;
  
  /** Timestamp when the membership was last updated */
  updatedAt: Date;
}

/**
 * Possible roles a user can have in a club.
 */
export enum MembershipRole {
  /** Regular club member */
  Member = 'member',
  
  /** Club leader with approval permissions */
  Leader = 'leader',
}

/**
 * Possible statuses for a club membership.
 */
export enum MembershipStatus {
  /** Application submitted, awaiting approval */
  Pending = 'pending',
  
  /** Membership approved and active */
  Active = 'active',
  
  /** Membership denied */
  Denied = 'denied',
  
  /** Membership revoked or user left */
  Inactive = 'inactive',
}
