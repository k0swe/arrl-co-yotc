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
  let authServiceMock: { currentUser: ReturnType<typeof vi.fn>; isAdmin: ReturnType<typeof vi.fn> };
  let documentServiceMock: {
    getEventDocuments: ReturnType<typeof vi.fn>;
    uploadDocument: ReturnType<typeof vi.fn>;
    getClubDocuments: ReturnType<typeof vi.fn>;
    uploadClubDocument: ReturnType<typeof vi.fn>;
  };
  let snackBarMock: { open: ReturnType<typeof vi.fn> };

  function createFile(name: string, type: string, size = 1): File {
    const file = new File(['x'], name, { type });
    Object.defineProperty(file, 'size', { value: size });
    return file;
  }

  beforeEach(async () => {
    authServiceMock = {
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
    documentServiceMock = {
      getEventDocuments: vi.fn(),
      uploadDocument: vi.fn(),
      getClubDocuments: vi.fn(),
      uploadClubDocument: vi.fn(),
    };
    const membershipServiceMock = {
      getUserMemberships: vi.fn().mockReturnValue(of([])),
    };
    snackBarMock = {
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

  it('should validate selected event files before upload', () => {
    const tooLargePdf = createFile('large.pdf', 'application/pdf', 50 * 1024 * 1024);
    const unsupportedFile = createFile('archive.zip', 'application/zip');

    component['selectedFiles'].set([
      createFile('log.adi', 'application/octet-stream'),
      createFile('report.pdf', 'application/pdf'),
      createFile('photo.webp', 'image/webp'),
      createFile('notes.txt', 'text/plain'),
      createFile(
        'document.docx',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ),
      tooLargePdf,
      unsupportedFile,
    ]);

    const results = component['selectedFileResults']();

    expect(results.slice(0, 5).every((result) => result.error === null)).toBe(true);
    expect(results.find((result) => result.file === tooLargePdf)?.error).toContain(
      'smaller than 50 MB',
    );
    expect(results.find((result) => result.file === unsupportedFile)?.error).toContain(
      'Unsupported file type',
    );
    expect(component['selectedFileErrors']()).toHaveLength(2);
  });

  it('should not upload invalid event files', async () => {
    const authService = component['authService'] as any;
    const snackBar = component['snackBar'] as any;
    const openSpy = vi.spyOn(snackBar, 'open').mockReturnValue(undefined);

    authService.currentUser.mockReturnValue({ uid: 'user123' });
    documentServiceMock.uploadDocument.mockResolvedValue(undefined);
    component['selectedEvent'].set({
      event: { id: 'event123', clubId: 'club123' },
      club: { id: 'club123' },
    } as any);
    component['selectedFiles'].set([createFile('archive.zip', 'application/zip')]);

    expect(component['selectedFileErrors']()).toHaveLength(1);

    await component['onUpload']();

    expect(documentServiceMock.uploadDocument).not.toHaveBeenCalled();
    expect(openSpy).toHaveBeenCalledWith('Remove invalid files before uploading.', 'Close', {
      duration: 5000,
    });
  });

  it('should report partial event upload results and preserve only failed files for retry', async () => {
    const snackBar = component['snackBar'] as any;
    const openSpy = vi.spyOn(snackBar, 'open').mockReturnValue(undefined);
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const uploadedFile = createFile('uploaded.adi', 'application/octet-stream');
    const failedFile = createFile('failed.adi', 'application/octet-stream');

    authServiceMock.currentUser.mockReturnValue({ uid: 'user123' });
    documentServiceMock.getEventDocuments.mockReturnValue(of([]));
    documentServiceMock.uploadDocument.mockImplementation(
      (_clubId: string, _eventId: string, file: File) =>
        file === failedFile ? Promise.reject(new Error('Upload failed')) : Promise.resolve(),
    );
    component['selectedEvent'].set({
      event: { id: 'event123', clubId: 'club123' },
      club: { id: 'club123' },
    } as any);
    component['selectedFiles'].set([uploadedFile, failedFile]);

    await component['onUpload']();

    expect(documentServiceMock.uploadDocument).toHaveBeenCalledTimes(2);
    expect(component['selectedFiles']()).toEqual([failedFile]);
    expect(component['uploadOutcomes']()).toEqual([
      { filename: 'uploaded.adi', success: true },
      { filename: 'failed.adi', success: false },
    ]);
    expect(openSpy).toHaveBeenCalledWith(
      'Uploaded 1 of 2 files. Failed files remain selected for retry: failed.adi',
      'Close',
      { duration: 7000 },
    );
    expect(documentServiceMock.getEventDocuments).toHaveBeenCalledWith('club123', 'event123');

    consoleError.mockRestore();
  });

  it('should not upload invalid club files', async () => {
    const authService = component['authService'] as any;
    const snackBar = component['snackBar'] as any;
    const openSpy = vi.spyOn(snackBar, 'open').mockReturnValue(undefined);

    authService.currentUser.mockReturnValue({ uid: 'user123' });
    documentServiceMock.uploadClubDocument.mockResolvedValue(undefined);
    component['selectedClub'].set({ id: 'club123' } as any);
    component['selectedClubFiles'].set([
      createFile('large.pdf', 'application/pdf', 50 * 1024 * 1024),
    ]);

    expect(component['selectedClubFileErrors']()).toHaveLength(1);

    await component['onClubUpload']();

    expect(documentServiceMock.uploadClubDocument).not.toHaveBeenCalled();
    expect(openSpy).toHaveBeenCalledWith('Remove invalid files before uploading.', 'Close', {
      duration: 5000,
    });
  });

  it('should report partial club upload results and preserve only failed files for retry', async () => {
    const snackBar = component['snackBar'] as any;
    const openSpy = vi.spyOn(snackBar, 'open').mockReturnValue(undefined);
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const uploadedFile = createFile('uploaded.pdf', 'application/pdf');
    const failedFile = createFile('failed.pdf', 'application/pdf');

    authServiceMock.currentUser.mockReturnValue({ uid: 'user123' });
    documentServiceMock.getClubDocuments.mockReturnValue(of([]));
    documentServiceMock.uploadClubDocument.mockImplementation((_clubId: string, file: File) =>
      file === failedFile ? Promise.reject(new Error('Upload failed')) : Promise.resolve(),
    );
    component['selectedClub'].set({ id: 'club123' } as any);
    component['selectedClubFiles'].set([uploadedFile, failedFile]);

    await component['onClubUpload']();

    expect(documentServiceMock.uploadClubDocument).toHaveBeenCalledTimes(2);
    expect(component['selectedClubFiles']()).toEqual([failedFile]);
    expect(component['clubUploadOutcomes']()).toEqual([
      { filename: 'uploaded.pdf', success: true },
      { filename: 'failed.pdf', success: false },
    ]);
    expect(openSpy).toHaveBeenCalledWith(
      'Uploaded 1 of 2 files. Failed files remain selected for retry: failed.pdf',
      'Close',
      { duration: 7000 },
    );
    expect(documentServiceMock.getClubDocuments).toHaveBeenCalledWith('club123');

    consoleError.mockRestore();
  });
});
