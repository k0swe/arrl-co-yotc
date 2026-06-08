import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { adminGuard } from './admin.guard';
import { AuthService } from './auth.service';
import { provideFirebaseTestServices } from '../firebase-test.providers';

describe('adminGuard', () => {
  let authService: AuthService;
  let router: Router;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        ...provideFirebaseTestServices('admin-guard', { auth: true }),

      ],
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
