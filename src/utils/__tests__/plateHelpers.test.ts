import { normalizePlate, GRZ_ALLOWED, DIGITS_ONLY, LATIN_TO_CYRILLIC } from '../plateHelpers';

describe('normalizePlate', () => {
  it('uppercases lowercase Cyrillic', () => {
    expect(normalizePlate('а123ав')).toBe('А123АВ');
  });

  it('converts Latin lookalikes to Cyrillic', () => {
    expect(normalizePlate('A123AB')).toBe('А123АВ');
    expect(normalizePlate('P777MK')).toBe('Р777МК');
  });

  it('leaves unmatched characters as-is (uppercased)', () => {
    // 'Z' has no Cyrillic lookalike in the map
    expect(normalizePlate('Z999ZZ')).toBe('Z999ZZ');
  });

  it('is idempotent on already-Cyrillic input', () => {
    const plate = 'А123ВС77';
    expect(normalizePlate(plate)).toBe(plate);
  });

  it('maps all 12 Latin lookalikes', () => {
    const expected = Object.keys(LATIN_TO_CYRILLIC).length;
    expect(expected).toBe(12);
    Object.entries(LATIN_TO_CYRILLIC).forEach(([lat, cyr]) => {
      expect(normalizePlate(lat)).toBe(cyr);
    });
  });
});

describe('regex allowlists', () => {
  it('GRZ_ALLOWED accepts Cyrillic + digits + Latin-lookalikes', () => {
    expect(GRZ_ALLOWED.test('А123АВ')).toBe(true);
    expect(GRZ_ALLOWED.test('A123AB')).toBe(true);
    expect(GRZ_ALLOWED.test('')).toBe(true);
  });

  it('GRZ_ALLOWED rejects disallowed Latin letters', () => {
    expect(GRZ_ALLOWED.test('Z123')).toBe(false);
    expect(GRZ_ALLOWED.test('QQ')).toBe(false);
  });

  it('DIGITS_ONLY matches only digit strings', () => {
    expect(DIGITS_ONLY.test('123')).toBe(true);
    expect(DIGITS_ONLY.test('')).toBe(true);
    expect(DIGITS_ONLY.test('1a')).toBe(false);
  });
});
