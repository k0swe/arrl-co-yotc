import { TestBed } from '@angular/core/testing';
import { DocumentService } from './document.service';
import { StorageService } from './storage.service';
import { provideFirebaseApp, initializeApp } from '@angular/fire/app';
import { provideFirestore, getFirestore, connectFirestoreEmulator } from '@angular/fire/firestore';
import { firebaseTestConfig } from '../firebase-test.config';
import { describe, it, expect, beforeEach } from 'vitest';

describe('DocumentService', () => {
  let service: DocumentService;

  beforeEach(() => {
    const storageServiceMock = {
      uploadEventDocument: vi.fn(),
      deleteEventDocument: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        DocumentService,
        provideFirebaseApp(() => initializeApp(firebaseTestConfig)),
        provideFirestore(() => {
          const firestore = getFirestore();
          connectFirestoreEmulator(firestore, '127.0.0.1', 8080);
          return firestore;
        }),
        { provide: StorageService, useValue: storageServiceMock },
      ],
    });

    service = TestBed.inject(DocumentService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
