/**
 * Represents a single row from the uploaded standings Excel sheet.
 * Fields are determined by the column headers in the spreadsheet.
 */
export type StandingEntry = Record<string, unknown>;

/**
 * New format for standings data stored as a single Firestore document at
 * `standings/latest`. `rows[0]` contains the column headers (always strings);
 * subsequent rows contain data values in the same column order, preserving the
 * original column ordering from the uploaded Excel sheet.
 */
export type StandingsData = {
  rows: [string[], ...(string | number | boolean | null)[][]];
  updatedAt: string;
};
