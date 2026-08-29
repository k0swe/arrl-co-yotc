import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { StandingsService } from '../services/standings.service';
import { StandingEntry } from '@arrl-co-yotc/shared/build/app/models/standing.model';
import { catchError, combineLatest, concat, map, of, switchMap } from 'rxjs';

interface StandingsState {
  rows: StandingEntry[];
  cols: string[];
}

@Component({
  selector: 'app-standings',
  imports: [MatTableModule, MatProgressSpinnerModule, MatButtonModule, MatIconModule],
  templateUrl: './standings.html',
  styleUrl: './standings.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Standings {
  private standingsService = inject(StandingsService);
  private refreshVersion = signal(0);

  private loadError = signal<string | null>(null);
  private standingsState = toSignal<StandingsState | null>(
    toObservable(this.refreshVersion).pipe(
      switchMap(() => {
        this.loadError.set(null);
        return concat(
          of<StandingsState | null>(null),
          combineLatest([
            this.standingsService.getStandingsColumns(),
            this.standingsService.getStandings(),
          ]).pipe(
            map(([columnsDoc, entries]) => {
              // Derive column order from the companion document when available;
              // fall back to the keys of the first row otherwise.
              const cols = columnsDoc?.columns ?? (entries.length > 0 ? Object.keys(entries[0]) : []);
              return { rows: entries, cols };
            }),
            catchError((error) => {
              console.error('Error loading standings:', error);
              this.loadError.set('Unable to load standings. Please try again.');
              return of<StandingsState>({ rows: [], cols: [] });
            }),
          ),
        );
      }),
    ),
    { initialValue: null },
  );

  protected readonly loading = computed(() => this.standingsState() === null);
  protected readonly standings = computed(() => this.standingsState()?.rows ?? []);
  protected readonly columns = computed(() => this.standingsState()?.cols ?? []);
  protected readonly errorMessage = computed(() => this.loadError());

  protected refreshStandings(): void {
    this.refreshVersion.update((value) => value + 1);
  }
}
