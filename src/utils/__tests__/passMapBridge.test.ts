import { setPendingMapData, getPendingMapData } from '../passMapBridge';

describe('passMapBridge', () => {
  it('returns null when nothing set', () => {
    expect(getPendingMapData()).toBeNull();
  });

  it('returns the stashed data then clears it', () => {
    setPendingMapData({
      address_map_data: { address: 'ул. Ленина, 1', lon: 37.5, lat: 55.7 },
      auto_list: [{ id: '1' }],
    });
    const first = getPendingMapData();
    expect(first?.address_map_data.address).toBe('ул. Ленина, 1');
    expect(first?.auto_list).toEqual([{ id: '1' }]);
    // Second call — bridge clears on read.
    expect(getPendingMapData()).toBeNull();
  });
});
