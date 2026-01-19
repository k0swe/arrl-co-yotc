import { Component, ChangeDetectionStrategy, inject, signal, DestroyRef, computed } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ClubService } from '../../services/club.service';
import { MembershipService } from '../../services/membership.service';
import { AuthService } from '../../auth/auth.service';
import { ClubCard } from '../club-card/club-card';
import { EditClubDialog, ClubFormData } from '../edit-club-dialog/edit-club-dialog';
import { Members } from './members/members';
import { EventList } from './event-list/event-list';
import { Club } from '@arrl-co-yotc/shared/build/app/models/club.model';
import { MembershipStatus } from '@arrl-co-yotc/shared/build/app/models/user.model';
import { catchError, of, switchMap } from 'rxjs';

@Component({
  selector: 'app-club-detail',
  imports: [
    MatCardModule,
    MatProgressSpinnerModule,
    MatIconModule,
    MatButtonModule,
    MatDialogModule,
    MatSnackBarModule,
    ClubCard,
    Members,
    EventList,
  ],
  templateUrl: './club-detail.html',
  styleUrl: './club-detail.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClubDetail {
  private route = inject(ActivatedRoute);
  private clubService = inject(ClubService);
  private membershipService = inject(MembershipService);
  private authService = inject(AuthService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  private destroyRef = inject(DestroyRef);

  protected readonly loading = signal(true);
  protected readonly club = signal<Club | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly userMembershipStatus = signal<MembershipStatus | null>(null);

  /**
   * Computed signal that determines if the current user can edit the club.
   * Users can edit if they are an admin or a leader of the club.
   */
  protected readonly canEdit = computed(() => {
    const currentClub = this.club();
    if (!currentClub) {
      return false;
    }
    
    // Admins can edit any club
    if (this.authService.isAdmin()) {
      return true;
    }

    // Club leaders can edit their club
    const currentUser = this.authService.currentUser();
    if (currentUser && currentClub?.leaderIds?.includes(currentUser.uid)) {
      return true;
    }

    return false;
  });

  /**
   * Computed signal that determines if the current user can manage events.
   * Users can manage events if they are an admin, a leader of the club, or an active member.
   */
  protected readonly canManageEvents = computed(() => {
    const currentClub = this.club();
    if (!currentClub) {
      return false;
    }
    
    // Admins can manage events for any club
    if (this.authService.isAdmin()) {
      return true;
    }

    const currentUser = this.authService.currentUser();
    if (!currentUser) {
      return false;
    }

    // Club leaders can manage events
    if (currentClub?.leaderIds?.includes(currentUser.uid)) {
      return true;
    }

    // Active club members can manage events
    const membershipStatus = this.userMembershipStatus();
    return membershipStatus === MembershipStatus.Active;
  });

  /**
   * Computed signal that determines if the current user can view the members list.
   * Members can be viewed by admins, club leaders, and active club members.
   */
  protected readonly canViewMembers = computed(() => {
    const currentClub = this.club();
    if (!currentClub) {
      return false;
    }
    
    // Admins can view members of any club
    if (this.authService.isAdmin()) {
      return true;
    }

    const currentUser = this.authService.currentUser();
    if (!currentUser) {
      return false;
    }

    // Club leaders can view members
    if (currentClub?.leaderIds?.includes(currentUser.uid)) {
      return true;
    }

    // Active club members can view other members
    const membershipStatus = this.userMembershipStatus();
    return membershipStatus === MembershipStatus.Active;
  });

  constructor() {
    // Subscribe to route parameter changes to handle navigation between clubs
    this.route.paramMap
      .pipe(
        switchMap((params) => {
          const slugOrId = params.get('slug');
          if (!slugOrId) {
            this.error.set('No club identifier provided');
            this.loading.set(false);
            return of(null);
          }
          this.loading.set(true);
          this.error.set(null);
          this.club.set(null);
          return this.clubService.getClubBySlugOrId(slugOrId).pipe(
            catchError((err) => {
              console.error(`Error loading club with identifier ${slugOrId}:`, err);
              this.error.set('Failed to load club');
              this.loading.set(false);
              return of(null);
            }),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((club) => {
        if (club) {
          this.club.set(club);
          // Load user membership status if authenticated
          const currentUser = this.authService.currentUser();
          if (currentUser) {
            this.membershipService
              .checkExistingMembership(currentUser.uid, club.id)
              .pipe(
                catchError((err) => {
                  console.error('Error loading user membership:', err);
                  return of(null);
                }),
                takeUntilDestroyed(this.destroyRef),
              )
              .subscribe((membership) => {
                this.userMembershipStatus.set(membership?.status || null);
              });
          } else {
            this.userMembershipStatus.set(null);
          }
        } else if (!this.error()) {
          this.error.set('Club not found');
        }
        this.loading.set(false);
      });
  }

  protected openEditDialog(): void {
    const currentClub = this.club();
    if (!currentClub) {
      return;
    }

    const dialogRef = this.dialog.open(EditClubDialog, {
      width: '600px',
      data: { club: currentClub },
    });

    dialogRef
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result: ClubFormData & { logoUrl?: string } | undefined) => {
        if (result) {
          this.loading.set(true);
          this.clubService
            .updateClub(currentClub.id, result)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
              next: () => {
                this.snackBar.open(`${result.name} has been updated!`, 'Close', {
                  duration: 3000,
                });
                // Update the local club data with the new values
                this.club.set({ ...currentClub, ...result });
                this.loading.set(false);
              },
              error: (error) => {
                console.error('Error updating club:', error);
                this.snackBar.open('Failed to update club', 'Close', { duration: 3000 });
                this.loading.set(false);
              },
            });
        }
      });
  }
}
