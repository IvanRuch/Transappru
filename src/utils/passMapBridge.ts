/**
 * Module-level bridge for the mobile pass-map → pass-screen flow.
 *
 * On mobile, PassYaMapScreen cannot navigate back with params (router.back()
 * doesn't accept them), so it stashes the pick here before popping. The
 * pass.tsx route wrapper reads it in a useFocusEffect and bridges it into
 * URL params via router.setParams — so that usePassOrder's URL-driven
 * applyMapData effect runs the same code path as on web.
 */

export interface PendingMapData {
  address_map_data: {
    address: string;
    lon?: number | string;
    lat?: number | string;
    [key: string]: any;
  };
  auto_list?: any;
}

let _pendingMapData: PendingMapData | null = null;

export function setPendingMapData(data: PendingMapData) {
  _pendingMapData = data;
}

export function getPendingMapData(): PendingMapData | null {
  const data = _pendingMapData;
  _pendingMapData = null;
  return data;
}
