import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  DestroyRef,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { doc, docData, Firestore } from '@angular/fire/firestore';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ClubService } from '../services/club.service';
import { Club } from '@arrl-co-yotc/shared/build/app/models/club.model';
import { User } from '@arrl-co-yotc/shared/build/app/models/user.model';
import { catchError, of, forkJoin } from 'rxjs';

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
  private firestore = inject(Firestore);
  private snackBar = inject(MatSnackBar);
  private destroyRef = inject(DestroyRef);

  protected readonly loading = signal(true);
  protected readonly pendingClubs = signal<Club[]>([]);
  protected readonly processingClubIds = signal<Set<string>>(new Set());
  protected readonly userNames = signal<Map<string, string>>(new Map());

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
        this.loadUserNames(clubs);
        this.loading.set(false);
      });
  }

  private loadUserNames(clubs: Club[]): void {
    // Get unique user IDs from clubs
    const userIds = [...new Set(clubs.map((club) => club.suggestedBy).filter(Boolean))] as string[];

    if (userIds.length === 0) {
      return;
    }

    // Fetch user data for each user ID
    // Note: User data could be cached in a future enhancement to avoid redundant Firestore requests
    // across multiple loadPendingClubs() calls. However, since admin reviews are infrequent and
    // user data rarely changes, the current implementation is acceptable.
    const userFetches = userIds.map((userId) =>
      docData(doc(this.firestore, 'users', userId), { idField: 'id' }).pipe(
        catchError(() => of(null)),
      ),
    );

    forkJoin(userFetches)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((users) => {
        const nameMap = new Map<string, string>();
        users.forEach((user, index) => {
          if (user && typeof user === 'object' && 'name' in user && 'callsign' in user) {
            const userData = user as User;
            // Display name with callsign for better identification
            nameMap.set(userIds[index], `${userData.name} (${userData.callsign})`);
          }
        });
        this.userNames.set(nameMap);
      });
  }

  protected getUserName(userId: string | undefined): string {
    if (!userId) {
      return 'Unknown';
    }
    return this.userNames().get(userId) || userId;
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
