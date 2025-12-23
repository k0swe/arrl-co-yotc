import {inject, Injectable} from '@angular/core';
import {
  addDoc,
  collection,
  collectionData,
  Firestore,
  orderBy,
  query,
  serverTimestamp,
  where
} from '@angular/fire/firestore';
import {from, Observable} from 'rxjs';
import {Club} from '@arrl-co-yotc/shared/build/app/models/club.model';

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
    return collectionData(q, {idField: 'id'}) as Observable<Club[]>;
  }

  /**
   * Get all clubs (active and inactive) ordered by name
   */
  getAllClubs(): Observable<Club[]> {
    const q = query(this.clubsCollection, orderBy('name', 'asc'));
    return collectionData(q, {idField: 'id'}) as Observable<Club[]>;
  }

  /**
   * Submit a suggestion for a new club
   * Creates an inactive club that requires admin approval
   */
  suggestClub(
    suggestion: Partial<Club>,
    userId?: string
  ): Observable<void> {
    const clubData = {
      name: suggestion.name,
      callsign: suggestion.callsign,
      description: suggestion.description,
      location: suggestion.location,
      isActive: false,
      suggestedBy: userId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    return from(addDoc(this.clubsCollection, clubData).then(() => void 0));
  }
}
