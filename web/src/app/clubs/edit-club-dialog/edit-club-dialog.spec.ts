import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { EditClubDialog, EditClubDialogData } from './edit-club-dialog';
import { provideAnimations } from '@angular/platform-browser/animations';
import { Club } from '@arrl-co-yotc/shared/build/app/models/club.model';

describe('EditClubDialog', () => {
  let component: EditClubDialog;
  let fixture: ComponentFixture<EditClubDialog>;
  let mockDialogRef: Partial<MatDialogRef<EditClubDialog>>;

  describe('Create mode (no existing club)', () => {
    beforeEach(async () => {
      mockDialogRef = {
        close: vi.fn(),
      };

      await TestBed.configureTestingModule({
        imports: [EditClubDialog],
        providers: [
          { provide: MatDialogRef, useValue: mockDialogRef },
          { provide: MAT_DIALOG_DATA, useValue: null },
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
      expect(component['clubForm'].get('description')).toBeTruthy();
      expect(component['clubForm'].get('location')).toBeTruthy();
      expect(component['clubForm'].get('website')).toBeTruthy();
    });

    it('should mark form as invalid when empty', () => {
      expect(component['clubForm'].valid).toBeFalsy();
    });

    it('should validate required fields', () => {
      const form = component['clubForm'];

      form.patchValue({
        name: 'Test Club',
        callsign: 'W0TEST',
        description: 'A test club for testing purposes',
        location: 'Denver, CO',
      });

      expect(form.valid).toBeTruthy();
    });

    it('should close dialog with form data on submit', () => {
      const form = component['clubForm'];

      form.patchValue({
        name: 'Test Club',
        callsign: 'W0TEST',
        description: 'A test club for testing purposes',
        location: 'Denver, CO',
      });

      component['onSubmit']();

      const expectedData: Partial<Club> = {
        name: 'Test Club',
        callsign: 'W0TEST',
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
  });

  describe('Edit mode (with existing club)', () => {
    const existingClub: Club = {
      id: 'test-id',
      name: 'Existing Club',
      callsign: 'W0EXIST',
      description: 'An existing club for testing',
      location: 'Boulder, CO',
      isActive: true,
      leaderIds: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    beforeEach(async () => {
      mockDialogRef = {
        close: vi.fn(),
      };

      const dialogData: EditClubDialogData = { club: existingClub };

      await TestBed.configureTestingModule({
        imports: [EditClubDialog],
        providers: [
          { provide: MatDialogRef, useValue: mockDialogRef },
          { provide: MAT_DIALOG_DATA, useValue: dialogData },
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
      expect(form.get('description')?.value).toBe(existingClub.description);
      expect(form.get('location')?.value).toBe(existingClub.location);
      expect(form.get('website')?.value).toBe('');
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
});
