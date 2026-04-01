import { initializeApp } from 'firebase-admin/app';

initializeApp();

export {
  escapeHtml,
  buildClubSuggestionHtml,
  notifyAdminsOnClubSuggestion,
} from './notify-admins-on-club-suggestion';

export { processStandingsUpload } from './process-standings-upload';

