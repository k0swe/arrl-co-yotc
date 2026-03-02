import { initializeApp } from 'firebase-admin/app';

initializeApp();

export {
  escapeHtml,
  buildClubSuggestionHtml,
  notifyAdminsOnClubSuggestion,
} from './notify-admins-on-club-suggestion';

export {
  StandingRow,
  parseStandingRow,
  processStandingsUpload,
} from './process-standings-upload';

