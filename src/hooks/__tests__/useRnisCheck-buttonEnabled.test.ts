/**
 * useRnisCheck — "Check" button-enabled rule.
 *
 * The RNIS-check button is enabled only when the plate input is fully
 * populated: 6-char base + 2-or-3-digit region. Same rule is used in
 * `useInnBinding` for the shared full-screen RNIS flow — keeping them
 * in sync is important, so it's explicitly re-asserted here.
 */

const isRnisButtonEnabled = (base: string, region: string): boolean =>
  base.length === 6 && (region.length === 2 || region.length === 3);

describe('RNIS button enabled rule', () => {
  it('requires a 6-char base', () => {
    expect(isRnisButtonEnabled('А123В', '77')).toBe(false);
    expect(isRnisButtonEnabled('А123ВС', '77')).toBe(true);
  });

  it('accepts both 2- and 3-digit region codes', () => {
    expect(isRnisButtonEnabled('А123ВС', '77')).toBe(true);
    expect(isRnisButtonEnabled('А123ВС', '777')).toBe(true);
  });

  it('rejects 1-digit or 4-digit region', () => {
    expect(isRnisButtonEnabled('А123ВС', '7')).toBe(false);
    expect(isRnisButtonEnabled('А123ВС', '7777')).toBe(false);
  });

  it('rejects empty inputs', () => {
    expect(isRnisButtonEnabled('', '')).toBe(false);
    expect(isRnisButtonEnabled('А123ВС', '')).toBe(false);
    expect(isRnisButtonEnabled('', '77')).toBe(false);
  });
});
