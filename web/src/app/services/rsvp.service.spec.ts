import { TestBed } from '@angular/core/testing';
import { RsvpService } from './rsvp.service';
import { provideFirebaseTestServices } from '../firebase-test.providers';

describe('RsvpService', () => {
  let service: RsvpService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        ...provideFirebaseTestServices('rsvp-service', { firestore: true }),

      ],
    });
    service = TestBed.inject(RsvpService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
