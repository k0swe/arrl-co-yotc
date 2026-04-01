import { TestBed } from '@angular/core/testing';
import { provideFirestore, getFirestore, connectFirestoreEmulator } from '@angular/fire/firestore';
import { provideFirebaseApp, initializeApp } from '@angular/fire/app';
import { StandingsService } from './standings.service';
import { firebaseTestConfig } from '../firebase-test.config';

describe('StandingsService', () => {
  let service: StandingsService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideFirebaseApp(() => initializeApp(firebaseTestConfig)),
        provideFirestore(() => {
          const firestore = getFirestore();
          connectFirestoreEmulator(firestore, '127.0.0.1', 8080);
          return firestore;
        }),
      ],
    });
    service = TestBed.inject(StandingsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have getStandings method', () => {
    expect(service.getStandings).toBeDefined();
    expect(typeof service.getStandings).toBe('function');
  });

  it('should return an observable from getStandings', () => {
    const result = service.getStandings();
    expect(result).toBeDefined();
    expect(result.subscribe).toBeDefined();
  });

  it('should have getStandingsColumns method', () => {
    expect(service.getStandingsColumns).toBeDefined();
    expect(typeof service.getStandingsColumns).toBe('function');
  });

  it('should return an observable from getStandingsColumns', () => {
    const result = service.getStandingsColumns();
    expect(result).toBeDefined();
    expect(result.subscribe).toBeDefined();
  });
});
