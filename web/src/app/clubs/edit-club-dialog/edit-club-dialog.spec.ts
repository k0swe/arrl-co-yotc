import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Storage } from '@angular/fire/storage';
import { EditClubDialog, EditClubDialogData } from './edit-club-dialog';
import { provideAnimations } from '@angular/platform-browser/animations';
import { Club } from '@arrl-co-yotc/shared/build/app/models/club.model';
import { ClubService } from '../../services/club.service';
import { of, throwError } from 'rxjs';

describe('EditClubDialog', () => {
  let component: EditClubDialog;
  let fixture: ComponentFixture<EditClubDialog>;
  let mockDialogRef: Partial<MatDialogRef<EditClubDialog>>;
  let mockStorage: Partial<Storage>;
  let mockClubService: {
    getClubBySlug: ReturnType<typeof vi.fn>;
  };

  describe('Create mode (no existing club)', () => {
    beforeEach(async () => {
      mockDialogRef = {
        close: vi.fn(),
      };

      mockStorage = {};

      mockClubService = {
        getClubBySlug: vi.fn().mockReturnValue(of(null)), // Default: slug is unique
      };

      await TestBed.configureTestingModule({
        imports: [EditClubDialog],
        providers: [
          { provide: MatDialogRef, useValue: mockDialogRef },
          { provide: MAT_DIALOG_DATA, useValue: null },
          { provide: Storage, useValue: mockStorage },
          { provide: ClubService, useValue: mockClubService },
          provideAnimations(),
        ],
      }).compileComponents();

      fixture = TestBed.createComponent(EditClubDialog);
      component = fixture.componentInstance;
      fixture.detectChanges();
    });

    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should have a form with all required fields', () => {
      expect(component['clubForm'].get('name')).toBeTruthy();
      expect(component['clubForm'].get('callsign')).toBeTruthy();
      expect(component['clubForm'].get('slug')).toBeTruthy();
      expect(component['clubForm'].get('description')).toBeTruthy();
      expect(component['clubForm'].get('location')).toBeTruthy();
      expect(component['clubForm'].get('website')).toBeTruthy();
    });

    it('should mark form as invalid when empty', () => {
      expect(component['clubForm'].valid).toBeFalsy();
    });

    it('should validate required fields', async () => {
      const form = component['clubForm'];

      form.patchValue({
        name: 'Test Club',
        callsign: 'W0TEST',
        slug: 'test-club',
        description: 'A test club for testing purposes',
        location: 'Denver, CO',
      });

      // Wait for async validation to complete (300ms debounce + processing)
      await new Promise(resolve => setTimeout(resolve, 400));
      await fixture.whenStable();

      expect(form.valid).toBeTruthy();
    });

    it('should close dialog with form data on submit', async () => {
      const form = component['clubForm'];

      form.patchValue({
        name: 'Test Club',
        callsign: 'W0TEST',
        slug: 'test-club',
        description: 'A test club for testing purposes',
        location: 'Denver, CO',
      });

      // Wait for async validation to complete
      await new Promise(resolve => setTimeout(resolve, 400));
      await fixture.whenStable();

      component['onSubmit']();

      const expectedData: Partial<Club> = {
        name: 'Test Club',
        callsign: 'W0TEST',
        slug: 'test-club',
        description: 'A test club for testing purposes',
        location: 'Denver, CO',
        website: '',
      };
      expect(mockDialogRef.close).toHaveBeenCalledWith(expectedData);
    });

    it('should close dialog without data on cancel', () => {
      component['onCancel']();
      expect(mockDialogRef.close).toHaveBeenCalledWith();
    });

    it('should be in create mode', () => {
      expect(component['isEditMode']).toBeFalsy();
    });

    it('should validate website URL pattern', () => {
      const websiteControl = component['clubForm'].get('website');

      websiteControl?.setValue('invalid-url');
      expect(websiteControl?.hasError('pattern')).toBeTruthy();

      websiteControl?.setValue('http://example.com');
      expect(websiteControl?.hasError('pattern')).toBeFalsy();

      websiteControl?.setValue('https://example.com');
      expect(websiteControl?.hasError('pattern')).toBeFalsy();

      websiteControl?.setValue('');
      expect(websiteControl?.valid).toBeTruthy(); // Website is optional
    });

    it('should validate slug pattern', () => {
      const slugControl = component['clubForm'].get('slug');

      slugControl?.setValue('Invalid Slug');
      expect(slugControl?.hasError('pattern')).toBeTruthy();

      slugControl?.setValue('UPPERCASE');
      expect(slugControl?.hasError('pattern')).toBeTruthy();

      slugControl?.setValue('valid-slug-123');
      expect(slugControl?.hasError('pattern')).toBeFalsy();

      slugControl?.setValue('');
      expect(slugControl?.hasError('required')).toBeTruthy(); // Slug is required
    });
  });

  describe('Edit mode (with existing club)', () => {
    const existingClub: Club = {
      id: 'test-id',
      name: 'Existing Club',
      callsign: 'W0EXIST',
      description: 'An existing club for testing',
      location: 'Boulder, CO',
      slug: 'existing-club',
      isActive: true,
      leaderIds: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    beforeEach(async () => {
      mockDialogRef = {
        close: vi.fn(),
      };

      mockStorage = {};

      mockClubService = {
        getClubBySlug: vi.fn().mockReturnValue(of(existingClub)), // Return same club for validation
      };

      const dialogData: EditClubDialogData = { club: existingClub };

      await TestBed.configureTestingModule({
        imports: [EditClubDialog],
        providers: [
          { provide: MatDialogRef, useValue: mockDialogRef },
          { provide: MAT_DIALOG_DATA, useValue: dialogData },
          { provide: Storage, useValue: mockStorage },
          { provide: ClubService, useValue: mockClubService },
          provideAnimations(),
        ],
      }).compileComponents();

      fixture = TestBed.createComponent(EditClubDialog);
      component = fixture.componentInstance;
      fixture.detectChanges();
    });

    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should be in edit mode', () => {
      expect(component['isEditMode']).toBeTruthy();
    });

    it('should pre-fill form with existing club data', () => {
      const form = component['clubForm'];

      expect(form.get('name')?.value).toBe(existingClub.name);
      expect(form.get('callsign')?.value).toBe(existingClub.callsign);
      expect(form.get('slug')?.value).toBe(existingClub.slug);
      expect(form.get('description')?.value).toBe(existingClub.description);
      expect(form.get('location')?.value).toBe(existingClub.location);
      expect(form.get('website')?.value).toBe('');
    });

    it('should disable slug field when club is active', () => {
      const slugControl = component['clubForm'].get('slug');
      expect(slugControl?.disabled).toBeTruthy();
    });

    it('should close dialog with updated data on submit', () => {
      const form = component['clubForm'];

      form.patchValue({
        name: 'Updated Club Name',
        description: 'Updated description for the club',
      });

      component['onSubmit']();

      expect(mockDialogRef.close).toHaveBeenCalledWith({
        name: 'Updated Club Name',
        callsign: existingClub.callsign,
        slug: existingClub.slug,
        description: 'Updated description for the club',
        location: existingClub.location,
        website: '',
      });
    });

    it('should validate callsign pattern', () => {
      const callsignControl = component['clubForm'].get('callsign');

      callsignControl?.setValue('INVALID CALL');
      expect(callsignControl?.hasError('pattern')).toBeTruthy();

      callsignControl?.setValue('W0ABC');
      expect(callsignControl?.hasError('pattern')).toBeFalsy();
    });

    it('should validate minimum length for description', () => {
      const descControl = component['clubForm'].get('description');

      descControl?.setValue('Short');
      expect(descControl?.hasError('minlength')).toBeTruthy();

      descControl?.setValue('A longer description that meets the minimum length');
      expect(descControl?.hasError('minlength')).toBeFalsy();
    });
  });

  describe('Edit mode (with inactive club)', () => {
    const inactiveClub: Club = {
      id: 'inactive-id',
      name: 'Inactive Club',
      callsign: 'W0INACT',
      description: 'An inactive club for testing',
      location: 'Aurora, CO',
      slug: 'inactive-club',
      isActive: false,
      leaderIds: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    beforeEach(async () => {
      mockDialogRef = {
        close: vi.fn(),
      };

      mockStorage = {};

      mockClubService = {
        getClubBySlug: vi.fn().mockReturnValue(of(inactiveClub)), // Return same club for validation
      };

      const dialogData: EditClubDialogData = { club: inactiveClub };

      await TestBed.configureTestingModule({
        imports: [EditClubDialog],
        providers: [
          { provide: MatDialogRef, useValue: mockDialogRef },
          { provide: MAT_DIALOG_DATA, useValue: dialogData },
          { provide: Storage, useValue: mockStorage },
          { provide: ClubService, useValue: mockClubService },
          provideAnimations(),
        ],
      }).compileComponents();

      fixture = TestBed.createComponent(EditClubDialog);
      component = fixture.componentInstance;
      fixture.detectChanges();
    });

    it('should allow editing slug field when club is inactive', () => {
      const slugControl = component['clubForm'].get('slug');
      expect(slugControl?.disabled).toBeFalsy();
    });
  });

  describe('Approval mode (with pending club)', () => {
    const pendingClub: Club = {
      id: 'pending-id',
      name: 'Pending Club',
      callsign: 'W0PEND',
      description: 'A pending club for testing',
      location: 'Fort Collins, CO',
      slug: 'pending-club',
      isActive: false,
      leaderIds: [],
      suggestedBy: 'user123',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    beforeEach(async () => {
      mockDialogRef = {
        close: vi.fn(),
      };

      mockStorage = {};

      mockClubService = {
        getClubBySlug: vi.fn().mockReturnValue(of(pendingClub)), // Return same club for validation
      };

      const dialogData: EditClubDialogData = { club: pendingClub, isApprovalMode: true };

      await TestBed.configureTestingModule({
        imports: [EditClubDialog],
        providers: [
          { provide: MatDialogRef, useValue: mockDialogRef },
          { provide: MAT_DIALOG_DATA, useValue: dialogData },
          { provide: Storage, useValue: mockStorage },
          { provide: ClubService, useValue: mockClubService },
          provideAnimations(),
        ],
      }).compileComponents();

      fixture = TestBed.createComponent(EditClubDialog);
      component = fixture.componentInstance;
      fixture.detectChanges();
    });

    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should be in approval mode', () => {
      expect(component['isApprovalMode']).toBeTruthy();
    });

    it('should be in edit mode when in approval mode', () => {
      expect(component['isEditMode']).toBeTruthy();
    });

    it('should pre-fill form with pending club data', () => {
      const form = component['clubForm'];

      expect(form.get('name')?.value).toBe(pendingClub.name);
      expect(form.get('callsign')?.value).toBe(pendingClub.callsign);
      expect(form.get('slug')?.value).toBe(pendingClub.slug);
      expect(form.get('description')?.value).toBe(pendingClub.description);
      expect(form.get('location')?.value).toBe(pendingClub.location);
    });

    it('should allow editing slug field when club is pending', () => {
      const slugControl = component['clubForm'].get('slug');
      expect(slugControl?.disabled).toBeFalsy();
    });

    it('should require all fields to be valid before submission', () => {
      const form = component['clubForm'];
      
      // Clear description to make form invalid
      form.patchValue({ description: '' });
      expect(form.valid).toBeFalsy();

      component['onSubmit']();
      expect(mockDialogRef.close).not.toHaveBeenCalled();
    });

    it('should close dialog with validated data on submit', async () => {
      const form = component['clubForm'];

      // Update some fields
      form.patchValue({
        name: 'Validated Club Name',
        description: 'This club has been reviewed and validated by an admin',
      });

      // Wait for async validation to complete
      await new Promise(resolve => setTimeout(resolve, 400));
      await fixture.whenStable();

      component['onSubmit']();

      expect(mockDialogRef.close).toHaveBeenCalledWith({
        name: 'Validated Club Name',
        callsign: pendingClub.callsign,
        slug: pendingClub.slug,
        description: 'This club has been reviewed and validated by an admin',
        location: pendingClub.location,
        website: '',
      });
    });
  });

  describe('Slug uniqueness validation', () => {
    let mockClubService: {
      getClubBySlug: ReturnType<typeof vi.fn>;
    };

    beforeEach(async () => {
      mockDialogRef = {
        close: vi.fn(),
      };

      mockStorage = {};

      mockClubService = {
        getClubBySlug: vi.fn(),
      };

      await TestBed.configureTestingModule({
        imports: [EditClubDialog],
        providers: [
          { provide: MatDialogRef, useValue: mockDialogRef },
          { provide: MAT_DIALOG_DATA, useValue: null },
          { provide: Storage, useValue: mockStorage },
          { provide: ClubService, useValue: mockClubService },
          provideAnimations(),
        ],
      }).compileComponents();
    });

    it('should reject duplicate slugs in create mode', async () => {
      const existingClub: Club = {
        id: 'existing-id',
        name: 'Existing Club',
        callsign: 'W0EXIST',
        description: 'An existing club',
        location: 'Denver, CO',
        slug: 'denver-club',
        isActive: true,
        leaderIds: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockClubService.getClubBySlug.mockReturnValue(of(existingClub));

      fixture = TestBed.createComponent(EditClubDialog);
      component = fixture.componentInstance;
      fixture.detectChanges();

      const slugControl = component['clubForm'].get('slug');
      slugControl?.setValue('denver-club');
      slugControl?.markAsTouched();
      
      // Wait for async validation (300ms debounce + processing)
      await new Promise(resolve => setTimeout(resolve, 400));
      await fixture.whenStable();

      expect(slugControl?.hasError('slugNotUnique')).toBeTruthy();
      expect(component['getErrorMessage']('slug')).toBe('This slug is already taken by another club');
    });

    it('should accept unique slugs in create mode', async () => {
      mockClubService.getClubBySlug.mockReturnValue(of(null));

      fixture = TestBed.createComponent(EditClubDialog);
      component = fixture.componentInstance;
      fixture.detectChanges();

      const slugControl = component['clubForm'].get('slug');
      slugControl?.setValue('unique-slug');
      
      // Wait for async validation
      await fixture.whenStable();

      expect(slugControl?.hasError('slugNotUnique')).toBeFalsy();
    });

    it('should allow same slug in edit mode for the current club', async () => {
      const currentClub: Club = {
        id: 'current-id',
        name: 'Current Club',
        callsign: 'W0CURR',
        description: 'The current club being edited',
        location: 'Boulder, CO',
        slug: 'boulder-club',
        isActive: true,
        leaderIds: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockClubService.getClubBySlug.mockReturnValue(of(currentClub));

      const dialogData: EditClubDialogData = { club: currentClub };

      await TestBed.configureTestingModule({
        imports: [EditClubDialog],
        providers: [
          { provide: MatDialogRef, useValue: mockDialogRef },
          { provide: MAT_DIALOG_DATA, useValue: dialogData },
          { provide: Storage, useValue: mockStorage },
          { provide: ClubService, useValue: mockClubService },
          provideAnimations(),
        ],
      }).compileComponents();

      fixture = TestBed.createComponent(EditClubDialog);
      component = fixture.componentInstance;
      fixture.detectChanges();

      const slugControl = component['clubForm'].get('slug');
      
      // Wait for async validation
      await fixture.whenStable();

      // Should not have slugNotUnique error because it's the same club
      expect(slugControl?.hasError('slugNotUnique')).toBeFalsy();
    });

    it('should reject different club slug in edit mode', async () => {
      const currentClub: Club = {
        id: 'current-id',
        name: 'Current Club',
        callsign: 'W0CURR',
        description: 'The current club being edited',
        location: 'Boulder, CO',
        slug: 'boulder-club',
        isActive: false, // Not active so slug can be edited
        leaderIds: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const otherClub: Club = {
        id: 'other-id',
        name: 'Other Club',
        callsign: 'W0OTHER',
        description: 'Another existing club',
        location: 'Denver, CO',
        slug: 'denver-club',
        isActive: true,
        leaderIds: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const dialogData: EditClubDialogData = { club: currentClub };

      await TestBed.configureTestingModule({
        imports: [EditClubDialog],
        providers: [
          { provide: MatDialogRef, useValue: mockDialogRef },
          { provide: MAT_DIALOG_DATA, useValue: dialogData },
          { provide: Storage, useValue: mockStorage },
          { provide: ClubService, useValue: mockClubService },
          provideAnimations(),
        ],
      }).compileComponents();

      mockClubService.getClubBySlug.mockReturnValue(of(otherClub));

      fixture = TestBed.createComponent(EditClubDialog);
      component = fixture.componentInstance;
      fixture.detectChanges();

      const slugControl = component['clubForm'].get('slug');
      slugControl?.setValue('denver-club');
      slugControl?.markAsTouched();
      
      // Wait for async validation (300ms debounce + processing)
      await new Promise(resolve => setTimeout(resolve, 400));
      await fixture.whenStable();

      expect(slugControl?.hasError('slugNotUnique')).toBeTruthy();
    });

    it('should show error message for pending async validation', () => {
      mockClubService.getClubBySlug.mockReturnValue(new Promise(() => {})); // Never resolves

      fixture = TestBed.createComponent(EditClubDialog);
      component = fixture.componentInstance;
      fixture.detectChanges();

      const slugControl = component['clubForm'].get('slug');
      slugControl?.setValue('checking-slug');
      
      // While async validation is pending
      expect(slugControl?.pending).toBeTruthy();
      expect(component['getErrorMessage']('slug')).toBe('Checking if slug is available...');
    });

    it('should use custom ErrorStateMatcher for immediate error display', () => {
      const existingClub: Club = {
        id: 'existing-id',
        name: 'Existing Club',
        callsign: 'W0EXIST',
        description: 'An existing club',
        location: 'Denver, CO',
        slug: 'denver-club',
        isActive: true,
        leaderIds: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockClubService.getClubBySlug.mockReturnValue(of(existingClub));
      
      const dialogData: EditClubDialogData = { club: existingClub };

      TestBed.overrideProvider(MAT_DIALOG_DATA, { useValue: dialogData });

      fixture = TestBed.createComponent(EditClubDialog);
      component = fixture.componentInstance;
      fixture.detectChanges();

      const slugErrorStateMatcher = component['slugErrorStateMatcher'];
      expect(slugErrorStateMatcher).toBeTruthy();
      expect(slugErrorStateMatcher.constructor.name).toBe('ImmediateErrorStateMatcher');

      // Test that the matcher returns true for invalid control even without touched/dirty
      const mockControl = {
        invalid: true,
        valid: false,
        touched: false,
        dirty: false
      } as any;

      expect(slugErrorStateMatcher.isErrorState(mockControl, null)).toBeTruthy();
    });

    it('should handle network errors during validation gracefully', async () => {
      mockClubService.getClubBySlug.mockReturnValue(
        throwError(() => new Error('Network error'))
      );

      fixture = TestBed.createComponent(EditClubDialog);
      component = fixture.componentInstance;
      fixture.detectChanges();

      const slugControl = component['clubForm'].get('slug');
      slugControl?.setValue('network-error-slug');
      
      // Wait for async validation to complete (300ms debounce + processing)
      await new Promise(resolve => setTimeout(resolve, 400));
      await fixture.whenStable();

      // Should not have validation error (validation should return null on error)
      expect(slugControl?.hasError('slugNotUnique')).toBeFalsy();
    });

    it('should not validate empty or disabled slug fields', () => {
      fixture = TestBed.createComponent(EditClubDialog);
      component = fixture.componentInstance;
      fixture.detectChanges();

      const slugControl = component['clubForm'].get('slug');
      
      // Test empty value
      slugControl?.setValue('');
      expect(mockClubService.getClubBySlug).not.toHaveBeenCalled();

      // Test disabled control
      slugControl?.disable();
      slugControl?.setValue('test-slug');
      expect(mockClubService.getClubBySlug).not.toHaveBeenCalled();
    });
  });

  describe('Automatic slug generation', () => {
    beforeEach(async () => {
      mockDialogRef = {
        close: vi.fn(),
      };

      mockStorage = {};

      mockClubService = {
        getClubBySlug: vi.fn().mockReturnValue(of(null)), // Default: slug is unique
      };

      await TestBed.configureTestingModule({
        imports: [EditClubDialog],
        providers: [
          { provide: MatDialogRef, useValue: mockDialogRef },
          { provide: MAT_DIALOG_DATA, useValue: null },
          { provide: Storage, useValue: mockStorage },
          { provide: ClubService, useValue: mockClubService },
          provideAnimations(),
        ],
      }).compileComponents();
    });

    it('should auto-generate slug when name changes in create mode', () => {
      fixture = TestBed.createComponent(EditClubDialog);
      component = fixture.componentInstance;
      fixture.detectChanges();

      const nameControl = component['clubForm'].get('name');
      const slugControl = component['clubForm'].get('slug');

      nameControl?.setValue('Denver Amateur Radio Club');

      // Expect acronym-style slug (first letter of each word)
      expect(slugControl?.value).toBe('darc');
      expect(slugControl?.touched).toBeTruthy();
    });

    it('should not auto-generate slug if slug field already has a value in edit mode', () => {
      const existingClub: Club = {
        id: 'existing-id',
        name: 'Existing Club',
        callsign: 'W0EXIST',
        description: 'An existing club',
        location: 'Denver, CO',
        slug: 'existing-slug',
        isActive: false,
        leaderIds: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const dialogData: EditClubDialogData = { club: existingClub };

      TestBed.overrideProvider(MAT_DIALOG_DATA, { useValue: dialogData });

      fixture = TestBed.createComponent(EditClubDialog);
      component = fixture.componentInstance;
      fixture.detectChanges();

      const nameControl = component['clubForm'].get('name');
      const slugControl = component['clubForm'].get('slug');

      // Slug should be pre-populated from existing club
      expect(slugControl?.value).toBe('existing-slug');

      // Changing name should not update slug since it already has a value
      nameControl?.setValue('Updated Club Name');
      
      expect(slugControl?.value).toBe('existing-slug');
    });

    it('should auto-generate slug if slug field is empty even in edit mode', () => {
      const existingClub: Club = {
        id: 'existing-id',
        name: 'Existing Club',
        callsign: 'W0EXIST',
        description: 'An existing club',
        location: 'Denver, CO',
        slug: '', // Empty slug
        isActive: false,
        leaderIds: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const dialogData: EditClubDialogData = { club: existingClub };

      TestBed.overrideProvider(MAT_DIALOG_DATA, { useValue: dialogData });

      fixture = TestBed.createComponent(EditClubDialog);
      component = fixture.componentInstance;
      fixture.detectChanges();

      const nameControl = component['clubForm'].get('name');
      const slugControl = component['clubForm'].get('slug');

      // Should start empty
      expect(slugControl?.value).toBe('');

      // Changing name should generate slug since current slug is empty
      nameControl?.setValue('Boulder Amateur Radio Club');
      
      // Expect acronym-style slug (first letter of each word)
      expect(slugControl?.value).toBe('barc');
    });
  });
});
