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
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MembershipService } from '../../../services/membership.service';
import { UserService } from '../../../services/user.service';
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
  ],
  templateUrl: './active-members.html',
  styleUrl: './active-members.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ActiveMembers {
  private membershipService = inject(MembershipService);
  private userService = inject(UserService);
  private destroyRef = inject(DestroyRef);

  /**
   * The ID of the club whose active members should be displayed
   */
  clubId = input.required<string>();

  protected readonly loading = signal(true);
  protected readonly activeMembersWithUsers = signal<MemberWithUser[]>([]);

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
}
