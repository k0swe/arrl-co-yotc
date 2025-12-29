import { Component, ChangeDetectionStrategy, inject, signal, DestroyRef } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { ClubService } from '../../services/club.service';
import { Club } from '@arrl-co-yotc/shared/build/app/models/club.model';
import { catchError, of } from 'rxjs';

@Component({
  selector: 'app-club-detail',
  imports: [MatCardModule, MatProgressSpinnerModule, MatIconModule],
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
    const clubId = this.route.snapshot.paramMap.get('clubId');
    if (clubId) {
      this.loadClub(clubId);
    } else {
      this.error.set('No club ID provided');
      this.loading.set(false);
    }
  }

  private loadClub(clubId: string): void {
    this.loading.set(true);
    this.clubService
      .getAllClubs()
      .pipe(
        catchError(() => {
          this.error.set('Failed to load club');
          this.loading.set(false);
          return of([]);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((clubs) => {
        const foundClub = clubs.find((c) => c.id === clubId);
        if (foundClub) {
          this.club.set(foundClub);
        } else {
          this.error.set('Club not found');
        }
        this.loading.set(false);
      });
  }
}
