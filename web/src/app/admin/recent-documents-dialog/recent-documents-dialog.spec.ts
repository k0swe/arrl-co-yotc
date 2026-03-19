import { TestBed } from '@angular/core/testing';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialog } from '@angular/material/dialog';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideFirestore, getFirestore, connectFirestoreEmulator } from '@angular/fire/firestore';
import { provideFirebaseApp, initializeApp } from '@angular/fire/app';
import { provideStorage, getStorage, connectStorageEmulator } from '@angular/fire/storage';
import { RecentDocumentsDialog } from './recent-documents-dialog';
import { firebaseTestConfig } from '../../firebase-test.config';

describe('RecentDocumentsDialog', () => {
  const mockSince = new Date('2026-01-01T00:00:00');

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RecentDocumentsDialog],
      providers: [
        provideAnimationsAsync(),
        provideFirebaseApp(() => initializeApp(firebaseTestConfig)),
        provideFirestore(() => {
          const firestore = getFirestore();
          connectFirestoreEmulator(firestore, '127.0.0.1', 8080);
          return firestore;
        }),
        provideStorage(() => {
          const storage = getStorage();
          connectStorageEmulator(storage, '127.0.0.1', 9199);
          return storage;
        }),
        { provide: MatDialogRef, useValue: { close: () => {} } },
        { provide: MatDialog, useValue: { open: () => {} } },
        { provide: MAT_DIALOG_DATA, useValue: { since: mockSince } },
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
