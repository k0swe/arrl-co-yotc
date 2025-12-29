import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  signal,
  effect,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { ClubService } from '../services/club.service';
import { MembershipService } from '../services/membership.service';
import { AuthService } from '../auth/auth.service';
import { Club } from '@arrl-co-yotc/shared/build/app/models/club.model';
import { MembershipStatus } from '@arrl-co-yotc/shared/build/app/models/user.model';
import { AddClubDialog } from './add-club-dialog/add-club-dialog';
import { of, forkJoin, Subscription } from 'rxjs';
import { catchError } from 'rxjs/operators';

interface ClubWithMembership extends Club {
  membershipStatus?: MembershipStatus;
  isApplying?: boolean;
}

@Component({
  selector: 'app-clubs',
  imports: [
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    MatSnackBarModule,
  ],
  templateUrl: './clubs.html',
  styleUrl: './clubs.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Clubs {
  private clubService = inject(ClubService);
  private membershipService = inject(MembershipService);
  private authService = inject(AuthService);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);
  private destroyRef = inject(DestroyRef);

  protected readonly loading = signal(true);
  protected readonly clubs = signal<ClubWithMembership[]>([]);
  protected readonly isAuthenticated = this.authService.isAuthenticated;
  protected readonly MembershipStatus = MembershipStatus;

  private clubsSubscription?: Subscription;
  private loadingMemberships = false;

  constructor() {
    // Use effect to react to authentication state changes
    effect(() => {
      // This effect will run whenever the authentication state changes
      const user = this.authService.currentUser();
      const isAuthenticated = this.authService.isAuthenticated();

      // Only load clubs if we have a definitive auth state to prevent duplicate loading
      // On page refresh: first call with user=null, then call with actual user
      // We want to wait for the definitive state
      if (user !== undefined) {
        this.loadClubs();
      }
    });
  }

  private loadClubs(): void {
    // Cancel any existing subscription to prevent concurrent calls
    if (this.clubsSubscription) {
      this.clubsSubscription.unsubscribe();
    }

    this.loading.set(true);
    const currentUser = this.authService.currentUser();

    // Get clubs
    this.clubsSubscription = this.clubService
      .getActiveClubs()
      .pipe(
        catchError(() => {
          this.loading.set(false);
          this.showSnackBar('Failed to load clubs');
          return of([]);
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((clubs) => {
        const currentUserInCallback = this.authService.currentUser();

        if (currentUserInCallback) {
          // If user is authenticated, check membership for each club individually
          this.loadMembershipsForClubs(clubs, currentUserInCallback.uid);
        } else {
          this.clubs.set(clubs);
          this.loading.set(false);
        }
      });
  }

  private loadMembershipsForClubs(clubs: Club[], userId: string): void {
    // Prevent concurrent membership loading
    if (this.loadingMemberships) {
      return;
    }

    this.loadingMemberships = true;

    if (clubs.length === 0) {
      this.clubs.set([]);
      this.loading.set(false);
      this.loadingMemberships = false;
      return;
    }

    // Check membership for each club individually using direct document reads
    // This is more reliable than collectionGroup queries with security rules
    const membershipChecks = clubs.map((club) =>
      this.membershipService.checkExistingMembership(userId, club.id).pipe(
        catchError((error) => {
          console.error(`Error checking membership for club ${club.id}:`, error);
          return of(null);
        })
      )
    );

    // Use forkJoin to wait for all membership checks to complete
    forkJoin(membershipChecks)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (memberships) => {
          const clubsWithMemberships = clubs.map((club, index) => {
            const membership = memberships[index];
            const membershipStatus = membership?.status;
            const result = {
              ...club,
              membershipStatus: membershipStatus,
              isApplying: false,
            };
            return result;
          });
          this.clubs.set(clubsWithMemberships);
          this.loading.set(false);
          this.loadingMemberships = false;
        },
        error: (error) => {
          console.error('Error in forkJoin:', error);
          this.clubs.set(clubs); // Set clubs without membership status
          this.loading.set(false);
          this.loadingMemberships = false;
        },
      });
  }

  private showSnackBar(message: string, action: string = 'Close'): void {
    try {
      this.snackBar.open(message, action, { duration: 3000 });
    } catch {
      // Silently handle if injector is destroyed
    }
  }

  protected applyForMembership(club: ClubWithMembership): void {
    const currentUser = this.authService.currentUser();
    if (!currentUser) {
      this.showSnackBar('Please sign in to confirm your membership');
      return;
    }

    // Set applying state for this club
    const clubIndex = this.clubs().findIndex((c) => c.id === club.id);
    if (clubIndex !== -1) {
      const updatedClubs = [...this.clubs()];
      updatedClubs[clubIndex] = { ...updatedClubs[clubIndex], isApplying: true };
      this.clubs.set(updatedClubs);
    }

    this.membershipService
      .applyForMembership(currentUser.uid, club.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          // Update the club's membership status
          const updatedClubs = this.clubs().map((c) =>
            c.id === club.id
              ? { ...c, membershipStatus: MembershipStatus.Pending, isApplying: false }
              : c
          );
          this.clubs.set(updatedClubs);
          this.showSnackBar('Membership confirmation submitted!');
        },
        error: (error) => {
          // Reset applying state
          const updatedClubs = this.clubs().map((c) =>
            c.id === club.id ? { ...c, isApplying: false } : c
          );
          this.clubs.set(updatedClubs);
          console.error('Error applying for membership:', error);
          this.showSnackBar('Failed to submit confirmation');
        },
      });
  }

  protected canApply(club: ClubWithMembership): boolean {
    return this.isAuthenticated() && !club.membershipStatus;
  }

  protected getMembershipStatusText(status: MembershipStatus): string {
    switch (status) {
      case MembershipStatus.Pending:
        return 'Confirmation Pending';
      case MembershipStatus.Active:
        return 'Confirmed Member';
      case MembershipStatus.Denied:
        return 'Confirmation Denied';
      case MembershipStatus.Inactive:
        return 'Membership Inactive';
      default:
        return '';
    }
  }

  protected getMembershipStatusColor(status: MembershipStatus): string {
    switch (status) {
      case MembershipStatus.Pending:
        return 'accent';
      case MembershipStatus.Active:
        return 'primary';
      case MembershipStatus.Denied:
      case MembershipStatus.Inactive:
        return 'warn';
      default:
        return '';
    }
  }

  protected openAddClubDialog(): void {
    const currentUser = this.authService.currentUser();
    if (!currentUser) {
      this.showSnackBar('Please sign in to suggest a new club');
      return;
    }

    const dialogRef = this.dialog.open(AddClubDialog, {
      width: '600px',
      maxWidth: '90vw',
      disableClose: false,
    });

    dialogRef
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result: Partial<Club> | undefined) => {
        if (result) {
          this.clubService
            .suggestClub(result, currentUser.uid)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
              next: () => {
                this.showSnackBar('Club submitted successfully and is pending approval!');
              },
              error: (error) => {
                console.error('Error submitting club suggestion:', error);
                this.showSnackBar('Failed to submit club suggestion');
              },
            });
        }
      });
  }
}
