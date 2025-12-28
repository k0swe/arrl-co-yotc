import {ComponentFixture, TestBed} from '@angular/core/testing';
import {MatDialogRef} from '@angular/material/dialog';
import {AddClubDialog} from './add-club-dialog';
import {provideAnimations} from '@angular/platform-browser/animations';
import {Club} from '@arrl-co-yotc/shared/build/app/models/club.model';

describe('AddClubDialog', () => {
  let component: AddClubDialog;
  let fixture: ComponentFixture<AddClubDialog>;
  let mockDialogRef: Partial<MatDialogRef<AddClubDialog>>;

  beforeEach(async () => {
    mockDialogRef = {
      close: vi.fn()
    };

    await TestBed.configureTestingModule({
      imports: [AddClubDialog],
      providers: [
        {provide: MatDialogRef, useValue: mockDialogRef},
        provideAnimations()
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AddClubDialog);
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
      location: 'Denver, CO'
    });

    expect(form.valid).toBeTruthy();
  });

  it('should close dialog with form data on submit', () => {
    const form = component['clubForm'];

    form.patchValue({
      name: 'Test Club',
      callsign: 'W0TEST',
      description: 'A test club for testing purposes',
      location: 'Denver, CO'
    });

    component['onSubmit']();

    const expectedData: Partial<Club> = {
      name: 'Test Club',
      callsign: 'W0TEST',
      description: 'A test club for testing purposes',
      location: 'Denver, CO'
    };
    expect(mockDialogRef.close).toHaveBeenCalledWith(expectedData);
  });

  it('should close dialog without data on cancel', () => {
    component['onCancel']();
    expect(mockDialogRef.close).toHaveBeenCalledWith();
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

