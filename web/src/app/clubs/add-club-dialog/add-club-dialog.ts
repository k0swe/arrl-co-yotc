import { Component, ChangeDetectionStrategy, signal, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Club } from '@arrl-co-yotc/shared/build/app/models/club.model';

@Component({
  selector: 'app-add-club-dialog',
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
  ],
  templateUrl: './add-club-dialog.html',
  styleUrl: './add-club-dialog.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddClubDialog {
  private fb = inject(FormBuilder);
  private dialogRef = inject(MatDialogRef<AddClubDialog>);

  protected readonly submitting = signal(false);

  protected readonly clubForm = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(100)]],
    callsign: [
      '',
      [Validators.required, Validators.pattern(/^[A-Z0-9]+$/i), Validators.maxLength(10)],
    ],
    description: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(500)]],
    location: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(100)]],
    website: [
      '',
      [Validators.pattern(/^https?:\/\/[^\s\/$.?#].[^\s]*$/i), Validators.maxLength(200)],
    ],
  });

  protected onCancel(): void {
    this.dialogRef.close();
  }

  protected onSubmit(): void {
    if (this.clubForm.invalid) {
      this.clubForm.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    const suggestion: Partial<Club> = this.clubForm.getRawValue();
    this.dialogRef.close(suggestion);
  }

  protected getErrorMessage(fieldName: string): string {
    const field = this.clubForm.get(fieldName);
    if (!field || !field.touched) {
      return '';
    }

    if (field.hasError('required')) {
      return 'This field is required';
    }
    if (field.hasError('minlength')) {
      const minLength = field.getError('minlength').requiredLength;
      return `Minimum length is ${minLength} characters`;
    }
    if (field.hasError('maxlength')) {
      const maxLength = field.getError('maxlength').requiredLength;
      return `Maximum length is ${maxLength} characters`;
    }
    if (field.hasError('pattern')) {
      if (fieldName === 'callsign') {
        return 'Only letters and numbers allowed';
      }
      if (fieldName === 'website') {
        return 'Must be a valid URL starting with http:// or https://';
      }
      return 'Invalid format';
    }
    return '';
  }
}
