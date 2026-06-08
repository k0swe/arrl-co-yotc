import { Observable } from 'rxjs';
import { Auth, onAuthStateChanged, User } from 'firebase/auth';
import {
  CollectionReference,
  DocumentData,
  DocumentReference,
  onSnapshot,
  Query,
} from 'firebase/firestore';

interface SnapshotOptions {
  idField?: string;
}

function withOptionalId<T>(id: string, data: T, options?: SnapshotOptions): T {
  if (!options?.idField) {
    return data;
  }

  return { ...data, [options.idField]: id };
}

export function authUser(auth: Auth): Observable<User | null> {
  return new Observable((subscriber) =>
    onAuthStateChanged(
      auth,
      (user) => subscriber.next(user),
      (error) => subscriber.error(error),
    ),
  );
}

export function collectionData<T extends object>(
  query: Query<DocumentData> | CollectionReference<DocumentData>,
  options?: SnapshotOptions,
): Observable<T[]> {
  return new Observable((subscriber) =>
    onSnapshot(
      query,
      (snapshot) => {
        subscriber.next(
          snapshot.docs.map((documentSnapshot) =>
            withOptionalId(documentSnapshot.id, documentSnapshot.data() as T, options),
          ),
        );
      },
      (error) => subscriber.error(error),
    ),
  );
}

export function docData<T extends object>(
  documentReference: DocumentReference<DocumentData>,
  options?: SnapshotOptions,
): Observable<T | undefined> {
  return new Observable((subscriber) =>
    onSnapshot(
      documentReference,
      (snapshot) => {
        if (!snapshot.exists()) {
          subscriber.next(undefined);
          return;
        }

        subscriber.next(withOptionalId(snapshot.id, snapshot.data() as T, options));
      },
      (error) => subscriber.error(error),
    ),
  );
}
