# Product Overview

## Purpose

This application promotes amateur radio clubs and their activities in the Colorado Section by
providing a centralized platform for discovering clubs, viewing events, and managing memberships.
The tool encourages participation in amateur radio activities and helps connect operators with local
clubs.

## Core Entities

### Clubs

Amateur radio clubs form the foundation of the platform. Each club has:

- Name and callsign
- Description
- Website URL
- Optional logo
- Status: pending, active, or inactive
- Leaders and members
- Multiple events and activities

Clubs own and manage their events through designated leaders. All clubs must be ARRL-affiliated and
located within the Colorado Section.

### Events

Events are activities hosted by clubs, and include:

- Name and description
- Start and end date-times
- Club ownership and management

Events are mainly imagined as operating on the air with the club callsign, either during contests or
just informal operations.

As a future enhancement, events could be recurring.

### Users

Users are amateur radio operators with:

- Name, callsign, and email (managed through Firebase Auth)
- Memberships in one or more clubs
- Role-based permissions within the system

## Access Levels and Permissions

### Public Access

The platform promotes transparency and discovery:

- **Anyone can view** all active clubs and their events without authentication
- **Calendar view** displays all upcoming events across the system
- **No login required** for browsing active clubs and event information

This open approach encourages participation and helps promote amateur radio activities to both
licensed operators and those interested in the hobby.

### Authenticated Users

Logged-in users gain additional capabilities:

- **Search and join clubs** by confirming membership
- **RSVP to events** as an attendee/operator once club membership is confirmed
- **Suggest new clubs** for admin review and approval
- **Belong to multiple clubs** with different roles in each

Event participation requires no additional approval from club leaders — confirmed club members can
freely join their club's events.

### Club Leaders

Club leaders manage their organization's presence:

- **Manage club details** including description and logo
- **Create and edit events** for their club
- **Confirm membership requests** from users wanting to join
- **Manage event details** including descriptions and scheduling

Users can serve as leaders in one club while being general members in others.

### App Administrators

System administrators maintain platform integrity:

- **Manage all clubs and events** across the system
- **Create new clubs** and remove inappropriate content
- **Assign club leader roles** to users for specific clubs
- **Review club suggestions** ensuring ARRL affiliation and Colorado Section location

## Key Workflows

### Club Membership

1. Users search for and select clubs they want to join
2. Users request membership confirmation
3. Club leaders review and approve membership requests
4. Confirmed members can participate in club events

### Club Suggestions

1. Users suggest new clubs with complete details (name, callsign, website)
2. The suggestion is populated as a pending club in the system
3. App admins review suggestions for ARRL affiliation and Colorado Section location
4. Approved clubs are added to the system
5. Admin assigns initial club leaders

### Event Management

1. Club leaders create events with details and scheduling
2. Events appear in public calendar and club pages
3. Club members RSVP to participate as attendees or operators
4. Leaders can modify event details as needed

## Administrative Notes

**Role Assignment**: App administrator and club leader roles are assigned through out-of-band
communication with ARRL Colorado Section leadership. The application does not provide self-service
role requests or assignments—this ensures proper validation of leadership credentials and maintains
system integrity.

** Club Membership**: The application relies on club leaders to confirm membership requests. Clubs
typically have their own new member application and fee processing outside of this platform. The app
simply tracks confirmed members for event participation.
