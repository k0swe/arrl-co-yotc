import { TestBed } from '@angular/core/testing';
import { provideAuth, getAuth, Auth } from '@angular/fire/auth';
import { provideFirebaseApp, initializeApp } from '@angular/fire/app';
import { AuthService } from './auth.service';
import { firebaseConfig } from '../firebase.config';

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideFirebaseApp(() => initializeApp(firebaseConfig)),
        provideAuth(() => getAuth())
      ]
    });
    service = TestBed.inject(AuthService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have isAuthenticated signal', () => {
    expect(service.isAuthenticated).toBeDefined();
    expect(typeof service.isAuthenticated()).toBe('boolean');
  });

  it('should have currentUser signal', () => {
    expect(service.currentUser).toBeDefined();
  });

  it('should have signInWithEmailAndPassword method', () => {
    expect(service.signInWithEmailAndPassword).toBeDefined();
    expect(typeof service.signInWithEmailAndPassword).toBe('function');
  });

  it('should have signInWithGoogle method', () => {
    expect(service.signInWithGoogle).toBeDefined();
    expect(typeof service.signInWithGoogle).toBe('function');
  });

  it('should have createUserWithEmailAndPassword method', () => {
    expect(service.createUserWithEmailAndPassword).toBeDefined();
    expect(typeof service.createUserWithEmailAndPassword).toBe('function');
  });

  it('should have sendPasswordResetEmail method', () => {
    expect(service.sendPasswordResetEmail).toBeDefined();
    expect(typeof service.sendPasswordResetEmail).toBe('function');
  });

  it('should have signOut method', () => {
    expect(service.signOut).toBeDefined();
    expect(typeof service.signOut).toBe('function');
  });
});
