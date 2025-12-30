import { TestBed } from '@angular/core/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { provideNativeDateAdapter } from '@angular/material/core';
import { EditEventDialog } from './edit-event-dialog';

describe('EditEventDialog', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EditEventDialog],
      providers: [
        provideAnimationsAsync(),
        provideNativeDateAdapter(),
        { provide: MatDialogRef, useValue: {} },
        { provide: MAT_DIALOG_DATA, useValue: { clubId: 'test-club-id' } },
      ],
    }).compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(EditEventDialog);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
  });

  it('should initialize form with empty values for new event', () => {
    const fixture = TestBed.createComponent(EditEventDialog);
    const component = fixture.componentInstance;
    expect(component['eventForm'].get('name')?.value).toBe('');
    expect(component['eventForm'].get('description')?.value).toBe('');
  });
});
