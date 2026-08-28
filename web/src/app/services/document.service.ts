import { inject, Injectable } from '@angular/core';
import {
  addDoc,
  collection,
  collectionGroup,
  deleteDoc,
  doc,
  orderBy,
  QueryConstraint,
  query,
  serverTimestamp,
  Timestamp,
  where,
} from 'firebase/firestore';
import { firstValueFrom, from, Observable } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import {
  AnyDocument,
  ClubDocument,
  EventLog,
  isEventDocument,
} from '@arrl-co-yotc/shared/build/app/models/event.model';
import { StorageService } from './storage.service';
import { collectionData } from '../firebase-observables';
import { FIREBASE_FIRESTORE } from '../firebase.tokens';

/**
 * Service for managing event document uploads and references in Firestore.
 * Documents are stored as subcollections under events:
 * clubs/{clubId}/events/{eventId}/documents/{documentId}
 *
 * Club-scoped documents (not tied to a specific event) are stored at:
 * clubs/{clubId}/documents/{documentId}
 */
@Injectable({
  providedIn: 'root',
})
export class DocumentService {
  private firestore = inject(FIREBASE_FIRESTORE);
  private storageService = inject(StorageService);

  /**
   * Get all documents uploaded on or after the given date, across all clubs and events.
   * Uses a Firestore collection group query and is restricted to admins by security rules.
   * Returns both event-scoped and club-scoped documents.
   */
  getDocumentsSince(since: Date): Observable<AnyDocument[]> {
    const documentsGroupQuery = query(
      collectionGroup(this.firestore, 'documents'),
      where('uploadedAt', '>=', Timestamp.fromDate(since)),
      orderBy('uploadedAt', 'desc'),
    );
    return collectionData(documentsGroupQuery, { idField: 'id' }) as Observable<AnyDocument[]>;
  }

  getRecentDocuments(search: {
    since: Date;
    until?: Date | null;
    clubId?: string | null;
    eventId?: string | null;
    uploadedBy?: string | null;
    scope?: 'all' | 'event' | 'club';
    pageIndex?: number;
    pageSize?: number;
  }): Observable<{ documents: AnyDocument[]; total: number }> {
    const constraints: QueryConstraint[] = [where('uploadedAt', '>=', Timestamp.fromDate(search.since))];
    if (search.until) {
      constraints.push(where('uploadedAt', '<=', Timestamp.fromDate(search.until)));
    }
    if (search.clubId) {
      constraints.push(where('clubId', '==', search.clubId));
    }
    if (search.uploadedBy) {
      constraints.push(where('uploadedBy', '==', search.uploadedBy));
    }
    constraints.push(orderBy('uploadedAt', 'desc'));

    const documentsGroupQuery = query(collectionGroup(this.firestore, 'documents'), ...constraints);

    return (collectionData(documentsGroupQuery, { idField: 'id' }) as Observable<AnyDocument[]>).pipe(
      map((documents) => {
        const filtered = this.filterRecentDocuments(documents, search.scope, search.eventId);
        if (search.pageSize === undefined) {
          return { documents: filtered, total: filtered.length };
        }
        const pageSize = Math.max(1, search.pageSize ?? 25);
        const pageIndex = Math.max(0, search.pageIndex ?? 0);
        const start = pageIndex * pageSize;
        return {
          documents: filtered.slice(start, start + pageSize),
          total: filtered.length,
        };
      }),
    );
  }

  /**
   * Get all documents for a specific event
   */
  getEventDocuments(clubId: string, eventId: string): Observable<EventLog[]> {
    const documentsCollection = collection(
      this.firestore,
      `clubs/${clubId}/events/${eventId}/documents`,
    );
    return collectionData(documentsCollection, { idField: 'id' }) as Observable<EventLog[]>;
  }

  /**
   * Get all club-scoped documents for a specific club
   */
  getClubDocuments(clubId: string): Observable<ClubDocument[]> {
    const documentsCollection = collection(this.firestore, `clubs/${clubId}/documents`);
    return collectionData(documentsCollection, { idField: 'id' }) as Observable<ClubDocument[]>;
  }

  /**
   * Upload a document for an event
   * @param clubId - The ID of the club
   * @param eventId - The ID of the event
   * @param file - The file to upload
   * @param userId - The ID of the user uploading the file
   * @returns Promise that resolves when upload is complete
   */
  async uploadDocument(
    clubId: string,
    eventId: string,
    file: File,
    userId: string,
  ): Promise<void> {
    // Upload file to storage and get the storage path and download URL
    const { storagePath, downloadUrl } = await this.storageService.uploadEventDocument(
      clubId,
      eventId,
      file,
    );

    // Add document reference to Firestore
    const documentsCollection = collection(
      this.firestore,
      `clubs/${clubId}/events/${eventId}/documents`,
    );

    const documentData = {
      eventId,
      clubId,
      uploadedBy: userId,
      storagePath,
      downloadUrl,
      filename: file.name,
      uploadedAt: serverTimestamp(),
    };

    try {
      await addDoc(documentsCollection, documentData);
    } catch (error) {
      await this.deleteUploadedEventDocument(storagePath);
      throw error;
    }
  }

  /**
   * Upload a club-scoped document (not tied to a specific event)
   * @param clubId - The ID of the club
   * @param file - The file to upload
   * @param userId - The ID of the user uploading the file
   * @returns Promise that resolves when upload is complete
   */
  async uploadClubDocument(clubId: string, file: File, userId: string): Promise<void> {
    const { storagePath, downloadUrl } = await this.storageService.uploadClubDocument(
      clubId,
      file,
    );

    const documentsCollection = collection(this.firestore, `clubs/${clubId}/documents`);

    try {
      await addDoc(documentsCollection, {
        clubId,
        uploadedBy: userId,
        storagePath,
        downloadUrl,
        filename: file.name,
        uploadedAt: serverTimestamp(),
      });
    } catch (error) {
      await this.deleteUploadedClubDocument(storagePath);
      throw error;
    }
  }

  /**
   * Delete a document
   * @param clubId - The ID of the club
   * @param eventId - The ID of the event
   * @param documentId - The ID of the document to delete
   * @param storagePath - The storage path of the file
   * @returns Observable that completes when deletion is done
   */
  deleteDocument(
    clubId: string,
    eventId: string,
    documentId: string,
    storagePath: string,
  ): Observable<void> {
    const documentDoc = doc(
      this.firestore,
      `clubs/${clubId}/events/${eventId}/documents`,
      documentId,
    );

    return from(deleteDoc(documentDoc)).pipe(
      switchMap(() => this.storageService.deleteEventDocument(storagePath)),
    );
  }

  /**
   * Delete a club-scoped document
   * @param clubId - The ID of the club
   * @param documentId - The ID of the document to delete
   * @param storagePath - The storage path of the file
   * @returns Observable that completes when deletion is done
   */
  deleteClubDocument(clubId: string, documentId: string, storagePath: string): Observable<void> {
    const documentDoc = doc(this.firestore, `clubs/${clubId}/documents`, documentId);

    return from(deleteDoc(documentDoc)).pipe(
      switchMap(() => this.storageService.deleteClubDocument(storagePath)),
    );
  }

  private async deleteUploadedEventDocument(storagePath: string): Promise<void> {
    try {
      await firstValueFrom(this.storageService.deleteEventDocument(storagePath));
    } catch (cleanupError) {
      console.warn('Failed to clean up event document from storage:', storagePath, cleanupError);
    }
  }

  private async deleteUploadedClubDocument(storagePath: string): Promise<void> {
    try {
      await firstValueFrom(this.storageService.deleteClubDocument(storagePath));
    } catch (cleanupError) {
      console.warn('Failed to clean up club document from storage:', storagePath, cleanupError);
    }
  }

  private filterRecentDocuments(
    documents: AnyDocument[],
    scope: 'all' | 'event' | 'club' | undefined,
    eventId: string | null | undefined,
  ): AnyDocument[] {
    let filtered = documents;
    if (scope === 'event') {
      filtered = filtered.filter(isEventDocument);
    } else if (scope === 'club') {
      filtered = filtered.filter((doc) => !isEventDocument(doc));
    }
    if (eventId) {
      filtered = filtered.filter((doc) => isEventDocument(doc) && doc.eventId === eventId);
    }
    return filtered;
  }
}
