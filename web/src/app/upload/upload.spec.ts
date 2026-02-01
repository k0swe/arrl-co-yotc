import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Upload } from './upload';
import { AuthService } from '../auth/auth.service';
import { RsvpService } from '../services/rsvp.service';
import { EventService } from '../services/event.service';
import { ClubService } from '../services/club.service';
import { DocumentService } from '../services/document.service';
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
    };
    const rsvpServiceMock = {
      getUserRsvp: vi.fn(),
    };
    const eventServiceMock = {
      getAllEvents: vi.fn(),
    };
    const clubServiceMock = {
      getClubById: vi.fn(),
    };
    const documentServiceMock = {
      getEventDocuments: vi.fn(),
      uploadDocument: vi.fn(),
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
});
