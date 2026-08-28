import { mapFirestoreDocument, type FirestoreDocument } from './firestore-document.util';

interface TestDocument {
  id: string;
  name: string;
  tags: string[];
}

describe('mapFirestoreDocument', () => {
  it('adds Firestore document metadata to typed document data', () => {
    const data: FirestoreDocument<TestDocument> = {
      name: 'Front Range Amateur Radio Club',
      tags: ['public-service'],
    };

    expect(mapFirestoreDocument<TestDocument>('club-123', data)).toEqual({
      id: 'club-123',
      name: 'Front Range Amateur Radio Club',
      tags: ['public-service'],
    });
  });

  it('does not mutate the Firestore data object', () => {
    const data: FirestoreDocument<TestDocument> = {
      name: 'Front Range Amateur Radio Club',
      tags: ['public-service'],
    };

    const document = mapFirestoreDocument<TestDocument>('club-123', data);

    expect(data).not.toHaveProperty('id');
    expect(document).not.toBe(data);
  });
});
