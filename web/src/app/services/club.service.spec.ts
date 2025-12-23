import { TestBed } from '@angular/core/testing';
import { provideFirestore, getFirestore } from '@angular/fire/firestore';
import { provideFirebaseApp, initializeApp } from '@angular/fire/app';
import { ClubService } from './club.service';
import { firebaseConfig } from '../firebase.config';

describe('ClubService', () => {
  let service: ClubService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideFirebaseApp(() => initializeApp(firebaseConfig)),
        provideFirestore(() => getFirestore())
      ]
    });
    service = TestBed.inject(ClubService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have getActiveClubs method', () => {
    expect(service.getActiveClubs).toBeDefined();
    expect(typeof service.getActiveClubs).toBe('function');
  });

  it('should have getAllClubs method', () => {
    expect(service.getAllClubs).toBeDefined();
    expect(typeof service.getAllClubs).toBe('function');
  });

  it('should return an observable from getActiveClubs', () => {
    const result = service.getActiveClubs();
    expect(result).toBeDefined();
    expect(result.subscribe).toBeDefined();
  });

  it('should return an observable from getAllClubs', () => {
    const result = service.getAllClubs();
    expect(result).toBeDefined();
    expect(result.subscribe).toBeDefined();
  });
});
