import { inject, Injectable } from '@angular/core';
import {
  collection,
  collectionData,
  doc,
  docData,
  documentId,
  Firestore,
  query,
  where,
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { StandingEntry, StandingsColumns } from '@arrl-co-yotc/shared/build/app/models/standing.model';

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
   * Returns all per-row standings documents, excluding the well-known
   * `standings/columns` sentinel document.
   */
  getStandings(): Observable<StandingEntry[]> {
    const rowsQuery = query(
      this.standingsCollection,
      where(documentId(), '!=', 'columns'),
    );
    return collectionData(rowsQuery) as Observable<StandingEntry[]>;
  }

  /**
   * Returns the `standings/columns` document which records the authoritative
   * column order from the most recent Excel upload. Emits `undefined` when the
   * document does not yet exist.
   */
  getStandingsColumns(): Observable<StandingsColumns | undefined> {
    const columnsDoc = doc(this.firestore, 'standings', 'columns');
    return docData(columnsDoc) as Observable<StandingsColumns | undefined>;
  }
}
