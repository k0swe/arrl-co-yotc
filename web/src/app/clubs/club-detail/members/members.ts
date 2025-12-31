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
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { MembershipService } from '../../../services/membership.service';
import { UserService } from '../../../services/user.service';
import { ClubService } from '../../../services/club.service';
import { AuthService } from '../../../auth/auth.service';
import { ClubMembership } from '@arrl-co-yotc/shared/build/app/models/user.model';
import { User } from '@arrl-co-yotc/shared/build/app/models/user.model';
import { catchError, of, forkJoin, switchMap } from 'rxjs';

interface MemberWithUser {
  membership: ClubMembership;
  user: User | null;
}

@Component({
  selector: 'app-members',
  imports: [
    DatePipe,
    MatCardModule,
    MatIconModule,
    MatListModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatButtonModule,
    MatTooltipModule,
    MatDividerModule,
  ],
  templateUrl: './members.html',
  styleUrl: './members.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Members {
  private membershipService = inject(MembershipService);
  private userService = inject(UserService);
  private clubService = inject(ClubService);
  private authService = inject(AuthService);
  private snackBar = inject(MatSnackBar);
  private destroyRef = inject(DestroyRef);

  /**
   * The ID of the club whose members should be displayed
   */
  clubId = input.required<string>();

  /**
   * The club's current leader IDs array
   */
  clubLeaderIds = input.required<string[]>();

  protected readonly loading = signal(true);
  protected readonly activeMembersWithUsers = signal<MemberWithUser[]>([]);
  protected readonly pendingMembershipsWithUsers = signal<MemberWithUser[]>([]);
  protected readonly processingMembership = signal<string | null>(null);

  /**
   * Computed signal that determines if the current user can manage roles.
   * Only admins can promote/demote members.
   */
  protected readonly canManageRoles = computed(() => {
    return this.authService.isAdmin();
  });

  /**
   * Computed signal that determines if the current user can approve/deny memberships.
   * Admins and club leaders can approve/deny pending memberships.
   */
  protected readonly canApproveMemberships = computed(() => {
    const currentUser = this.authService.currentUser();
    if (!currentUser) {
      return false;
    }

    // Admins can approve memberships
    if (this.authService.isAdmin()) {
      return true;
    }

    // Club leaders can approve memberships
    const currentLeaderIds = this.clubLeaderIds();
    return currentLeaderIds.includes(currentUser.uid);
  });

  constructor() {
    // Use effect to reload members when clubId changes
    effect(() => {
      const id = this.clubId();
      if (id) {
        this.loadMembers();
      }
    });
  }

  private loadMembers(): void {
    this.loading.set(true);
    const clubId = this.clubId();

    // Load both active and pending members in parallel
    forkJoin({
      active: this.membershipService.getActiveMembers(clubId).pipe(
        catchError((error) => {
          console.error('Error loading active members:', error);
          return of([]);
        }),
      ),
      pending: this.membershipService.getPendingMemberships(clubId).pipe(
        catchError((error) => {
          console.error('Error loading pending memberships:', error);
          return of([]);
        }),
      ),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(({ active, pending }) => {
        // Process active members
        if (active.length > 0) {
          this.loadUsersForMemberships(active, (membersWithUsers) => {
            this.activeMembersWithUsers.set(membersWithUsers);
          });
        } else {
          this.activeMembersWithUsers.set([]);
        }

        // Process pending memberships
        if (pending.length > 0) {
          this.loadUsersForMemberships(pending, (membersWithUsers) => {
            this.pendingMembershipsWithUsers.set(membersWithUsers);
          });
        } else {
          this.pendingMembershipsWithUsers.set([]);
        }

        this.loading.set(false);
      });
  }

  private loadUsersForMemberships(
    memberships: ClubMembership[],
    callback: (membersWithUsers: MemberWithUser[]) => void,
  ): void {
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
          return of(memberships.map(() => null));
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((users) => {
        const membersWithUsers = memberships.map((membership, index) => ({
          membership,
          user: users[index],
        }));
        callback(membersWithUsers);
      });
  }

  protected approveMembership(membershipWithUser: MemberWithUser): void {
    const currentUser = this.authService.currentUser();
    if (!currentUser) {
      this.snackBar.open('You must be logged in to approve memberships', 'Close', {
        duration: 3000,
      });
      return;
    }

    const membership = membershipWithUser.membership;
    this.processingMembership.set(membership.userId);

    this.membershipService
      .approveMembership(membership.clubId, membership.userId, currentUser.uid)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.snackBar.open('Membership approved', 'Close', { duration: 3000 });
          // Reload members to reflect the changes
          this.loadMembers();
          this.processingMembership.set(null);
        },
        error: (error) => {
          console.error('Error approving membership:', error);
          this.snackBar.open('Failed to approve membership', 'Close', { duration: 3000 });
          this.processingMembership.set(null);
        },
      });
  }

  protected denyMembership(membershipWithUser: MemberWithUser): void {
    const membership = membershipWithUser.membership;
    this.processingMembership.set(membership.userId);

    this.membershipService
      .denyMembership(membership.clubId, membership.userId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.snackBar.open('Membership denied', 'Close', { duration: 3000 });
          // Remove the denied membership from the list
          this.pendingMembershipsWithUsers.update((membershipsWithUsers) =>
            membershipsWithUsers.filter((m) => m.membership.userId !== membership.userId),
          );
          this.processingMembership.set(null);
        },
        error: (error) => {
          console.error('Error denying membership:', error);
          this.snackBar.open('Failed to deny membership', 'Close', { duration: 3000 });
          this.processingMembership.set(null);
        },
      });
  }

  protected isProcessing(userId: string): boolean {
    return this.processingMembership() === userId;
  }

  /**
   * Promote a member to club leader
   */
  protected promoteToLeader(userId: string, userName: string): void {
    const clubId = this.clubId();
    const currentLeaderIds = this.clubLeaderIds();

    // Check if user is already a leader
    if (currentLeaderIds.includes(userId)) {
      this.snackBar.open(`${userName} is already a club leader`, 'Close', { duration: 3000 });
      return;
    }

    this.membershipService
      .promoteMemberToLeader(clubId, userId)
      .pipe(
        switchMap(() => {
          // Update the club's leaderIds array
          const newLeaderIds = [...currentLeaderIds, userId];
          return this.clubService.updateClubLeaderIds(clubId, newLeaderIds);
        }),
        catchError((error) => {
          console.error('Error promoting member:', error);
          this.snackBar.open('Failed to promote member', 'Close', { duration: 3000 });
          return of(undefined);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((result) => {
        if (result !== undefined) {
          this.snackBar.open(`${userName} has been promoted to club leader!`, 'Close', {
            duration: 3000,
          });
          // Reload the members list to reflect the changes
          this.loadMembers();
        }
      });
  }

  /**
   * Demote a club leader to regular member
   */
  protected demoteToMember(userId: string, userName: string): void {
    const clubId = this.clubId();
    const currentLeaderIds = this.clubLeaderIds();

    // Check if user is actually a leader
    if (!currentLeaderIds.includes(userId)) {
      this.snackBar.open(`${userName} is not a club leader`, 'Close', { duration: 3000 });
      return;
    }

    this.membershipService
      .demoteMemberToRegular(clubId, userId)
      .pipe(
        switchMap(() => {
          // Update the club's leaderIds array
          const newLeaderIds = currentLeaderIds.filter((id) => id !== userId);
          return this.clubService.updateClubLeaderIds(clubId, newLeaderIds);
        }),
        catchError((error) => {
          console.error('Error demoting member:', error);
          this.snackBar.open('Failed to demote member', 'Close', { duration: 3000 });
          return of(undefined);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((result) => {
        if (result !== undefined) {
          this.snackBar.open(`${userName} has been demoted to regular member!`, 'Close', {
            duration: 3000,
          });
          // Reload the members list to reflect the changes
          this.loadMembers();
        }
      });
  }

  /**
   * Convert Firestore Timestamp to Date for display
   * Firestore returns Timestamp objects that need to be converted
   */
  protected toDate(timestamp: Date | { toDate(): Date } | string | null | undefined): Date | null {
    if (!timestamp) {
      return null;
    }
    // Check if it's already a Date
    if (timestamp instanceof Date) {
      return timestamp;
    }
    // Check if it's a Firestore Timestamp with toDate method
    if (typeof timestamp === 'object' && 'toDate' in timestamp && typeof timestamp.toDate === 'function') {
      return timestamp.toDate();
    }
    // Try to parse as date string
    if (typeof timestamp === 'string') {
      const date = new Date(timestamp);
      return isNaN(date.getTime()) ? null : date;
    }
    return null;
  }
}
