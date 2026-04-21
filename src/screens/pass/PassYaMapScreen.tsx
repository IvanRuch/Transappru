import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, PermissionsAndroid, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';

import Api from '../../utils/Api';
import { ScreenHeader } from '../../components/common';
import { MapAddressOverlay, MapAddFooter } from '../../components/pass';
import { setPendingMapData } from '../../utils/passMapBridge';

import YaMap, { Marker, Polygon, YamapInstance } from 'react-native-yamap-plus';
import { mkadPolygonNative, ttkPolygonNative, skPolygonNative } from '../../data/moscowZonePolygons';

YamapInstance.init('9247644d-4157-4d20-bd95-eb97583fc962');

/**
 * Mobile map screen for pass-order address selection. Shows Moscow zone
 * polygons (МКАД/ТТК/СК) and lets the user pick a point via long-press;
 * resolved address is sent back to PassScreen via `pendingMapData` +
 * router.back() — the pass.tsx wrapper bridges it into URL params.
 *
 * Edit mode (opened with an existing address): all three zones are shown,
 * the API call is unfiltered, and the Add button is hidden until the
 * user picks a new point.
 */
export default function PassYaMapScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<any>();

  const isEditMode = !!params.address;

  // State mirrored from route params — also refreshed on focus (see below).
  const [locationType, setLocationType] = useState<string>((params.location_type as string) || '');
  const [lon, setLon] = useState<number | string>(params.lon || '');
  const [lat, setLat] = useState<number | string>(params.lat || '');
  const [address, setAddress] = useState<string>((params.address as string) || '');
  const [wrongLocation, setWrongLocation] = useState(false);
  const [isLoadingAddress, setIsLoadingAddress] = useState(false);
  const [hasNewPick, setHasNewPick] = useState(false);

  const mapRef = useRef<any>(null);

  // Android location permission (for user-position rendering).
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      {
        title: 'Разрешение на доступ к местоположению',
        message: 'Приложению требуется доступ к вашему местоположению для работы с картой',
        buttonNeutral: 'Спросить позже',
        buttonNegative: 'Отмена',
        buttonPositive: 'OK',
      },
    ).catch(() => { /* ignore — map still works without permission */ });
  }, []);

  // No focus listener needed — params arrive via useLocalSearchParams on mount
  // and wouldn't change under us because the user navigates away via router.back().

  const handleYaMapLongPress = useCallback((point: { lon: number; lat: number }) => {
    const apiLocationType = isEditMode ? '' : locationType;

    setLon(point.lon);
    setLat(point.lat);
    setWrongLocation(false);
    setIsLoadingAddress(true);
    setHasNewPick(true);

    Api.post('/get-address-map', { lon: point.lon, lat: point.lat, location_type: apiLocationType })
      .then((res: any) => {
        const data = res.data;
        if (data.auth_required === 1) {
          setIsLoadingAddress(false);
          router.replace('/' as any);
          return;
        }
        if (typeof data.address_map_data?.address !== 'undefined') {
          setAddress(data.address_map_data.address);
          setIsLoadingAddress(false);
        } else {
          const showWrong = apiLocationType !== '';
          setAddress('');
          setWrongLocation(showWrong);
          setIsLoadingAddress(false);
        }
      })
      .catch((err: any) => {
        setIsLoadingAddress(false);
        if (err.response?.status === 401) router.replace('/' as any);
      });
  }, [isEditMode, locationType, router]);

  /**
   * Commit the current pin. Stashes the pick in the module-level bridge,
   * then pops back — pass.tsx wrapper reads it on focus and sync's into
   * URL params so the hook's applyMapData effect fires.
   *
   * The button is hidden in edit mode until the user taps a new point,
   * so stale-data commits are not reachable from the UI.
   */
  const handleAdd = useCallback(() => {
    setPendingMapData({
      address_map_data: { address, lon, lat },
      auto_list: params.auto_list,
    });
    router.back();
  }, [router, address, lon, lat, params.auto_list]);

  const markerPoint = {
    lon: typeof lon === 'string' ? parseFloat(lon) : lon,
    lat: typeof lat === 'string' ? parseFloat(lat) : lat,
  };

  const showPinMarker = lon !== '' && lat !== '';
  const showAllZones = isEditMode || locationType === '';

  const canAdd = address !== '' && (!isEditMode || hasNewPick);
  const overlayVariant = isLoadingAddress
    ? 'loading' as const
    : wrongLocation
      ? 'warning' as const
      : address !== ''
        ? 'address' as const
        : null;

  const initialZoom = isEditMode ? 10 :
    locationType === 'sk' ? 12.4 :
    locationType === 'ttk' ? 11.4 : 10;

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-dark-bg" edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" translucent={false} />

      <ScreenHeader
        title="Укажите адрес долгим нажатием"
        onBack={() => router.back()}
      />

      {overlayVariant && (
        <MapAddressOverlay variant={overlayVariant} address={address} />
      )}

      <YaMap
        ref={mapRef}
        rotateGesturesDisabled
        showUserPosition={false}
        userLocationAccuracyFillColor="rgba(0, 0, 0, 0)"
        userLocationAccuracyStrokeColor="rgba(0, 0, 0, 0)"
        userLocationAccuracyStrokeWidth={0}
        initialRegion={{ lat: 55.74954, lon: 37.621587, zoom: initialZoom }}
        onMapLongPress={(point) => handleYaMapLongPress(point.nativeEvent)}
        style={{ flex: 1 }}
      >
        <Marker
          point={{ lon: 37.621587, lat: 55.74954 }}
          source={require('../../../assets/images/moscow_marker.png')}
        />
        {showPinMarker && (
          <Marker
            point={markerPoint}
            source={require('../../../assets/images/address_marker.png')}
          />
        )}

        {showAllZones ? (
          <>
            <Polygon strokeColor="#FF0000" fillColor="rgba(0, 0, 255, 0.15)" points={mkadPolygonNative} />
            <Polygon strokeColor="#FF0000" fillColor="rgba(0, 255, 0, 0.15)" points={ttkPolygonNative} />
            <Polygon strokeColor="#FF0000" fillColor="rgba(255, 0, 0, 0.15)" points={skPolygonNative} />
          </>
        ) : locationType === 'mkad' ? (
          <Polygon
            strokeColor="#FF0000"
            fillColor="rgba(0, 0, 255, 0.15)"
            points={mkadPolygonNative}
            innerRings={[ttkPolygonNative]}
          />
        ) : locationType === 'ttk' ? (
          <Polygon
            strokeColor="#FF0000"
            fillColor="rgba(0, 255, 0, 0.15)"
            points={ttkPolygonNative}
            innerRings={[skPolygonNative]}
          />
        ) : locationType === 'sk' ? (
          <Polygon strokeColor="#FF0000" fillColor="rgba(255, 0, 0, 0.15)" points={skPolygonNative} />
        ) : null}
      </YaMap>

      <MapAddFooter visible={canAdd} onPress={handleAdd} />
    </SafeAreaView>
  );
}

