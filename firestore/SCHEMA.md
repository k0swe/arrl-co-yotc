# Firestore Schema

This document describes the Firestore collections and document structure for the ARRL Colorado
Section Year of the Club application.

## Schema Design: Sub-collections for Access Control

This schema uses Firestore sub-collections to simplify security rules and enable proper access control:

- **`clubs/{clubId}/memberships/{membershipId}`**: Club memberships as sub-collections enable rules to check if a user is a club leader by verifying write access to the parent club document
- **`clubs/{clubId}/events/{eventId}`**: Events as sub-collections automatically inherit club-based permissions
- **`events/{eventId}/rsvps/{rsvpId}`**: RSVPs as sub-collections of events enable event-scoped access control

This structure allows security rules to enforce club leader permissions without queries:
```javascript
// Club leaders can create events for their club
match /clubs/{clubId}/events/{eventId} {
  allow write: if isClubLeader(clubId); // Can check by verifying club write access
}
```

## Collections

### `users`

Stores user account information. Each document represents a user authenticated through Firebase Auth.

**Document ID**: Firebase Auth UID

**Fields**:
- `id` (string): User's unique identifier (matches document ID)
- `name` (string): User's full name
- `callsign` (string): User's amateur radio callsign
- `email` (string): User's email address
- `isAdmin` (boolean): Whether the user has application administrator privileges
- `createdAt` (timestamp): When the user account was created
- `updatedAt` (timestamp): When the user account was last updated

**Access**:
- Public: None
- Authenticated: Read own document, create on first sign-in
- Admin: Read/write all documents

---

### `clubs`

Stores amateur radio club information. Each document represents a club in the Colorado Section.

**Document ID**: Auto-generated

**Fields**:
- `id` (string): Club's unique identifier (matches document ID)
- `name` (string): Club name
- `description` (string): Club description
- `callsign` (string): Club's main callsign
- `location` (string): Physical location or meeting location
- `isActive` (boolean): Whether the club is currently active (false for pending/suggested clubs)
- `suggestedBy` (string, optional): User ID who suggested this club (if user-submitted)
- `leaderIds` (array of strings): Array of user IDs who are leaders of this club (for easy permission checks)
- `createdAt` (timestamp): When the club was created
- `updatedAt` (timestamp): When the club was last updated

**Access**:
- Public: Read active clubs (isActive = true)
- Authenticated: Read all clubs, create new clubs (as suggestions with isActive = false)
- Club Leaders: Update their club's details (verified by checking leaderIds array)
- Admin: Full access to all clubs

**Indexes**:
- Composite index on `isActive` (ASC), `name` (ASC) for listing active clubs
- Array-contains index on `leaderIds` for finding clubs where user is a leader

---

### `clubs/{clubId}/memberships` (sub-collection)

Stores the relationship between users and a specific club, including membership status and roles.

**Document ID**: User ID (makes lookups easier and ensures one membership per user per club)

**Fields**:
- `id` (string): User's unique identifier (matches document ID)
- `userId` (string): ID of the user (denormalized for convenience)
- `clubId` (string): ID of the parent club (denormalized for convenience)
- `role` (string): Either 'member' or 'leader'
- `status` (string): One of 'pending', 'active', 'denied', 'inactive'
- `appliedAt` (timestamp): When the membership was requested
- `approvedAt` (timestamp, optional): When the membership was approved
- `approvedBy` (string, optional): ID of the user who approved the membership
- `updatedAt` (timestamp): When the membership was last updated

**Access**:
- Public: None
- Authenticated: Read own membership in any club, create membership requests (status = 'pending')
- Club Leaders: Read all memberships for their club, update status/role for their club's memberships
- Admin: Full access to all memberships

**Queries**:
- Get user's membership in a club: `clubs/{clubId}/memberships/{userId}`
- List all members of a club: `clubs/{clubId}/memberships` where `status == 'active'`
- List club leaders: `clubs/{clubId}/memberships` where `role == 'leader'` and `status == 'active'`
- Find all clubs a user is a member of: Use collection group query on `memberships` where `userId == {userId}` and `status == 'active'`

---

### `clubs/{clubId}/events` (sub-collection)

Stores events hosted by a specific club. Using a sub-collection enables automatic permission inheritance.

**Document ID**: Auto-generated

**Fields**:
- `id` (string): Event's unique identifier (matches document ID)
- `clubId` (string): ID of the parent club (denormalized for convenience)
- `name` (string): Event name
- `description` (string): Event description
- `startTime` (timestamp): Start date and time of the event
- `endTime` (timestamp): End date and time of the event
- `createdAt` (timestamp): When the event was created
- `updatedAt` (timestamp): When the event was last updated
- `createdBy` (string): ID of the user who created the event

**Access**:
- Public: Read all events for active clubs
- Authenticated: Read all events
- Club Leaders: Create/update/delete events for their clubs
- Admin: Full access to all events

**Indexes**:
- Collection group index on `startTime` (DESC) for global event calendar
- Sub-collection automatically indexed by `startTime` for club event listings

---

### `events/{eventId}/rsvps` (sub-collection)

Stores user RSVPs for a specific event. The full path is `clubs/{clubId}/events/{eventId}/rsvps/{rsvpId}`.

**Document ID**: User ID (ensures one RSVP per user per event)

**Fields**:
- `id` (string): User's unique identifier (matches document ID)
- `userId` (string): ID of the user (denormalized for convenience)
- `eventId` (string): ID of the parent event (denormalized for convenience)
- `clubId` (string): ID of the club (denormalized for convenience)
- `createdAt` (timestamp): When the RSVP was created
- `updatedAt` (timestamp): When the RSVP was last updated

**Access**:
- Public: None
- Authenticated: Read own RSVP, create RSVP for themselves (if they're active club members)
- Club Leaders: Read all RSVPs for their club's events, create/delete RSVPs for their events
- Admin: Full access to all RSVPs

**Queries**:
- Get user's RSVP for an event: `clubs/{clubId}/events/{eventId}/rsvps/{userId}`
- List all attendees for an event: `clubs/{clubId}/events/{eventId}/rsvps`

---

### `events/{eventId}/logs` (sub-collection)

Stores ADIF log files uploaded for a specific event. The full path is `clubs/{clubId}/events/{eventId}/logs/{logId}`.

**Document ID**: Auto-generated

**Fields**:
- `id` (string): Log record's unique identifier (matches document ID)
- `eventId` (string): ID of the parent event (denormalized for convenience)
- `clubId` (string): ID of the club (denormalized for convenience)
- `uploadedBy` (string): ID of the user who uploaded the log
- `storagePath` (string): Path to the ADIF file in Cloud Storage
- `filename` (string): Original filename of the uploaded ADIF file
- `uploadedAt` (timestamp): When the log was uploaded

**Access**:
- Public: None
- Authenticated: Read logs for events they attended (have an RSVP), upload logs for events they attended
- Club Leaders: Read all logs for their club's events
- Admin: Full access to all logs

**Indexes**:
- Sub-collection automatically indexed by `uploadedAt` for chronological listing

---

## Data Relationships

### User to Club Membership
- A user can have multiple memberships (one per club)
- Query user's clubs: Use collection group query on `memberships` where `userId == {userId}` and `status == 'active'`
- Query specific membership: `clubs/{clubId}/memberships/{userId}`

### Club to Members
- A club has members through its memberships sub-collection
- Query: `clubs/{clubId}/memberships` where `status == 'active'`

### Club to Leaders
- Club leaders are stored in the `leaderIds` array in the club document (for quick permission checks)
- Also queryable via: `clubs/{clubId}/memberships` where `role == 'leader'` and `status == 'active'`

### Club to Events
- A club's events are in its events sub-collection
- Query: `clubs/{clubId}/events` ordered by `startTime`

### Global Event Calendar
- Use collection group query: collection group `events` ordered by `startTime`
- Filter by active clubs at application level

### Event to Attendees
- Event attendees are in the RSVPs sub-collection
- Query: `clubs/{clubId}/events/{eventId}/rsvps`

### Event to Logs
- Event logs are in the logs sub-collection
- Query: `clubs/{clubId}/events/{eventId}/logs` ordered by `uploadedAt`

---

## Security Model

The sub-collection structure enables robust security rules:

1. **Public Access**: Anyone can read active clubs and their events
2. **Authenticated Users**: Can read all clubs, request memberships, RSVP to events
3. **Club Leaders**: Verified by checking `leaderIds` array in club document - can manage their club's details, events, memberships, and view logs
4. **Admins**: Have full access to all collections via Custom Claims

The key advantage is that rules can check `request.auth.uid in resource.data.leaderIds` to verify club leadership without querying the memberships collection.

See `firestore.rules` for the detailed implementation.
