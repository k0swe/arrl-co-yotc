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
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatListModule } from '@angular/material/list';
import { MatMenuModule } from '@angular/material/menu';
import { MatExpansionModule } from '@angular/material/expansion';
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
    NgOptimizedImage,
  ],
  templateUrl: './app.html',
  styleUrl: './app.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  private router = inject(Router);
  protected authService = inject(AuthService);
  private membershipService = inject(MembershipService);
  private clubService = inject(ClubService);
  private destroyRef = inject(DestroyRef);

  protected readonly title = signal('ARRL Colorado Section - Year of the Club');
  protected readonly sidenavOpened = signal(true);
  protected readonly userClubs = signal<Club[]>([]);
  protected readonly hasConfirmedMemberships = computed(() => this.userClubs().length > 0);

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

  protected signOut(): void {
    this.authService.signOut().subscribe(() => {
      this.router.navigate(['/login']);
    });
  }
}
