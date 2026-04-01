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
    const existingIds = new Set(existingRefs.map((r) => r.id));

    const batch = db.batch();
    let rowCount = 0;
    const newIds = new Set<string>();

    worksheet.eachRow((row, rowNumber) => {
      // Skip the header row.
      if (rowNumber === 1) return;

      // Build a record from header names to primitive cell values.
      const entry: Record<string, unknown> = {};
      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        const header = headers[colNumber - 1];
        if (header) {
          entry[header] = toPrimitive(cell.value);
        }
      });

      // Use the first column's value as the document ID; skip empty rows.
      const docId = String(entry[headers[0]] ?? '').trim();
      if (!docId) return;

      newIds.add(docId);
      const docRef = standingsCollection.doc(docId);
      // Full overwrite (no merge) so that fields from a previous upload with
      // different column names do not persist alongside the new columns.
      batch.set(docRef, { ...entry, updatedAt });
      rowCount++;
    });

    // Delete documents that are no longer present in the new upload.
    for (const oldId of existingIds) {
      if (!newIds.has(oldId)) {
        batch.delete(standingsCollection.doc(oldId));
      }
    }

    await batch.commit();
    console.log(`Standings ETL complete: ${rowCount} row(s) written to Firestore.`);
  },
);
