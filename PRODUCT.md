# Product Overview

The main concepts of the tool are:

- Clubs: name, callsign, website, optional logo
- Events: name, description, start and end date-times
- Users: name, callsign, email (maintained by Firebase Auth)
  - Roles: App admins, club leaders and general users

Non-authenticated users can view clubs and their events. A calendar view is provided to see all
upcoming events.

When a user logs in, they can search for clubs and confirm their membership. Once confirmed, users
can add themselves to the club's events as an attendee/operator. Users may belong to multiple clubs.
Users may suggest new clubs to be added to the system. Suggested clubs are reviewed by App admins,
mainly to ensure they are ARRL Affiliated clubs in the Colorado Section.

Club leaders can create and manage their club's events, including editing event details. Club
leaders also confirm club membership for users who request to join their club. Users may be a leader
in one club and a general member in another.

App admins can manage all clubs and events in the system, including creating new clubs and deleting
inappropriate content. App admins assign club leader roles to users for specific clubs. App admins
are only assigned manually in Firestore, not through the app itself.
