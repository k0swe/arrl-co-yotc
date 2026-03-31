import { Component, ChangeDetectionStrategy, inject, DestroyRef, signal, computed } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { StandingsService } from '../services/standings.service';
import { StandingEntry } from '@arrl-co-yotc/shared/build/app/models/standing.model';
import { catchError, of } from 'rxjs';

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
    this.standingsService
      .getStandings()
      .pipe(
        catchError(() => of([])),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((entries) => {
        this.standings.set(entries);
        this.loading.set(false);
      });
  }
}
