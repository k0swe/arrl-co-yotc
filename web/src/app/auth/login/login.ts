import { Component, ChangeDetectionStrategy, signal, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from '../auth.service';
import { ArrlInfoDialog } from '../arrl-info-dialog/arrl-info-dialog';

@Component({
  selector: 'app-login',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatCardModule,
    MatButtonModule,
    MatInputModule,
    MatFormFieldModule,
    MatIconModule,
    MatDividerModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './login.html',
  styleUrl: './login.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Login {
  private authService = inject(AuthService);
  private router = inject(Router);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);

  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly showEmailLogin = signal(false);

  protected readonly loginForm = new FormGroup({
    email: new FormControl('', [Validators.required, Validators.email]),
    password: new FormControl('', [Validators.required]),
  });

  protected signInWithGoogle(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.authService.signInWithGoogle().subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigate(['/']);
      },
      error: (error) => {
        this.loading.set(false);
        const errorMsg = this.getErrorMessage(error);
        this.errorMessage.set(errorMsg);
        this.snackBar.open(errorMsg, 'Close', { duration: 5000 });
      },
    });
  }

  protected signInWithFacebook(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.authService.signInWithFacebook().subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigate(['/']);
      },
      error: (error) => {
        this.loading.set(false);
        console.error('Facebook sign-in error:', error);
        const errorMsg = this.getErrorMessage(error);
        this.errorMessage.set(errorMsg);
        this.snackBar.open(errorMsg, 'Close', { duration: 5000 });
      },
    });
  }

  protected signInWithEmail(): void {
    if (this.loginForm.invalid) {
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);

    const { email, password } = this.loginForm.value;

    this.authService.signInWithEmailAndPassword(email!, password!).subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigate(['/']);
      },
      error: (error) => {
        this.loading.set(false);
        const errorMsg = this.getErrorMessage(error);
        this.errorMessage.set(errorMsg);
        this.snackBar.open(errorMsg, 'Close', { duration: 5000 });
      },
    });
  }

  protected toggleEmailLogin(): void {
    this.showEmailLogin.update((value) => !value);
    this.errorMessage.set(null);
  }

  protected showArrlInfo(): void {
    this.dialog.open(ArrlInfoDialog, {
      width: '500px',
      maxWidth: '90vw',
    });
  }

  private getErrorMessage(error: any): string {
    const code = error?.code || '';

    switch (code) {
      case 'auth/user-not-found':
      case 'auth/wrong-password':
      case 'auth/invalid-credential':
        return 'Invalid email or password. Please try again.';
      case 'auth/too-many-requests':
        return 'Too many failed attempts. Please try again later.';
      case 'auth/network-request-failed':
        return 'Network error. Please check your connection.';
      case 'auth/popup-closed-by-user':
        return 'Sign-in cancelled. Please try again.';
      case 'auth/account-exists-with-different-credential':
        return 'An account already exists with this email. Please sign in with your original method.';
      case 'auth/internal-error':
        return 'Authentication configuration error. Please contact support.';
      case 'auth/invalid-oauth-client-id':
        return 'Social login is not properly configured. Please contact support.';
      default:
        console.error('Unhandled auth error code:', code, error);
        return 'An error occurred. Please try again.';
    }
  }
}
