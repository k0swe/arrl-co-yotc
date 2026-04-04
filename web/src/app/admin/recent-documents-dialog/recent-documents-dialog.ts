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
import {
  AnyDocument,
  isEventDocument,
} from '@arrl-co-yotc/shared/build/app/models/event.model';
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
  protected readonly documents = signal<AnyDocument[]>([]);
  protected readonly openingEventId = signal<string | null>(null);
  protected readonly eventNames = signal<Map<string, string>>(new Map());
  protected readonly clubNames = signal<Map<string, string>>(new Map());

  protected readonly displayedColumns = ['filename', 'uploadedAt', 'club', 'actions'];

  readonly toDate = toDate;
  readonly isEventDocument = isEventDocument;

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
        this.loadClubNames(docs);
      });
  }

  private loadEventNames(docs: AnyDocument[]): void {
    const eventDocs = docs.filter(isEventDocument);
    const uniqueKeys = new Set(eventDocs.map((d) => this.eventKey(d.clubId, d.eventId)));
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

  private eventKey(clubId: string, eventId: string): string {
    return `${clubId}:${eventId}`;
  }

  private loadClubNames(docs: AnyDocument[]): void {
    const uniqueClubIds = new Set(docs.map((d) => d.clubId));
    if (uniqueClubIds.size === 0) return;

    const fetches: Record<string, Observable<Club | null>> = {};
    for (const clubId of uniqueClubIds) {
      fetches[clubId] = this.clubService.getClubById(clubId).pipe(catchError(() => of(null)));
    }
    forkJoin(fetches)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((results) => {
        const names = new Map<string, string>();
        for (const [clubId, club] of Object.entries(results)) {
          if (club) names.set(clubId, club.name);
        }
        this.clubNames.set(names);
      });
  }

  protected getClubName(doc: AnyDocument): string {
    return this.clubNames().get(doc.clubId) ?? doc.clubId;
  }

  protected getEventName(doc: AnyDocument): string {
    if (!isEventDocument(doc)) return '';
    return this.eventNames().get(this.eventKey(doc.clubId, doc.eventId)) ?? 'View Event';
  }

  protected openEventDetail(document: AnyDocument): void {
    if (!isEventDocument(document)) return;

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
