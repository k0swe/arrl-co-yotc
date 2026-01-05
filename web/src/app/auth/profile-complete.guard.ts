import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { map } from 'rxjs/operators';
import { AuthService } from './auth.service';
import { UserService } from '../services/user.service';

export const profileCompleteGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const userService = inject(UserService);
  const router = inject(Router);

  const currentUser = authService.currentUser();

  if (!currentUser) {
    // Not authenticated, let authGuard handle this
    return true;
  }

  // Check if user has completed their profile
  return userService.getUser(currentUser.uid).pipe(
    map((user) => {
      if (!user || !user.name?.trim() || !user.callsign?.trim()) {
        // Profile incomplete, redirect to profile page
        return router.createUrlTree(['/profile']);
      }
      return true;
    }),
  );
};
