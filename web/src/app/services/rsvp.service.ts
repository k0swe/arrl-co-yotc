import { inject, Injectable } from '@angular/core';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import { from, Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { EventRsvp } from '@arrl-co-yotc/shared/build/app/models/event.model';
import { collectionData } from '../firebase-observables';
import { FIREBASE_FIRESTORE } from '../firebase.tokens';

/**
 * Service for managing event RSVPs.
 * RSVPs are stored as sub-collections under events: clubs/{clubId}/events/{eventId}/rsvps/{userId}
 */
@Injectable({
  providedIn: 'root',
})
export class RsvpService {
  private firestore = inject(FIREBASE_FIRESTORE);

  /**
   * Get all RSVPs for a specific event
   */
  getEventRsvps(clubId: string, eventId: string): Observable<EventRsvp[]> {
    const rsvpsCollection = collection(this.firestore, `clubs/${clubId}/events/${eventId}/rsvps`);
    return collectionData(rsvpsCollection, { idField: 'id' }) as Observable<EventRsvp[]>;
  }

  /**
   * Check if a user has RSVP'd to a specific event
   */
  getUserRsvp(clubId: string, eventId: string, userId: string): Observable<EventRsvp | null> {
    const rsvpRef = doc(this.firestore, `clubs/${clubId}/events/${eventId}/rsvps/${userId}`);
    return from(getDoc(rsvpRef)).pipe(
      map((docSnapshot) => {
        return docSnapshot.exists()
          ? ({ id: docSnapshot.id, ...docSnapshot.data() } as EventRsvp)
          : null;
      }),
      catchError((error) => {
        console.error(`Error fetching RSVP for user ${userId} to event ${eventId}:`, error);
        return of(null);
      }),
    );
  }

  /**
   * Create an RSVP for a user to an event
   */
  createRsvp(clubId: string, eventId: string, userId: string): Observable<void> {
    const rsvpRef = doc(this.firestore, `clubs/${clubId}/events/${eventId}/rsvps/${userId}`);
    const rsvp = {
      userId,
      eventId,
      clubId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    return from(setDoc(rsvpRef, rsvp).then(() => {}));
  }

  /**
   * Delete a user's RSVP to an event
   */
  deleteRsvp(clubId: string, eventId: string, userId: string): Observable<void> {
    const rsvpRef = doc(this.firestore, `clubs/${clubId}/events/${eventId}/rsvps/${userId}`);
    return from(deleteDoc(rsvpRef).then(() => {}));
  }
}
