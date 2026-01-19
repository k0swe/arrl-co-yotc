import {
  Component,
  ChangeDetectionStrategy,
  inject,
  computed,
  effect,
  DestroyRef,
  signal,
  input,
  output,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgOptimizedImage } from '@angular/common';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatBadgeModule } from '@angular/material/badge';
import { AuthService } from '../auth/auth.service';
import { MembershipService } from '../services/membership.service';
import { ClubService } from '../services/club.service';
import { Club } from '@arrl-co-yotc/shared/build/app/models/club.model';
import { MembershipStatus } from '@arrl-co-yotc/shared/build/app/models/user.model';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { combineLatest, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

@Component({
  selector: 'app-sidenav',
  imports: [
    RouterLink,
    MatListModule,
    MatIconModule,
    MatExpansionModule,
    MatBadgeModule,
    NgOptimizedImage,
  ],
  templateUrl: './sidenav.html',
  styleUrl: './sidenav.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SidenavComponent {
  protected authService = inject(AuthService);
  private membershipService = inject(MembershipService);
  private clubService = inject(ClubService);
  private destroyRef = inject(DestroyRef);

  isMobile = input.required<boolean>();
  navItemClick = output<void>();

  protected readonly userClubs = signal<Club[]>([]);
  protected readonly hasConfirmedMemberships = computed(() => this.userClubs().length > 0);
  protected readonly pendingClubsCount = signal(0);
  protected readonly pendingMembershipCounts = signal<Map<string, number>>(new Map());

  constructor() {
    // Load user's clubs when authentication state changes
    effect(() => {
      const user = this.authService.currentUser();
      const isAdmin = this.authService.isAdmin();

      if (user) {
        this.loadUserClubs(user.uid, isAdmin);
      } else {
        this.userClubs.set([]);
      }
    });

    // Load pending clubs count when user is an admin
    effect(() => {
      const isAdmin = this.authService.isAdmin();

      if (isAdmin) {
        this.loadPendingClubsCount();
      } else {
        this.pendingClubsCount.set(0);
      }
    });

    // Load pending membership counts for clubs where user is a leader or admin
    effect(() => {
      const user = this.authService.currentUser();
      const isAdmin = this.authService.isAdmin();
      const clubs = this.userClubs();

      if (user && clubs.length > 0) {
        this.loadPendingMembershipCounts(user.uid, isAdmin, clubs);
      } else {
        this.pendingMembershipCounts.set(new Map());
      }
    });
  }

  private loadUserClubs(userId: string, isAdmin: boolean): void {
    console.log('[SidenavComponent] loadUserClubs called', { userId, isAdmin });

    if (isAdmin) {
      // Admins see all active clubs
      console.log('[SidenavComponent] Loading clubs for admin user');
      this.clubService
        .getActiveClubs()
        .pipe(
          catchError((error) => {
            console.error('[SidenavComponent] Error loading active clubs for admin:', error);
            return of([]);
          }),
          takeUntilDestroyed(this.destroyRef),
        )
        .subscribe((clubs) => {
          console.log('[SidenavComponent] Admin clubs loaded:', clubs.length);
          this.userClubs.set(clubs);
        });
    } else {
      // Regular users see only clubs where they have confirmed membership
      console.log('[SidenavComponent] Loading clubs for non-admin user');
      combineLatest([
        this.membershipService.getUserMemberships(userId),
        this.clubService.getActiveClubs(),
      ])
        .pipe(
          map(([memberships, clubs]) => {
            console.log('[SidenavComponent] Memberships received:', memberships.length);
            console.log('[SidenavComponent] Active clubs received:', clubs.length);
            console.log('[SidenavComponent] All memberships:', memberships);

            const confirmedClubIds = memberships
              .filter((m) => m.status === MembershipStatus.Active)
              .map((m) => m.clubId);

            console.log('[SidenavComponent] Confirmed club IDs:', confirmedClubIds);

            const userClubs = clubs.filter((c) => confirmedClubIds.includes(c.id));
            console.log('[SidenavComponent] Filtered user clubs:', userClubs.length, userClubs);

            return userClubs;
          }),
          catchError((error) => {
            console.error('[SidenavComponent] Error loading clubs for non-admin:', error);
            return of([]);
          }),
          takeUntilDestroyed(this.destroyRef),
        )
        .subscribe((clubs) => {
          console.log('[SidenavComponent] Setting user clubs:', clubs.length);
          this.userClubs.set(clubs);
        });
    }
  }

  private loadPendingClubsCount(): void {
    this.clubService
      .getPendingClubs()
      .pipe(
        map((clubs) => clubs.length),
        catchError(() => of(0)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((count) => {
        this.pendingClubsCount.set(count);
      });
  }

  private loadPendingMembershipCounts(userId: string, isAdmin: boolean, clubs: Club[]): void {
    // Filter clubs where user is a leader or admin can see all
    const clubsToCheck = isAdmin ? clubs : clubs.filter((club) => club.leaderIds?.includes(userId));

    if (clubsToCheck.length === 0) {
      this.pendingMembershipCounts.set(new Map());
      return;
    }

    // Load pending memberships for each club
    const pendingRequests$ = clubsToCheck.map((club) =>
      this.membershipService.getPendingMemberships(club.id).pipe(
        map((memberships) => ({ clubId: club.id, count: memberships.length })),
        catchError(() => of({ clubId: club.id, count: 0 })),
      ),
    );

    // Use of([]) when array is empty to ensure immediate completion
    (pendingRequests$.length > 0 ? combineLatest(pendingRequests$) : of([]))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((results) => {
        const countsMap = new Map<string, number>();
        results.forEach((result) => {
          countsMap.set(result.clubId, result.count);
        });
        this.pendingMembershipCounts.set(countsMap);
      });
  }

  protected getPendingMembershipCount(clubId: string): number {
    return this.pendingMembershipCounts().get(clubId) || 0;
  }

  protected onNavItemClick(): void {
    this.navItemClick.emit();
  }
}
