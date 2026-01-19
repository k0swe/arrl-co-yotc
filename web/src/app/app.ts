import { Component, signal, ChangeDetectionStrategy, inject, DestroyRef } from '@angular/core';
import { Router, RouterOutlet, RouterLink } from '@angular/router';
import { NgOptimizedImage } from '@angular/common';
import { BreakpointObserver } from '@angular/cdk/layout';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { AuthService } from './auth/auth.service';
import { SidenavComponent } from './sidenav/sidenav';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-root',
  imports: [
    RouterOutlet,
    RouterLink,
    MatToolbarModule,
    MatSidenavModule,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
    MatDividerModule,
    NgOptimizedImage,
    SidenavComponent,
  ],
  templateUrl: './app.html',
  styleUrl: './app.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  private router = inject(Router);
  private breakpointObserver = inject(BreakpointObserver);
  protected authService = inject(AuthService);
  private destroyRef = inject(DestroyRef);

  protected readonly title = signal('ARRL Colorado Section - Year of the Club');
  protected readonly sidenavOpened = signal(true);
  protected readonly sidenavMode = signal<'side' | 'over'>('side');
  protected readonly isMobile = signal(false);

  constructor() {
    // Set up responsive behavior for sidenav
    // Use custom breakpoint to match CSS media queries (< 960px)
    this.breakpointObserver
      .observe(['(max-width: 959px)'])
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result) => {
        const isMobile = result.matches;
        this.isMobile.set(isMobile);
        this.sidenavMode.set(isMobile ? 'over' : 'side');
        this.sidenavOpened.set(!isMobile);
      });
  }

  protected toggleSidenav(): void {
    this.sidenavOpened.update((value) => !value);
  }

  protected closeSidenavIfMobile(): void {
    if (this.isMobile()) {
      this.sidenavOpened.set(false);
    }
  }

  protected signOut(): void {
    this.authService.signOut().subscribe(() => {
      this.router.navigate(['/login']);
    });
  }
}
