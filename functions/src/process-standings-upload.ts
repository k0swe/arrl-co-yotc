import { onObjectFinalized } from 'firebase-functions/v2/storage';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import ExcelJS from 'exceljs';

/**
 * Normalises an ExcelJS cell value to a Firestore-safe primitive.
 * Dates become ISO strings; formula cells resolve to their result;
 * rich-text and hyperlink objects are collapsed to plain strings.
 * Everything else (string, number, boolean, null) is returned as-is.
 */
function toPrimitive(value: ExcelJS.CellValue): string | number | boolean | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }
  if (value instanceof Date) return value.toISOString();
  // Formula cell – use the cached result if available
  if (typeof value === 'object' && 'result' in value) {
    return toPrimitive((value as ExcelJS.CellFormulaValue).result ?? null);
  }
  // Rich text, hyperlinks, shared-string objects – convert to plain text
  return String(value);
}

/**
 * Cloud Run function triggered when a file is uploaded to the
 * `standings-uploads/` path in Firebase Storage.
 *
 * It reads the first worksheet of the Excel workbook, treats row 1 as column
 * headers, and replaces the entire `standings` Firestore collection with the
 * rows from the new file. Documents whose IDs are no longer in the new file
 * are deleted, and existing documents are fully overwritten (not merged) so
 * that stale fields from previous uploads are removed.
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

    // Read the header row to determine column names.
    const headers: string[] = [];
    worksheet.getRow(1).eachCell((cell) => {
      headers.push(String(cell.value ?? '').trim());
    });

    const db = getFirestore();
    const standingsCollection = db.collection('standings');
    const updatedAt = new Date().toISOString();

    // Fetch existing document refs so we can delete any that are no longer in
    // the new upload (avoids stale rows persisting after a re-upload).
    const existingRefs = await standingsCollection.listDocuments();

    // Build the array-of-arrays representation: first row is headers, each
    // subsequent row mirrors the column order from the Excel sheet exactly.
    // This preserves column ordering, which Firestore named fields do not
    // guarantee across reads.
    const dataRows: (string | number | boolean | null)[][] = [];
    let rowCount = 0;

    worksheet.eachRow((row, rowNumber) => {
      // Skip the header row.
      if (rowNumber === 1) return;

      // Map each column by index so that empty cells become null and column
      // position is always preserved.
      const rowValues = headers.map((_, i) => toPrimitive(row.getCell(i + 1).value));

      // Skip entirely empty rows (first cell is blank).
      if (!String(rowValues[0] ?? '').trim()) return;

      dataRows.push(rowValues);
      rowCount++;
    });

    const batch = db.batch();

    // Write a single document that encodes the full table as an array of
    // arrays. Document ID "latest" is a well-known sentinel that the client
    // reads first before falling back to the legacy per-row format.
    const latestRef = standingsCollection.doc('latest');
    batch.set(latestRef, { rows: [headers, ...dataRows], updatedAt });

    // Delete all previously stored documents (old per-row docs and any prior
    // "latest" document) so the collection stays clean.
    for (const ref of existingRefs) {
      if (ref.id !== 'latest') {
        batch.delete(ref);
      }
    }

    await batch.commit();
    console.log(`Standings ETL complete: ${rowCount} row(s) written to Firestore.`);
  },
);
