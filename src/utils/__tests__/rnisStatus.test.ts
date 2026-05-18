import { getRnisStatus } from '../rnisStatus';

describe('getRnisStatus', () => {
  // Null / missing data
  it('returns null for null input', () => {
    expect(getRnisStatus(null)).toBeNull();
  });

  it('returns null for undefined input', () => {
    expect(getRnisStatus(undefined)).toBeNull();
  });

  it('returns null when registrationOk is absent', () => {
    expect(getRnisStatus({})).toBeNull();
  });

  // Not registered
  it('registered=false when registrationOk is "0"', () => {
    const result = getRnisStatus({ registrationOk: '0' });
    expect(result).not.toBeNull();
    expect(result!.registered).toBe(false);
  });

  it('registered=false when registrationOk is 0 (number)', () => {
    const result = getRnisStatus({ registrationOk: 0 });
    expect(result!.registered).toBe(false);
  });

  // Registered
  it('registered=true when registrationOk is "1"', () => {
    const result = getRnisStatus({ registrationOk: '1', rnis_registered: '2026-01-15', telematicsOk: '1', telematics_date: '2026-05-17 10:00:00' });
    expect(result!.registered).toBe(true);
    expect(result!.registeredAt).toBe('2026-01-15');
  });

  it('registered=true when registrationOk is 1 (number)', () => {
    const result = getRnisStatus({ registrationOk: 1, telematicsOk: 1, telematics_date: '2026-05-17 10:00:00' });
    expect(result!.registered).toBe(true);
  });

  // Telematics: never (no transmission at all)
  it('telematics=never when telematicsOk="0" and telematics_date="0"', () => {
    const result = getRnisStatus({ registrationOk: '1', telematicsOk: '0', telematics_date: '0' });
    expect(result!.telematics).toBe('never');
    expect(result!.lastTransmissionAt).toBeNull();
  });

  it('telematics=never when telematicsOk=0 (number) and telematics_date=0 (number)', () => {
    const result = getRnisStatus({ registrationOk: 1, telematicsOk: 0, telematics_date: 0 });
    expect(result!.telematics).toBe('never');
    expect(result!.lastTransmissionAt).toBeNull();
  });

  // Telematics: stale (transmitted but >24h ago — the bug report case)
  it('telematics=stale when telematicsOk="0" and telematics_date is a real date', () => {
    const result = getRnisStatus({
      registrationOk: '1',
      telematicsOk: '0',
      telematics_date: '2026-05-16 15:52:39',
    });
    expect(result!.telematics).toBe('stale');
    expect(result!.lastTransmissionAt).toBe('2026-05-16 15:52:39');
  });

  // Telematics: active
  it('telematics=active when telematicsOk="1"', () => {
    const result = getRnisStatus({
      registrationOk: '1',
      telematicsOk: '1',
      telematics_date: '2026-05-18 09:30:00',
    });
    expect(result!.telematics).toBe('active');
    expect(result!.lastTransmissionAt).toBe('2026-05-18 09:30:00');
  });

  it('telematics=active with no date gives null lastTransmissionAt', () => {
    const result = getRnisStatus({ registrationOk: '1', telematicsOk: '1', telematics_date: '0' });
    expect(result!.telematics).toBe('active');
    expect(result!.lastTransmissionAt).toBeNull();
  });

  // registeredAt null when rnis_registered is absent
  it('registeredAt=null when rnis_registered not provided', () => {
    const result = getRnisStatus({ registrationOk: '1', telematicsOk: '1' });
    expect(result!.registeredAt).toBeNull();
  });
});
