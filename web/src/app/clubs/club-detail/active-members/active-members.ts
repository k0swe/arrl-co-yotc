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
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MembershipService } from '../../../services/membership.service';
import { UserService } from '../../../services/user.service';
import { ClubService } from '../../../services/club.service';
import { AuthService } from '../../../auth/auth.service';
import { ClubMembership } from '@arrl-co-yotc/shared/build/app/models/user.model';
import { User } from '@arrl-co-yotc/shared/build/app/models/user.model';
import { catchError, of, forkJoin } from 'rxjs';

interface MemberWithUser {
  membership: ClubMembership;
  user: User | null;
}

@Component({
  selector: 'app-active-members',
  imports: [
    MatCardModule,
    MatIconModule,
    MatListModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatButtonModule,
    MatTooltipModule,
  ],
  templateUrl: './active-members.html',
  styleUrl: './active-members.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ActiveMembers {
  private membershipService = inject(MembershipService);
  private userService = inject(UserService);
  private clubService = inject(ClubService);
  private authService = inject(AuthService);
  private snackBar = inject(MatSnackBar);
  private destroyRef = inject(DestroyRef);

  /**
   * The ID of the club whose active members should be displayed
   */
  clubId = input.required<string>();

  /**
   * The club's current leader IDs array
   */
  clubLeaderIds = input.required<string[]>();

  protected readonly loading = signal(true);
  protected readonly activeMembersWithUsers = signal<MemberWithUser[]>([]);

  /**
   * Computed signal that determines if the current user can manage roles.
   * Only admins can promote/demote members.
   */
  protected readonly canManageRoles = computed(() => {
    return this.authService.isAdmin();
  });

  constructor() {
    // Use effect to reload members when clubId changes
    effect(() => {
      const id = this.clubId();
      if (id) {
        this.loadActiveMembers();
      }
    });
  }

  private loadActiveMembers(): void {
    this.loading.set(true);
    const clubId = this.clubId();

    this.membershipService
      .getActiveMembers(clubId)
      .pipe(
        catchError((error) => {
          console.error('Error loading active members:', error);
          return of([]);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((memberships) => {
        if (memberships.length === 0) {
          this.activeMembersWithUsers.set([]);
          this.loading.set(false);
          return;
        }

        // Fetch user data for each membership
        const userFetches = memberships.map((membership) =>
          this.userService.getUser(membership.userId).pipe(
            catchError((error) => {
              console.error(`Error fetching user ${membership.userId}:`, error);
              return of(null);
            }),
          ),
        );

        forkJoin(userFetches)
          .pipe(
            catchError((error) => {
              console.error('Error fetching users:', error);
              // Return empty array on error so we still display memberships without user data
              return of(memberships.map(() => null));
            }),
            takeUntilDestroyed(this.destroyRef),
          )
          .subscribe((users) => {
            const membersWithUsers = memberships.map((membership, index) => ({
              membership,
              user: users[index],
            }));
            this.activeMembersWithUsers.set(membersWithUsers);
            this.loading.set(false);
          });
      });
  }

  /**
   * Promote a member to club leader
   */
  protected promoteToLeader(userId: string, userName: string): void {
    const clubId = this.clubId();
    const currentLeaderIds = this.clubLeaderIds();

    this.membershipService
      .promoteMemberToLeader(clubId, userId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          // Update the club's leaderIds array
          const newLeaderIds = [...currentLeaderIds, userId];
          this.clubService
            .updateClubLeaderIds(clubId, newLeaderIds)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
              next: () => {
                this.snackBar.open(`${userName} has been promoted to club leader!`, 'Close', {
                  duration: 3000,
                });
                // Reload the members list to reflect the changes
                this.loadActiveMembers();
              },
              error: (error) => {
                console.error('Error updating club leaderIds:', error);
                this.snackBar.open('Failed to update club leader list', 'Close', {
                  duration: 3000,
                });
              },
            });
        },
        error: (error) => {
          console.error('Error promoting member:', error);
          this.snackBar.open('Failed to promote member', 'Close', { duration: 3000 });
        },
      });
  }

  /**
   * Demote a club leader to regular member
   */
  protected demoteToMember(userId: string, userName: string): void {
    const clubId = this.clubId();
    const currentLeaderIds = this.clubLeaderIds();

    this.membershipService
      .demoteMemberToRegular(clubId, userId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          // Update the club's leaderIds array
          const newLeaderIds = currentLeaderIds.filter((id) => id !== userId);
          this.clubService
            .updateClubLeaderIds(clubId, newLeaderIds)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
              next: () => {
                this.snackBar.open(`${userName} has been demoted to regular member!`, 'Close', {
                  duration: 3000,
                });
                // Reload the members list to reflect the changes
                this.loadActiveMembers();
              },
              error: (error) => {
                console.error('Error updating club leaderIds:', error);
                this.snackBar.open('Failed to update club leader list', 'Close', {
                  duration: 3000,
                });
              },
            });
        },
        error: (error) => {
          console.error('Error demoting member:', error);
          this.snackBar.open('Failed to demote member', 'Close', { duration: 3000 });
        },
      });
  }
}
