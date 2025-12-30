import { inject, Injectable } from '@angular/core';
import {
  addDoc,
  collection,
  collectionData,
  deleteDoc,
  doc,
  Firestore,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from '@angular/fire/firestore';
import { from, Observable } from 'rxjs';
import { Event } from '@arrl-co-yotc/shared/build/app/models/event.model';

/**
 * Service for managing event data from Firestore.
 * Events are stored as subcollections under clubs: clubs/{clubId}/events/{eventId}
 */
@Injectable({
  providedIn: 'root',
})
export class EventService {
  private firestore = inject(Firestore);

  /**
   * Get all events for a specific club ordered by start time
   */
  getClubEvents(clubId: string): Observable<Event[]> {
    const eventsCollection = collection(this.firestore, `clubs/${clubId}/events`);
    const q = query(eventsCollection, orderBy('startTime', 'asc'));
    return collectionData(q, { idField: 'id' }) as Observable<Event[]>;
  }

  /**
   * Create a new event for a club
   */
  createEvent(clubId: string, eventData: Omit<Event, 'id' | 'clubId' | 'createdAt' | 'updatedAt' | 'createdBy'>, userId: string): Observable<string> {
    const eventsCollection = collection(this.firestore, `clubs/${clubId}/events`);
    const newEvent = {
      ...eventData,
      clubId,
      createdBy: userId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    return from(
      addDoc(eventsCollection, newEvent).then((docRef) => docRef.id),
    );
  }

  /**
   * Update an existing event
   */
  updateEvent(clubId: string, eventId: string, updates: Partial<Event>): Observable<void> {
    const eventDoc = doc(this.firestore, `clubs/${clubId}/events`, eventId);
    return from(
      updateDoc(eventDoc, {
        ...updates,
        updatedAt: serverTimestamp(),
      }).then(() => void 0),
    );
  }

  /**
   * Delete an event
   */
  deleteEvent(clubId: string, eventId: string): Observable<void> {
    const eventDoc = doc(this.firestore, `clubs/${clubId}/events`, eventId);
    return from(deleteDoc(eventDoc).then(() => void 0));
  }
}
