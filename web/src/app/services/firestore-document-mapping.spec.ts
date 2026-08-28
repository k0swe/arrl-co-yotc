import { firstValueFrom, of } from 'rxjs';
import { describe, expect, it } from 'vitest';
import { MembershipRole, MembershipStatus } from '@arrl-co-yotc/shared/build/app/models/user.model';
import {
  isClub,
  isClubMembership,
  isStandingsColumns,
  toTypedCollection,
  toTypedDocumentWithId,
  toTypedOptionalDocument,
} from './firestore-document-mapping';

describe('firestore-document-mapping', () => {
  it('filters invalid club documents from collection data', async () => {
    const validClub = {
      id: 'club-1',
      name: 'Test Club',
      description: 'Club description',
      callsign: 'W0TST',
      location: 'Denver, CO',
      slug: 'test-club',
      isActive: true,
      leaderIds: ['leader-1'],
      createdAt: { seconds: 1 },
      updatedAt: { seconds: 2 },
    };

    const result = await firstValueFrom(
      toTypedCollection(of([validClub, { id: 'club-2', name: 'Invalid Club' }]), isClub),
    );

    expect(result).toEqual([validClub]);
  });

  it('maps snapshot data to a typed document with ID when complete', () => {
    const mapped = toTypedDocumentWithId(
      'membership-1',
      {
        userId: 'user-1',
        clubId: 'club-1',
        role: MembershipRole.Member,
        status: MembershipStatus.Active,
        appliedAt: { seconds: 1 },
        updatedAt: { seconds: 2 },
      },
      isClubMembership,
    );

    expect(mapped).toEqual({
      id: 'membership-1',
      userId: 'user-1',
      clubId: 'club-1',
      role: MembershipRole.Member,
      status: MembershipStatus.Active,
      appliedAt: { seconds: 1 },
      updatedAt: { seconds: 2 },
    });
  });

  it('returns undefined for invalid optional documents', async () => {
    const result = await firstValueFrom(
      toTypedOptionalDocument(of({ columns: ['Callsign'], updatedAt: 123 }), isStandingsColumns),
    );

    expect(result).toBeUndefined();
  });
});
