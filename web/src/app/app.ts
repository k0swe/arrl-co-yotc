import {
  Component,
  signal,
  ChangeDetectionStrategy,
  inject,
  computed,
  effect,
  DestroyRef,
} from '@angular/core';
import { Router, RouterOutlet, RouterLink } from '@angular/router';
import { NgOptimizedImage } from '@angular/common';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatListModule } from '@angular/material/list';
import { MatMenuModule } from '@angular/material/menu';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatBadgeModule } from '@angular/material/badge';
import { AuthService } from './auth/auth.service';
import { MembershipService } from './services/membership.service';
import { ClubService } from './services/club.service';
import { Club } from '@arrl-co-yotc/shared/build/app/models/club.model';
import { MembershipStatus } from '@arrl-co-yotc/shared/build/app/models/user.model';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { combineLatest, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  imports: [
    RouterOutlet,
    RouterLink,
    MatToolbarModule,
    MatSidenavModule,
    MatIconModule,
    MatButtonModule,
    MatListModule,
    MatMenuModule,
    MatExpansionModule,
    MatBadgeModule,
    NgOptimizedImage,
  ],
  templateUrl: './app.html',
  styleUrl: './app.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  private router = inject(Router);
  private breakpointObserver = inject(BreakpointObserver);
  protected authService = inject(AuthService);
  private membershipService = inject(MembershipService);
  private clubService = inject(ClubService);
  private destroyRef = inject(DestroyRef);

  protected readonly title = signal('ARRL Colorado Section - Year of the Club');
  protected readonly sidenavOpened = signal(true);
  protected readonly sidenavMode = signal<'side' | 'over'>('side');
  protected readonly isMobile = signal(false);
  protected readonly userClubs = signal<Club[]>([]);
  protected readonly hasConfirmedMemberships = computed(() => this.userClubs().length > 0);
  protected readonly pendingClubsCount = signal(0);
  protected readonly pendingMembershipCounts = signal<Map<string, number>>(new Map());

  constructor() {
    // Set up responsive behavior for sidenav
    this.breakpointObserver
      .observe([Breakpoints.XSmall, Breakpoints.Small, Breakpoints.Medium])
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result) => {
        const isMobile = result.matches;
        this.isMobile.set(isMobile);
        this.sidenavMode.set(isMobile ? 'over' : 'side');
        this.sidenavOpened.set(!isMobile);
      });

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
    if (isAdmin) {
      // Admins see all active clubs
      this.clubService
        .getActiveClubs()
        .pipe(
          catchError(() => of([])),
          takeUntilDestroyed(this.destroyRef),
        )
        .subscribe((clubs) => {
          this.userClubs.set(clubs);
        });
    } else {
      // Regular users see only clubs where they have confirmed membership
      combineLatest([
        this.membershipService.getUserMemberships(userId),
        this.clubService.getActiveClubs(),
      ])
        .pipe(
          map(([memberships, clubs]) => {
            const confirmedClubIds = memberships
              .filter((m) => m.status === MembershipStatus.Active)
              .map((m) => m.clubId);
            return clubs.filter((c) => confirmedClubIds.includes(c.id));
          }),
          catchError(() => of([])),
          takeUntilDestroyed(this.destroyRef),
        )
        .subscribe((clubs) => {
          this.userClubs.set(clubs);
        });
    }
  }

  protected toggleSidenav(): void {
    this.sidenavOpened.update((value) => !value);
  }

  protected closeSidenavIfMobile(): void {
    if (this.isMobile()) {
      this.sidenavOpened.set(false);
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

  protected signOut(): void {
    this.authService.signOut().subscribe(() => {
      this.router.navigate(['/login']);
    });
  }
}
