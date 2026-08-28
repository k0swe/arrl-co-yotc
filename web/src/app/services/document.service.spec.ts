import { TestBed } from '@angular/core/testing';
import { addDoc } from 'firebase/firestore';
import { of } from 'rxjs';
import { DocumentService } from './document.service';
import { StorageService } from './storage.service';
import { FIREBASE_FIRESTORE } from '../firebase.tokens';
import { describe, it, expect, beforeEach } from 'vitest';

vi.mock('firebase/firestore', () => {
  return {
    addDoc: vi.fn(),
    collection: vi.fn(),
    collectionGroup: vi.fn(),
    deleteDoc: vi.fn(),
    doc: vi.fn(),
    orderBy: vi.fn(),
    query: vi.fn(),
    serverTimestamp: vi.fn(() => 'server-timestamp'),
    Timestamp: {
      fromDate: vi.fn(),
    },
    where: vi.fn(),
  };
});

describe('DocumentService', () => {
  let service: DocumentService;
  let storageServiceMock: {
    uploadEventDocument: ReturnType<typeof vi.fn>;
    deleteEventDocument: ReturnType<typeof vi.fn>;
    uploadClubDocument: ReturnType<typeof vi.fn>;
    deleteClubDocument: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    storageServiceMock = {
      uploadEventDocument: vi.fn(),
      deleteEventDocument: vi.fn(),
      uploadClubDocument: vi.fn(),
      deleteClubDocument: vi.fn(),
    };
    vi.mocked(addDoc).mockReset();

    TestBed.configureTestingModule({
      providers: [
        DocumentService,
        { provide: StorageService, useValue: storageServiceMock },
        { provide: FIREBASE_FIRESTORE, useValue: {} },
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

  it('should filter event and club documents in helper', () => {
    const docs = [
      {
        id: 'event-1',
        eventId: 'event-a',
        clubId: 'club-1',
        uploadedBy: 'user-1',
        storagePath: 'path-1',
        downloadUrl: 'url-1',
        filename: 'log-1.adi',
        uploadedAt: new Date('2026-01-03'),
      },
      {
        id: 'club-1',
        clubId: 'club-1',
        uploadedBy: 'user-3',
        storagePath: 'path-3',
        downloadUrl: 'url-3',
        filename: 'minutes.pdf',
        uploadedAt: new Date('2026-01-01'),
      },
    ];
    const eventDocs = service['filterRecentDocuments'](docs, 'event', undefined);
    const clubDocs = service['filterRecentDocuments'](docs, 'club', undefined);

    expect(eventDocs.length).toBe(1);
    expect(clubDocs.length).toBe(1);
  });

  it('should filter to a specific event in helper', () => {
    const docs = [
      {
        id: 'event-1',
        eventId: 'event-a',
        clubId: 'club-1',
        uploadedBy: 'user-1',
        storagePath: 'path-1',
        downloadUrl: 'url-1',
        filename: 'log-1.adi',
        uploadedAt: new Date('2026-01-03'),
      },
      {
        id: 'event-2',
        eventId: 'event-b',
        clubId: 'club-1',
        uploadedBy: 'user-2',
        storagePath: 'path-2',
        downloadUrl: 'url-2',
        filename: 'log-2.adi',
        uploadedAt: new Date('2026-01-02'),
      },
    ];
    const docsForEventB = service['filterRecentDocuments'](docs, 'event', 'event-b');

    expect(docsForEventB.length).toBe(1);
    expect(docsForEventB[0]?.id).toBe('event-2');
  });

  it('should delete event document storage when metadata creation fails', async () => {
    const metadataError = new Error('metadata failed');
    storageServiceMock.uploadEventDocument.mockResolvedValue({
      storagePath: 'event-documents/club-1/event-1/log.adi',
      downloadUrl: 'https://example.test/log.adi',
    });
    storageServiceMock.deleteEventDocument.mockReturnValue(of(undefined));
    vi.mocked(addDoc).mockRejectedValue(metadataError);

    await expect(
      service.uploadDocument('club-1', 'event-1', new File(['log'], 'log.adi'), 'user-1'),
    ).rejects.toThrow(metadataError);

    expect(storageServiceMock.deleteEventDocument).toHaveBeenCalledWith(
      'event-documents/club-1/event-1/log.adi',
    );
  });

  it('should delete club document storage when metadata creation fails', async () => {
    const metadataError = new Error('metadata failed');
    storageServiceMock.uploadClubDocument.mockResolvedValue({
      storagePath: 'club-documents/club-1/agenda.pdf',
      downloadUrl: 'https://example.test/agenda.pdf',
    });
    storageServiceMock.deleteClubDocument.mockReturnValue(of(undefined));
    vi.mocked(addDoc).mockRejectedValue(metadataError);

    await expect(
      service.uploadClubDocument('club-1', new File(['agenda'], 'agenda.pdf'), 'user-1'),
    ).rejects.toThrow(metadataError);

    expect(storageServiceMock.deleteClubDocument).toHaveBeenCalledWith(
      'club-documents/club-1/agenda.pdf',
    );
  });
});
