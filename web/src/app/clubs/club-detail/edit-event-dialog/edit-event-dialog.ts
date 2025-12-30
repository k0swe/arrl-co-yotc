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
import { MatDatepickerModule } from '@angular/material/datepicker';
import { provideNativeDateAdapter } from '@angular/material/core';
import { Event } from '@arrl-co-yotc/shared/build/app/models/event.model';

export interface EditEventDialogData {
  event?: Event;
  clubId: string;
}

export type EventFormData = Pick<Event, 'name' | 'description' | 'startTime' | 'endTime'>;

@Component({
  selector: 'app-edit-event-dialog',
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatDatepickerModule,
  ],
  providers: [provideNativeDateAdapter()],
  templateUrl: './edit-event-dialog.html',
  styleUrl: './edit-event-dialog.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EditEventDialog {
  private fb = inject(FormBuilder);
  private dialogRef = inject(MatDialogRef<EditEventDialog>);
  protected data = inject<EditEventDialogData>(MAT_DIALOG_DATA);

  protected readonly submitting = signal(false);
  protected readonly isEditMode = !!this.data?.event;
  protected readonly timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  protected readonly eventForm = this.fb.nonNullable.group({
    name: [
      this.data?.event?.name || '',
      [Validators.required, Validators.minLength(3), Validators.maxLength(100)],
    ],
    description: [
      this.data?.event?.description || '',
      [Validators.required, Validators.minLength(10), Validators.maxLength(1000)],
    ],
    startDate: [
      this.toDate(this.data?.event?.startTime),
      [Validators.required],
    ],
    startTime: [
      this.toTimeString(this.data?.event?.startTime),
      [Validators.required],
    ],
    endDate: [
      this.toDate(this.data?.event?.endTime),
      [Validators.required],
    ],
    endTime: [
      this.toTimeString(this.data?.event?.endTime),
      [Validators.required],
    ],
  });

  protected onCancel(): void {
    this.dialogRef.close();
  }

  protected onSubmit(): void {
    if (this.eventForm.invalid) {
      this.eventForm.markAllAsTouched();
      return;
    }

    const formData = this.eventForm.getRawValue();
    
    // Combine date and time fields into Date objects
    const startDateTime = this.combineDateAndTime(formData.startDate, formData.startTime);
    const endDateTime = this.combineDateAndTime(formData.endDate, formData.endTime);
    
    if (!startDateTime || !endDateTime) {
      return; // Should not happen due to required validators
    }
    
    // Validate that end time is after start time
    if (endDateTime <= startDateTime) {
      // Show error on endTime field
      this.eventForm.get('endTime')?.setErrors({ endBeforeStart: true });
      this.eventForm.get('endTime')?.markAsTouched();
      return;
    }

    const result: EventFormData = {
      name: formData.name,
      description: formData.description,
      startTime: startDateTime,
      endTime: endDateTime,
    };

    this.dialogRef.close(result);
  }

  protected getErrorMessage(fieldName: string): string {
    const field = this.eventForm.get(fieldName);
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
    if (field.hasError('endBeforeStart')) {
      return 'End date/time must be after start date/time';
    }
    return '';
  }

  /**
   * Convert Firestore Timestamp to Date for form input
   */
  private toDate(timestamp: Date | { toDate(): Date } | string | null | undefined): Date | null {
    if (!timestamp) {
      return null;
    }
    if (timestamp instanceof Date) {
      return timestamp;
    }
    if (typeof timestamp === 'object' && 'toDate' in timestamp && typeof timestamp.toDate === 'function') {
      return timestamp.toDate();
    }
    if (typeof timestamp === 'string') {
      const date = new Date(timestamp);
      return isNaN(date.getTime()) ? null : date;
    }
    return null;
  }

  /**
   * Extract time string (HH:MM) from a Date or Firestore Timestamp
   */
  private toTimeString(timestamp: Date | { toDate(): Date } | string | null | undefined): string {
    const date = this.toDate(timestamp);
    if (!date) {
      return '';
    }
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  /**
   * Combine a date and time string into a single Date object
   */
  private combineDateAndTime(date: Date | null, timeString: string): Date | null {
    if (!date || !timeString) {
      return null;
    }
    
    const [hours, minutes] = timeString.split(':').map(Number);
    if (isNaN(hours) || isNaN(minutes)) {
      return null;
    }
    
    const combined = new Date(date);
    combined.setHours(hours, minutes, 0, 0);
    return combined;
  }
}
