import { Component, ChangeDetectionStrategy, signal, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-forgot-password',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatCardModule,
    MatButtonModule,
    MatInputModule,
    MatFormFieldModule,
    MatIconModule,
  ],
  templateUrl: './forgot-password.html',
  styleUrl: './forgot-password.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ForgotPassword {
  private authService = inject(AuthService);
  private snackBar = inject(MatSnackBar);

  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly successMessage = signal<string | null>(null);

  protected readonly resetForm = new FormGroup({
    email: new FormControl('', [Validators.required, Validators.email]),
  });

  protected sendResetEmail(): void {
    if (this.resetForm.invalid) {
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    const { email } = this.resetForm.value;

    this.authService.sendPasswordResetEmail(email!).subscribe({
      next: () => {
        this.loading.set(false);
        const successMsg = 'Password reset email sent! Please check your inbox for instructions.';
        this.successMessage.set(successMsg);
        this.snackBar.open(successMsg, 'Close', { duration: 5000 });
        this.resetForm.reset();
      },
      error: (error) => {
        this.loading.set(false);
        const errorMsg = this.getErrorMessage(error);
        this.errorMessage.set(errorMsg);
        this.snackBar.open(errorMsg, 'Close', { duration: 5000 });
      },
    });
  }

  private getErrorMessage(error: any): string {
    const code = error?.code || '';

    switch (code) {
      case 'auth/user-not-found':
        return 'No account found with this email address.';
      case 'auth/invalid-email':
        return 'Invalid email address. Please check and try again.';
      case 'auth/network-request-failed':
        return 'Network error. Please check your connection.';
      default:
        return 'An error occurred. Please try again.';
    }
  }
}
