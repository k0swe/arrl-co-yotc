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
import { MatListModule } from '@angular/material/list';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MembershipService } from '../../../services/membership.service';
import { UserService } from '../../../services/user.service';
import { AuthService } from '../../../auth/auth.service';
import { ClubMembership } from '@arrl-co-yotc/shared/build/app/models/user.model';
import { User } from '@arrl-co-yotc/shared/build/app/models/user.model';
import { catchError, of, forkJoin } from 'rxjs';

interface MembershipWithUser {
  membership: ClubMembership;
  user: User | null;
}

@Component({
  selector: 'app-membership-requests',
  imports: [
    DatePipe,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatListModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
  ],
  templateUrl: './membership-requests.html',
  styleUrl: './membership-requests.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MembershipRequests {
  private membershipService = inject(MembershipService);
  private userService = inject(UserService);
  private authService = inject(AuthService);
  private snackBar = inject(MatSnackBar);
  private destroyRef = inject(DestroyRef);

  /**
   * The ID of the club whose pending memberships should be displayed
   */
  clubId = input.required<string>();

  protected readonly loading = signal(true);
  protected readonly pendingMembershipsWithUsers = signal<MembershipWithUser[]>([]);
  protected readonly processingMembership = signal<string | null>(null);

  constructor() {
    // Use effect to reload memberships when clubId changes
    effect(() => {
      const id = this.clubId();
      if (id) {
        this.loadPendingMemberships();
      }
    });
  }

  private loadPendingMemberships(): void {
    this.loading.set(true);
    const clubId = this.clubId();

    this.membershipService
      .getPendingMemberships(clubId)
      .pipe(
        catchError((error) => {
          console.error('Error loading pending memberships:', error);
          this.snackBar.open('Failed to load pending membership requests', 'Close', {
            duration: 3000,
          });
          return of([]);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((memberships) => {
        if (memberships.length === 0) {
          this.pendingMembershipsWithUsers.set([]);
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
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe((users) => {
            const membershipsWithUsers = memberships.map((membership, index) => ({
              membership,
              user: users[index],
            }));
            this.pendingMembershipsWithUsers.set(membershipsWithUsers);
            this.loading.set(false);
          });
      });
  }

  protected approveMembership(membershipWithUser: MembershipWithUser): void {
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
          // Remove the approved membership from the list
          this.pendingMembershipsWithUsers.update((membershipsWithUsers) =>
            membershipsWithUsers.filter((m) => m.membership.userId !== membership.userId),
          );
          this.processingMembership.set(null);
        },
        error: (error) => {
          console.error('Error approving membership:', error);
          this.snackBar.open('Failed to approve membership', 'Close', { duration: 3000 });
          this.processingMembership.set(null);
        },
      });
  }

  protected denyMembership(membershipWithUser: MembershipWithUser): void {
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
}
