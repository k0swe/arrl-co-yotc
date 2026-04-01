import { Component, ChangeDetectionStrategy, inject, DestroyRef, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { StandingsService } from '../services/standings.service';
import { StandingEntry } from '@arrl-co-yotc/shared/build/app/models/standing.model';
import { catchError, combineLatest, map, of } from 'rxjs';

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
  protected readonly columns = signal<string[]>([]);

  constructor() {
    combineLatest([
      this.standingsService.getStandingsColumns(),
      this.standingsService.getStandings(),
    ])
      .pipe(
        map(([columnsDoc, entries]) => {
          // Derive column order from the companion document when available;
          // fall back to the keys of the first row otherwise.
          const cols =
            columnsDoc?.columns ??
            (entries.length > 0 ? Object.keys(entries[0]) : []);
          return { rows: entries, cols };
        }),
        catchError(() => of({ rows: [], cols: [] })),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(({ rows, cols }) => {
        this.standings.set(rows);
        this.columns.set(cols);
        this.loading.set(false);
      });
  }
}
