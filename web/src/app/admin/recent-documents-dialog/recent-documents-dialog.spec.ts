import { TestBed } from '@angular/core/testing';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialog } from '@angular/material/dialog';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { RecentDocumentsDialog } from './recent-documents-dialog';
import { provideFirebaseTestServices } from '../../firebase-test.providers';

describe('RecentDocumentsDialog', () => {
  const mockSince = new Date('2026-01-01T00:00:00');

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RecentDocumentsDialog],
      providers: [
        provideAnimationsAsync(),
        { provide: MatDialogRef, useValue: { close: () => {} } },
        { provide: MatDialog, useValue: { open: () => {} } },
        { provide: MAT_DIALOG_DATA, useValue: { since: mockSince } },
        ...provideFirebaseTestServices('recent-documents-dialog', { firestore: true, storage: true }),

      ],
    }).compileComponents();
  });

  it('should create the dialog component', () => {
    const fixture = TestBed.createComponent(RecentDocumentsDialog);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
  });

  it('should display the dialog title', async () => {
    const fixture = TestBed.createComponent(RecentDocumentsDialog);
    fixture.detectChanges();
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    const title = compiled.querySelector('h2[mat-dialog-title]');
    expect(title).toBeTruthy();
    expect(title?.textContent).toContain('Recent Document Uploads');
  });

  it('should have loading signal initialised to true', () => {
    const fixture = TestBed.createComponent(RecentDocumentsDialog);
    const component = fixture.componentInstance;
    expect(component['loading']()).toBe(true);
  });

  it('should have close button', async () => {
    const fixture = TestBed.createComponent(RecentDocumentsDialog);
    fixture.detectChanges();
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    const closeButton = compiled.querySelector('button[mat-raised-button]');
    expect(closeButton).toBeTruthy();
    expect(closeButton?.textContent).toContain('Close');
  });
});
