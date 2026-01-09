import { inject, Injectable } from '@angular/core';
import {
  addDoc,
  collection,
  collectionData,
  deleteDoc,
  doc,
  Firestore,
  getDoc,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from '@angular/fire/firestore';
import { from, Observable, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
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
      })
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
      })
    );
  }

  /**
   * Get a specific club by slug or ID
   * Tries to fetch by slug first, falls back to ID if slug lookup fails
   */
  getClubBySlugOrId(slugOrId: string): Observable<Club | null> {
    // First try to get by slug
    return this.getClubBySlug(slugOrId).pipe(
      switchMap((club: Club | null) => {
        // If found by slug, return it
        if (club) {
          return of(club);
        }
        // Otherwise try by ID
        return this.getClubById(slugOrId);
      })
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
      orderBy('createdAt', 'desc')
    );
    return collectionData(q, { idField: 'id' }) as Observable<Club[]>;
  }

  /**
   * Submit a suggestion for a new club
   * Creates an inactive club that requires admin approval
   * The slug will be set by admins when they approve the club
   */
  suggestClub(suggestion: Partial<Club>, userId: string): Observable<void> {
    const clubData = {
      name: suggestion.name,
      callsign: suggestion.callsign,
      description: suggestion.description,
      location: suggestion.location,
      website: suggestion.website,
      slug: '', // Will be set by admin when approving the club
      isActive: false,
      suggestedBy: userId,
      leaderIds: [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    return from(
      addDoc(this.clubsCollection, clubData).then(() => void 0)
    );
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
      }).then(() => void 0)
    );
  }

  /**
   * Reject a club suggestion by deleting it from the database
   * This removes the rejected club suggestion completely. Note: This operation
   * is permanent and does not preserve an audit trail. Use this when the
   * suggestion should not be retained in the system.
   */
  rejectClub(clubId: string): Observable<void> {
    const clubDoc = doc(this.firestore, 'clubs', clubId);
    return from(deleteDoc(clubDoc).then(() => void 0));
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
      }).then(() => void 0)
    );
  }

  /**
   * Update the leaderIds array for a club
   * Used when promoting or demoting members to/from leader role
   */
  updateClubLeaderIds(clubId: string, leaderIds: string[]): Observable<void> {
    const clubDoc = doc(this.firestore, 'clubs', clubId);
    return from(
      updateDoc(clubDoc, {
        leaderIds,
        updatedAt: serverTimestamp(),
      }).then(() => void 0)
    );
  }
}
