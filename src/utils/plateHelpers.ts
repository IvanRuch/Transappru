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

// First run of digits in a plate. For a standard Russian plate "А123БВ77"
// this is "123" — the main 3-digit segment, excluding the region code that
// lives in `auto_number_region_code`. Used as the primary sort key.
const PLATE_DIGIT_RUN = /\d+/;

/**
 * Sort key for a Russian licence plate.
 *
 * Primary: numeric value of the first digit run in the plate. For the
 * standard format "А123БВ77" callers typically pass `auto_number_base`
 * ("А123БВ") so the region code can never bleed into the key.
 * Secondary: the plate string itself, used for an alphabetical
 * tie-breaker by the caller.
 *
 * Edge cases by design:
 *   - undefined / empty input → primary 0
 *   - plate with no digits at all → primary 0
 *   - non-standard plates (trailers, special equipment) → first digit
 *     run wins; matches the user-stated intent "by digits in the number".
 */
export function plateSortKey(plate: string | undefined | null): {
  primary: number;
  secondary: string;
} {
  if (!plate) return { primary: 0, secondary: '' };
  const match = PLATE_DIGIT_RUN.exec(plate);
  return {
    primary: match ? parseInt(match[0], 10) : 0,
    secondary: plate,
  };
}

// Minimal shape needed by the comparator. Compatible with `AutoItem`
// from `src/types/auto.ts` and any narrower object that exposes the same
// two fields.
type PlateLike = {
  auto_number?: string;
  auto_number_base?: string;
};

/**
 * Comparator: primary = numeric segment of `auto_number_base` (falls back
 * to `auto_number` if base is missing), secondary = full `auto_number`
 * alphabetically with the Russian collation. Result is deterministic
 * across reloads.
 *
 * Why not `localeCompare(b, 'ru', { numeric: true })`: that still sorts
 * letters first, which is exactly the behaviour the manager team asked
 * us to change.
 */
export function compareByPlateNumber<T extends PlateLike>(a: T, b: T): number {
  const keyA = plateSortKey(a.auto_number_base || a.auto_number);
  const keyB = plateSortKey(b.auto_number_base || b.auto_number);
  if (keyA.primary !== keyB.primary) return keyA.primary - keyB.primary;
  return (a.auto_number || '').localeCompare(b.auto_number || '', 'ru');
}

/**
 * Returns a new array sorted in ascending order by the main numeric
 * segment of each item's plate. Does NOT mutate the input.
 *
 * Single source of truth for vehicle list ordering on both mobile and
 * web. Called by `useAutoData` before every `setAutoList` so the user
 * always sees a consistent numeric order regardless of whether the
 * legacy `/get-auto-list` backend keeps shipping a lexicographic order
 * or eventually adopts the same sort itself (idempotent — sorting an
 * already-sorted array is O(n) for Timsort).
 */
export function sortAutoListByPlateNumber<T extends PlateLike>(items: T[]): T[] {
  return [...items].sort(compareByPlateNumber);
}
