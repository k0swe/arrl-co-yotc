import { TestBed } from '@angular/core/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideFirebaseApp, initializeApp } from '@angular/fire/app';
import { provideAuth, getAuth, connectAuthEmulator } from '@angular/fire/auth';
import { provideFirestore, getFirestore, connectFirestoreEmulator } from '@angular/fire/firestore';
import { EventList } from './event-list';
import { firebaseTestConfig } from '../../../firebase-test.config';

describe('EventList', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EventList],
      providers: [
        provideAnimationsAsync(),
        provideFirebaseApp(() => initializeApp(firebaseTestConfig)),
        provideAuth(() => {
          const auth = getAuth();
          connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
          return auth;
        }),
        provideFirestore(() => {
          const firestore = getFirestore();
          connectFirestoreEmulator(firestore, '127.0.0.1', 8080);
          return firestore;
        }),
      ],
    }).compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(EventList);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
  });
});
