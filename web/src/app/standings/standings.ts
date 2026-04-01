import { Component, ChangeDetectionStrategy, inject, DestroyRef, signal, computed } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { StandingsService } from '../services/standings.service';
import { StandingEntry } from '@arrl-co-yotc/shared/build/app/models/standing.model';
import { catchError, of, switchMap } from 'rxjs';

@Component({
  selector: 'app-standings',
  imports: [MatTableModule, MatProgressSpinnerModule, MatIconModule],
  templateUrl: './standings.html',
  styleUrl: './standings.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Standings {
  private standingsService = inject(StandingsService);
  private destroyRef = inject(DestroyRef);

  protected readonly loading = signal(true);
  protected readonly standings = signal<StandingEntry[]>([]);
  protected readonly columns = computed(() => {
    const entries = this.standings();
    if (entries.length === 0) return [];
    return Object.keys(entries[0]).filter((k) => k !== 'updatedAt');
  });

  constructor() {
    // Try the new array-of-arrays format first (standings/latest document).
    // When that document is absent or empty, fall back to the legacy per-row
    // collection format so that data uploaded before the ETL migration is
    // still displayed.
    this.standingsService
      .getStandingsData()
      .pipe(
        switchMap((data) => {
          if (data && data.rows.length > 1) {
            // New format: convert rows to the same StandingEntry[] shape used
            // by the template so the rendering logic is unchanged.
            const headers = data.rows[0];
            const entries = data.rows.slice(1).map(
              (row) =>
                Object.fromEntries(headers.map((h, i) => [h, row[i]])) as StandingEntry,
            );
            return of(entries);
          }
          // Fall back to the legacy per-row collection format.
          return this.standingsService.getStandings();
        }),
        catchError(() => of([])),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((entries) => {
        this.standings.set(entries);
        this.loading.set(false);
      });
  }
}
