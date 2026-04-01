import { inject, Injectable } from '@angular/core';
import { collection, collectionData, Firestore } from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { StandingEntry } from '@arrl-co-yotc/shared/build/app/models/standing.model';

/**
 * Service for reading standings data from the Firestore `standings` collection.
 */
@Injectable({
  providedIn: 'root',
})
export class StandingsService {
  private firestore = inject(Firestore);
  private standingsCollection = collection(this.firestore, 'standings');

  /**
   * Returns all standings entries in their stored order.
   */
  getStandings(): Observable<StandingEntry[]> {
    return collectionData(this.standingsCollection) as Observable<StandingEntry[]>;
  }
}
