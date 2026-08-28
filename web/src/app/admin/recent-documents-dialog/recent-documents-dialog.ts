import {
  Component,
  ChangeDetectionStrategy,
  computed,
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
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { FormsModule } from '@angular/forms';
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
import { UserService } from '../../services/user.service';
import {
  EventDetailDialog,
  EventDetailDialogData,
} from '../../events/event-detail-dialog/event-detail-dialog';
import { toDate } from '../../utils/timestamp.util';
import { User } from '@arrl-co-yotc/shared/build/app/models/user.model';

export interface RecentDocumentsDialogData {
  since: Date;
  until?: Date;
}

interface RecentDocumentsFilters {
  since: string;
  until: string;
  scope: 'all' | 'event' | 'club';
  clubId: string;
  eventId: string;
  uploadedBy: string;
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
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    FormsModule,
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
  private userService = inject(UserService);
  private dialog = inject(MatDialog);
  private destroyRef = inject(DestroyRef);

  protected data = inject<RecentDocumentsDialogData>(MAT_DIALOG_DATA);

  protected readonly loading = signal(true);
  protected readonly allDocuments = signal<AnyDocument[]>([]);
  protected readonly pageIndex = signal(0);
  protected readonly pageSize = 25;
  protected readonly totalDocuments = signal(0);
  protected readonly openingEventId = signal<string | null>(null);
  protected readonly eventNames = signal<Map<string, string>>(new Map());
  protected readonly clubNames = signal<Map<string, string>>(new Map());
  protected readonly uploaderNames = signal<Map<string, string>>(new Map());

  protected readonly filters = signal<RecentDocumentsFilters>({
    since: this.formatDateForInput(this.data.since),
    until: this.data.until ? this.formatDateForInput(this.data.until) : '',
    scope: 'all',
    clubId: '',
    eventId: '',
    uploadedBy: '',
  });
  protected readonly sinceDate = computed(() => this.parseSinceDate(this.filters().since));
  protected readonly untilDate = computed(() => this.parseUntilDate(this.filters().until));

  protected readonly documents = computed(() => {
    const start = this.pageIndex() * this.pageSize;
    return this.allDocuments().slice(start, start + this.pageSize);
  });
  protected readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.totalDocuments() / this.pageSize)),
  );
  protected readonly hasPreviousPage = computed(() => this.pageIndex() > 0);
  protected readonly hasNextPage = computed(() => this.pageIndex() < this.totalPages() - 1);
  protected readonly clubFilterOptions = computed(() =>
    Array.from(new Set(this.allDocuments().map((doc) => doc.clubId))).sort((a, b) =>
      this.getClubNameById(a).localeCompare(this.getClubNameById(b)),
    ),
  );
  protected readonly eventFilterOptions = computed(() => {
    const selectedClub = this.filters().clubId;
    const events = this.allDocuments().filter(isEventDocument).filter((doc) => {
      if (!selectedClub) return true;
      return doc.clubId === selectedClub;
    });
    const uniqueKeys = new Set(events.map((doc) => this.eventKey(doc.clubId, doc.eventId)));
    return Array.from(uniqueKeys).sort((a, b) => this.getEventNameByKey(a).localeCompare(this.getEventNameByKey(b)));
  });
  protected readonly uploaderFilterOptions = computed(() =>
    Array.from(new Set(this.allDocuments().map((doc) => doc.uploadedBy))).sort((a, b) =>
      this.getUploaderName(a).localeCompare(this.getUploaderName(b)),
    ),
  );

  protected readonly displayedColumns = [
    'filename',
    'uploadedAt',
    'scope',
    'club',
    'uploader',
    'actions',
  ];

  readonly toDate = toDate;
  readonly isEventDocument = isEventDocument;

  ngOnInit(): void {
    this.loadDocuments();
  }

  private loadDocuments(): void {
    this.loading.set(true);
    const filters = this.filters();
    const since = this.parseSinceDate(filters.since);
    const until = this.parseUntilDate(filters.until);
    const { clubId, eventId } = this.parseEventSelection(filters.clubId, filters.eventId);
    this.documentService
      .getRecentDocuments({
        since,
        until,
        scope: filters.scope,
        clubId,
        eventId,
        uploadedBy: filters.uploadedBy || undefined,
      })
      .pipe(
        catchError((error) => {
          console.error('Error loading recent documents:', error);
          return of({ documents: [], total: 0 });
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((result) => {
        this.allDocuments.set(result.documents);
        this.totalDocuments.set(result.total);
        this.loading.set(false);
        this.loadEventNames(result.documents);
        this.loadClubNames(result.documents);
        this.loadUploaderNames(result.documents);
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

  private loadUploaderNames(docs: AnyDocument[]): void {
    const uniqueUploaderIds = new Set(docs.map((doc) => doc.uploadedBy));
    if (uniqueUploaderIds.size === 0) return;

    const fetches: Record<string, Observable<User | null>> = {};
    for (const userId of uniqueUploaderIds) {
      fetches[userId] = this.userService.getUser(userId).pipe(catchError(() => of(null)));
    }
    forkJoin(fetches)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((results) => {
        const names = new Map<string, string>();
        for (const [userId, user] of Object.entries(results)) {
          if (user) {
            names.set(userId, `${user.name} (${user.callsign})`);
          }
        }
        this.uploaderNames.set(names);
      });
  }

  protected getClubName(doc: AnyDocument): string {
    return this.getClubNameById(doc.clubId);
  }

  protected getEventName(doc: AnyDocument): string {
    if (!isEventDocument(doc)) return '';
    return this.getEventNameByKey(this.eventKey(doc.clubId, doc.eventId));
  }

  protected getClubNameById(clubId: string): string {
    return this.clubNames().get(clubId) ?? clubId;
  }

  private getEventNameByKey(key: string): string {
    return this.eventNames().get(key) ?? key;
  }

  protected getUploaderName(userId: string): string {
    return this.uploaderNames().get(userId) ?? userId;
  }

  protected onFilterChange(partial: Partial<RecentDocumentsFilters>): void {
    const current = this.filters();
    const next = { ...current, ...partial };
    if (partial.scope === 'club') {
      next.eventId = '';
    }
    if (partial.clubId !== undefined) {
      next.eventId = '';
    }
    this.filters.set(next);
    this.pageIndex.set(0);
    this.loadDocuments();
  }

  protected onPreviousPage(): void {
    if (!this.hasPreviousPage()) return;
    this.pageIndex.update((value) => value - 1);
  }

  protected onNextPage(): void {
    if (!this.hasNextPage()) return;
    this.pageIndex.update((value) => value + 1);
  }

  protected getEventOptionName(key: string): string {
    const [clubId] = key.split(':');
    return `${this.getEventNameByKey(key)} (${this.getClubNameById(clubId)})`;
  }

  protected getEventFilterValue(key: string): string {
    return key;
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

  private formatDateForInput(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private parseSinceDate(value: string): Date {
    return new Date(`${value}T00:00:00`);
  }

  private parseUntilDate(value: string): Date | undefined {
    if (!value) return undefined;
    return new Date(`${value}T23:59:59`);
  }

  private parseEventSelection(
    selectedClubId: string,
    selectedEventId: string,
  ): { clubId: string | undefined; eventId: string | undefined } {
    if (!selectedEventId) {
      return {
        clubId: selectedClubId || undefined,
        eventId: undefined,
      };
    }
    const [clubIdFromEvent, eventId] = selectedEventId.includes(':')
      ? selectedEventId.split(':')
      : [selectedClubId, selectedEventId];
    return {
      clubId: selectedClubId || clubIdFromEvent || undefined,
      eventId: eventId || undefined,
    };
  }
}
