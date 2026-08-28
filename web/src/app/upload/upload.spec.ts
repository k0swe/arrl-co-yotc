import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Upload } from './upload';
import { AuthService } from '../auth/auth.service';
import { RsvpService } from '../services/rsvp.service';
import { EventService } from '../services/event.service';
import { ClubService } from '../services/club.service';
import { DocumentService } from '../services/document.service';
import { MembershipService } from '../services/membership.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of } from 'rxjs';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('Upload', () => {
  let component: Upload;
  let fixture: ComponentFixture<Upload>;

  beforeEach(async () => {
    const authServiceMock = {
      currentUser: vi.fn(),
      isAdmin: vi.fn().mockReturnValue(false),
    };
    const rsvpServiceMock = {
      getUserRsvp: vi.fn(),
    };
    const eventServiceMock = {
      getAllEvents: vi.fn(),
    };
    const clubServiceMock = {
      getClubById: vi.fn(),
      getActiveClubs: vi.fn().mockReturnValue(of([])),
    };
    const documentServiceMock = {
      getEventDocuments: vi.fn(),
      uploadDocument: vi.fn(),
      getClubDocuments: vi.fn(),
      uploadClubDocument: vi.fn(),
    };
    const membershipServiceMock = {
      getUserMemberships: vi.fn().mockReturnValue(of([])),
    };
    const snackBarMock = {
      open: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [Upload],
      providers: [
        provideNoopAnimations(),
        { provide: AuthService, useValue: authServiceMock },
        { provide: RsvpService, useValue: rsvpServiceMock },
        { provide: EventService, useValue: eventServiceMock },
        { provide: ClubService, useValue: clubServiceMock },
        { provide: DocumentService, useValue: documentServiceMock },
        { provide: MembershipService, useValue: membershipServiceMock },
        { provide: MatSnackBar, useValue: snackBarMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Upload);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    const authService = TestBed.inject(AuthService) as any;
    const eventService = TestBed.inject(EventService) as any;

    authService.currentUser.mockReturnValue(null);
    eventService.getAllEvents.mockReturnValue(of([]));

    fixture.detectChanges();

    expect(component).toBeTruthy();
  });

  it('should load RSVP events on init when user is authenticated', () => {
    const authService = TestBed.inject(AuthService) as any;
    const eventService = TestBed.inject(EventService) as any;

    const mockUser = { uid: 'user123' } as any;
    authService.currentUser.mockReturnValue(mockUser);
    eventService.getAllEvents.mockReturnValue(of([]));

    fixture.detectChanges();

    expect(eventService.getAllEvents).toHaveBeenCalled();
  });

  it('should not load events when user is not authenticated', () => {
    const authService = TestBed.inject(AuthService) as any;
    const eventService = TestBed.inject(EventService) as any;

    authService.currentUser.mockReturnValue(null);
    eventService.getAllEvents.mockReturnValue(of([]));

    fixture.detectChanges();

    expect(component['loading']()).toBe(false);
  });

  it('should report partial event upload results and preserve only failed files for retry', async () => {
    const authService = TestBed.inject(AuthService) as any;
    const documentService = TestBed.inject(DocumentService) as any;
    const snackBarOpen = vi
      .spyOn(component['snackBar'], 'open')
      .mockImplementation(() => undefined as any);
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const uploadedFile = new File(['ok'], 'uploaded.adi');
    const failedFile = new File(['bad'], 'failed.adi');

    authService.currentUser.mockReturnValue({ uid: 'user123' });
    documentService.getEventDocuments.mockReturnValue(of([]));
    documentService.uploadDocument.mockImplementation(
      (_clubId: string, _eventId: string, file: File) =>
        file === failedFile ? Promise.reject(new Error('Upload failed')) : Promise.resolve(),
    );
    component['selectedEvent'].set({
      event: { id: 'event123', clubId: 'club123' },
      club: { id: 'club123' },
    } as any);
    component['selectedFiles'].set([uploadedFile, failedFile]);

    await component['onUpload']();

    expect(documentService.uploadDocument).toHaveBeenCalledTimes(2);
    expect(component['selectedFiles']()).toEqual([failedFile]);
    expect(component['uploadOutcomes']()).toEqual([
      { filename: 'uploaded.adi', success: true },
      { filename: 'failed.adi', success: false },
    ]);
    expect(snackBarOpen).toHaveBeenCalledWith(
      'Uploaded 1 of 2 files. Failed files remain selected for retry: failed.adi',
      'Close',
      { duration: 7000 },
    );
    expect(documentService.getEventDocuments).toHaveBeenCalledWith('club123', 'event123');

    snackBarOpen.mockRestore();
    consoleError.mockRestore();
  });

  it('should report partial club upload results and preserve only failed files for retry', async () => {
    const authService = TestBed.inject(AuthService) as any;
    const documentService = TestBed.inject(DocumentService) as any;
    const snackBarOpen = vi
      .spyOn(component['snackBar'], 'open')
      .mockImplementation(() => undefined as any);
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const uploadedFile = new File(['ok'], 'uploaded.pdf', { type: 'application/pdf' });
    const failedFile = new File(['bad'], 'failed.pdf', { type: 'application/pdf' });

    authService.currentUser.mockReturnValue({ uid: 'user123' });
    documentService.getClubDocuments.mockReturnValue(of([]));
    documentService.uploadClubDocument.mockImplementation((_clubId: string, file: File) =>
      file === failedFile ? Promise.reject(new Error('Upload failed')) : Promise.resolve(),
    );
    component['selectedClub'].set({ id: 'club123' } as any);
    component['selectedClubFiles'].set([uploadedFile, failedFile]);

    await component['onClubUpload']();

    expect(documentService.uploadClubDocument).toHaveBeenCalledTimes(2);
    expect(component['selectedClubFiles']()).toEqual([failedFile]);
    expect(component['clubUploadOutcomes']()).toEqual([
      { filename: 'uploaded.pdf', success: true },
      { filename: 'failed.pdf', success: false },
    ]);
    expect(snackBarOpen).toHaveBeenCalledWith(
      'Uploaded 1 of 2 files. Failed files remain selected for retry: failed.pdf',
      'Close',
      { duration: 7000 },
    );
    expect(documentService.getClubDocuments).toHaveBeenCalledWith('club123');

    snackBarOpen.mockRestore();
    consoleError.mockRestore();
  });
});
