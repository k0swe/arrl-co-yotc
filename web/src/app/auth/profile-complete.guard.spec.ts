import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { provideAuth, getAuth, connectAuthEmulator } from '@angular/fire/auth';
import { provideFirebaseApp, initializeApp } from '@angular/fire/app';
import { provideFirestore, getFirestore, connectFirestoreEmulator } from '@angular/fire/firestore';
import { profileCompleteGuard } from './profile-complete.guard';
import { AuthService } from './auth.service';
import { UserService } from '../services/user.service';
import { firebaseTestConfig } from '../firebase-test.config';
import { of } from 'rxjs';
import { vi } from 'vitest';

describe('profileCompleteGuard', () => {
  let authService: AuthService;
  let userService: UserService;
  let router: Router;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
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
    });
    authService = TestBed.inject(AuthService);
    userService = TestBed.inject(UserService);
    router = TestBed.inject(Router);
  });

  it('should allow access when user is not authenticated', () => {
    authService.currentUser.set(null);

    const result = TestBed.runInInjectionContext(() =>
      profileCompleteGuard(null as any, null as any),
    );

    expect(result).toBe(true);
  });

  it('should allow access when user has completed profile', async () => {
    const mockUser = { uid: 'test-user-id', email: 'test@example.com' } as any;
    authService.currentUser.set(mockUser);

    const completeUserData = {
      id: 'test-user-id',
      name: 'Test User',
      callsign: 'K0TEST',
      email: 'test@example.com',
      isAdmin: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    vi.spyOn(userService, 'getUser').mockReturnValue(of(completeUserData));

    const result = TestBed.runInInjectionContext(() =>
      profileCompleteGuard(null as any, null as any),
    );

    // The result is an Observable
    await new Promise<void>((resolve) => {
      if (typeof result === 'object' && 'subscribe' in result) {
        result.subscribe((res) => {
          expect(res).toBe(true);
          resolve();
        });
      } else {
        expect(result).toBe(true);
        resolve();
      }
    });
  });

  it('should redirect to profile when user has not completed profile (missing name)', async () => {
    const mockUser = { uid: 'test-user-id', email: 'test@example.com' } as any;
    authService.currentUser.set(mockUser);

    const incompleteUserData = {
      id: 'test-user-id',
      name: '',
      callsign: 'K0TEST',
      email: 'test@example.com',
      isAdmin: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    vi.spyOn(userService, 'getUser').mockReturnValue(of(incompleteUserData));

    const result = TestBed.runInInjectionContext(() =>
      profileCompleteGuard(null as any, null as any),
    );

    await new Promise<void>((resolve) => {
      if (typeof result === 'object' && 'subscribe' in result) {
        result.subscribe((res: any) => {
          expect(res).not.toBe(true);
          expect(res.toString()).toBe('/profile');
          resolve();
        });
      }
    });
  });

  it('should redirect to profile when user has not completed profile (missing callsign)', async () => {
    const mockUser = { uid: 'test-user-id', email: 'test@example.com' } as any;
    authService.currentUser.set(mockUser);

    const incompleteUserData = {
      id: 'test-user-id',
      name: 'Test User',
      callsign: '',
      email: 'test@example.com',
      isAdmin: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    vi.spyOn(userService, 'getUser').mockReturnValue(of(incompleteUserData));

    const result = TestBed.runInInjectionContext(() =>
      profileCompleteGuard(null as any, null as any),
    );

    await new Promise<void>((resolve) => {
      if (typeof result === 'object' && 'subscribe' in result) {
        result.subscribe((res: any) => {
          expect(res).not.toBe(true);
          expect(res.toString()).toBe('/profile');
          resolve();
        });
      }
    });
  });

  it('should redirect to profile when user document does not exist', async () => {
    const mockUser = { uid: 'test-user-id', email: 'test@example.com' } as any;
    authService.currentUser.set(mockUser);

    vi.spyOn(userService, 'getUser').mockReturnValue(of(null));

    const result = TestBed.runInInjectionContext(() =>
      profileCompleteGuard(null as any, null as any),
    );

    await new Promise<void>((resolve) => {
      if (typeof result === 'object' && 'subscribe' in result) {
        result.subscribe((res: any) => {
          expect(res).not.toBe(true);
          expect(res.toString()).toBe('/profile');
          resolve();
        });
      }
    });
  });

  it('should redirect to profile when user has whitespace-only name', async () => {
    const mockUser = { uid: 'test-user-id', email: 'test@example.com' } as any;
    authService.currentUser.set(mockUser);

    const incompleteUserData = {
      id: 'test-user-id',
      name: '   ',
      callsign: 'K0TEST',
      email: 'test@example.com',
      isAdmin: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    vi.spyOn(userService, 'getUser').mockReturnValue(of(incompleteUserData));

    const result = TestBed.runInInjectionContext(() =>
      profileCompleteGuard(null as any, null as any),
    );

    await new Promise<void>((resolve) => {
      if (typeof result === 'object' && 'subscribe' in result) {
        result.subscribe((res: any) => {
          expect(res).not.toBe(true);
          expect(res.toString()).toBe('/profile');
          resolve();
        });
      }
    });
  });

  it('should redirect to profile when user has whitespace-only callsign', async () => {
    const mockUser = { uid: 'test-user-id', email: 'test@example.com' } as any;
    authService.currentUser.set(mockUser);

    const incompleteUserData = {
      id: 'test-user-id',
      name: 'Test User',
      callsign: '   ',
      email: 'test@example.com',
      isAdmin: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    vi.spyOn(userService, 'getUser').mockReturnValue(of(incompleteUserData));

    const result = TestBed.runInInjectionContext(() =>
      profileCompleteGuard(null as any, null as any),
    );

    await new Promise<void>((resolve) => {
      if (typeof result === 'object' && 'subscribe' in result) {
        result.subscribe((res: any) => {
          expect(res).not.toBe(true);
          expect(res.toString()).toBe('/profile');
          resolve();
        });
      }
    });
  });
});

