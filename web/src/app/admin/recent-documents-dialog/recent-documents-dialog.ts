import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  DestroyRef,
  OnInit,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DatePipe } from '@angular/common';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA, MatDialog } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatListModule } from '@angular/material/list';
import { MatDividerModule } from '@angular/material/divider';
import { MatTableModule } from '@angular/material/table';
import { catchError, forkJoin, Observable, of } from 'rxjs';
import { EventLog } from '@arrl-co-yotc/shared/build/app/models/event.model';
import { Club } from '@arrl-co-yotc/shared/build/app/models/club.model';
import { Event } from '@arrl-co-yotc/shared/build/app/models/event.model';
import { DocumentService } from '../../services/document.service';
import { EventService } from '../../services/event.service';
import { ClubService } from '../../services/club.service';
import {
  EventDetailDialog,
  EventDetailDialogData,
} from '../../events/event-detail-dialog/event-detail-dialog';
import { toDate } from '../../utils/timestamp.util';

export interface RecentDocumentsDialogData {
  since: Date;
}

@Component({
  selector: 'app-recent-documents-dialog',
  imports: [
    DatePipe,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatListModule,
    MatDividerModule,
    MatTableModule,
  ],
  templateUrl: './recent-documents-dialog.html',
  styleUrl: './recent-documents-dialog.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecentDocumentsDialog implements OnInit {
  private dialogRef = inject(MatDialogRef<RecentDocumentsDialog>);
  private documentService = inject(DocumentService);
  private eventService = inject(EventService);
  private clubService = inject(ClubService);
  private dialog = inject(MatDialog);
  private destroyRef = inject(DestroyRef);

  protected data = inject<RecentDocumentsDialogData>(MAT_DIALOG_DATA);

  protected readonly loading = signal(true);
  protected readonly documents = signal<EventLog[]>([]);
  protected readonly openingEventId = signal<string | null>(null);
  protected readonly eventNames = signal<Map<string, string>>(new Map());

  protected readonly displayedColumns = ['filename', 'uploadedAt', 'actions'];

  readonly toDate = toDate;

  ngOnInit(): void {
    this.loadDocuments();
  }

  private loadDocuments(): void {
    this.loading.set(true);
    this.documentService
      .getDocumentsSince(this.data.since)
      .pipe(
        catchError((error) => {
          console.error('Error loading recent documents:', error);
          return of([]);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((docs) => {
        this.documents.set(docs);
        this.loading.set(false);
        this.loadEventNames(docs);
      });
  }

  private loadEventNames(docs: EventLog[]): void {
    const uniqueKeys = new Set(docs.map((d) => this.eventKey(d)));
    if (uniqueKeys.size === 0) return;

    const fetches: Record<string, Observable<Event | null>> = {};
    for (const key of uniqueKeys) {
      const [clubId, eventId] = key.split(':');
      fetches[key] = this.eventService.getEvent(clubId, eventId).pipe(catchError(() => of(null)));
    }
    forkJoin(fetches)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((results) => {
        const names = new Map<string, string>();
        for (const [key, event] of Object.entries(results)) {
          if (event) names.set(key, event.name);
        }
        this.eventNames.set(names);
      });
  }

  private eventKey(doc: EventLog): string {
    return `${doc.clubId}:${doc.eventId}`;
  }

  protected getEventName(doc: EventLog): string {
    return this.eventNames().get(this.eventKey(doc)) ?? 'View Event';
  }

  protected openEventDetail(document: EventLog): void {
    this.openingEventId.set(document.id);

    forkJoin({
      event: this.eventService
        .getEvent(document.clubId, document.eventId)
        .pipe(catchError(() => of(null))),
      club: this.clubService.getClubById(document.clubId).pipe(catchError(() => of(null))),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(({ event, club }) => {
        this.openingEventId.set(null);
        if (event && club) {
          this.dialog.open<EventDetailDialog, EventDetailDialogData>(EventDetailDialog, {
            width: '600px',
            data: { event: event as Event, club: club as Club },
          });
        }
      });
  }

  protected onClose(): void {
    this.dialogRef.close();
  }
}
