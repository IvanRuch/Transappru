/**
 * useUserProfile — phone normalization logic extracted for direct testing.
 * Keeps the same rules as the hook's `normalizePhoneInput`.
 */

const normalizePhoneInput = (v: string): string => {
  if (v === '+7') return '';
  if (v === '7') return '+7';
  if (v === '+' || v === '8') return '+7';
  if (/^\d$/.test(v)) return '+7' + v;
  return v;
};

describe('phone normalization', () => {
  it('clears "+7" to empty (user backspaced out the prefix)', () => {
    expect(normalizePhoneInput('+7')).toBe('');
  });
  it('auto-prefixes "+7" when the only digit typed is 7', () => {
    expect(normalizePhoneInput('7')).toBe('+7');
  });
  it('handles "8" (Russian mobile historical)', () => {
    expect(normalizePhoneInput('8')).toBe('+7');
  });
  it('handles leading "+" (user started typing prefix)', () => {
    expect(normalizePhoneInput('+')).toBe('+7');
  });
  it('prefixes single digit with "+7"', () => {
    expect(normalizePhoneInput('9')).toBe('+79');
    expect(normalizePhoneInput('5')).toBe('+75');
  });
  it('passes through a full number unchanged', () => {
    expect(normalizePhoneInput('+79161234567')).toBe('+79161234567');
  });
});

describe('phone validity regex', () => {
  const isValid = (phone: string) => /^\+7\d{10}$/.test(phone);

  it('accepts +7 followed by exactly 10 digits', () => {
    expect(isValid('+79161234567')).toBe(true);
  });
  it('rejects missing prefix', () => {
    expect(isValid('79161234567')).toBe(false);
  });
  it('rejects wrong digit count', () => {
    expect(isValid('+7916123456')).toBe(false);
    expect(isValid('+791612345678')).toBe(false);
  });
  it('rejects empty', () => {
    expect(isValid('')).toBe(false);
  });
});
