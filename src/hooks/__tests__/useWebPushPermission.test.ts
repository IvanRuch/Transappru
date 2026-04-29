import { deriveState, SNOOZE_DURATION_MS } from '../useWebPushPermission';

describe('deriveState', () => {
  const NOW = Date.UTC(2026, 3, 29, 12, 0, 0);

  it('returns "unsupported" when browser permission is undefined', () => {
    expect(deriveState(undefined, null, NOW)).toBe('unsupported');
  });

  it('returns "granted" when browser already granted', () => {
    expect(deriveState('granted', null, NOW)).toBe('granted');
    // Snooze is irrelevant once granted.
    expect(deriveState('granted', NOW + 1000, NOW)).toBe('granted');
  });

  it('returns "denied" when browser blocked', () => {
    expect(deriveState('denied', null, NOW)).toBe('denied');
  });

  it('returns "idle" on default permission with no snooze', () => {
    expect(deriveState('default', null, NOW)).toBe('idle');
  });

  it('returns "snoozed" when snoozedUntil is in the future', () => {
    expect(deriveState('default', NOW + 1000, NOW)).toBe('snoozed');
  });

  it('returns "idle" when snoozedUntil is in the past (expired)', () => {
    expect(deriveState('default', NOW - 1000, NOW)).toBe('idle');
  });

  it('treats exact-equal snoozedUntil as expired (idle, not snoozed)', () => {
    // At the boundary tick the snooze just elapsed — show banner again.
    expect(deriveState('default', NOW, NOW)).toBe('idle');
  });
});

describe('SNOOZE_DURATION_MS', () => {
  it('is exactly 14 days in milliseconds', () => {
    expect(SNOOZE_DURATION_MS).toBe(14 * 24 * 60 * 60 * 1000);
  });

  it('rounds to 14 days when interpreted as days', () => {
    const days = SNOOZE_DURATION_MS / (24 * 60 * 60 * 1000);
    expect(days).toBe(14);
  });
});

describe('storage marker semantics (smoke)', () => {
  // Sanity check: deriveState handles the typical state transitions a real
  // user goes through, expressed as a sequence rather than per-call mocks.
  it('idle → snoozed → idle (after 14d) → granted', () => {
    const start = Date.UTC(2026, 0, 1);
    const fourteenDays = SNOOZE_DURATION_MS;

    // Day 0: user sees banner (idle)
    expect(deriveState('default', null, start)).toBe('idle');

    // User clicks "Позже"; snooze now+14d
    const snoozedUntil = start + fourteenDays;
    expect(deriveState('default', snoozedUntil, start)).toBe('snoozed');

    // Day 7: still snoozed
    expect(deriveState('default', snoozedUntil, start + fourteenDays / 2)).toBe('snoozed');

    // Day 14 + 1 ms: snooze expired, idle again
    expect(deriveState('default', snoozedUntil, snoozedUntil + 1)).toBe('idle');

    // User clicks "Включить" → granted
    expect(deriveState('granted', snoozedUntil, snoozedUntil + 1)).toBe('granted');
  });

  it('dismiss path: snoozedUntil 100 years ahead never elapses in practice', () => {
    const start = Date.now();
    const hundredYears = 100 * 365 * 24 * 60 * 60 * 1000;
    expect(deriveState('default', start + hundredYears, start)).toBe('snoozed');
    // Even one year later, still snoozed.
    expect(deriveState('default', start + hundredYears, start + 365 * 24 * 60 * 60 * 1000)).toBe('snoozed');
  });
});
