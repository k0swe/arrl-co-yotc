import { TestBed } from '@angular/core/testing';
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
});
