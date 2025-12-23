import { inject, Injectable } from '@angular/core';
import { Firestore, collection, collectionData, query, where, orderBy } from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { Club } from '@arrl-co-yotc/shared/build/app/models/club.model';

/**
 * Service for managing club data from Firestore.
 */
@Injectable({
  providedIn: 'root'
})
export class ClubService {
  private firestore = inject(Firestore);
  private clubsCollection = collection(this.firestore, 'clubs');

  /**
   * Get all active clubs ordered by name
   */
  getActiveClubs(): Observable<Club[]> {
    const q = query(
      this.clubsCollection,
      where('isActive', '==', true),
      orderBy('name', 'asc')
    );
    return collectionData(q, { idField: 'id' }) as Observable<Club[]>;
  }

  /**
   * Get all clubs (active and inactive) ordered by name
   */
  getAllClubs(): Observable<Club[]> {
    const q = query(this.clubsCollection, orderBy('name', 'asc'));
    return collectionData(q, { idField: 'id' }) as Observable<Club[]>;
  }
}
