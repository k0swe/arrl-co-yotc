import { TestBed } from '@angular/core/testing';
import { Firestore } from '@angular/fire/firestore';
import { UserService } from './user.service';

describe('UserService', () => {
  let service: UserService;
  let mockFirestore: any;

  beforeEach(() => {
    mockFirestore = {};

    TestBed.configureTestingModule({
      providers: [UserService, { provide: Firestore, useValue: mockFirestore }],
    });
    service = TestBed.inject(UserService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
