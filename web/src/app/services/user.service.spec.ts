import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { UserService } from './user.service';
import { FIREBASE_FIRESTORE } from '../firebase.tokens';

describe('UserService', () => {
  let service: UserService;
  let mockFirestore: any;

  beforeEach(() => {
    mockFirestore = {};

    TestBed.configureTestingModule({
      providers: [UserService, { provide: FIREBASE_FIRESTORE, useValue: mockFirestore }],
    });
    service = TestBed.inject(UserService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should not query Firestore when no user IDs are requested', async () => {
    await expect(firstValueFrom(service.getUsers([]))).resolves.toEqual(new Map());
  });
});
