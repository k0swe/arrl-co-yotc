# Product Overview

The main concepts of the tool are:

- Clubs: name, callsign, website, optional logo
  - Clubs host multiple events. Clubs own the events, and any leaders of the club can manage the
    events.
- Events: name, description, start and end date-times
- Users: name, callsign, email (maintained by Firebase Auth)
  - Roles: App admins, club leaders and general users

Clubs and events are implicitly public. The purpose of the tool is to promote clubs and their
events, so anyone can view them without logging in.

Non-authenticated users can view clubs and their events. A calendar view is provided to see all
upcoming events.

When a user logs in, they can search for clubs and confirm their membership. Once confirmed, users
can RSVP themselves to the club's events as an attendee/operator. Initially, permission/approval is
not needed by club leaders for confirmed members to join events. Users may belong to multiple clubs.

Users may suggest new clubs to be added to the system. The user provides all details like name,
callsign, and website. Suggested clubs are reviewed by App admins. In particular, admins need to
ensure clubs are ARRL Affiliated and in the Colorado Section.

Club leaders can create and manage their club's events, including editing event details. Club
leaders also confirm club membership for users who request to join their club. Users may be a leader
in one club and a general member in another.

App admins can manage all clubs and events in the system, including creating new clubs and deleting
inappropriate content. App admins assign club leader roles to users for specific clubs. App admins
are only assigned manually in Firestore, not through the app itself.

To identify admins and club leaders, it's assumed that there is out-of-band communication between
the ARRL Colorado Section leadership and club leaders. The app does not provide a way to request or
assign these elevated roles.
