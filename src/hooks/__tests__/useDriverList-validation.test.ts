/**
 * useDriverList — form validation + VU_reg auto-format logic.
 * Kept in sync with the hook's internal rules: VU=10 digits, VU_reg=DD.MM.YYYY
 * (auto-formatted from digits-only input).
 */

const isVuValid = (vu: string) => /^[0-9]{10}$/.test(vu);
const isVuRegValid = (vuReg: string) => /^[0-9]{2}\.[0-9]{2}\.[0-9]{4}$/.test(vuReg);

const formatVuReg = (raw: string): string => {
  const digits = raw.replace(/\D/g, '').slice(0, 8);
  let formatted = digits.slice(0, 2);
  if (digits.length > 2) formatted += '.' + digits.slice(2, 4);
  if (digits.length > 4) formatted += '.' + digits.slice(4, 8);
  return formatted;
};

describe('VU number validation', () => {
  it('accepts exactly 10 digits', () => {
    expect(isVuValid('1234567890')).toBe(true);
  });
  it('rejects wrong length', () => {
    expect(isVuValid('123456789')).toBe(false);
    expect(isVuValid('12345678901')).toBe(false);
  });
  it('rejects non-digits', () => {
    expect(isVuValid('12345abcde')).toBe(false);
  });
  it('rejects empty', () => {
    expect(isVuValid('')).toBe(false);
  });
});

describe('VU issue date (DD.MM.YYYY)', () => {
  it('accepts correctly formatted date', () => {
    expect(isVuRegValid('01.01.2020')).toBe(true);
    expect(isVuRegValid('31.12.2030')).toBe(true);
  });
  it('rejects missing dots', () => {
    expect(isVuRegValid('01012020')).toBe(false);
  });
  it('rejects partial input', () => {
    expect(isVuRegValid('01.01')).toBe(false);
  });
});

describe('VU issue date auto-format', () => {
  it('formats digit-by-digit progression', () => {
    expect(formatVuReg('0')).toBe('0');
    expect(formatVuReg('01')).toBe('01');
    expect(formatVuReg('011')).toBe('01.1');
    expect(formatVuReg('0101')).toBe('01.01');
    expect(formatVuReg('01012')).toBe('01.01.2');
    expect(formatVuReg('01012020')).toBe('01.01.2020');
  });
  it('strips non-digits from existing format', () => {
    expect(formatVuReg('01.01.2020')).toBe('01.01.2020');
  });
  it('caps at 8 digits even if more typed', () => {
    expect(formatVuReg('123456789999')).toBe('12.34.5678');
  });
});
