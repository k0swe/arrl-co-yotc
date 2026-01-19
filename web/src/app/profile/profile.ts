import {
  Component,
  ChangeDetectionStrategy,
  signal,
  inject,
  effect,
  DestroyRef,
} from '@angular/core';
import { Router } from '@angular/router';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AuthService } from '../auth/auth.service';
import { UserService } from '../services/user.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, of, EMPTY } from 'rxjs';

@Component({
  selector: 'app-profile',
  imports: [
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatInputModule,
    MatFormFieldModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
  ],
  templateUrl: './profile.html',
  styleUrl: './profile.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Profile {
  private authService = inject(AuthService);
  private userService = inject(UserService);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);
  private destroyRef = inject(DestroyRef);

  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly profileForm = new FormGroup({
    name: new FormControl('', [Validators.required, Validators.minLength(2)]),
    callsign: new FormControl('', [Validators.required, Validators.pattern(/^[A-Z0-9]{3,7}$/i)]),
  });

  constructor() {
    // Load user profile when authenticated
    effect(() => {
      const user = this.authService.currentUser();
      if (user) {
        this.loadUserProfile(user.uid);
      }
    });
  }

  private loadUserProfile(userId: string): void {
    this.loading.set(true);
    this.userService
      .getUser(userId)
      .pipe(
        catchError((error) => {
          console.error('Error loading user profile:', error);
          this.errorMessage.set('Failed to load profile');
          this.loading.set(false);
          return of(null);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((userData) => {
        if (userData) {
          this.profileForm.patchValue({
            name: userData.name,
            callsign: userData.callsign,
          });
        }
        this.loading.set(false);
      });
  }

  protected saveProfile(): void {
    if (this.profileForm.invalid) {
      return;
    }

    const currentUser = this.authService.currentUser();
    if (!currentUser) {
      this.errorMessage.set('You must be signed in to save your profile');
      return;
    }

    this.saving.set(true);
    this.errorMessage.set(null);

    const { name, callsign } = this.profileForm.value;

    this.userService
      .saveUser(currentUser.uid, {
        name: name!,
        callsign: callsign!.toUpperCase(),
        email: currentUser.email || '',
      })
      .pipe(
        catchError((error) => {
          console.error('Error saving profile:', error);
          this.errorMessage.set('Failed to save profile. Please try again.');
          this.saving.set(false);
          return EMPTY;
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => {
        this.saving.set(false);
        this.snackBar.open('Profile saved successfully', 'Close', {
          duration: 3000,
          horizontalPosition: 'center',
          verticalPosition: 'top',
        });
        this.router.navigate(['/clubs']);
      });
  }

  protected cancel(): void {
    this.router.navigate(['/']);
  }
}
