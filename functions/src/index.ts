import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { onObjectFinalized } from 'firebase-functions/v2/storage';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import ExcelJS from 'exceljs';

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

/**
 * Shape of a single standings row as parsed from the uploaded Excel file.
 * Column names match those specified in the Excel template.
 */
export interface StandingRow {
  callsign: string;
  totalQsos: number;
  was: number;
  coloClubs: string;
  veSessions: number;
  newMembers: number;
  publicEvents: number;
  arrlFieldDay: boolean;
  winterFieldDay: boolean;
  interClubEvent: boolean;
}

/**
 * Parses a single Excel worksheet row (1-based column index) into a StandingRow.
 * Returns null if the row is empty or missing a callsign.
 *
 * Expected column order (from the Excel template):
 *   1: STATION_CALLSIGN  2: Total QSO's  3: WAS  4: Colo_Clubs
 *   5: VE Session        6: New Members  7: Public Event
 *   8: ARRL Field Day    9: Winter Field Day  10: Inter-Club Event
 */
export function parseStandingRow(row: ExcelJS.Row): StandingRow | null {
  const callsign = String(row.getCell(1).value ?? '').trim().toUpperCase();
  if (!callsign) return null;

  const toInt = (cell: ExcelJS.Cell): number => {
    const v = cell.value;
    if (typeof v === 'number') return Math.round(v);
    const n = parseInt(String(v ?? '0'), 10);
    return isNaN(n) ? 0 : n;
  };

  const toBool = (cell: ExcelJS.Cell): boolean => {
    const v = cell.value;
    if (typeof v === 'boolean') return v;
    const s = String(v ?? '').trim().toLowerCase();
    return s === 'true' || s === '1' || s === 'yes';
  };

  return {
    callsign,
    totalQsos: toInt(row.getCell(2)),
    was: toInt(row.getCell(3)),
    coloClubs: String(row.getCell(4).value ?? '').trim(),
    veSessions: toInt(row.getCell(5)),
    newMembers: toInt(row.getCell(6)),
    publicEvents: toInt(row.getCell(7)),
    arrlFieldDay: toBool(row.getCell(8)),
    winterFieldDay: toBool(row.getCell(9)),
    interClubEvent: toBool(row.getCell(10)),
  };
}

/**
 * Cloud Run function triggered when a file is uploaded to the
 * `standings-uploads/` path in Firebase Storage.
 *
 * It reads the Excel workbook, parses standings rows from the first sheet
 * (skipping the header row), and upserts each entry into the `standings`
 * Firestore collection, keyed by the station callsign.
 */
export const processStandingsUpload = onObjectFinalized(
  { bucket: 'arrl-co-yotc.firebasestorage.app' },
  async (event) => {
  const filePath = event.data.name;

  // Only process files inside the standings-uploads/ prefix.
  if (!filePath?.startsWith('standings-uploads/')) return;

  console.log(`Processing standings file: ${filePath}`);

  const bucket = getStorage().bucket(event.data.bucket);
  const file = bucket.file(filePath);

  const [fileBuffer] = await file.download();

  // ExcelJS.xlsx.load() also accepts ArrayBuffer; slicing ensures we get exactly the
  // bytes this Buffer covers (avoids any byteOffset issues from shared ArrayBuffers).
  const arrayBuffer = fileBuffer.buffer.slice(
    fileBuffer.byteOffset,
    fileBuffer.byteOffset + fileBuffer.byteLength,
  ) as ArrayBuffer;

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(arrayBuffer);

  const worksheet = workbook.worksheets[0];
  if (!worksheet) {
    console.warn('No worksheet found in the uploaded Excel file.');
    return;
  }

  const db = getFirestore();
  const standingsCollection = db.collection('standings');
  const updatedAt = new Date().toISOString();

  const batch = db.batch();
  let rowCount = 0;

  worksheet.eachRow((row, rowNumber) => {
    // Skip the header row.
    if (rowNumber === 1) return;

    const entry = parseStandingRow(row);
    if (!entry) return;

    const docRef = standingsCollection.doc(entry.callsign);
    batch.set(docRef, { ...entry, updatedAt }, { merge: true });
    rowCount++;
  });

  await batch.commit();
  console.log(`Standings ETL complete: ${rowCount} row(s) written to Firestore.`);
  },
);
