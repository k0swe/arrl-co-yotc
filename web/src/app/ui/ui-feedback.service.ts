import { inject, Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';

@Injectable({ providedIn: 'root' })
export class UiFeedback {
  private readonly snackBar = inject(MatSnackBar);

  success(message: string): void {
    this.show(message, 'polite');
  }

  error(message: string): void {
    this.show(message, 'assertive');
  }

  info(message: string): void {
    this.show(message, 'polite');
  }

  private show(message: string, politeness: 'polite' | 'assertive'): void {
    this.snackBar.open(message, 'Close', { duration: 3000, politeness });
  }
}
