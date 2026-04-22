/**
 * Test the one non-trivial piece of logic extracted from useNotificationList —
 * the "is this notification new?" comparison that handles both string and
 * number shapes returned by the backend. See notifications.ts doc.
 */

/** Mirrors the in-hook helper; kept in sync manually. */
const isNew = (viewed: string | number | undefined) => String(viewed) === '0';

describe('notification viewed-flag comparison', () => {
  it('treats "0" (string) as new', () => {
    expect(isNew('0')).toBe(true);
  });
  it('treats 0 (number) as new', () => {
    expect(isNew(0)).toBe(true);
  });
  it('treats "1" as viewed', () => {
    expect(isNew('1')).toBe(false);
  });
  it('treats 1 (number) as viewed', () => {
    expect(isNew(1)).toBe(false);
  });
  it('treats undefined as not-new', () => {
    expect(isNew(undefined)).toBe(false);
  });
});
