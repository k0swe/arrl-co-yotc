import { TestBed } from '@angular/core/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { EventList } from './event-list';
import { provideFirebaseTestServices } from '../../../firebase-test.providers';

describe('EventList', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EventList],
      providers: [
        provideAnimationsAsync(),
        ...provideFirebaseTestServices('club-detail-event-list', { auth: true, firestore: true }),

      ],
    }).compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(EventList);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
  });
});
