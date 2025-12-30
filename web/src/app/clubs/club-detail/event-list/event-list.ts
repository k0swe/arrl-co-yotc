import {
  Component,
  ChangeDetectionStrategy,
  input,
  inject,
  signal,
  DestroyRef,
  effect,
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
import { EventService } from '../../../services/event.service';
import { AuthService } from '../../../auth/auth.service';
import { Event } from '@arrl-co-yotc/shared/build/app/models/event.model';
import { EditEventDialog, EventFormData } from '../edit-event-dialog/edit-event-dialog';
import { catchError, of } from 'rxjs';

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
  ],
  templateUrl: './event-list.html',
  styleUrl: './event-list.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EventList {
  private eventService = inject(EventService);
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
  protected readonly displayedColumns = ['name', 'startTime', 'endTime', 'actions'];

  constructor() {
    // Use effect to reload events when clubId changes
    effect(() => {
      const id = this.clubId();
      if (id) {
        this.loadEvents();
      }
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
        this.loading.set(false);
      });
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
    if (!confirm(`Are you sure you want to delete "${event.name}"?`)) {
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
