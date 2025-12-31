import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DatePipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatDividerModule } from '@angular/material/divider';
import { EventService } from '../services/event.service';
import { ClubService } from '../services/club.service';
import { Event } from '@arrl-co-yotc/shared/build/app/models/event.model';
import { Club } from '@arrl-co-yotc/shared/build/app/models/club.model';
import { catchError, forkJoin, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';

interface EventWithClub extends Event {
  club?: Club;
}

@Component({
  selector: 'app-events',
  imports: [
    DatePipe,
    MatCardModule,
    MatProgressSpinnerModule,
    MatIconModule,
    MatListModule,
    MatDividerModule,
  ],
  templateUrl: './events.html',
  styleUrl: './events.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Events {
  private eventService = inject(EventService);
  private clubService = inject(ClubService);
  private destroyRef = inject(DestroyRef);

  protected readonly loading = signal(true);
  protected readonly events = signal<EventWithClub[]>([]);

  constructor() {
    this.loadEvents();
  }

  private loadEvents(): void {
    this.loading.set(true);

    this.eventService
      .getAllEvents()
      .pipe(
        switchMap((events) => {
          // If no events, return empty array
          if (events.length === 0) {
            return of([]);
          }

          // Get unique club IDs
          const clubIds = [...new Set(events.map((event) => event.clubId))];
          
          // Fetch all club details
          const clubRequests = clubIds.map((clubId) =>
            this.clubService.getClubById(clubId).pipe(
              catchError(() => of(null))
            )
          );

          // Wait for all club details to load, then combine with events
          return forkJoin(clubRequests).pipe(
            map((clubs) => {
              // Create a map of club ID to club object
              const clubMap = new Map<string, Club | null>();
              clubIds.forEach((id, index) => {
                clubMap.set(id, clubs[index]);
              });

              // Combine events with their club information
              return events.map((event) => ({
                ...event,
                club: clubMap.get(event.clubId) || undefined,
              }));
            })
          );
        }),
        catchError((error) => {
          console.error('Error loading events:', error);
          return of([]);
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((eventsWithClubs) => {
        this.events.set(eventsWithClubs);
        this.loading.set(false);
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
