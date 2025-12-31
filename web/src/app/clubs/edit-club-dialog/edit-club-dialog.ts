import {
  Component,
  ChangeDetectionStrategy,
  signal,
  inject,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators, AsyncValidatorFn, AbstractControl, ValidationErrors } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Club } from '@arrl-co-yotc/shared/build/app/models/club.model';
import { StorageService } from '../../services/storage.service';
import { ClubService } from '../../services/club.service';
import { catchError, of, map, Observable } from 'rxjs';

export interface EditClubDialogData {
  club?: Club;
  isApprovalMode?: boolean;
}

export type ClubFormData = Pick<Club, 'name' | 'callsign' | 'description' | 'location' | 'website' | 'slug'>;

@Component({
  selector: 'app-edit-club-dialog',
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './edit-club-dialog.html',
  styleUrl: './edit-club-dialog.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EditClubDialog {
  private fb = inject(FormBuilder);
  private dialogRef = inject(MatDialogRef<EditClubDialog>);
  private storageService = inject(StorageService);
  private clubService = inject(ClubService);
  protected data = inject<EditClubDialogData>(MAT_DIALOG_DATA, { optional: true });

  protected readonly submitting = signal(false);
  protected readonly uploadingLogo = signal(false);
  protected readonly isEditMode = !!this.data?.club;
  protected readonly isApprovalMode = this.data?.isApprovalMode ?? false;
  protected readonly isClubActive = this.data?.club?.isActive ?? false;
  protected readonly logoUrl = signal<string | undefined>(this.data?.club?.logoUrl);
  protected readonly logoFile = signal<File | null>(null);
  protected readonly uploadError = signal<string | null>(null);

  protected readonly clubForm = this.fb.nonNullable.group({
    name: [
      this.data?.club?.name || '',
      [Validators.required, Validators.minLength(3), Validators.maxLength(100)],
    ],
    callsign: [
      this.data?.club?.callsign || '',
      [Validators.required, Validators.pattern(/^[A-Z0-9]+$/i), Validators.maxLength(10)],
    ],
    slug: [
      this.data?.club?.slug || '',
      [Validators.required, Validators.pattern(/^[a-z0-9-]*$/), Validators.maxLength(100)],
      [this.uniqueSlugValidator()],
    ],
    description: [
      this.data?.club?.description || '',
      [Validators.required, Validators.minLength(10), Validators.maxLength(500)],
    ],
    location: [
      this.data?.club?.location || '',
      [Validators.required, Validators.minLength(3), Validators.maxLength(100)],
    ],
    website: [
      this.data?.club?.website || '',
      [Validators.pattern(/^https?:\/\/[^\s\/$.?#].[^\s]*$/i), Validators.maxLength(200)],
    ],
  });

  /**
   * Async validator to check if slug is unique
   * Returns null if slug is unique or if it's the current club's slug
   * Returns { slugNotUnique: true } if slug is already taken by another club
   */
  private uniqueSlugValidator(): AsyncValidatorFn {
    return (control: AbstractControl): Observable<ValidationErrors | null> => {
      if (!control.value) {
        return of(null);
      }

      return this.clubService.getClubBySlug(control.value).pipe(
        map((existingClub) => {
          // If no club found with this slug, it's unique
          if (!existingClub) {
            return null;
          }

          // If in edit mode and the club with this slug is the current club, it's valid
          if (this.data?.club?.id && existingClub.id === this.data.club.id) {
            return null;
          }

          // Otherwise, slug is not unique
          return { slugNotUnique: true };
        }),
        catchError(() => of(null)) // On error, allow the slug (fail open)
      );
    };
  }

  constructor() {
    // Disable slug field when club is active to prevent changing deep links
    if (this.isClubActive) {
      this.clubForm.get('slug')?.disable();
    }
  }

  protected onCancel(): void {
    this.dialogRef.close();
  }

  protected onLogoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) {
      return;
    }

    const file = input.files[0];
    
    // Validate file type
    if (!file.type.match(/^image\/(jpeg|png|webp|gif)$/)) {
      this.uploadError.set('Please select a valid image file (JPEG, PNG, WEBP, or GIF)');
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      this.uploadError.set('Image file must be less than 5MB');
      return;
    }

    this.uploadError.set(null);
    this.logoFile.set(file);

    // Create a preview URL
    const reader = new FileReader();
    reader.onload = (e) => {
      this.logoUrl.set(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  }

  protected removeLogo(): void {
    this.logoFile.set(null);
    this.logoUrl.set(undefined);
    this.uploadError.set(null);
  }

  protected onSubmit(): void {
    if (this.clubForm.invalid) {
      this.clubForm.markAllAsTouched();
      return;
    }

    const formData: ClubFormData = this.clubForm.getRawValue();
    const logoFile = this.logoFile();
    const clubId = this.data?.club?.id;

    // If there's a new logo file to upload and we have a club ID, handle it
    if (logoFile && clubId) {
      this.submitting.set(true);
      this.uploadingLogo.set(true);
      
      this.storageService.uploadClubLogo(clubId, logoFile)
        .pipe(
          catchError((error) => {
            console.error('Error uploading logo:', error);
            this.uploadError.set('Failed to upload logo. Please try again.');
            this.submitting.set(false);
            this.uploadingLogo.set(false);
            return of(null);
          })
        )
        .subscribe((logoUrl) => {
          this.uploadingLogo.set(false);
          if (logoUrl) {
            this.dialogRef.close({ ...formData, logoUrl });
          }
          this.submitting.set(false);
        });
    } else if (logoFile && !clubId) {
      // Cannot upload logo without a club ID (club must be created first)
      this.uploadError.set('Club must be created before uploading a logo');
      this.submitting.set(false);
    } else {
      // No new logo to upload, just return the form data
      // If logo was removed, include logoUrl: undefined to clear it
      const result = this.logoUrl() === undefined && this.data?.club?.logoUrl
        ? { ...formData, logoUrl: undefined }
        : formData;
      this.dialogRef.close(result);
    }
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
      if (fieldName === 'slug') {
        return 'Only lowercase letters, numbers, and hyphens allowed';
      }
      return 'Invalid format';
    }
    if (field.hasError('slugNotUnique')) {
      return 'This slug is already taken by another club';
    }
    return '';
  }
}
