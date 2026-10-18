import { onObjectFinalized } from 'firebase-functions/v2/storage';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import ExcelJS from 'exceljs';

const REQUIRED_HEADERS = [
  'STATION_CALLSIGN',
  "Total QSO's",
  'WAS',
  'Colo_Clubs',
  'VE Session',
  'New Members',
  'Public Event',
  'ARRL Field Day',
  'Winter Field Day',
  'Inter-Club Event',
];
const MIN_STANDINGS_RETENTION_RATIO = 0.5;
const MAX_STANDINGS_BATCH_WRITES = 500;

type StandingsRow = Record<string, string | number | boolean | null>;

export type PreparedStandings = {
  headers: string[];
  worksheetName: string;
  rowDocs: Record<string, StandingsRow>;
  rowCount: number;
};

export class StandingsUploadValidationError extends Error {
  constructor(
    message: string,
    readonly worksheetName?: string,
  ) {
    super(message);
    this.name = 'StandingsUploadValidationError';
  }
}

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

function worksheetHeaders(worksheet: ExcelJS.Worksheet): string[] {
  const headers: string[] = [];
  worksheet.getRow(1).eachCell({ includeEmpty: true }, (cell, columnNumber) => {
    headers[columnNumber - 1] = String(cell.value ?? '').trim();
  });
  return headers;
}

function missingRequiredHeaders(headers: string[]): string[] {
  const normalizedHeaders = new Set(headers.map((header) => header.toLowerCase()));
  return REQUIRED_HEADERS.filter((header) => !normalizedHeaders.has(header.toLowerCase()));
}

/**
 * Validates and prepares a complete snapshot before any Firestore writes occur.
 */
export function prepareStandingsUpload(
  workbook: ExcelJS.Workbook,
  existingRowCount: number,
): PreparedStandings {
  const candidates = workbook.worksheets.map((worksheet) => ({
    worksheet,
    headers: worksheetHeaders(worksheet),
  }));
  const matchingSheet = candidates.find(({ headers }) => missingRequiredHeaders(headers).length === 0);

  if (!matchingSheet) {
    const bestCandidate = candidates
      .map((candidate) => ({
        ...candidate,
        missing: missingRequiredHeaders(candidate.headers),
      }))
      .sort((a, b) => a.missing.length - b.missing.length)[0];
    const sheetDescription = bestCandidate ? ` in worksheet "${bestCandidate.worksheet.name}"` : '';
    const missing = bestCandidate?.missing.length
      ? ` Missing required column(s): ${bestCandidate.missing.join(', ')}.`
      : '';
    throw new StandingsUploadValidationError(
      `No worksheet contains all required standings columns${sheetDescription}.${missing}`,
      bestCandidate?.worksheet.name,
    );
  }

  const { worksheet, headers } = matchingSheet;
  const callsignIndex = headers.findIndex(
    (header) => header.toLowerCase() === 'station_callsign',
  );
  const rowDocs = Object.create(null) as Record<string, StandingsRow>;
  let rowCount = 0;

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;

    const values = headers.map((header, index) => ({
      header,
      value: toPrimitive(row.getCell(index + 1).value),
    }));
    if (values.every(({ value }) => value === null || String(value).trim() === '')) return;

    const callsign = String(values[callsignIndex]?.value ?? '').trim();
    if (!callsign) {
      throw new StandingsUploadValidationError(
        `Worksheet "${worksheet.name}" contains data on row ${rowNumber} without a station callsign.`,
        worksheet.name,
      );
    }

    const docId = callsign.toUpperCase();
    if (docId.includes('/') || docId === 'COLUMNS' || Object.hasOwn(rowDocs, docId)) {
      throw new StandingsUploadValidationError(
        `Worksheet "${worksheet.name}" contains an invalid or duplicate station callsign on row ${rowNumber}: "${callsign}".`,
        worksheet.name,
      );
    }

    const entry: StandingsRow = {};
    values.forEach(({ header, value }) => {
      if (header) entry[header] = value;
    });
    entry[headers[callsignIndex]] = callsign;
    rowDocs[docId] = entry;
    rowCount++;
  });

  if (rowCount === 0) {
    throw new StandingsUploadValidationError(
      `Worksheet "${worksheet.name}" contains no station rows.`,
      worksheet.name,
    );
  }

  if (existingRowCount > 0 && rowCount / existingRowCount < MIN_STANDINGS_RETENTION_RATIO) {
    throw new StandingsUploadValidationError(
      `Upload contains ${rowCount} station row(s), less than half of the ${existingRowCount} currently published. Check the workbook before retrying.`,
      worksheet.name,
    );
  }

  if (rowCount + existingRowCount + 1 > MAX_STANDINGS_BATCH_WRITES) {
    throw new StandingsUploadValidationError(
      `Upload is too large to publish safely in one transaction (${rowCount} station rows).`,
      worksheet.name,
    );
  }

  return { headers, worksheetName: worksheet.name, rowDocs, rowCount };
}

/**
 * Cloud Run function triggered when a file is uploaded to the
 * `standings-uploads/` path in Firebase Storage.
 *
 * It finds the worksheet containing the required standings columns, validates
 * the complete snapshot, and then replaces the `standings` collection.
 * Documents that are no longer in the new file are deleted, and existing
 * documents are fully overwritten (not merged) so that stale fields from
 * previous uploads are removed.
 */
export const processStandingsUpload = onObjectFinalized(
  { bucket: 'arrl-co-yotc.firebasestorage.app' },
  async (event) => {
    const filePath = event.data.name;

    // Only process files inside the standings-uploads/ prefix.
    if (!filePath?.startsWith('standings-uploads/')) return;

    console.log(`Processing standings file: ${filePath}`);

    const db = getFirestore();
    const uploadId = filePath.slice('standings-uploads/'.length);
    if (!uploadId || uploadId.includes('/')) return;
    const uploadStatusRef = db.collection('standings-upload-jobs').doc(uploadId);
    const standingsCollection = db.collection('standings');
    const fileName = uploadId.split('/').at(-1) ?? uploadId;
    const updatedAt = () => new Date().toISOString();

    await uploadStatusRef.set({ status: 'processing', fileName, updatedAt: updatedAt() });

    try {
      const bucket = getStorage().bucket(event.data.bucket);
      const file = bucket.file(filePath);
      const [fileBuffer] = await file.download();
      const arrayBuffer = fileBuffer.buffer.slice(
        fileBuffer.byteOffset,
        fileBuffer.byteOffset + fileBuffer.byteLength,
      ) as ArrayBuffer;

      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(arrayBuffer);
      const existingRefs = await standingsCollection.listDocuments();
      const existingRowCount = existingRefs.filter((ref) => ref.id !== 'columns').length;
      const prepared = prepareStandingsUpload(workbook, existingRowCount);
      const batch = db.batch();

      batch.set(standingsCollection.doc('columns'), {
        columns: prepared.headers,
        updatedAt: updatedAt(),
      });
      for (const [docId, fields] of Object.entries(prepared.rowDocs)) {
        batch.set(standingsCollection.doc(docId), fields);
      }

      const incomingIds = new Set(['columns', ...Object.keys(prepared.rowDocs)]);
      for (const ref of existingRefs) {
        if (!incomingIds.has(ref.id)) batch.delete(ref);
      }

      await batch.commit();
      await uploadStatusRef.set({
        status: 'succeeded',
        fileName,
        worksheetName: prepared.worksheetName,
        rowCount: prepared.rowCount,
        updatedAt: updatedAt(),
      });
      console.log(
        `Standings ETL complete: ${prepared.rowCount} row(s) written from "${prepared.worksheetName}".`,
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Standings upload could not be processed.';
      await uploadStatusRef.set({
        status: 'failed',
        fileName,
        ...(error instanceof StandingsUploadValidationError && error.worksheetName
          ? { worksheetName: error.worksheetName }
          : {}),
        error: message,
        updatedAt: updatedAt(),
      });
      console.error(`Standings upload rejected: ${message}`);
    }
  },
);
