import ExcelJS from 'exceljs';
import { describe, expect, it } from 'vitest';
import {
  prepareStandingsUpload,
  StandingsUploadValidationError,
} from './process-standings-upload';

const headers = [
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

function workbookWithRows(
  callsigns: Array<string | null>,
  includeHeaders = true,
): ExcelJS.Workbook {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Standings');
  if (includeHeaders) worksheet.addRow(headers);
  for (const callsign of callsigns) {
    worksheet.addRow([callsign, callsign ? 10 : 12]);
  }
  return workbook;
}

describe('prepareStandingsUpload', () => {
  it('selects the worksheet with required headers instead of assuming the first sheet', () => {
    const workbook = new ExcelJS.Workbook();
    workbook.addWorksheet('Notes').addRow(['Intro', 'not standings']);
    const expected = workbook.addWorksheet('Scores');
    expected.addRow(headers);
    expected.addRow(['N0POH', 12]);
    expected.addRow(['W0VG', 5000]);

    const result = prepareStandingsUpload(workbook, 0);

    expect(result.worksheetName).toBe('Scores');
    expect(result.rowCount).toBe(2);
    expect(result.rowDocs['N0POH']["Total QSO's"]).toBe(12);
    expect(result.rowDocs['W0VG']["Total QSO's"]).toBe(5000);
  });

  it('rejects a workbook missing required headers', () => {
    const workbook = new ExcelJS.Workbook();
    workbook.addWorksheet('Standings').addRow(headers.slice(1));

    expect(() => prepareStandingsUpload(workbook, 0)).toThrow(
      /STATION_CALLSIGN/,
    );
  });

  it('rejects populated rows without a station callsign', () => {
    const workbook = workbookWithRows([null]);

    expect(() => prepareStandingsUpload(workbook, 0)).toThrow(
      /without a station callsign/,
    );
  });

  it('rejects snapshots that would remove more than half of published rows', () => {
    const workbook = workbookWithRows(['N0POH']);

    expect(() => prepareStandingsUpload(workbook, 4)).toThrow(
      /less than half of the 4 currently published/,
    );
  });

  it('allows a complete snapshot containing the recently missing stations', () => {
    const workbook = workbookWithRows(['N0POH', 'W0VG']);

    const result = prepareStandingsUpload(workbook, 2);

    expect(result.rowCount).toBe(2);
    expect(Object.keys(result.rowDocs)).toEqual(['N0POH', 'W0VG']);
  });

  it('returns a specific validation error type for rejected workbooks', () => {
    const workbook = workbookWithRows([]);

    try {
      prepareStandingsUpload(workbook, 0);
      throw new Error('Expected upload validation to fail');
    } catch (error) {
      expect(error).toBeInstanceOf(StandingsUploadValidationError);
      expect(error).toHaveProperty('worksheetName', 'Standings');
    }
  });
});
