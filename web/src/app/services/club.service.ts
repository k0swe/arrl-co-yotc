import { inject, Injectable } from '@angular/core';
import {
  addDoc,
  collection,
  collectionData,
  doc,
  Firestore,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from '@angular/fire/firestore';
import { from, Observable } from 'rxjs';
import { Club } from '@arrl-co-yotc/shared/build/app/models/club.model';

/**
 * Service for managing club data from Firestore.
 */
@Injectable({
  providedIn: 'root',
})
export class ClubService {
  private firestore = inject(Firestore);
  private clubsCollection = collection(this.firestore, 'clubs');

  /**
   * Get all active clubs ordered by name
   */
  getActiveClubs(): Observable<Club[]> {
    const q = query(this.clubsCollection, where('isActive', '==', true), orderBy('name', 'asc'));
    return collectionData(q, { idField: 'id' }) as Observable<Club[]>;
  }

  /**
   * Get all clubs (active and inactive) ordered by name
   */
  getAllClubs(): Observable<Club[]> {
    const q = query(this.clubsCollection, orderBy('name', 'asc'));
    return collectionData(q, { idField: 'id' }) as Observable<Club[]>;
  }

  /**
   * Get all pending clubs (suggestions awaiting approval) ordered by creation date
   */
  getPendingClubs(): Observable<Club[]> {
    const q = query(
      this.clubsCollection,
      where('isActive', '==', false),
      orderBy('createdAt', 'desc'),
    );
    return collectionData(q, { idField: 'id' }) as Observable<Club[]>;
  }

  /**
   * Submit a suggestion for a new club
   * Creates an inactive club that requires admin approval
   */
  suggestClub(suggestion: Partial<Club>, userId: string): Observable<void> {
    const clubData = {
      name: suggestion.name,
      callsign: suggestion.callsign,
      description: suggestion.description,
      location: suggestion.location,
      isActive: false,
      suggestedBy: userId,
      leaderIds: [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    return from(addDoc(this.clubsCollection, clubData).then(() => void 0));
  }

  /**
   * Approve a club suggestion by setting it to active
   */
  approveClub(clubId: string): Observable<void> {
    const clubDoc = doc(this.firestore, 'clubs', clubId);
    return from(
      updateDoc(clubDoc, {
        isActive: true,
        updatedAt: serverTimestamp(),
      }).then(() => void 0),
    );
  }

  /**
   * Reject a club suggestion by keeping it as inactive
   * This preserves the record for auditing purposes
   */
  rejectClub(clubId: string): Observable<void> {
    const clubDoc = doc(this.firestore, 'clubs', clubId);
    return from(
      updateDoc(clubDoc, {
        isActive: false,
        updatedAt: serverTimestamp(),
      }).then(() => void 0),
    );
  }
}
