/** Represents a single club's standings entry, derived from the uploaded Excel report. */
export interface StandingEntry {
  /** Amateur radio callsign of the station */
  callsign: string;
  /** Total number of QSOs logged */
  totalQsos: number;
  /** Worked All States count */
  was: number;
  /** Colorado clubs affiliation string */
  coloClubs: string;
  /** Number of VE (volunteer examiner) sessions */
  veSessions: number;
  /** Number of new members brought in */
  newMembers: number;
  /** Number of public events participated in */
  publicEvents: number;
  /** Whether the club participated in ARRL Field Day */
  arrlFieldDay: boolean;
  /** Whether the club participated in Winter Field Day */
  winterFieldDay: boolean;
  /** Whether the club participated in an inter-club event */
  interClubEvent: boolean;
  /** When this entry was last updated (ISO 8601 string) */
  updatedAt: string;
}
