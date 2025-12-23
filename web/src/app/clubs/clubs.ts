import { Component, ChangeDetectionStrategy, signal, inject, computed } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ClubService } from '../services/club.service';
import { MembershipService } from '../services/membership.service';
import { AuthService } from '../auth/auth.service';
import { Club } from '../../../../src/app/models/club.model';
import { ClubMembership, MembershipStatus } from '../../../../src/app/models/user.model';
import { forkJoin, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

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
    MatSnackBarModule
  ],
  templateUrl: './clubs.html',
  styleUrl: './clubs.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Clubs {
  private clubService = inject(ClubService);
  private membershipService = inject(MembershipService);
  private authService = inject(AuthService);
  private snackBar = inject(MatSnackBar);

  protected readonly loading = signal(true);
  protected readonly clubs = signal<ClubWithMembership[]>([]);
  protected readonly userMemberships = signal<ClubMembership[]>([]);
  protected readonly isAuthenticated = this.authService.isAuthenticated;
  protected readonly MembershipStatus = MembershipStatus;

  constructor() {
    this.loadClubs();
  }

  private loadClubs(): void {
    this.loading.set(true);
    const currentUser = this.authService.currentUser();
    
    // Get clubs
    this.clubService.getActiveClubs().pipe(
      catchError(() => {
        this.loading.set(false);
        this.snackBar.open('Failed to load clubs', 'Close', { duration: 3000 });
        return of([]);
      })
    ).subscribe(clubs => {
      if (currentUser) {
        // If user is authenticated, also get their memberships
        this.membershipService.getUserMemberships(currentUser.uid).pipe(
          catchError(() => of([]))
        ).subscribe(memberships => {
          this.userMemberships.set(memberships);
          this.clubs.set(this.mergeClubsWithMemberships(clubs, memberships));
          this.loading.set(false);
        });
      } else {
        this.clubs.set(clubs);
        this.loading.set(false);
      }
    });
  }

  private mergeClubsWithMemberships(
    clubs: Club[], 
    memberships: ClubMembership[]
  ): ClubWithMembership[] {
    return clubs.map(club => {
      const membership = memberships.find(m => m.clubId === club.id);
      return {
        ...club,
        membershipStatus: membership?.status,
        isApplying: false
      };
    });
  }

  protected applyForMembership(club: ClubWithMembership): void {
    const currentUser = this.authService.currentUser();
    if (!currentUser) {
      this.snackBar.open('Please sign in to apply for membership', 'Close', { duration: 3000 });
      return;
    }

    // Set applying state for this club
    const clubIndex = this.clubs().findIndex(c => c.id === club.id);
    if (clubIndex !== -1) {
      const updatedClubs = [...this.clubs()];
      updatedClubs[clubIndex] = { ...updatedClubs[clubIndex], isApplying: true };
      this.clubs.set(updatedClubs);
    }

    this.membershipService.applyForMembership(currentUser.uid, club.id).subscribe({
      next: () => {
        // Update the club's membership status
        const updatedClubs = this.clubs().map(c => 
          c.id === club.id 
            ? { ...c, membershipStatus: MembershipStatus.Pending, isApplying: false }
            : c
        );
        this.clubs.set(updatedClubs);
        this.snackBar.open('Membership application submitted!', 'Close', { duration: 3000 });
      },
      error: (error) => {
        // Reset applying state
        const updatedClubs = this.clubs().map(c => 
          c.id === club.id 
            ? { ...c, isApplying: false }
            : c
        );
        this.clubs.set(updatedClubs);
        console.error('Error applying for membership:', error);
        this.snackBar.open('Failed to submit application', 'Close', { duration: 3000 });
      }
    });
  }

  protected canApply(club: ClubWithMembership): boolean {
    return this.isAuthenticated() && !club.membershipStatus;
  }

  protected getMembershipStatusText(status: MembershipStatus): string {
    switch (status) {
      case MembershipStatus.Pending:
        return 'Application Pending';
      case MembershipStatus.Active:
        return 'Active Member';
      case MembershipStatus.Denied:
        return 'Application Denied';
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
}
