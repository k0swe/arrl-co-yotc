import {
  Component,
  ChangeDetectionStrategy,
  input,
  inject,
  signal,
  DestroyRef,
  effect,
  computed,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DatePipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { EventService } from '../../../services/event.service';
import { RsvpService } from '../../../services/rsvp.service';
import { MembershipService } from '../../../services/membership.service';
import { UserService } from '../../../services/user.service';
import { AuthService } from '../../../auth/auth.service';
import { Event, EventRsvp } from '@arrl-co-yotc/shared/build/app/models/event.model';
import { MembershipStatus } from '@arrl-co-yotc/shared/build/app/models/user.model';
import { EditEventDialog, EventFormData } from '../edit-event-dialog/edit-event-dialog';
import { ConfirmDialog } from '../confirm-dialog/confirm-dialog';
import { catchError, of, forkJoin } from 'rxjs';

@Component({
  selector: 'app-event-list',
  imports: [
    DatePipe,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatDialogModule,
    MatChipsModule,
    MatTooltipModule,
  ],
  templateUrl: './event-list.html',
  styleUrl: './event-list.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EventList {
  private eventService = inject(EventService);
  private rsvpService = inject(RsvpService);
  private membershipService = inject(MembershipService);
  private userService = inject(UserService);
  private authService = inject(AuthService);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);
  private destroyRef = inject(DestroyRef);

  /**
   * The ID of the club whose events should be displayed
   */
  clubId = input.required<string>();

  /**
   * Whether the current user can edit events for this club
   */
  canEdit = input.required<boolean>();

  protected readonly loading = signal(true);
  protected readonly events = signal<Event[]>([]);
  protected readonly displayedColumns = ['name', 'startTime', 'endTime', 'rsvp', 'attendees', 'actions'];

  // Map of eventId to array of RSVPs
  protected readonly eventRsvps = signal<Map<string, EventRsvp[]>>(new Map());
  
  // Map of eventId to whether current user has RSVP'd
  protected readonly userRsvps = signal<Map<string, boolean>>(new Map());
  
  // Map of userId to user name/callsign for display
  protected readonly userNames = signal<Map<string, string>>(new Map());

  // Current user's membership status in this club
  protected readonly userMembershipStatus = signal<MembershipStatus | null>(null);

  /**
   * Computed signal that determines if the current user can RSVP to events.
   * Users can RSVP if they are active members of the club.
   */
  protected readonly canRsvp = computed(() => {
    return this.userMembershipStatus() === MembershipStatus.Active;
  });

  constructor() {
    // Use effect to reload events and membership when clubId changes
    effect(() => {
      const id = this.clubId();
      if (id) {
        this.loadUserMembership();
        this.loadEvents();
      }
    });
  }

  private loadUserMembership(): void {
    const currentUser = this.authService.currentUser();
    if (!currentUser) {
      this.userMembershipStatus.set(null);
      return;
    }

    const clubId = this.clubId();
    this.membershipService
      .checkExistingMembership(currentUser.uid, clubId)
      .pipe(
        catchError((error) => {
          console.error('Error loading user membership:', error);
          return of(null);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((membership) => {
        this.userMembershipStatus.set(membership?.status || null);
      });
  }

  private loadEvents(): void {
    this.loading.set(true);
    const clubId = this.clubId();

    this.eventService
      .getClubEvents(clubId)
      .pipe(
        catchError((error) => {
          console.error('Error loading events:', error);
          this.snackBar.open('Failed to load events', 'Close', {
            duration: 3000,
          });
          return of([]);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((events) => {
        this.events.set(events);
        // Load RSVPs for all events
        events.forEach((event) => {
          this.loadEventRsvps(event.id);
        });
        this.loading.set(false);
      });
  }

  private loadEventRsvps(eventId: string): void {
    const clubId = this.clubId();
    const currentUser = this.authService.currentUser();

    this.rsvpService
      .getEventRsvps(clubId, eventId)
      .pipe(
        catchError((error) => {
          console.error(`Error loading RSVPs for event ${eventId}:`, error);
          return of([]);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((rsvps) => {
        // Update the map of event RSVPs
        const currentMap = new Map(this.eventRsvps());
        currentMap.set(eventId, rsvps);
        this.eventRsvps.set(currentMap);

        // Check if current user has RSVP'd
        if (currentUser) {
          const hasRsvp = rsvps.some((rsvp) => rsvp.userId === currentUser.uid);
          const userRsvpMap = new Map(this.userRsvps());
          userRsvpMap.set(eventId, hasRsvp);
          this.userRsvps.set(userRsvpMap);
        }

        // Load user names for display
        const userIds = rsvps.map((rsvp) => rsvp.userId);
        this.loadUserNames(userIds);
      });
  }

  private loadUserNames(userIds: string[]): void {
    const currentNames = this.userNames();
    const missingUserIds = userIds.filter((id) => !currentNames.has(id));

    if (missingUserIds.length === 0) {
      return;
    }

    // Load all missing user names
    const userObservables = missingUserIds.map((userId) =>
      this.userService.getUser(userId).pipe(
        catchError(() => of(null)),
      ),
    );

    forkJoin(userObservables)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((users) => {
        const updatedNames = new Map(currentNames);
        users.forEach((user, index) => {
          if (user) {
            updatedNames.set(missingUserIds[index], `${user.name} (${user.callsign})`);
          }
        });
        this.userNames.set(updatedNames);
      });
  }

  protected toggleRsvp(event: Event): void {
    const currentUser = this.authService.currentUser();
    if (!currentUser) {
      this.snackBar.open('You must be logged in to RSVP', 'Close', {
        duration: 3000,
      });
      return;
    }

    if (!this.canRsvp()) {
      this.snackBar.open('You must be an active member to RSVP', 'Close', {
        duration: 3000,
      });
      return;
    }

    const clubId = this.clubId();
    const hasRsvp = this.userRsvps().get(event.id) || false;

    const operation = hasRsvp
      ? this.rsvpService.deleteRsvp(clubId, event.id, currentUser.uid)
      : this.rsvpService.createRsvp(clubId, event.id, currentUser.uid);

    operation.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        const message = hasRsvp ? 'RSVP removed' : 'RSVP added';
        this.snackBar.open(message, 'Close', { duration: 3000 });
        // Reload RSVPs for this event
        this.loadEventRsvps(event.id);
      },
      error: (error) => {
        console.error('Error toggling RSVP:', error);
        this.snackBar.open('Failed to update RSVP', 'Close', { duration: 3000 });
      },
    });
  }

  protected getAttendeeNames(eventId: string): string[] {
    const rsvps = this.eventRsvps().get(eventId) || [];
    const names = this.userNames();
    return rsvps.map((rsvp) => names.get(rsvp.userId) || 'Loading...').filter((name) => name !== 'Loading...');
  }

  protected getAttendeeCount(eventId: string): number {
    return (this.eventRsvps().get(eventId) || []).length;
  }

  protected openAddDialog(): void {
    const clubId = this.clubId();
    const dialogRef = this.dialog.open(EditEventDialog, {
      width: '600px',
      data: { clubId },
    });

    dialogRef
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result: EventFormData | undefined) => {
        if (result) {
          const currentUser = this.authService.currentUser();
          if (!currentUser) {
            this.snackBar.open('You must be logged in to add events', 'Close', {
              duration: 3000,
            });
            return;
          }

          this.eventService
            .createEvent(clubId, result, currentUser.uid)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
              next: () => {
                this.snackBar.open('Event added successfully!', 'Close', {
                  duration: 3000,
                });
                this.loadEvents();
              },
              error: (error) => {
                console.error('Error adding event:', error);
                this.snackBar.open('Failed to add event', 'Close', { duration: 3000 });
              },
            });
        }
      });
  }

  protected openEditDialog(event: Event): void {
    const clubId = this.clubId();
    const dialogRef = this.dialog.open(EditEventDialog, {
      width: '600px',
      data: { clubId, event },
    });

    dialogRef
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result: EventFormData | undefined) => {
        if (result) {
          this.eventService
            .updateEvent(clubId, event.id, result)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
              next: () => {
                this.snackBar.open('Event updated successfully!', 'Close', {
                  duration: 3000,
                });
                this.loadEvents();
              },
              error: (error) => {
                console.error('Error updating event:', error);
                this.snackBar.open('Failed to update event', 'Close', { duration: 3000 });
              },
            });
        }
      });
  }

  protected deleteEvent(event: Event): void {
    const dialogRef = this.dialog.open(ConfirmDialog, {
      width: '400px',
      data: {
        title: 'Delete Event',
        message: `Are you sure you want to delete "${event.name}"?`,
        confirmText: 'Delete',
        cancelText: 'Cancel',
      },
    });

    dialogRef
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((confirmed: boolean) => {
        if (!confirmed) {
          return;
        }

        const clubId = this.clubId();
        this.eventService
          .deleteEvent(clubId, event.id)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: () => {
              this.snackBar.open('Event deleted successfully!', 'Close', {
                duration: 3000,
              });
              this.loadEvents();
            },
            error: (error) => {
              console.error('Error deleting event:', error);
              this.snackBar.open('Failed to delete event', 'Close', { duration: 3000 });
            },
          });
      });
  }

  /**
   * Convert Firestore Timestamp to Date for display
   */
  protected toDate(timestamp: Date | { toDate(): Date } | string | null | undefined): Date | null {
    if (!timestamp) {
      return null;
    }
    if (timestamp instanceof Date) {
      return timestamp;
    }
    if (typeof timestamp === 'object' && 'toDate' in timestamp && typeof timestamp.toDate === 'function') {
      return timestamp.toDate();
    }
    if (typeof timestamp === 'string') {
      const date = new Date(timestamp);
      return isNaN(date.getTime()) ? null : date;
    }
    return null;
  }
}
