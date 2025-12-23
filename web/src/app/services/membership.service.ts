import { inject, Injectable } from '@angular/core';
import { 
  Firestore, 
  collection, 
  collectionData, 
  addDoc, 
  query, 
  where,
  Timestamp 
} from '@angular/fire/firestore';
import { Observable, from } from 'rxjs';
import { ClubMembership, MembershipRole, MembershipStatus } from '../../../../src/app/models/user.model';

/**
 * Service for managing club membership applications and data.
 */
@Injectable({
  providedIn: 'root'
})
export class MembershipService {
  private firestore = inject(Firestore);
  private membershipsCollection = collection(this.firestore, 'memberships');

  /**
   * Get all memberships for a specific user
   */
  getUserMemberships(userId: string): Observable<ClubMembership[]> {
    const q = query(
      this.membershipsCollection,
      where('userId', '==', userId)
    );
    return collectionData(q, { idField: 'id' }) as Observable<ClubMembership[]>;
  }

  /**
   * Apply for membership in a club
   */
  applyForMembership(userId: string, clubId: string): Observable<void> {
    const now = Timestamp.now();
    const membership = {
      userId,
      clubId,
      role: MembershipRole.Member,
      status: MembershipStatus.Pending,
      appliedAt: now,
      updatedAt: now
    };

    return from(
      addDoc(this.membershipsCollection, membership).then(() => {})
    );
  }

  /**
   * Check if a user has already applied or is a member of a club
   */
  checkExistingMembership(userId: string, clubId: string): Observable<ClubMembership[]> {
    const q = query(
      this.membershipsCollection,
      where('userId', '==', userId),
      where('clubId', '==', clubId)
    );
    return collectionData(q, { idField: 'id' }) as Observable<ClubMembership[]>;
  }
}
