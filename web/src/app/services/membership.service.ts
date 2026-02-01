import { inject, Injectable } from '@angular/core';
import {
  Firestore,
  collection,
  collectionData,
  collectionGroup,
  setDoc,
  doc,
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
    return collectionData(q, { idField: 'id' }).pipe(map((data) => data as ClubMembership[]));
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
   * Get all active members for a specific club
   * Returns memberships with status 'active'
   */
  getActiveMembers(clubId: string): Observable<ClubMembership[]> {
    const membershipsCollection = collection(this.firestore, `clubs/${clubId}/memberships`);
    const q = query(membershipsCollection, where('status', '==', MembershipStatus.Active));
    return collectionData(q, { idField: 'id' }) as Observable<ClubMembership[]>;
  }

  /**
   * Get all denied members for a specific club
   * Returns memberships with status 'denied'
   */
  getDeniedMembers(clubId: string): Observable<ClubMembership[]> {
    const membershipsCollection = collection(this.firestore, `clubs/${clubId}/memberships`);
    const q = query(membershipsCollection, where('status', '==', MembershipStatus.Denied));
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

  /**
   * Reject an active membership
   * Updates the membership status from 'active' to 'denied'.
   * This is a convenience method that delegates to denyMembership.
   * Use this when rejecting an already-active membership; it has the same
   * effect as denyMembership but with clearer naming in the UI context.
   */
  rejectMembership(clubId: string, userId: string): Observable<void> {
    return this.denyMembership(clubId, userId);
  }

  /**
   * Accept a denied membership
   * Updates the membership status from 'denied' to 'active'.
   * This reinstates a previously rejected member and records who approved
   * the reinstatement. Note: This will update approvedAt and approvedBy fields,
   * replacing any previous approval metadata to create an audit trail of the
   * reinstatement action.
   */
  acceptDeniedMembership(clubId: string, userId: string, approvedBy: string): Observable<void> {
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
   * Promote a member to club leader
   * Updates the membership role to 'leader'
   */
  promoteMemberToLeader(clubId: string, userId: string): Observable<void> {
    const membershipRef = doc(this.firestore, `clubs/${clubId}/memberships/${userId}`);
    return from(
      updateDoc(membershipRef, {
        role: MembershipRole.Leader,
        updatedAt: serverTimestamp(),
      }),
    );
  }

  /**
   * Demote a club leader to regular member
   * Updates the membership role to 'member'
   */
  demoteMemberToRegular(clubId: string, userId: string): Observable<void> {
    const membershipRef = doc(this.firestore, `clubs/${clubId}/memberships/${userId}`);
    return from(
      updateDoc(membershipRef, {
        role: MembershipRole.Member,
        updatedAt: serverTimestamp(),
      }),
    );
  }
}
