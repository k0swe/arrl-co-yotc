/**
 * Generates a URL-friendly slug from a club name by taking the first letter of each word.
 * @param clubName The club name to convert to a slug
 * @returns A lowercase slug consisting of the first letter of each word
 * @example
 * generateSlugFromName('Denver Radio Club') // returns 'drc'
 * generateSlugFromName('Rocky Mountain Radio League') // returns 'rmrl'
 * generateSlugFromName('The Amateur Radio Club') // returns 'tarc'
 */
export function generateSlugFromName(clubName: string): string {
  if (!clubName || clubName.trim() === '') {
    return '';
  }

  // Split by spaces, hyphens, and other word separators, then filter out empty strings
  const words = clubName.trim().split(/[\s-]+/);

  // Take the first letter of each word, convert to lowercase
  const slug = words
    .map((word) => word.charAt(0).toLowerCase())
    .join('');

  return slug;
}
