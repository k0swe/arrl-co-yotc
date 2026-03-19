import { Component, ChangeDetectionStrategy, inject, signal, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { doc, getDoc, Firestore } from '@angular/fire/firestore';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { FormsModule } from '@angular/forms';
import { ClubService } from '../services/club.service';
import { StorageService } from '../services/storage.service';
import { Club } from '@arrl-co-yotc/shared/build/app/models/club.model';
import { User } from '@arrl-co-yotc/shared/build/app/models/user.model';
import { ClubCard } from '../clubs/club-card/club-card';
import { catchError, of, from, forkJoin } from 'rxjs';
import { map } from 'rxjs/operators';
import { EditClubDialog, ClubFormData } from '../clubs/edit-club-dialog/edit-club-dialog';
import {
  RecentDocumentsDialog,
  RecentDocumentsDialogData,
} from './recent-documents-dialog/recent-documents-dialog';

@Component({
  selector: 'app-admin',
  imports: [
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatDialogModule,
    FormsModule,
    ClubCard,
  ],
  templateUrl: './admin.html',
  styleUrl: './admin.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Admin {
  private clubService = inject(ClubService);
  private storageService = inject(StorageService);
  private firestore = inject(Firestore);
  private snackBar = inject(MatSnackBar);
  private destroyRef = inject(DestroyRef);
  private dialog = inject(MatDialog);

  protected readonly loading = signal(true);
  protected readonly pendingClubs = signal<Club[]>([]);
  protected readonly processingClubIds = signal<Set<string>>(new Set());
  protected readonly userNames = signal<Map<string, string>>(new Map());
  protected readonly standingsUploading = signal(false);
  protected readonly sinceDate = signal<string>(this.defaultSinceDate());

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

    // Fetch user data for each user ID using getDoc for one-time reads
    // Note: User data could be cached in a future enhancement to avoid redundant Firestore requests
    // across multiple loadPendingClubs() calls. However, since admin reviews are infrequent and
    // user data rarely changes, the current implementation is acceptable.
    const userFetches = userIds.map((userId) =>
      from(getDoc(doc(this.firestore, 'users', userId))).pipe(
        map((docSnap) => {
          if (docSnap.exists()) {
            return { id: docSnap.id, ...docSnap.data() };
          }
          return null;
        }),
        catchError((error) => {
          console.error(`Error fetching user ${userId}:`, error);
          return of(null);
        }),
      ),
    );

    forkJoin(userFetches)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (users) => {
          const nameMap = new Map<string, string>();
          users.forEach((user, index) => {
            if (user && typeof user === 'object' && 'name' in user && 'callsign' in user) {
              const userData = user as User;
              // Display name with callsign for better identification
              nameMap.set(userIds[index], `${userData.name} (${userData.callsign})`);
            }
          });
          this.userNames.set(nameMap);
        },
        error: (error) => {
          console.error('Error loading user names:', error);
        },
      });
  }

  protected getUserName(userId: string | undefined): string {
    if (!userId) {
      return 'Unknown';
    }
    return this.userNames().get(userId) || userId;
  }

  protected editClub(club: Club): void {
    const dialogRef = this.dialog.open(EditClubDialog, {
      width: '600px',
      data: { club },
    });

    dialogRef
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result: ClubFormData | undefined) => {
        if (result) {
          this.setProcessing(club.id, true);
          this.clubService
            .updateClub(club.id, result)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
              next: () => {
                this.showSnackBar(`${result.name} has been updated!`);
                // Update the local club data with the new values
                const updatedClubs = this.pendingClubs().map((c) =>
                  c.id === club.id ? { ...c, ...result } : c,
                );
                this.pendingClubs.set(updatedClubs);
                this.setProcessing(club.id, false);
              },
              error: (error) => {
                console.error('Error updating club:', error);
                this.showSnackBar('Failed to update club');
                this.setProcessing(club.id, false);
              },
            });
        }
      });
  }

  protected approveClub(club: Club): void {
    const dialogRef = this.dialog.open(EditClubDialog, {
      width: '600px',
      data: { club, isApprovalMode: true },
    });

    dialogRef
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result: ClubFormData | undefined) => {
        if (result) {
          this.setProcessing(club.id, true);
          // Update club with validated form data AND set it to active
          this.clubService
            .updateClub(club.id, { ...result, isActive: true })
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
              next: () => {
                this.showSnackBar(`${result.name} has been approved!`);
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
          // Remove from pending review queue. The club has been deleted from the database.
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

  private defaultSinceDate(): string {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  protected openRecentDocuments(): void {
    const sinceValue = this.sinceDate();
    if (!sinceValue) {
      this.showSnackBar('Please select a date to search from.');
      return;
    }
    // Append T00:00:00 so the date string is parsed as local midnight rather
    // than UTC midnight (which would be the previous day for negative-offset timezones).
    this.dialog.open<RecentDocumentsDialog, RecentDocumentsDialogData>(RecentDocumentsDialog, {
      width: '700px',
      data: { since: new Date(`${sinceValue}T00:00:00`) },
    });
  }

  protected onStandingsFileSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.standingsUploading.set(true);
    this.storageService
      .uploadStandingsFile(file)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.showSnackBar('Standings file uploaded. Processing will begin shortly.');
          this.standingsUploading.set(false);
          // Reset the file input so the same file can be re-uploaded if needed.
          input.value = '';
        },
        error: (error) => {
          console.error('Error uploading standings file:', error);
          this.showSnackBar('Failed to upload standings file. Please try again.');
          this.standingsUploading.set(false);
        },
      });
  }
}
