import {
  Component,
  ChangeDetectionStrategy,
  signal,
  inject,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Club } from '@arrl-co-yotc/shared/build/app/models/club.model';

export interface EditClubDialogData {
  club?: Club;
}

export type ClubFormData = Pick<Club, 'name' | 'callsign' | 'description' | 'location'>;

@Component({
  selector: 'app-edit-club-dialog',
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
  ],
  templateUrl: './edit-club-dialog.html',
  styleUrl: './edit-club-dialog.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EditClubDialog {
  private fb = inject(FormBuilder);
  private dialogRef = inject(MatDialogRef<EditClubDialog>);
  protected data = inject<EditClubDialogData>(MAT_DIALOG_DATA, { optional: true });

  protected readonly submitting = signal(false);
  protected readonly isEditMode = !!this.data?.club;

  protected readonly clubForm = this.fb.nonNullable.group({
    name: [
      this.data?.club?.name || '',
      [Validators.required, Validators.minLength(3), Validators.maxLength(100)],
    ],
    callsign: [
      this.data?.club?.callsign || '',
      [Validators.required, Validators.pattern(/^[A-Z0-9]+$/i), Validators.maxLength(10)],
    ],
    description: [
      this.data?.club?.description || '',
      [Validators.required, Validators.minLength(10), Validators.maxLength(500)],
    ],
    location: [
      this.data?.club?.location || '',
      [Validators.required, Validators.minLength(3), Validators.maxLength(100)],
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

    const formData: ClubFormData = this.clubForm.getRawValue();
    this.dialogRef.close(formData);
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
      return 'Only letters and numbers allowed';
    }
    return '';
  }
}
