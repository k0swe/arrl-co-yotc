/**
 * Represents a single row from the uploaded standings Excel sheet.
 * Fields are determined by the column headers in the spreadsheet.
 */
export type StandingEntry = Record<string, unknown>;

/**
 * Stored at `standings/columns` to preserve the original column ordering from
 * the uploaded Excel sheet. Per-row documents use column names as field keys,
 * but Firestore does not guarantee key ordering on reads, so this companion
 * document records the authoritative column sequence.
 */
export type StandingsColumns = {
  columns: string[];
  updatedAt: string;
};
