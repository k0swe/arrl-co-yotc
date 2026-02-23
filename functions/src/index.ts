import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

initializeApp();

/** Shape of a club document stored in Firestore. */
interface ClubDocument {
  isActive: boolean;
  name: string;
  callsign: string;
  location: string;
  description: string;
  website?: string;
}

/**
 * Escapes special HTML characters to prevent injection in email bodies.
 */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Builds the HTML body for a club-suggestion notification email.
 */
export function buildClubSuggestionHtml(club: {
  name: string;
  callsign: string;
  location: string;
  description: string;
  website?: string;
}): string {
  const websiteLine = club.website
    ? `<li><strong>Website:</strong> <a href="${escapeHtml(club.website)}">${escapeHtml(club.website)}</a></li>`
    : '';

  return `<p>A new club suggestion has been submitted for admin review:</p>
<ul>
  <li><strong>Name:</strong> ${escapeHtml(club.name)}</li>
  <li><strong>Callsign:</strong> ${escapeHtml(club.callsign)}</li>
  <li><strong>Location:</strong> ${escapeHtml(club.location)}</li>
  ${websiteLine}
  <li><strong>Description:</strong> ${escapeHtml(club.description)}</li>
</ul>
<p>Please review this suggestion in the admin dashboard.</p>`;
}

/**
 * Cloud Run function triggered when a new club document is created.
 * When the club is a pending suggestion (isActive = false), it notifies all
 * admins by writing to the `mail` collection, which is watched by the
 * firebase/firestore-send-email extension.
 */
export const notifyAdminsOnClubSuggestion = onDocumentCreated(
  'clubs/{clubId}',
  async (event) => {
    const snap = event.data;
    if (!snap) return;

    const club = snap.data() as ClubDocument;

    // Only notify for pending club suggestions, not directly-created active clubs.
    if (club.isActive !== false) return;

    const db = getFirestore();

    // Resolve admin user IDs. The firestore-send-email extension resolves
    // toUids → email addresses from the users collection.
    const adminsSnap = await db.collection('users').where('isAdmin', '==', true).get();
    const adminUids = adminsSnap.docs.map((doc) => doc.id);

    if (adminUids.length === 0) {
      console.log('No admin users found; skipping club suggestion notification.');
      return;
    }

    const subject = `New Club Suggestion: ${club.name} (${club.callsign})`;
    const html = buildClubSuggestionHtml({
      name: club.name ?? '',
      callsign: club.callsign ?? '',
      location: club.location ?? '',
      description: club.description ?? '',
      website: club.website,
    });

    await db.collection('mail').add({
      toUids: adminUids,
      message: { subject, html },
    });

    console.log(`Club suggestion notification queued for ${adminUids.length} admin(s).`);
  },
);
