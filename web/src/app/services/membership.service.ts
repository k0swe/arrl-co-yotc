import { inject, Injectable } from '@angular/core';
import {
  Firestore,
  collection,
  collectionData,
  collectionGroup,
  setDoc,
  doc,
  query,
  where,
  serverTimestamp
} from '@angular/fire/firestore';
import { Observable, from } from 'rxjs';
import { ClubMembership, MembershipRole, MembershipStatus } from '@arrl-co-yotc/shared/build/app/models/user.model';

/**
 * Service for managing club membership confirmations and data.
 */
@Injectable({
  providedIn: 'root'
})
export class MembershipService {
  private firestore = inject(Firestore);

  /**
   * Get all memberships for a specific user using collection group query
   */
  getUserMemberships(userId: string): Observable<ClubMembership[]> {
    const membershipsGroup = collectionGroup(this.firestore, 'memberships');
    const q = query(
      membershipsGroup,
      where('userId', '==', userId)
    );
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
      updatedAt: serverTimestamp()
    };

    return from(
      setDoc(membershipRef, membership).then(() => {})
    );
  }

  /**
   * Check if a user has already confirmed membership or has an existing record for a club
   */
  checkExistingMembership(userId: string, clubId: string): Observable<ClubMembership[]> {
    const membershipsGroup = collectionGroup(this.firestore, 'memberships');
    const q = query(
      membershipsGroup,
      where('userId', '==', userId),
      where('clubId', '==', clubId)
    );
    return collectionData(q, { idField: 'id' }) as Observable<ClubMembership[]>;
  }
}
