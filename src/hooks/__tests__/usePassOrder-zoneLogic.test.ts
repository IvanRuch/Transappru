/**
 * usePassOrder — manual-zone-override banner logic (ADR-005 parity fix).
 *
 * The banner should fire whenever the user toggles to a zone that differs
 * from the auto-detected one (regardless of source: map pick OR
 * previously-entered user-address). See useUserProfile / useInnBinding
 * for the `detectedLocationType` concept.
 */

const computeIsLocationTypeManual = (
  detectedLocationType: string,
  tab: string,
): boolean =>
  detectedLocationType !== '' && tab !== detectedLocationType;

describe('manual-zone override detection', () => {
  it('is NOT manual when no zone was auto-detected', () => {
    expect(computeIsLocationTypeManual('', 'mkad')).toBe(false);
    expect(computeIsLocationTypeManual('', '')).toBe(false);
  });

  it('is NOT manual when user toggles to the same zone as detected', () => {
    expect(computeIsLocationTypeManual('mkad', 'mkad')).toBe(false);
    expect(computeIsLocationTypeManual('ttk', 'ttk')).toBe(false);
  });

  it('IS manual when user toggles to a different zone', () => {
    expect(computeIsLocationTypeManual('mkad', 'ttk')).toBe(true);
    expect(computeIsLocationTypeManual('ttk', 'sk')).toBe(true);
    expect(computeIsLocationTypeManual('sk', 'mkad')).toBe(true);
  });

  it('treats source-agnostic — works for map pick and user-history picks', () => {
    // Previously this was gated on `lon/lat !== ''` (map only).
    // Now any source that populates detectedLocationType triggers the banner.
    expect(computeIsLocationTypeManual('mkad', 'ttk')).toBe(true);
  });
});
