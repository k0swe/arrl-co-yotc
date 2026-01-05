import { TestBed } from '@angular/core/testing';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideAuth, getAuth, connectAuthEmulator } from '@angular/fire/auth';
import { provideFirestore, getFirestore, connectFirestoreEmulator } from '@angular/fire/firestore';
import { provideFirebaseApp, initializeApp } from '@angular/fire/app';
import { EventDetailDialog } from './event-detail-dialog';
import { firebaseTestConfig } from '../../firebase-test.config';
import { Event } from '@arrl-co-yotc/shared/build/app/models/event.model';
import { Club } from '@arrl-co-yotc/shared/build/app/models/club.model';

describe('EventDetailDialog', () => {
  const mockEvent: Event = {
    id: 'test-event-id',
    clubId: 'test-club-id',
    name: 'Test Event',
    description: 'Test event description',
    startTime: new Date('2026-01-10T10:00:00'),
    endTime: new Date('2026-01-10T14:00:00'),
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'test-user-id',
  };

  const mockClub: Club = {
    id: 'test-club-id',
    name: 'Test Club',
    description: 'Test club description',
    website: 'https://test.club',
    callsign: 'W0TEST',
    location: 'Denver, CO',
    slug: 'test-club',
    isActive: true,
    leaderIds: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockDialogData = {
    event: mockEvent,
    club: mockClub,
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EventDetailDialog],
      providers: [
        provideAnimationsAsync(),
        provideFirebaseApp(() => initializeApp(firebaseTestConfig)),
        provideAuth(() => {
          const auth = getAuth();
          connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
          return auth;
        }),
        provideFirestore(() => {
          const firestore = getFirestore();
          connectFirestoreEmulator(firestore, '127.0.0.1', 8080);
          return firestore;
        }),
        { provide: MatDialogRef, useValue: { close: () => {} } },
        { provide: MAT_DIALOG_DATA, useValue: mockDialogData },
      ],
    }).compileComponents();
  });

  it('should create the dialog component', () => {
    const fixture = TestBed.createComponent(EventDetailDialog);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
  });

  it('should display event name in title', async () => {
    const fixture = TestBed.createComponent(EventDetailDialog);
    fixture.detectChanges();
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    const title = compiled.querySelector('h2[mat-dialog-title]');
    expect(title).toBeTruthy();
    expect(title?.textContent).toContain('Test Event');
  });

  it('should display club name', async () => {
    const fixture = TestBed.createComponent(EventDetailDialog);
    fixture.detectChanges();
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Test Club');
  });

  it('should display event description', async () => {
    const fixture = TestBed.createComponent(EventDetailDialog);
    fixture.detectChanges();
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Test event description');
  });

  it('should have close button', async () => {
    const fixture = TestBed.createComponent(EventDetailDialog);
    fixture.detectChanges();
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    const closeButton = compiled.querySelector('button[mat-raised-button]');
    expect(closeButton).toBeTruthy();
    expect(closeButton?.textContent).toContain('Close');
  });

  it('should have canViewRsvps signal', () => {
    const fixture = TestBed.createComponent(EventDetailDialog);
    const component = fixture.componentInstance;
    expect(component['canViewRsvps']).toBeDefined();
    expect(typeof component['canViewRsvps']()).toBe('boolean');
  });
});
