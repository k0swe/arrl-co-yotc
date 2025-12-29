import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  DestroyRef,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ClubService } from '../services/club.service';
import { Club } from '@arrl-co-yotc/shared/build/app/models/club.model';
import { catchError, of } from 'rxjs';

@Component({
  selector: 'app-admin',
  imports: [
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
  ],
  templateUrl: './admin.html',
  styleUrl: './admin.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Admin {
  private clubService = inject(ClubService);
  private snackBar = inject(MatSnackBar);
  private destroyRef = inject(DestroyRef);

  protected readonly loading = signal(true);
  protected readonly pendingClubs = signal<Club[]>([]);
  protected readonly processingClubIds = signal<Set<string>>(new Set());

  constructor() {
    this.loadPendingClubs();
  }

  private loadPendingClubs(): void {
    this.loading.set(true);
    this.clubService
      .getPendingClubs()
      .pipe(
        catchError(() => {
          this.showSnackBar('Failed to load pending clubs');
          this.loading.set(false);
          return of([]);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((clubs) => {
        this.pendingClubs.set(clubs);
        this.loading.set(false);
      });
  }

  protected approveClub(club: Club): void {
    this.setProcessing(club.id, true);
    this.clubService
      .approveClub(club.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.showSnackBar(`${club.name} has been approved!`);
          this.setProcessing(club.id, false);
          // Remove from pending review queue. The club is now active and visible to the public.
          this.pendingClubs.set(this.pendingClubs().filter((c) => c.id !== club.id));
        },
        error: (error) => {
          console.error('Error approving club:', error);
          this.showSnackBar('Failed to approve club');
          this.setProcessing(club.id, false);
        },
      });
  }

  protected rejectClub(club: Club): void {
    this.setProcessing(club.id, true);
    this.clubService
      .rejectClub(club.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.showSnackBar(`${club.name} has been rejected`);
          this.setProcessing(club.id, false);
          // Remove from pending review queue. The club remains in the database as inactive
          // for auditing purposes, but it no longer needs admin review.
          this.pendingClubs.set(this.pendingClubs().filter((c) => c.id !== club.id));
        },
        error: (error) => {
          console.error('Error rejecting club:', error);
          this.showSnackBar('Failed to reject club');
          this.setProcessing(club.id, false);
        },
      });
  }

  protected isProcessing(clubId: string): boolean {
    return this.processingClubIds().has(clubId);
  }

  private setProcessing(clubId: string, processing: boolean): void {
    const current = new Set(this.processingClubIds());
    if (processing) {
      current.add(clubId);
    } else {
      current.delete(clubId);
    }
    this.processingClubIds.set(current);
  }

  private showSnackBar(message: string): void {
    this.snackBar.open(message, 'Close', { duration: 3000 });
  }
}
