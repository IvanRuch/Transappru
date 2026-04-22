/**
 * useInnBinding — INN validation rules.
 * INN is either 10 digits (юридическое лицо) or 12 digits (ИП / физлицо).
 */

const isInnValid = (inn: string) => /^[0-9]{10}$/.test(inn) || /^[0-9]{12}$/.test(inn);

describe('INN validation', () => {
  it('accepts 10-digit INN (legal entity)', () => {
    expect(isInnValid('1234567890')).toBe(true);
  });

  it('accepts 12-digit INN (individual)', () => {
    expect(isInnValid('123456789012')).toBe(true);
  });

  it('rejects 9 or 11 digits (wrong length)', () => {
    expect(isInnValid('123456789')).toBe(false);
    expect(isInnValid('12345678901')).toBe(false);
  });

  it('rejects non-digits', () => {
    expect(isInnValid('12345abcde')).toBe(false);
  });

  it('rejects empty', () => {
    expect(isInnValid('')).toBe(false);
  });
});
