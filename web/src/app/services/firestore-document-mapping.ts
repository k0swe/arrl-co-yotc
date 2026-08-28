import { map, Observable } from 'rxjs';
import { Club } from '@arrl-co-yotc/shared/build/app/models/club.model';
import {
  AnyDocument,
  ClubDocument,
  Event,
  EventLog,
  EventRsvp,
} from '@arrl-co-yotc/shared/build/app/models/event.model';
import {
  ClubMembership,
  MembershipRole,
  MembershipStatus,
} from '@arrl-co-yotc/shared/build/app/models/user.model';
import { StandingEntry, StandingsColumns } from '@arrl-co-yotc/shared/build/app/models/standing.model';

const membershipRoles = new Set<string>(Object.values(MembershipRole));
const membershipStatuses = new Set<string>(Object.values(MembershipStatus));

type FirestoreRecord = Record<string, unknown>;

type TypeGuard<T> = (value: unknown) => value is T;

function isRecord(value: unknown): value is FirestoreRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasString(value: FirestoreRecord, key: string): boolean {
  return typeof value[key] === 'string' && (value[key] as string).length > 0;
}

function hasKnownValue(value: FirestoreRecord, key: string): boolean {
  return value[key] !== undefined;
}

function hasStringArray(value: FirestoreRecord, key: string): boolean {
  return Array.isArray(value[key]) && (value[key] as unknown[]).every((entry) => typeof entry === 'string');
}

function isCommonDocument(value: unknown): value is ClubDocument {
  if (!isRecord(value)) {
    return false;
  }

  return (
    hasString(value, 'id') &&
    hasString(value, 'clubId') &&
    hasString(value, 'uploadedBy') &&
    hasString(value, 'storagePath') &&
    hasString(value, 'downloadUrl') &&
    hasString(value, 'filename') &&
    hasKnownValue(value, 'uploadedAt')
  );
}

function isMembershipRole(value: unknown): value is MembershipRole {
  return typeof value === 'string' && membershipRoles.has(value);
}

function isMembershipStatus(value: unknown): value is MembershipStatus {
  return typeof value === 'string' && membershipStatuses.has(value);
}

export function toTypedCollection<T>(
  source$: Observable<unknown[]>,
  guard: TypeGuard<T>,
): Observable<T[]> {
  return source$.pipe(
    map((documents) => documents.filter(guard)),
  );
}

export function toTypedNullableDocument<T>(
  source$: Observable<unknown | null>,
  guard: TypeGuard<T>,
): Observable<T | null> {
  return source$.pipe(
    map((document) => (guard(document) ? document : null)),
  );
}

export function toTypedOptionalDocument<T>(
  source$: Observable<unknown | undefined>,
  guard: TypeGuard<T>,
): Observable<T | undefined> {
  return source$.pipe(
    map((document) => (guard(document) ? document : undefined)),
  );
}

export function toTypedDocumentWithId<T>(
  id: string,
  documentData: unknown,
  guard: TypeGuard<T>,
): T | null {
  if (!isRecord(documentData)) {
    return null;
  }

  const candidate = { ...documentData, id };
  return guard(candidate) ? candidate : null;
}

export function isClub(value: unknown): value is Club {
  if (!isRecord(value)) {
    return false;
  }

  return (
    hasString(value, 'id') &&
    hasString(value, 'name') &&
    hasString(value, 'description') &&
    hasString(value, 'callsign') &&
    hasString(value, 'location') &&
    hasString(value, 'slug') &&
    typeof value['isActive'] === 'boolean' &&
    hasStringArray(value, 'leaderIds') &&
    hasKnownValue(value, 'createdAt') &&
    hasKnownValue(value, 'updatedAt')
  );
}

export function isEvent(value: unknown): value is Event {
  if (!isRecord(value)) {
    return false;
  }

  return (
    hasString(value, 'id') &&
    hasString(value, 'clubId') &&
    hasString(value, 'name') &&
    hasString(value, 'description') &&
    hasString(value, 'createdBy') &&
    hasKnownValue(value, 'startTime') &&
    hasKnownValue(value, 'endTime') &&
    hasKnownValue(value, 'createdAt') &&
    hasKnownValue(value, 'updatedAt')
  );
}

export function isClubMembership(value: unknown): value is ClubMembership {
  if (!isRecord(value)) {
    return false;
  }

  return (
    hasString(value, 'id') &&
    hasString(value, 'userId') &&
    hasString(value, 'clubId') &&
    isMembershipRole(value['role']) &&
    isMembershipStatus(value['status']) &&
    hasKnownValue(value, 'appliedAt') &&
    hasKnownValue(value, 'updatedAt')
  );
}

export function isEventRsvp(value: unknown): value is EventRsvp {
  if (!isRecord(value)) {
    return false;
  }

  return (
    hasString(value, 'id') &&
    hasString(value, 'eventId') &&
    hasString(value, 'userId') &&
    hasString(value, 'clubId') &&
    hasKnownValue(value, 'createdAt') &&
    hasKnownValue(value, 'updatedAt')
  );
}

export function isEventLog(value: unknown): value is EventLog {
  if (!isCommonDocument(value) || !isRecord(value)) {
    return false;
  }

  return hasString(value, 'eventId');
}

export function isClubDocument(value: unknown): value is ClubDocument {
  return isCommonDocument(value);
}

export function isAnyDocument(value: unknown): value is AnyDocument {
  return isCommonDocument(value);
}

export function isStandingEntry(value: unknown): value is StandingEntry {
  return isRecord(value);
}

export function isStandingsColumns(value: unknown): value is StandingsColumns {
  if (!isRecord(value)) {
    return false;
  }

  return (
    Array.isArray(value['columns']) &&
    (value['columns'] as unknown[]).every((column) => typeof column === 'string') &&
    typeof value['updatedAt'] === 'string'
  );
}
