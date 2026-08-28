import { TestBed } from '@angular/core/testing';
import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { StorageService } from './storage.service';
import { FIREBASE_STORAGE } from '../firebase.tokens';

vi.mock('firebase/storage', () => ({
  deleteObject: vi.fn(),
  getDownloadURL: vi.fn(),
  ref: vi.fn(),
  uploadBytes: vi.fn(),
}));

describe('StorageService', () => {
  let service: StorageService;

  beforeEach(() => {
    vi.clearAllMocks();
    TestBed.configureTestingModule({
      providers: [
        {
          provide: FIREBASE_STORAGE,
          useValue: {
            ref: vi.fn(),
          },
        },
      ],
    });
    service = TestBed.inject(StorageService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should delete event document storage when getting the download URL fails', async () => {
    const storageRef = { fullPath: 'event-documents/club-1/event-1/log.adi' };
    const downloadUrlError = new Error('url failed');
    vi.mocked(ref).mockReturnValue(storageRef as ReturnType<typeof ref>);
    vi.mocked(uploadBytes).mockResolvedValue({ ref: storageRef } as Awaited<
      ReturnType<typeof uploadBytes>
    >);
    vi.mocked(getDownloadURL).mockRejectedValue(downloadUrlError);
    vi.mocked(deleteObject).mockResolvedValue(undefined);

    await expect(
      service.uploadEventDocument('club-1', 'event-1', new File(['log'], 'log.adi')),
    ).rejects.toThrow(downloadUrlError);

    expect(deleteObject).toHaveBeenCalledWith(storageRef);
  });

  it('should delete club document storage when getting the download URL fails', async () => {
    const storageRef = { fullPath: 'club-documents/club-1/agenda.pdf' };
    const downloadUrlError = new Error('url failed');
    vi.mocked(ref).mockReturnValue(storageRef as ReturnType<typeof ref>);
    vi.mocked(uploadBytes).mockResolvedValue({ ref: storageRef } as Awaited<
      ReturnType<typeof uploadBytes>
    >);
    vi.mocked(getDownloadURL).mockRejectedValue(downloadUrlError);
    vi.mocked(deleteObject).mockResolvedValue(undefined);

    await expect(
      service.uploadClubDocument('club-1', new File(['agenda'], 'agenda.pdf')),
    ).rejects.toThrow(downloadUrlError);

    expect(deleteObject).toHaveBeenCalledWith(storageRef);
  });
});
