import {
  plateSortKey,
  compareByPlateNumber,
  sortAutoListByPlateNumber,
} from '../plateHelpers';

describe('plateSortKey', () => {
  it('extracts the main 3-digit segment from a standard plate', () => {
    expect(plateSortKey('А123БВ')).toEqual({ primary: 123, secondary: 'А123БВ' });
    expect(plateSortKey('А123БВ77')).toEqual({ primary: 123, secondary: 'А123БВ77' });
  });

  it('returns primary 0 for missing / empty / non-digit input', () => {
    expect(plateSortKey(undefined).primary).toBe(0);
    expect(plateSortKey(null).primary).toBe(0);
    expect(plateSortKey('').primary).toBe(0);
    expect(plateSortKey('АБВГД').primary).toBe(0);
  });

  it('preserves original string as secondary key for tie-breaking', () => {
    expect(plateSortKey('К123ОР99').secondary).toBe('К123ОР99');
  });

  it('handles non-standard plates by taking the first digit run', () => {
    // Trailers / special equipment may have differing layouts.
    expect(plateSortKey('АА1234').primary).toBe(1234);
    expect(plateSortKey('34АВ').primary).toBe(34);
  });
});

describe('compareByPlateNumber', () => {
  const make = (auto_number_base: string, auto_number = auto_number_base) => ({
    auto_number_base,
    auto_number,
  });

  it('orders by main numeric segment ascending', () => {
    const list = [make('А456БВ', 'А456БВ77'), make('А123БВ', 'А123БВ77')];
    expect(list.sort(compareByPlateNumber).map(x => x.auto_number)).toEqual([
      'А123БВ77',
      'А456БВ77',
    ]);
  });

  it('region code does NOT affect order — the user requirement', () => {
    // Same letters, different middle digits, different regions.
    const list = [make('А999БВ', 'А999БВ01'), make('А001БВ', 'А001БВ77')];
    expect(list.sort(compareByPlateNumber).map(x => x.auto_number)).toEqual([
      'А001БВ77',
      'А999БВ01',
    ]);
  });

  it('falls back to auto_number when auto_number_base is missing', () => {
    const list = [
      { auto_number: 'А456БВ77' } as { auto_number?: string; auto_number_base?: string },
      { auto_number: 'А123БВ77' },
    ];
    expect(list.sort(compareByPlateNumber).map(x => x.auto_number)).toEqual([
      'А123БВ77',
      'А456БВ77',
    ]);
  });

  it('breaks ties by full plate alphabetically (Russian collation)', () => {
    // Same primary key 123 — letters decide.
    const list = [make('К123ОР', 'К123ОР99'), make('А123БВ', 'А123БВ77')];
    expect(list.sort(compareByPlateNumber).map(x => x.auto_number)).toEqual([
      'А123БВ77',
      'К123ОР99',
    ]);
  });
});

describe('sortAutoListByPlateNumber', () => {
  it('returns empty array for empty input without throwing', () => {
    expect(sortAutoListByPlateNumber([])).toEqual([]);
  });

  it('does not mutate the input array', () => {
    const input = [
      { auto_number_base: 'А456БВ', auto_number: 'А456БВ77' },
      { auto_number_base: 'А123БВ', auto_number: 'А123БВ77' },
    ];
    const snapshotOrder = input.map(x => x.auto_number);
    sortAutoListByPlateNumber(input);
    expect(input.map(x => x.auto_number)).toEqual(snapshotOrder);
  });

  it('is idempotent — sorting twice yields the same order', () => {
    const input = [
      { auto_number_base: 'М234ХА', auto_number: 'М234ХА50' },
      { auto_number_base: 'А456БВ', auto_number: 'А456БВ77' },
      { auto_number_base: 'К123ОР', auto_number: 'К123ОР99' },
    ];
    const once = sortAutoListByPlateNumber(input);
    const twice = sortAutoListByPlateNumber(once);
    expect(once.map(x => x.auto_number)).toEqual(twice.map(x => x.auto_number));
    expect(once.map(x => x.auto_number)).toEqual([
      'К123ОР99',
      'М234ХА50',
      'А456БВ77',
    ]);
  });
});
