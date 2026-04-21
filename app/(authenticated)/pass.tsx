import React from 'react';
import { useRouter, useFocusEffect } from 'expo-router';
import PassScreen from '../../src/screens/pass/PassScreen';
import { getPendingMapData } from './pass-yamap';

/**
 * Route wrapper for PassScreen.
 *
 * PassScreen is a functional component that reads route params via
 * useLocalSearchParams (inside the usePassOrder hook). The only reason this
 * wrapper exists now is to bridge the mobile map-return channel: the mobile
 * PassYaMapScreen writes its result into a module-level `pendingMapData`
 * variable (see pass-yamap.tsx) instead of URL params. On focus, we read it
 * and push `address_map_data` into the URL via router.setParams — then the
 * hook's URL-driven applyMapData effect fires, same as on web.
 */
export default function PassRoute() {
  const router = useRouter();

  useFocusEffect(
    React.useCallback(() => {
      const mapData = getPendingMapData();
      if (!mapData) return;
      // Push map result into URL params so useLocalSearchParams picks it up
      // inside the hook (identical code path as on web).
      const nextParams: Record<string, string> = {};
      if (mapData.address_map_data) {
        nextParams.address_map_data = JSON.stringify(mapData.address_map_data);
      }
      if (mapData.auto_list) {
        nextParams.auto_list = JSON.stringify(mapData.auto_list);
      }
      if (Object.keys(nextParams).length > 0) {
        router.setParams(nextParams);
      }
    }, [router])
  );

  return <PassScreen />;
}
