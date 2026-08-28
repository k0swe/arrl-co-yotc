import { TestBed } from '@angular/core/testing';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialog } from '@angular/material/dialog';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { of } from 'rxjs';
import { RecentDocumentsDialog } from './recent-documents-dialog';
import { DocumentService } from '../../services/document.service';
import { EventService } from '../../services/event.service';
import { ClubService } from '../../services/club.service';
import { UserService } from '../../services/user.service';

describe('RecentDocumentsDialog', () => {
  const mockSince = new Date('2026-01-01T00:00:00');
  const getRecentDocuments = vi.fn();

  beforeEach(async () => {
    getRecentDocuments.mockReset();
    getRecentDocuments.mockReturnValue(of({ documents: [], total: 0 }));

    await TestBed.configureTestingModule({
      imports: [RecentDocumentsDialog],
      providers: [
        provideAnimationsAsync(),
        { provide: MatDialogRef, useValue: { close: () => {} } },
        { provide: MatDialog, useValue: { open: () => {} } },
        { provide: MAT_DIALOG_DATA, useValue: { since: mockSince } },
        { provide: DocumentService, useValue: { getRecentDocuments } },
        { provide: EventService, useValue: { getEvent: () => of(null) } },
        { provide: ClubService, useValue: { getClubById: () => of(null) } },
        { provide: UserService, useValue: { getUser: () => of(null) } },
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

  it('should render filter fields', async () => {
    const fixture = TestBed.createComponent(RecentDocumentsDialog);
    fixture.detectChanges();
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Scope');
    expect(compiled.textContent).toContain('Club');
    expect(compiled.textContent).toContain('Uploader');
  });

  it('should label club-level uploads', async () => {
    getRecentDocuments.mockReturnValue(
      of({
        documents: [
          {
            id: 'club-doc-1',
            clubId: 'club-1',
            uploadedBy: 'user-1',
            storagePath: 'club-documents/club-1/file.pdf',
            downloadUrl: 'https://example.test/file.pdf',
            filename: 'file.pdf',
            uploadedAt: new Date('2026-01-01T00:00:00'),
          },
        ],
        total: 1,
      }),
    );
    const fixture = TestBed.createComponent(RecentDocumentsDialog);
    fixture.detectChanges();
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Club-level');
  });
});
