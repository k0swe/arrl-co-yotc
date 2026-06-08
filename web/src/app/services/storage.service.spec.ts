import { TestBed } from '@angular/core/testing';
import { StorageService } from './storage.service';
import { FIREBASE_STORAGE } from '../firebase.tokens';

describe('StorageService', () => {
  let service: StorageService;

  beforeEach(() => {
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
});
