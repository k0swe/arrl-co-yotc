import { inject, Injectable } from '@angular/core';
import {
  addDoc,
  collection,
  collectionData,
  deleteDoc,
  doc,
  Firestore,
  serverTimestamp,
} from '@angular/fire/firestore';
import { from, Observable } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { EventLog } from '@arrl-co-yotc/shared/build/app/models/event.model';
import { StorageService } from './storage.service';

/**
 * Service for managing event document uploads and references in Firestore.
 * Documents are stored as subcollections under events:
 * clubs/{clubId}/events/{eventId}/documents/{documentId}
 */
@Injectable({
  providedIn: 'root',
})
export class DocumentService {
  private firestore = inject(Firestore);
  private storageService = inject(StorageService);

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

    await addDoc(documentsCollection, documentData);
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
}
