import { inject, Injectable } from '@angular/core';
import {
  collection,
  doc,
  documentId,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore';
import { forkJoin, from, Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { User } from '@arrl-co-yotc/shared/build/app/models/user.model';
import { FIREBASE_FIRESTORE } from '../firebase.tokens';

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private firestore = inject(FIREBASE_FIRESTORE);

  /**
   * Get a user by ID
   */
  getUser(userId: string): Observable<User | null> {
    return from(getDoc(doc(this.firestore, 'users', userId))).pipe(
      map((docSnap) => (docSnap.exists() ? this.toUser(docSnap.id, docSnap.data()) : null)),
    );
  }

  /**
   * Get several users with batched document-ID queries.
   *
   * Firestore limits `in` queries to 30 values, so larger requests are split
   * into compliant batches. This preserves the existing document-level read
   * permissions while avoiding one request per displayed user.
   */
  getUsers(userIds: readonly string[]): Observable<Map<string, User>> {
    const uniqueIds = [...new Set(userIds.filter(Boolean))];
    if (uniqueIds.length === 0) {
      return of(new Map());
    }

    const userBatches = this.chunk(uniqueIds, 30).map((ids) => {
      const usersQuery = query(collection(this.firestore, 'users'), where(documentId(), 'in', ids));

      return from(getDocs(usersQuery)).pipe(
        map((snapshot) => snapshot.docs.map((userDoc) => this.toUser(userDoc.id, userDoc.data()))),
      );
    });

    return forkJoin(userBatches).pipe(
      map((batches) => new Map(batches.flat().map((user) => [user.id, user]))),
    );
  }

  /**
   * Create or update a user document
   */
  saveUser(userId: string, userData: Partial<User>): Observable<void> {
    const userDoc = doc(this.firestore, 'users', userId);

    return from(
      getDoc(userDoc).then((docSnap) => {
        const now = serverTimestamp();
        const data: any = {
          id: userId,
          ...userData,
          updatedAt: now,
        };

        // If document doesn't exist, add createdAt and default values
        if (!docSnap.exists()) {
          data.createdAt = now;
          data.isAdmin = false;
        }

        return setDoc(userDoc, data, { merge: true });
      }),
    );
  }

  private toUser(id: string, data: Record<string, unknown>): User {
    return {
      id,
      name: typeof data['name'] === 'string' ? data['name'] : '',
      callsign: typeof data['callsign'] === 'string' ? data['callsign'] : '',
      email: typeof data['email'] === 'string' ? data['email'] : '',
      isAdmin: data['isAdmin'] === true,
      createdAt: this.toDate(data['createdAt']),
      updatedAt: this.toDate(data['updatedAt']),
    };
  }

  private toDate(value: unknown): Date {
    if (
      typeof value === 'object' &&
      value !== null &&
      'toDate' in value &&
      typeof value.toDate === 'function'
    ) {
      return value.toDate();
    }

    return new Date();
  }

  private chunk<T>(values: readonly T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let index = 0; index < values.length; index += size) {
      chunks.push(values.slice(index, index + size));
    }
    return chunks;
  }
}
