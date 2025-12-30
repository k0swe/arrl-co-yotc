import { inject, Injectable } from '@angular/core';
import {
  Firestore,
  collection,
  collectionData,
  collectionGroup,
  setDoc,
  doc,
  docData,
  getDoc,
  query,
  where,
  serverTimestamp,
  updateDoc,
} from '@angular/fire/firestore';
import { Observable, from, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import {
  ClubMembership,
  MembershipRole,
  MembershipStatus,
} from '@arrl-co-yotc/shared/build/app/models/user.model';

/**
 * Service for managing club membership confirmations and data.
 */
@Injectable({
  providedIn: 'root',
})
export class MembershipService {
  private firestore = inject(Firestore);

  /**
   * Get all memberships for a specific user using collection group query
   */
  getUserMemberships(userId: string): Observable<ClubMembership[]> {
    const membershipsGroup = collectionGroup(this.firestore, 'memberships');
    const q = query(membershipsGroup, where('userId', '==', userId));
    return collectionData(q, { idField: 'id' }) as Observable<ClubMembership[]>;
  }

  /**
   * Apply for membership in a club
   * Creates a membership document at clubs/{clubId}/memberships/{userId}
   */
  applyForMembership(userId: string, clubId: string): Observable<void> {
    const membershipRef = doc(this.firestore, `clubs/${clubId}/memberships/${userId}`);
    const membership = {
      userId,
      clubId,
      role: MembershipRole.Member,
      status: MembershipStatus.Pending,
      appliedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    return from(setDoc(membershipRef, membership).then(() => {}));
  }

  /**
   * Check if a user has already confirmed membership or has an existing record for a club
   * Directly fetches the membership document at clubs/{clubId}/memberships/{userId}
   */
  checkExistingMembership(userId: string, clubId: string): Observable<ClubMembership | null> {
    const membershipRef = doc(this.firestore, `clubs/${clubId}/memberships/${userId}`);
    return from(getDoc(membershipRef)).pipe(
      map((docSnapshot) => {
        const membership = docSnapshot.exists()
          ? ({ id: docSnapshot.id, ...docSnapshot.data() } as ClubMembership)
          : null;
        return membership;
      }),
      catchError((error) => {
        console.error(`Error fetching membership for user ${userId} in club ${clubId}:`, error);
        return of(null);
      }),
    );
  }

  /**
   * Get all pending membership requests for a specific club
   * Returns memberships with status 'pending'
   */
  getPendingMemberships(clubId: string): Observable<ClubMembership[]> {
    const membershipsCollection = collection(this.firestore, `clubs/${clubId}/memberships`);
    const q = query(membershipsCollection, where('status', '==', MembershipStatus.Pending));
    return collectionData(q, { idField: 'id' }) as Observable<ClubMembership[]>;
  }

  /**
   * Approve a pending membership request
   * Updates the membership status to 'active' and records who approved it
   */
  approveMembership(clubId: string, userId: string, approvedBy: string): Observable<void> {
    const membershipRef = doc(this.firestore, `clubs/${clubId}/memberships/${userId}`);
    return from(
      updateDoc(membershipRef, {
        status: MembershipStatus.Active,
        approvedAt: serverTimestamp(),
        approvedBy,
        updatedAt: serverTimestamp(),
      }),
    );
  }

  /**
   * Deny a pending membership request
   * Updates the membership status to 'denied'
   */
  denyMembership(clubId: string, userId: string): Observable<void> {
    const membershipRef = doc(this.firestore, `clubs/${clubId}/memberships/${userId}`);
    return from(
      updateDoc(membershipRef, {
        status: MembershipStatus.Denied,
        updatedAt: serverTimestamp(),
      }),
    );
  }
}
