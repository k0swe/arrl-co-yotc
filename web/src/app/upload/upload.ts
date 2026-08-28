import {
  Component,
  ChangeDetectionStrategy,
  computed,
  inject,
  signal,
  DestroyRef,
  OnInit,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatListModule } from '@angular/material/list';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../auth/auth.service';
import { RsvpService } from '../services/rsvp.service';
import { EventService } from '../services/event.service';
import { ClubService } from '../services/club.service';
import { DocumentService } from '../services/document.service';
import { MembershipService } from '../services/membership.service';
import {
  Event as YotcEvent,
  EventLog,
  ClubDocument,
} from '@arrl-co-yotc/shared/build/app/models/event.model';
import { Club } from '@arrl-co-yotc/shared/build/app/models/club.model';
import { MembershipStatus } from '@arrl-co-yotc/shared/build/app/models/user.model';
import { catchError, forkJoin, of } from 'rxjs';
import { toDate } from '../utils/timestamp.util';

interface EventWithClub {
  event: YotcEvent;
  club: Club;
}

type UploadMode = 'event' | 'club';

interface UploadOutcome {
  filename: string;
  success: boolean;
}

interface SelectedDocumentFile {
  file: File;
  error: string | null;
}

const MAX_DOCUMENT_UPLOAD_SIZE_BYTES = 50 * 1024 * 1024;
const DOCUMENT_ACCEPT_TYPES = '.adi,.adif,.pdf,.doc,.docx,image/*,text/*';
const DOCUMENT_TYPE_DESCRIPTION =
  'ADIF logs (.adi or .adif), PDFs, Word documents, images, or text files';
const VALID_DOCUMENT_MIME_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

@Component({
  selector: 'app-upload',
  imports: [
    MatCardModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatIconModule,
    MatSelectModule,
    MatFormFieldModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatListModule,
    DatePipe,
    FormsModule,
  ],
  templateUrl: './upload.html',
  styleUrl: './upload.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Upload implements OnInit {
  private authService = inject(AuthService);
  private rsvpService = inject(RsvpService);
  private eventService = inject(EventService);
  private clubService = inject(ClubService);
  private documentService = inject(DocumentService);
  private membershipService = inject(MembershipService);
  private snackBar = inject(MatSnackBar);
  private destroyRef = inject(DestroyRef);

  protected readonly isAdmin = this.authService.isAdmin;
  protected readonly loading = signal(true);
  protected readonly uploading = signal(false);
  protected readonly uploadMode = signal<UploadMode>('event');

  // Event-upload state
  protected readonly rsvpedEvents = signal<EventWithClub[]>([]);
  protected readonly selectedEvent = signal<EventWithClub | null>(null);
  protected readonly selectedFiles = signal<File[]>([]);
  protected readonly uploadOutcomes = signal<UploadOutcome[]>([]);
  protected readonly selectedFileResults = computed(() =>
    this.selectedFiles().map((file) => ({
      file,
      error: this.getDocumentFileValidationError(file),
    })),
  );
  protected readonly selectedFileErrors = computed(() =>
    this.selectedFileResults().filter(
      (result): result is SelectedDocumentFile & { error: string } => result.error !== null,
    ),
  );
  protected readonly existingDocuments = signal<EventLog[]>([]);
  protected readonly loadingDocuments = signal(false);

  // Club-upload state
  protected readonly memberClubs = signal<Club[]>([]);
  protected readonly selectedClub = signal<Club | null>(null);
  protected readonly selectedClubFiles = signal<File[]>([]);
  protected readonly clubUploadOutcomes = signal<UploadOutcome[]>([]);
  protected readonly selectedClubFileResults = computed(() =>
    this.selectedClubFiles().map((file) => ({
      file,
      error: this.getDocumentFileValidationError(file),
    })),
  );
  protected readonly selectedClubFileErrors = computed(() =>
    this.selectedClubFileResults().filter(
      (result): result is SelectedDocumentFile & { error: string } => result.error !== null,
    ),
  );
  protected readonly existingClubDocuments = signal<ClubDocument[]>([]);
  protected readonly loadingClubDocuments = signal(false);
  protected readonly documentAcceptTypes = DOCUMENT_ACCEPT_TYPES;

  ngOnInit(): void {
    this.loadRsvpedEvents();
  }

  private loadRsvpedEvents(): void {
    const currentUser = this.authService.currentUser();
    if (!currentUser) {
      this.loading.set(false);
      return;
    }

    // Get all events
    this.eventService
      .getAllEvents()
      .pipe(
        catchError((error) => {
          console.error('Error loading events:', error);
          return of([]);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((events) => {
        // Admins can upload for any event; others are limited to events they RSVP'd to
        if (this.authService.isAdmin()) {
          this.loadClubsForEvents(events);
        } else {
          this.filterRsvpedEvents(events, currentUser.uid);
        }
      });
  }

  private filterRsvpedEvents(events: YotcEvent[], userId: string): void {
    const rsvpChecks = events.map((event) =>
      this.rsvpService.getUserRsvp(event.clubId, event.id, userId).pipe(
        catchError(() => of(null)),
      ),
    );

    forkJoin(rsvpChecks)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((rsvps) => {
        const eventsWithRsvp = events.filter((_, index) => rsvps[index] !== null);
        this.loadClubsForEvents(eventsWithRsvp);
      });
  }

  private loadClubsForEvents(events: YotcEvent[]): void {
    const uniqueClubIds = [...new Set(events.map((e) => e.clubId))];
    const clubObservables = uniqueClubIds.map((clubId) =>
      this.clubService.getClubById(clubId).pipe(catchError(() => of(null))),
    );

    forkJoin(clubObservables)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((clubs) => {
        const clubMap = new Map<string, Club>();
        clubs.forEach((club) => {
          if (club) {
            clubMap.set(club.id, club);
          }
        });

        const eventsWithClubs = events
          .map((event) => {
            const club = clubMap.get(event.clubId);
            return club ? { event, club } : null;
          })
          .filter((item): item is EventWithClub => item !== null);

        this.rsvpedEvents.set(eventsWithClubs);
        this.loading.set(false);
      });
  }

  private loadMemberClubs(): void {
    const currentUser = this.authService.currentUser();
    if (!currentUser) {
      return;
    }

    if (this.authService.isAdmin()) {
      this.clubService
        .getActiveClubs()
        .pipe(
          catchError((error) => {
            console.error('Error loading clubs:', error);
            return of([]);
          }),
          takeUntilDestroyed(this.destroyRef),
        )
        .subscribe((clubs) => {
          this.memberClubs.set(clubs);
        });
      return;
    }

    this.membershipService
      .getUserMemberships(currentUser.uid)
      .pipe(
        catchError((error) => {
          console.error('Error loading memberships:', error);
          return of([]);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((memberships) => {
        const activeMemberships = memberships.filter(
          (m) => m.status === MembershipStatus.Active,
        );
        if (activeMemberships.length === 0) {
          return;
        }

        const clubObservables = activeMemberships.map((m) =>
          this.clubService.getClubById(m.clubId).pipe(catchError(() => of(null))),
        );
        forkJoin(clubObservables)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe((clubs) => {
            this.memberClubs.set(clubs.filter((c): c is Club => c !== null));
          });
      });
  }

  protected onModeChange(newMode: UploadMode): void {
    this.uploadMode.set(newMode);
    this.selectedFiles.set([]);
    this.selectedClubFiles.set([]);
    this.uploadOutcomes.set([]);
    this.clubUploadOutcomes.set([]);
    if (newMode === 'club' && this.memberClubs().length === 0) {
      this.loadMemberClubs();
    }
  }

  protected onEventSelect(eventWithClub: EventWithClub): void {
    this.selectedEvent.set(eventWithClub);
    this.selectedFiles.set([]);
    this.uploadOutcomes.set([]);
    this.loadExistingDocuments(eventWithClub.event);
  }

  protected onClubSelect(club: Club): void {
    this.selectedClub.set(club);
    this.selectedClubFiles.set([]);
    this.clubUploadOutcomes.set([]);
    this.loadExistingClubDocuments(club.id);
  }

  private loadExistingDocuments(event: YotcEvent): void {
    this.loadingDocuments.set(true);
    this.documentService
      .getEventDocuments(event.clubId, event.id)
      .pipe(
        catchError((error) => {
          console.error('Error loading documents:', error);
          return of([]);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((documents) => {
        this.existingDocuments.set(documents);
        this.loadingDocuments.set(false);
      });
  }

  private loadExistingClubDocuments(clubId: string): void {
    this.loadingClubDocuments.set(true);
    this.documentService
      .getClubDocuments(clubId)
      .pipe(
        catchError((error) => {
          console.error('Error loading club documents:', error);
          return of([]);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((documents) => {
        this.existingClubDocuments.set(documents);
        this.loadingClubDocuments.set(false);
      });
  }

  protected onFileSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      this.selectedFiles.set(Array.from(input.files));
      this.uploadOutcomes.set([]);
    }
  }

  protected onClubFileSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      this.selectedClubFiles.set(Array.from(input.files));
      this.clubUploadOutcomes.set([]);
    }
  }

  private async uploadFiles(
    files: File[],
    uploadFile: (file: File) => Promise<void>,
  ): Promise<UploadOutcome[]> {
    const outcomes: UploadOutcome[] = [];

    for (const file of files) {
      try {
        await uploadFile(file);
        outcomes.push({ filename: file.name, success: true });
      } catch (error) {
        console.error(`Error uploading ${file.name}:`, error);
        outcomes.push({ filename: file.name, success: false });
      }
    }

    return outcomes;
  }

  private showUploadOutcome(outcomes: UploadOutcome[]): void {
    const uploadedCount = outcomes.filter((outcome) => outcome.success).length;
    const failedOutcomes = outcomes.filter((outcome) => !outcome.success);

    if (failedOutcomes.length === 0) {
      this.snackBar.open('Files uploaded successfully!', 'Close', {
        duration: 3000,
      });
      return;
    }

    const failedNames = failedOutcomes.map((outcome) => outcome.filename).join(', ');
    const message =
      uploadedCount > 0
        ? `Uploaded ${uploadedCount} of ${outcomes.length} files. Failed files remain selected for retry: ${failedNames}`
        : `No files uploaded. Failed files remain selected for retry: ${failedNames}`;

    this.snackBar.open(message, 'Close', {
      duration: 7000,
    });
  }

  protected formatFileSize(file: File): string {
    return `${(file.size / 1024).toFixed(2)} KB`;
  }

  private getDocumentFileValidationError(file: File): string | null {
    if (file.size >= MAX_DOCUMENT_UPLOAD_SIZE_BYTES) {
      return 'File must be smaller than 50 MB.';
    }

    if (!this.isValidDocumentFileType(file)) {
      return `Unsupported file type. Upload ${DOCUMENT_TYPE_DESCRIPTION}.`;
    }

    return null;
  }

  private isValidDocumentFileType(file: File): boolean {
    if (file.name.match(/\.(adi|adif)$/)) {
      return true;
    }

    return (
      file.type.startsWith('image/') ||
      file.type.startsWith('text/') ||
      VALID_DOCUMENT_MIME_TYPES.has(file.type)
    );
  }

  private hasInvalidFiles(invalidFiles: SelectedDocumentFile[]): boolean {
    if (invalidFiles.length === 0) {
      return false;
    }

    this.snackBar.open('Remove invalid files before uploading.', 'Close', {
      duration: 5000,
    });
    return true;
  }

  protected async onUpload(): Promise<void> {
    const currentUser = this.authService.currentUser();
    const event = this.selectedEvent();
    const files = this.selectedFiles();

    if (!currentUser || !event || files.length === 0) {
      return;
    }

    if (this.hasInvalidFiles(this.selectedFileErrors())) {
      return;
    }

    this.uploading.set(true);

    try {
      const outcomes = await this.uploadFiles(files, (file) =>
        this.documentService.uploadDocument(
          event.event.clubId,
          event.event.id,
          file,
          currentUser.uid,
        ),
      );
      const failedFiles = files.filter((_, index) => !outcomes[index].success);

      this.uploadOutcomes.set(outcomes);
      this.selectedFiles.set(failedFiles);
      this.showUploadOutcome(outcomes);

      if (failedFiles.length < files.length) {
        this.loadExistingDocuments(event.event);
      }
    } finally {
      this.uploading.set(false);
    }
  }

  protected async onClubUpload(): Promise<void> {
    const currentUser = this.authService.currentUser();
    const club = this.selectedClub();
    const files = this.selectedClubFiles();

    if (!currentUser || !club || files.length === 0) {
      return;
    }

    if (this.hasInvalidFiles(this.selectedClubFileErrors())) {
      return;
    }

    this.uploading.set(true);

    try {
      const outcomes = await this.uploadFiles(files, (file) =>
        this.documentService.uploadClubDocument(club.id, file, currentUser.uid),
      );
      const failedFiles = files.filter((_, index) => !outcomes[index].success);

      this.clubUploadOutcomes.set(outcomes);
      this.selectedClubFiles.set(failedFiles);
      this.showUploadOutcome(outcomes);

      if (failedFiles.length < files.length) {
        this.loadExistingClubDocuments(club.id);
      }
    } finally {
      this.uploading.set(false);
    }
  }

  protected readonly toDate = toDate;
}
