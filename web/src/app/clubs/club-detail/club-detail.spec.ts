import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideFirebaseApp, initializeApp } from '@angular/fire/app';
import { provideFirestore, getFirestore, connectFirestoreEmulator } from '@angular/fire/firestore';
import { ClubDetail } from './club-detail';
import { firebaseTestConfig } from '../../firebase-test.config';

describe('ClubDetail', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ClubDetail],
      providers: [
        provideRouter([]),
        provideAnimationsAsync(),
        provideFirebaseApp(() => initializeApp(firebaseTestConfig)),
        provideFirestore(() => {
          const firestore = getFirestore();
          connectFirestoreEmulator(firestore, '127.0.0.1', 8080);
          return firestore;
        }),
      ],
    }).compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(ClubDetail);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
  });
});
