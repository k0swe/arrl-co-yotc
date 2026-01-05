import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  DestroyRef,
  effect,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DatePipe } from '@angular/common';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatListModule } from '@angular/material/list';
import { MatDividerModule } from '@angular/material/divider';
import { Event, EventRsvp } from '@arrl-co-yotc/shared/build/app/models/event.model';
import { Club } from '@arrl-co-yotc/shared/build/app/models/club.model';
import { MembershipStatus } from '@arrl-co-yotc/shared/build/app/models/user.model';
import { RsvpService } from '../../services/rsvp.service';
import { MembershipService } from '../../services/membership.service';
import { UserService } from '../../services/user.service';
import { AuthService } from '../../auth/auth.service';
import { catchError, forkJoin, of } from 'rxjs';

export interface EventDetailDialogData {
  event: Event;
  club: Club;
}

@Component({
  selector: 'app-event-detail-dialog',
  imports: [
    DatePipe,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatListModule,
    MatDividerModule,
  ],
  templateUrl: './event-detail-dialog.html',
  styleUrl: './event-detail-dialog.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EventDetailDialog {
  private dialogRef = inject(MatDialogRef<EventDetailDialog>);
  private rsvpService = inject(RsvpService);
  private membershipService = inject(MembershipService);
  private userService = inject(UserService);
  private authService = inject(AuthService);
  private destroyRef = inject(DestroyRef);

  protected data = inject<EventDetailDialogData>(MAT_DIALOG_DATA);

  protected readonly loadingRsvps = signal(true);
  protected readonly rsvps = signal<EventRsvp[]>([]);
  protected readonly userNames = signal<Map<string, string>>(new Map());
  protected readonly canViewRsvps = signal(false);

  constructor() {
    effect(() => {
      this.checkPermissionsAndLoadRsvps();
    });
  }

  private checkPermissionsAndLoadRsvps(): void {
    const currentUser = this.authService.currentUser();
    const isAdmin = this.authService.isAdmin();

    if (!currentUser) {
      this.canViewRsvps.set(false);
      this.loadingRsvps.set(false);
      return;
    }

    // Admins can always view RSVPs
    if (isAdmin) {
      this.canViewRsvps.set(true);
      this.loadRsvps();
      return;
    }

    // Check if user is a member of the club
    this.membershipService
      .checkExistingMembership(currentUser.uid, this.data.event.clubId)
      .pipe(
        catchError((error) => {
          console.error('Error checking membership:', error);
          return of(null);
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((membership) => {
        const isMember = membership?.status === MembershipStatus.Active;
        this.canViewRsvps.set(isMember);
        if (isMember) {
          this.loadRsvps();
        } else {
          this.loadingRsvps.set(false);
        }
      });
  }

  private loadRsvps(): void {
    this.loadingRsvps.set(true);

    this.rsvpService
      .getEventRsvps(this.data.event.clubId, this.data.event.id)
      .pipe(
        catchError((error) => {
          console.error('Error loading RSVPs:', error);
          return of([]);
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((rsvps) => {
        this.rsvps.set(rsvps);
        this.loadUserNames(rsvps.map((rsvp) => rsvp.userId));
        this.loadingRsvps.set(false);
      });
  }

  private loadUserNames(userIds: string[]): void {
    if (userIds.length === 0) {
      return;
    }

    const userObservables = userIds.map((userId) =>
      this.userService.getUser(userId).pipe(catchError(() => of(null)))
    );

    forkJoin(userObservables)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((users) => {
        const namesMap = new Map<string, string>();
        users.forEach((user, index) => {
          if (user) {
            namesMap.set(userIds[index], `${user.name} (${user.callsign})`);
          }
        });
        this.userNames.set(namesMap);
      });
  }

  protected onClose(): void {
    this.dialogRef.close();
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
    if (
      typeof timestamp === 'object' &&
      'toDate' in timestamp &&
      typeof timestamp.toDate === 'function'
    ) {
      return timestamp.toDate();
    }
    if (typeof timestamp === 'string') {
      const date = new Date(timestamp);
      return isNaN(date.getTime()) ? null : date;
    }
    return null;
  }
}
