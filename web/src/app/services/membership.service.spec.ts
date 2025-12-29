import { TestBed } from '@angular/core/testing';
import { provideFirestore, getFirestore, connectFirestoreEmulator } from '@angular/fire/firestore';
import { provideFirebaseApp, initializeApp } from '@angular/fire/app';
import { MembershipService } from './membership.service';
import { firebaseTestConfig } from '../firebase-test.config';

describe('MembershipService', () => {
  let service: MembershipService;

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
    service = TestBed.inject(MembershipService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have getUserMemberships method', () => {
    expect(service.getUserMemberships).toBeDefined();
    expect(typeof service.getUserMemberships).toBe('function');
  });

  it('should have applyForMembership method', () => {
    expect(service.applyForMembership).toBeDefined();
    expect(typeof service.applyForMembership).toBe('function');
  });

  it('should have checkExistingMembership method', () => {
    expect(service.checkExistingMembership).toBeDefined();
    expect(typeof service.checkExistingMembership).toBe('function');
  });

  it('should return an observable from getUserMemberships', () => {
    const result = service.getUserMemberships('test-user-id');
    expect(result).toBeDefined();
    expect(result.subscribe).toBeDefined();
  });

  it('should return an observable from applyForMembership', () => {
    const result = service.applyForMembership('test-user-id', 'test-club-id');
    expect(result).toBeDefined();
    expect(result.subscribe).toBeDefined();
  });

  it('should return an observable from checkExistingMembership', () => {
    const result = service.checkExistingMembership('test-user-id', 'test-club-id');
    expect(result).toBeDefined();
    expect(result.subscribe).toBeDefined();
  });
});
