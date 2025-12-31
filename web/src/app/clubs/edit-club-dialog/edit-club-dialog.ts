import {
  Component,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  signal,
  inject,
  effect,
} from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
  AsyncValidatorFn,
  AbstractControl,
  ValidationErrors,
  FormControl,
  FormGroupDirective,
  NgForm,
} from '@angular/forms';
import { ErrorStateMatcher } from '@angular/material/core';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Club } from '@arrl-co-yotc/shared/build/app/models/club.model';
import { StorageService } from '../../services/storage.service';
import { ClubService } from '../../services/club.service';
import { generateSlugFromName } from '@arrl-co-yotc/shared/build/app/utils/slug.util';
import { catchError, of, map, Observable, tap, debounceTime, distinctUntilChanged } from 'rxjs';

export interface EditClubDialogData {
  club?: Club;
  isApprovalMode?: boolean;
}

export type ClubFormData = Pick<
  Club,
  'name' | 'callsign' | 'description' | 'location' | 'website' | 'slug'
>;

/** Custom error state matcher that shows errors immediately for async validation */
class ImmediateErrorStateMatcher implements ErrorStateMatcher {
  isErrorState(control: FormControl | null, form: FormGroupDirective | NgForm | null): boolean {
    // Show errors immediately if the control is invalid, regardless of touched/dirty state
    return !!(control && control.invalid);
  }
}

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
  private cdr = inject(ChangeDetectorRef);
  protected data = inject<EditClubDialogData>(MAT_DIALOG_DATA, { optional: true });

  protected readonly submitting = signal(false);
  protected readonly uploadingLogo = signal(false);
  protected readonly isEditMode = !!this.data?.club;
  protected readonly isApprovalMode = this.data?.isApprovalMode ?? false;
  protected readonly isClubActive = this.data?.club?.isActive ?? false;
  protected readonly logoUrl = signal<string | undefined>(this.data?.club?.logoUrl);
  protected readonly logoFile = signal<File | null>(null);
  protected readonly uploadError = signal<string | null>(null);

  /** Custom error state matcher to show async validation errors immediately */
  protected readonly slugErrorStateMatcher = new ImmediateErrorStateMatcher();

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
      const value = control.value?.trim();

      console.log('🔍 uniqueSlugValidator called:', {
        value,
        disabled: control.disabled,
        touched: control.touched,
        dirty: control.dirty,
      });

      // Skip validation if control is disabled or empty
      if (control.disabled || !value) {
        console.log('⏭️ Skipping validation: disabled or empty');
        return of(null);
      }

      console.log('▶️ Starting async validation for slug:', value);

      // Create a simple observable with debouncing to prevent race conditions
      return new Observable<ValidationErrors | null>((observer) => {
        // Debounce the API call
        const timeout = setTimeout(() => {
          console.log('🔄 Executing debounced validation for:', value);

          this.clubService.getClubBySlug(value).subscribe({
            next: (existingClub) => {
              console.log('📡 API response:', existingClub);

              let result: ValidationErrors | null = null;

              if (existingClub) {
                // If in edit mode and the club with this slug is the current club, it's valid
                if (this.data?.club?.id && existingClub.id === this.data.club.id) {
                  console.log('✅ Slug belongs to current club');
                  result = null;
                } else {
                  console.log('❌ Slug is not unique, returning error');
                  result = { slugNotUnique: true };
                }
              } else {
                console.log('✅ Slug is unique');
                result = null;
              }

              console.log('📋 Final validation result:', result);
              observer.next(result);
              observer.complete();

              // Trigger change detection after a short delay
              setTimeout(() => {
                console.log('🔄 Triggering change detection');
                this.cdr.detectChanges();
              }, 50);
            },
            error: (error) => {
              console.error('💥 Async validator error:', error);
              observer.next(null); // Fail open
              observer.complete();
            },
          });
        }, 300); // 300ms debounce

        // Return cleanup function
        return () => {
          clearTimeout(timeout);
        };
      });
    };
  }

  constructor() {
    console.log('🏗️ EditClubDialog constructor:', {
      isEditMode: this.isEditMode,
      isClubActive: this.isClubActive,
      clubData: this.data?.club,
    });

    // Disable slug field when club is active to prevent changing deep links
    if (this.isClubActive) {
      console.log('🔒 Disabling slug field for active club');
      this.clubForm.get('slug')?.disable();
    }

    // Auto-generate slug from name when creating a new club or when editing inactive clubs
    if (!this.isEditMode || !this.isClubActive) {
      console.log('⚙️ Setting up slug auto-generation');
      this.setupSlugAutoGeneration();
    }

    // Log initial form state
    const slugControl = this.clubForm.get('slug');
    console.log('📋 Initial slug control state:', {
      value: slugControl?.value,
      disabled: slugControl?.disabled,
      validators: slugControl?.validator ? 'has sync validators' : 'no sync validators',
      asyncValidators: slugControl?.asyncValidator ? 'has async validators' : 'no async validators',
    });
  }

  /**
   * Sets up automatic slug generation based on club name changes
   */
  private setupSlugAutoGeneration(): void {
    const nameControl = this.clubForm.get('name');
    const slugControl = this.clubForm.get('slug');

    if (!nameControl || !slugControl) {
      console.warn('⚠️ Could not set up slug auto-generation: missing controls');
      return;
    }

    console.log('🔗 Setting up slug auto-generation subscription');

    // Only auto-generate if slug is empty or in create mode
    nameControl.valueChanges.subscribe((nameValue) => {
      console.log('📝 Name changed:', nameValue);

      // Only auto-generate slug if it's currently empty or we're creating a new club
      if (!this.isEditMode || !slugControl.value) {
        const generatedSlug = generateSlugFromName(nameValue || '');
        console.log('🔄 Generated slug:', generatedSlug);

        if (generatedSlug && generatedSlug !== slugControl.value) {
          console.log('✏️ Setting new slug value and triggering validation');
          slugControl.setValue(generatedSlug);
          slugControl.markAsTouched();
          // Force validation to run after setting the value
          slugControl.updateValueAndValidity();

          console.log('📋 After setValue - slug control state:', {
            value: slugControl.value,
            touched: slugControl.touched,
            dirty: slugControl.dirty,
            valid: slugControl.valid,
            pending: slugControl.pending,
            errors: slugControl.errors,
          });
        }
      }
    });
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
    console.log('🚀 Form submission attempted');
    console.log('📋 Form state:', {
      valid: this.clubForm.valid,
      invalid: this.clubForm.invalid,
      pending: this.clubForm.pending,
      status: this.clubForm.status,
      errors: this.clubForm.errors,
    });

    const slugControl = this.clubForm.get('slug');
    console.log('🔗 Slug control state on submit:', {
      value: slugControl?.value,
      valid: slugControl?.valid,
      invalid: slugControl?.invalid,
      pending: slugControl?.pending,
      errors: slugControl?.errors,
      status: slugControl?.status,
    });

    // Check if form is invalid OR has pending async validators
    if (this.clubForm.invalid || this.clubForm.pending) {
      console.log('❌ Form validation failed - marking all as touched');
      this.clubForm.markAllAsTouched();
      // Trigger change detection to show errors
      this.cdr.markForCheck();
      return;
    }

    console.log('✅ Form is valid, proceeding with submission');

    const formData: ClubFormData = this.clubForm.getRawValue();
    const logoFile = this.logoFile();
    const clubId = this.data?.club?.id;

    // If there's a new logo file to upload and we have a club ID, handle it
    if (logoFile && clubId) {
      this.submitting.set(true);
      this.uploadingLogo.set(true);

      this.storageService
        .uploadClubLogo(clubId, logoFile)
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
      const result =
        this.logoUrl() === undefined && this.data?.club?.logoUrl
          ? { ...formData, logoUrl: undefined }
          : formData;
      this.dialogRef.close(result);
    }
  }

  protected getErrorMessage(fieldName: string): string {
    const field = this.clubForm.get(fieldName);
    if (!field) {
      return '';
    }

    // Debug logging for slug field
    if (fieldName === 'slug') {
      console.log('🔍 getErrorMessage for slug:', {
        value: field.value,
        valid: field.valid,
        invalid: field.invalid,
        touched: field.touched,
        dirty: field.dirty,
        pending: field.pending,
        errors: field.errors,
        status: field.status,
      });
      // Add delayed state check for debugging
      setTimeout(() => {
        console.log('🕐 Delayed slug control state check:', {
          value: field.value,
          valid: field.valid,
          invalid: field.invalid,
          pending: field.pending,
          errors: field.errors,
          status: field.status,
        });
      }, 100);
    }

    // For async validators, we need to check if the field is invalid and touched/dirty
    // or if it's pending (currently being validated)
    // Special case: show async validation errors immediately for pre-populated fields
    const hasAsyncError = field.invalid && field.errors && 'slugNotUnique' in field.errors;
    const shouldShowError = field.invalid && (field.touched || field.dirty || hasAsyncError);
    const isPending = field.pending;

    if (fieldName === 'slug') {
      console.log('🎯 Slug error display logic:', {
        shouldShowError,
        isPending,
        willReturn: shouldShowError || isPending,
      });
    }

    if (!shouldShowError && !isPending) {
      return '';
    }

    // Show "validating..." message when async validation is pending
    if (isPending && fieldName === 'slug') {
      return 'Checking if slug is available...';
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
      console.log('🚨 Found slugNotUnique error, returning message');
      return 'This slug is already taken by another club';
    }
    return '';
  }

  /**
   * Helper method to determine if slug validation feedback should be shown
   */
  protected shouldShowSlugValidation(): boolean {
    const slugControl = this.clubForm.get('slug');
    if (!slugControl) {
      return false;
    }

    return (
      (slugControl.invalid && (slugControl.touched || slugControl.dirty)) || slugControl.pending
    );
  }
}
