# Firestore Schema

This document describes the Firestore collections and document structure for the ARRL Colorado
Section Year of the Club application.

## Important Note on Security Rules

Firestore security rules have limitations when checking user roles across collections. Specifically,
rules cannot perform queries to check if a user is a club leader. To work around this:

1. **Admin-only operations**: Most write operations (creating events, updating clubs, managing
   memberships) are restricted to admins in the rules. The application layer should enforce
   club-leader permissions before submitting these operations.

2. **Application-level enforcement**: The Angular application should check the user's memberships
   in the `memberships` collection to determine if they are a leader of a club before allowing
   UI actions.

3. **Backend functions**: For production, consider using Cloud Functions with Firebase Admin SDK
   for operations that require complex permission checks (e.g., approving memberships, creating
   events). These functions can safely query the database and enforce proper permissions.

4. **Performance optimization**: The security rules perform document reads for admin checks and
   club status verification. For production:
   - Use Firebase Auth Custom Claims to store admin status (avoids database reads)
   - Consider denormalizing frequently-checked data to minimize read operations
   - Monitor Firestore quotas and costs

5. **Alternative structure**: If needed, you could denormalize leader information into club
   documents (e.g., `leaderIds: string[]`) to make rules simpler and more performant, at the
   cost of data consistency maintenance.

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
- Authenticated: Read own document
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
- `createdAt` (timestamp): When the club was created
- `updatedAt` (timestamp): When the club was last updated

**Access**:
- Public: Read active clubs (isActive = true)
- Authenticated: Read all clubs, create new clubs (as suggestions with isActive = false)
- Club Leaders: Update their club's details
- Admin: Full access to all clubs

**Indexes**:
- Composite index on `isActive` (ASC), `name` (ASC) for listing active clubs

---

### `memberships`

Stores the relationship between users and clubs, including membership status and roles.

**Document ID**: Auto-generated

**Fields**:
- `id` (string): Membership record's unique identifier (matches document ID)
- `userId` (string): ID of the user
- `clubId` (string): ID of the club
- `role` (string): Either 'member' or 'leader'
- `status` (string): One of 'pending', 'active', 'denied', 'inactive'
- `appliedAt` (timestamp): When the membership was requested
- `approvedAt` (timestamp, optional): When the membership was approved
- `approvedBy` (string, optional): ID of the user who approved the membership
- `updatedAt` (timestamp): When the membership was last updated

**Access**:
- Public: None
- Authenticated: Read own memberships, create membership requests (status = 'pending')
- Club Leaders: Read all memberships for their club, update status/role for their club's memberships
- Admin: Full access to all memberships

**Indexes**:
- Composite index on `userId` (ASC), `status` (ASC) for user's memberships
- Composite index on `clubId` (ASC), `status` (ASC) for club's members
- Composite index on `clubId` (ASC), `role` (ASC), `status` (ASC) for finding club leaders

---

### `events`

Stores club event information. Each document represents an event hosted by a club.

**Document ID**: Auto-generated

**Fields**:
- `id` (string): Event's unique identifier (matches document ID)
- `clubId` (string): ID of the club hosting this event
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
- Composite index on `clubId` (ASC), `startTime` (DESC) for club event listings
- Single field index on `startTime` (DESC) for global event calendar

---

### `rsvps`

Stores user RSVPs to events. Each document represents a user's attendance confirmation for an event.

**Document ID**: Auto-generated

**Fields**:
- `id` (string): RSVP record's unique identifier (matches document ID)
- `eventId` (string): ID of the event
- `userId` (string): ID of the user
- `clubId` (string): ID of the club (denormalized for easier querying)
- `createdAt` (timestamp): When the RSVP was created
- `updatedAt` (timestamp): When the RSVP was last updated

**Access**:
- Public: None
- Authenticated: Read own RSVPs, create RSVPs for events of clubs they're active members of
- Club Leaders: Read all RSVPs for their club's events, create/delete RSVPs for their events
- Admin: Full access to all RSVPs

**Indexes**:
- Composite index on `eventId` (ASC), `userId` (ASC) for event attendees
- Composite index on `userId` (ASC), `eventId` (ASC) for user's RSVPs

---

### `logs`

Stores ADIF log files uploaded after events. Each document represents a log file uploaded by an
event attendee.

**Document ID**: Auto-generated

**Fields**:
- `id` (string): Log record's unique identifier (matches document ID)
- `eventId` (string): ID of the event
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
- Composite index on `eventId` (ASC), `uploadedAt` (DESC) for event logs

---

## Data Relationships

### User to Club Membership
- A user can have multiple memberships (one per club)
- Each membership has a role (member or leader) and status (pending, active, denied, inactive)
- Query: `memberships` where `userId == {userId}` and `status == 'active'`

### Club to Members
- A club has multiple members through the memberships collection
- Query: `memberships` where `clubId == {clubId}` and `status == 'active'`

### Club to Leaders
- Club leaders are found through memberships with role = 'leader' and status = 'active'
- Query: `memberships` where `clubId == {clubId}` and `role == 'leader'` and `status == 'active'`

### Club to Events
- A club can have multiple events
- Query: `events` where `clubId == {clubId}`

### Event to Attendees
- Event attendees are tracked through the rsvps collection
- Query: `rsvps` where `eventId == {eventId}`

### Event to Logs
- Event logs are tracked through the logs collection
- Query: `logs` where `eventId == {eventId}`

---

## Security Model

The security rules implement the following access patterns:

1. **Public Access**: Anyone can read active clubs and their events
2. **Authenticated Users**: Can read all clubs, request memberships, RSVP to events
3. **Club Leaders**: Can manage their club's details, events, memberships, and view logs
4. **Admins**: Have full access to all collections

See `firestore.rules` for the detailed implementation.
