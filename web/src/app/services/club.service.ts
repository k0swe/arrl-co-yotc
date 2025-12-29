import { inject, Injectable } from '@angular/core';
import {
  addDoc,
  collection,
  collectionData,
  doc,
  Firestore,
  getDoc,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from '@angular/fire/firestore';
import { from, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
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
   * Get a specific club by ID
   */
  getClubById(clubId: string): Observable<Club | null> {
    const clubDoc = doc(this.firestore, 'clubs', clubId);
    return from(
      getDoc(clubDoc).then((docSnapshot) => {
        if (docSnapshot.exists()) {
          return { id: docSnapshot.id, ...docSnapshot.data() } as Club;
        }
        return null;
      }),
    );
  }

  /**
   * Get a specific club by slug
   */
  getClubBySlug(slug: string): Observable<Club | null> {
    const q = query(this.clubsCollection, where('slug', '==', slug));
    return (collectionData(q, { idField: 'id' }) as Observable<Club[]>).pipe(
      map((clubs) => {
        if (clubs.length > 0) {
          return clubs[0];
        }
        return null;
      }),
    );
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
   * This preserves the record for auditing purposes in the database.
   * Note: Rejected clubs remain in the database but are removed from the
   * pending review queue since they have been reviewed and rejected.
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

  /**
   * Update club details (name, callsign, description, location)
   * Used by admins to edit pending clubs or by club leaders to manage their club
   */
  updateClub(clubId: string, updates: Partial<Club>): Observable<void> {
    const clubDoc = doc(this.firestore, 'clubs', clubId);
    return from(
      updateDoc(clubDoc, {
        ...updates,
        updatedAt: serverTimestamp(),
      }).then(() => void 0),
    );
  }
}
