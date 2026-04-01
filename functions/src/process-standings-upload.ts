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
 * headers, and upserts each subsequent row into the `standings` Firestore
 * collection keyed by the value in the first column. All cell values are
 * stored as-is without any type coercion.
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

    const batch = db.batch();
    let rowCount = 0;

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

      const docRef = standingsCollection.doc(docId);
      batch.set(docRef, { ...entry, updatedAt }, { merge: true });
      rowCount++;
    });

    await batch.commit();
    console.log(`Standings ETL complete: ${rowCount} row(s) written to Firestore.`);
  },
);
