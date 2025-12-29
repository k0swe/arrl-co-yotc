import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { provideAuth, getAuth, connectAuthEmulator } from '@angular/fire/auth';
import { provideFirebaseApp, initializeApp } from '@angular/fire/app';
import { adminGuard } from './admin.guard';
import { AuthService } from './auth.service';
import { firebaseTestConfig } from '../firebase-test.config';

describe('adminGuard', () => {
  let authService: AuthService;
  let router: Router;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideFirebaseApp(() => initializeApp(firebaseTestConfig)),
        provideAuth(() => {
          const auth = getAuth();
          connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
          return auth;
        })
      ]
    });
    authService = TestBed.inject(AuthService);
    router = TestBed.inject(Router);
  });

  it('should allow access when user is admin', () => {
    // Set admin signal to true
    authService.isAdmin.set(true);
    
    const result = TestBed.runInInjectionContext(() => adminGuard(null as any, null as any));
    
    expect(result).toBe(true);
  });

  it('should redirect to home when user is not admin', () => {
    // Set admin signal to false
    authService.isAdmin.set(false);
    
    const result = TestBed.runInInjectionContext(() => adminGuard(null as any, null as any));
    
    expect(result).not.toBe(true);
    const urlTree = result as any;
    expect(urlTree.toString()).toBe('/');
  });
});
