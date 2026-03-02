import { Component, ChangeDetectionStrategy, inject, DestroyRef, signal } from '@angular/core';
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
  protected readonly displayedColumns = [
    'callsign',
    'totalQsos',
    'was',
    'coloClubs',
    'veSessions',
    'newMembers',
    'publicEvents',
    'arrlFieldDay',
    'winterFieldDay',
    'interClubEvent',
  ];

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
