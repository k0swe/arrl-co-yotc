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
import { from, Observable, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { Club } from '@arrl-co-yotc/shared/build/app/models/club.model';
import { generateSlugFromName } from '@arrl-co-yotc/shared/build/app/utils/slug.util';

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
   * Get all clubs with a specific slug (for uniqueness validation)
   */
  getAllClubsBySlug(slug: string): Observable<Club[]> {
    const q = query(this.clubsCollection, where('slug', '==', slug));
    return collectionData(q, { idField: 'id' }) as Observable<Club[]>;
  }

  /**
   * Generate a unique slug from a club name, handling collisions by appending numbers
   * @param clubName The club name to generate a slug from
   * @param excludeClubId Optional club ID to exclude from collision detection (for editing existing clubs)
   * @returns Observable that emits a unique slug
   */
  generateUniqueSlug(clubName: string, excludeClubId?: string): Observable<string> {
    const baseSlug = generateSlugFromName(clubName);
    
    if (!baseSlug) {
      // If we can't generate a base slug, return a random one
      return of(`club-${Math.random().toString(36).substr(2, 6)}`);
    }

    // Check if the base slug is available
    return this.getAllClubsBySlug(baseSlug).pipe(
      switchMap((existingClubs) => {
        // Filter out the current club if editing
        const conflictingClubs = existingClubs.filter(club => 
          !excludeClubId || club.id !== excludeClubId
        );
        
        if (conflictingClubs.length === 0) {
          // Base slug is available
          return of(baseSlug);
        }
        
        // Base slug is taken, try numbered variants
        return this.findAvailableNumberedSlug(baseSlug, excludeClubId);
      })
    );
  }

  /**
   * Find an available slug by appending numbers (slug2, slug3, etc.)
   */
  private findAvailableNumberedSlug(baseSlug: string, excludeClubId?: string): Observable<string> {
    const maxAttempts = 100; // Prevent infinite loops
    
    const checkSlug = (attempt: number): Observable<string> => {
      if (attempt > maxAttempts) {
        // Fallback to random suffix if we can't find a numbered one
        const randomSuffix = Math.random().toString(36).substr(2, 4);
        return of(`${baseSlug}-${randomSuffix}`);
      }
      
      const candidateSlug = `${baseSlug}${attempt}`;
      
      return this.getAllClubsBySlug(candidateSlug).pipe(
        switchMap((existingClubs) => {
          const conflictingClubs = existingClubs.filter(club => 
            !excludeClubId || club.id !== excludeClubId
          );
          
          if (conflictingClubs.length === 0) {
            return of(candidateSlug);
          }
          
          // Try next number
          return checkSlug(attempt + 1);
        })
      );
    };
    
    return checkSlug(2); // Start with slug2
  }

  /**
   * Get a specific club by slug or ID
   * Tries to fetch by slug first, falls back to ID if slug lookup fails
   */
  getClubBySlugOrId(slugOrId: string): Observable<Club | null> {
    // First try to get by slug
    return this.getClubBySlug(slugOrId).pipe(
      switchMap((club) => {
        // If found by slug, return it
        if (club) {
          return of(club);
        }
        // Otherwise try by ID
        return this.getClubById(slugOrId);
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
   * The slug will be generated from the club name and guaranteed to be unique
   */
  suggestClub(suggestion: Partial<Club>, userId: string): Observable<void> {
    // Generate a unique slug first
    return this.generateUniqueSlug(suggestion.name || '').pipe(
      switchMap((uniqueSlug) => {
        const clubData = {
          name: suggestion.name,
          callsign: suggestion.callsign,
          description: suggestion.description,
          location: suggestion.location,
          website: suggestion.website,
          slug: uniqueSlug,
          isActive: false,
          suggestedBy: userId,
          leaderIds: [],
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };
        return from(
          addDoc(this.clubsCollection, clubData).then(() => void 0),
        );
      })
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
      }).then(() => void 0),
    );
  }
}
