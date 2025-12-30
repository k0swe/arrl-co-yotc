import { inject, Injectable } from '@angular/core';
import { Firestore, doc, getDoc, setDoc, serverTimestamp } from '@angular/fire/firestore';
import { from, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { User } from '@arrl-co-yotc/shared/build/app/models/user.model';

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private firestore = inject(Firestore);

  /**
   * Get a user by ID
   */
  getUser(userId: string): Observable<User | null> {
    return from(getDoc(doc(this.firestore, 'users', userId))).pipe(
      map((docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            name: data['name'] || '',
            callsign: data['callsign'] || '',
            email: data['email'] || '',
            isAdmin: data['isAdmin'] || false,
            createdAt: data['createdAt']?.toDate() || new Date(),
            updatedAt: data['updatedAt']?.toDate() || new Date(),
          } as User;
        }
        return null;
      }),
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
}
