/**
 * The application model represented by a Firestore document, including its document ID.
 *
 * Firestore stores the ID as document metadata rather than as a field in document data.
 */
export type FirestoreDocument<T extends { id: string }> = Omit<T, 'id'>;

/**
 * Combines Firestore document metadata with its data as a fully typed application model.
 *
 * The document ID is deliberately assigned after the data so persisted data cannot override
 * Firestore's authoritative document ID.
 */
export function mapFirestoreDocument<T extends { id: string }>(
  id: string,
  data: FirestoreDocument<T>,
): T {
  return { ...data, id } as T;
}
