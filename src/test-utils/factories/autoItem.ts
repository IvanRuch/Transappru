import type { AutoItem } from '../../types/auto';

/**
 * Factory for `AutoItem` (one row in the vehicle list).
 *
 * Defaults to a "clean" car (no expired passes / fines / OSAGO / DK)
 * with auto_number `А001АА77`. Override per test:
 *
 *   makeAutoItem({ id: '2', auto_number: 'В234ВВ50' })
 *
 * For lists, use `makeAutoList(n)` below to get a deterministic sequence
 * of unique ids and plates.
 */
export function makeAutoItem(overrides: Partial<AutoItem> = {}): AutoItem {
  return {
    id: '1',
    auto_number: 'А001АА77',
    auto_number_base: 'А001АА',
    auto_number_region_code: '77',
    check_passes_expared: 0,
    check_diagnostic_card_expared: 0,
    check_fines_expared: 0,
    check_osago_expared: 0,
    ...overrides,
  };
}

/**
 * N consecutive `AutoItem`s with deterministic ids and plates so tests
 * can assert on order. Plate digits start at 100 and increment by 1.
 *
 *   makeAutoList(3)  →  [
 *     { id: '1', auto_number: 'А100АА77', auto_number_base: 'А100АА', ... },
 *     { id: '2', auto_number: 'А101АА77', auto_number_base: 'А101АА', ... },
 *     { id: '3', auto_number: 'А102АА77', auto_number_base: 'А102АА', ... },
 *   ]
 */
export function makeAutoList(n: number, overridesByIndex: (i: number) => Partial<AutoItem> = () => ({})): AutoItem[] {
  return Array.from({ length: n }, (_, i) => {
    const num = 100 + i;
    return makeAutoItem({
      id: String(i + 1),
      auto_number: `А${num}АА77`,
      auto_number_base: `А${num}АА`,
      auto_number_region_code: '77',
      ...overridesByIndex(i),
    });
  });
}
