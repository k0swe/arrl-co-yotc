import { TestBed } from '@angular/core/testing';
import { EventService } from './event.service';
import { provideFirebaseTestServices } from '../firebase-test.providers';

describe('EventService', () => {
  let service: EventService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        ...provideFirebaseTestServices('event-service', { firestore: true }),

      ],
    });
    service = TestBed.inject(EventService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have getEvent method', () => {
    expect(typeof service.getEvent).toBe('function');
  });
});
