import { Component, ChangeDetectionStrategy, inject, signal, DestroyRef } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { ClubService } from '../../services/club.service';
import { ClubCard } from '../club-card/club-card';
import { Club } from '@arrl-co-yotc/shared/build/app/models/club.model';
import { catchError, of, switchMap } from 'rxjs';

@Component({
  selector: 'app-club-detail',
  imports: [MatCardModule, MatProgressSpinnerModule, MatIconModule, ClubCard],
  templateUrl: './club-detail.html',
  styleUrl: './club-detail.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClubDetail {
  private route = inject(ActivatedRoute);
  private clubService = inject(ClubService);
  private destroyRef = inject(DestroyRef);

  protected readonly loading = signal(true);
  protected readonly club = signal<Club | null>(null);
  protected readonly error = signal<string | null>(null);

  constructor() {
    // Subscribe to route parameter changes to handle navigation between clubs
    this.route.paramMap
      .pipe(
        switchMap((params) => {
          const clubId = params.get('clubId');
          if (!clubId) {
            this.error.set('No club ID provided');
            this.loading.set(false);
            return of(null);
          }
          this.loading.set(true);
          this.error.set(null);
          this.club.set(null);
          return this.clubService.getClubById(clubId).pipe(
            catchError((err) => {
              console.error(`Error loading club ${clubId}:`, err);
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
        } else if (!this.error()) {
          this.error.set('Club not found');
        }
        this.loading.set(false);
      });
  }

}
