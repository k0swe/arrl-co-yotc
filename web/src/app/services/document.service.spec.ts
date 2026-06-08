import { TestBed } from '@angular/core/testing';
import { DocumentService } from './document.service';
import { StorageService } from './storage.service';
import { provideFirebaseTestServices } from '../firebase-test.providers';
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
        { provide: StorageService, useValue: storageServiceMock },
        ...provideFirebaseTestServices('document-service', { firestore: true }),

      ],
    });

    service = TestBed.inject(DocumentService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have getDocumentsSince method', () => {
    expect(typeof service.getDocumentsSince).toBe('function');
  });
});
