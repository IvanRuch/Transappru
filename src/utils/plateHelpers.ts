// Russian license plates use only these 12 Cyrillic letters (matching Latin lookalikes)
export const LATIN_TO_CYRILLIC: Record<string, string> = {
  A: 'А', B: 'В', E: 'Е', K: 'К', M: 'М', H: 'Н',
  O: 'О', P: 'Р', C: 'С', T: 'Т', Y: 'У', X: 'Х',
};

export const GRZ_ALLOWED = /^[АВЕКМНОРСТУХABEKMHOPCTYX0-9]*$/i;
export const DIGITS_ONLY = /^[0-9]*$/;

export function normalizePlate(value: string): string {
  return value
    .toUpperCase()
    .split('')
    .map(ch => LATIN_TO_CYRILLIC[ch] || ch)
    .join('');
}
