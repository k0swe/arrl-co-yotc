import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  DestroyRef,
  OnInit,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
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
import {
  Event as YotcEvent,
  EventLog,
} from '@arrl-co-yotc/shared/build/app/models/event.model';
import { Club } from '@arrl-co-yotc/shared/build/app/models/club.model';
import { catchError, forkJoin, of } from 'rxjs';
import { toDate } from '../utils/timestamp.util';

interface EventWithClub {
  event: YotcEvent;
  club: Club;
}

@Component({
  selector: 'app-upload',
  imports: [
    MatCardModule,
    MatButtonModule,
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
  private snackBar = inject(MatSnackBar);
  private destroyRef = inject(DestroyRef);

  protected readonly loading = signal(true);
  protected readonly uploading = signal(false);
  protected readonly rsvpedEvents = signal<EventWithClub[]>([]);
  protected readonly selectedEvent = signal<EventWithClub | null>(null);
  protected readonly selectedFiles = signal<File[]>([]);
  protected readonly existingDocuments = signal<EventLog[]>([]);
  protected readonly loadingDocuments = signal(false);

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
        // Filter events where user has RSVP'd
        this.filterRsvpedEvents(events, currentUser.uid);
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

  protected onEventSelect(eventWithClub: EventWithClub): void {
    this.selectedEvent.set(eventWithClub);
    this.selectedFiles.set([]);
    this.loadExistingDocuments(eventWithClub.event);
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

  protected onFileSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      this.selectedFiles.set(Array.from(input.files));
    }
  }

  protected async onUpload(): Promise<void> {
    const currentUser = this.authService.currentUser();
    const event = this.selectedEvent();
    const files = this.selectedFiles();

    if (!currentUser || !event || files.length === 0) {
      return;
    }

    this.uploading.set(true);

    try {
      for (const file of files) {
        await this.documentService.uploadDocument(
          event.event.clubId,
          event.event.id,
          file,
          currentUser.uid,
        );
      }

      this.snackBar.open('Files uploaded successfully!', 'Close', {
        duration: 3000,
      });

      this.selectedFiles.set([]);
      // Reload existing documents
      this.loadExistingDocuments(event.event);
    } catch (error) {
      console.error('Error uploading files:', error);
      this.snackBar.open('Error uploading files. Please try again.', 'Close', {
        duration: 5000,
      });
    } finally {
      this.uploading.set(false);
    }
  }

  protected readonly toDate = toDate;
}
