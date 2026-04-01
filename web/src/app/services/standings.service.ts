import { inject, Injectable } from '@angular/core';
import { collection, collectionData, doc, docData, Firestore } from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { StandingEntry, StandingsData } from '@arrl-co-yotc/shared/build/app/models/standing.model';

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
   * @deprecated Prefer {@link getStandingsData} which preserves column ordering.
   */
  getStandings(): Observable<StandingEntry[]> {
    return collectionData(this.standingsCollection) as Observable<StandingEntry[]>;
  }

  /**
   * Returns the single `standings/latest` document written by the new ETL
   * format. Emits `undefined` when the document does not yet exist.
   */
  getStandingsData(): Observable<StandingsData | undefined> {
    const latestDoc = doc(this.firestore, 'standings', 'latest');
    return docData(latestDoc) as Observable<StandingsData | undefined>;
  }
}
