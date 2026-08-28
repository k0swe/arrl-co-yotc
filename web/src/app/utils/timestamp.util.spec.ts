import { toDate } from './timestamp.util';

describe('toDate', () => {
  it('returns a valid Date input unchanged', () => {
    const date = new Date('2026-08-28T19:05:24.653Z');

    expect(toDate(date)).toBe(date);
  });

  it('converts a Firestore timestamp-like value', () => {
    const date = new Date('2026-08-28T19:05:24.653Z');

    expect(toDate({ toDate: () => date })).toBe(date);
  });

  it('converts a valid date string', () => {
    const result = toDate('2026-08-28T19:05:24.653Z');

    expect(result?.toISOString()).toBe('2026-08-28T19:05:24.653Z');
  });

  it.each([
    null,
    undefined,
    '',
    'not a date',
    new Date('not a date'),
    { toDate: () => new Date('not a date') },
    { toDate: () => 'not a date' },
    {
      toDate: () => {
        throw new Error('invalid timestamp');
      },
    },
    0,
    {},
  ])('returns null for an invalid value', (value) => {
    expect(toDate(value)).toBeNull();
  });
});
