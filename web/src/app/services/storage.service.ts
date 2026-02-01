import { inject, Injectable } from '@angular/core';
import { Storage, ref, uploadBytes, getDownloadURL, deleteObject } from '@angular/fire/storage';
import { from, Observable } from 'rxjs';
import { switchMap } from 'rxjs/operators';

/**
 * Service for managing file uploads to Firebase Storage.
 */
@Injectable({
  providedIn: 'root',
})
export class StorageService {
  private storage = inject(Storage);

  /**
   * Upload a club logo image to Firebase Storage
   * @param clubId - The ID of the club
   * @param file - The image file to upload
   * @returns Observable that emits the download URL of the uploaded file
   */
  uploadClubLogo(clubId: string, file: File): Observable<string> {
    const timestamp = Date.now();
    const filename = `${timestamp}-${file.name}`;
    const filePath = `club-logos/${clubId}/${filename}`;
    const storageRef = ref(this.storage, filePath);

    return from(uploadBytes(storageRef, file)).pipe(
      switchMap((uploadResult) => from(getDownloadURL(uploadResult.ref))),
    );
  }

  /**
   * Delete a club logo from Firebase Storage
   * Note: This requires the storage path, not the download URL
   * For now, we just clear the logoUrl in Firestore and let Firebase Storage lifecycle rules clean up unused files
   * @param storagePath - The storage path of the logo to delete (e.g., 'club-logos/clubId/filename.jpg')
   * @returns Observable that completes when the file is deleted
   */
  deleteClubLogo(storagePath: string): Observable<void> {
    try {
      const storageRef = ref(this.storage, storagePath);
      return from(deleteObject(storageRef));
    } catch (error) {
      // If path parsing fails, just resolve without error
      console.warn('Failed to delete logo from storage:', storagePath, error);
      return from(Promise.resolve());
    }
  }

  /**
   * Upload an event document to Firebase Storage
   * @param clubId - The ID of the club
   * @param eventId - The ID of the event
   * @param file - The file to upload
   * @returns Promise that resolves with the storage path and download URL
   */
  async uploadEventDocument(
    clubId: string,
    eventId: string,
    file: File,
  ): Promise<{ storagePath: string; downloadUrl: string }> {
    const timestamp = Date.now();
    const filename = `${timestamp}-${file.name}`;
    const storagePath = `event-documents/${clubId}/${eventId}/${filename}`;
    const storageRef = ref(this.storage, storagePath);

    const uploadResult = await uploadBytes(storageRef, file);
    const downloadUrl = await getDownloadURL(uploadResult.ref);

    return { storagePath, downloadUrl };
  }

  /**
   * Delete an event document from Firebase Storage
   * @param storagePath - The storage path of the document to delete
   * @returns Observable that completes when the file is deleted
   */
  deleteEventDocument(storagePath: string): Observable<void> {
    try {
      const storageRef = ref(this.storage, storagePath);
      return from(deleteObject(storageRef));
    } catch (error) {
      // If path parsing fails, just resolve without error
      console.warn('Failed to delete document from storage:', storagePath, error);
      return from(Promise.resolve());
    }
  }
}
