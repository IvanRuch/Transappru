/**
 * Web version of PassYaMapScreen — Yandex Maps JS API v3.
 *
 * Renders an interactive map of Moscow with zone polygons (МКАД/ТТК/СК).
 * User clicks on the map to select an address; the result is returned
 * to PassScreen via navigation params (address_map_data).
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../../services/api';
import { mkadPolygonWeb, ttkPolygonWeb, skPolygonWeb } from '../../data/moscowZonePolygons';
// WebAppLayout is provided by _layout.web.tsx — do NOT wrap again here.

const noSelect = Platform.OS === 'web' ? { userSelect: 'none' as const } : {};

const YANDEX_API_KEY = 'e2f7a3f4-a2db-4aa1-beac-eae772516bf1';
const MOSCOW_CENTER: [number, number] = [37.621587, 55.74954];

const ZONE_COLORS = {
  mkad: { stroke: '#0000FFCC', fill: 'rgba(0, 0, 255, 0.15)' },
  ttk:  { stroke: '#00FF00CC', fill: 'rgba(0, 255, 0, 0.15)' },
  sk:   { stroke: '#FF0000CC', fill: 'rgba(255, 0, 0, 0.15)' },
};

const ZONE_ZOOM: Record<string, number> = {
  sk: 12.4,
  ttk: 11.4,
  mkad: 10,
  '': 10,
};

// ─── Dynamic Yandex Maps v3 loader ─────────────────────────────────────────

let _loadPromise: Promise<void> | null = null;

function loadYandexMapsScript(): Promise<void> {
  if (_loadPromise) return _loadPromise;

  _loadPromise = new Promise<void>((resolve, reject) => {
    if (typeof window !== 'undefined' && (window as any).ymaps3) {
      (window as any).ymaps3.ready.then(resolve);
      return;
    }
    const script = document.createElement('script');
    script.src = `https://api-maps.yandex.ru/v3/?apikey=${YANDEX_API_KEY}&lang=ru_RU`;
    script.async = true;
    script.onload = () => {
      (window as any).ymaps3.ready.then(resolve).catch(reject);
    };
    script.onerror = () => reject(new Error('Failed to load Yandex Maps script'));
    document.head.appendChild(script);
  });

  return _loadPromise;
}

// Reactified Yandex Maps v3 component bundle. Runtime components come from
// the Yandex CDN via `ymaps3.import('@yandex/ymaps3-reactify')` — there is
// no npm package, so we keep these typed as `any` and expose a named alias
// so consumers (MapInner props, useState generics) reference a stable type.
type YmapsReactComponents = {
  YMap: any;
  YMapDefaultSchemeLayer: any;
  YMapDefaultFeaturesLayer: any;
  YMapFeature: any;
  YMapMarker: any;
  YMapListener: any;
  reactify: any;
};

// Cache of the reactified components — populated on first successful load.
let _reactComponents: YmapsReactComponents | null = null;

async function getReactComponents() {
  if (_reactComponents) return _reactComponents;

  await loadYandexMapsScript();

  const ymaps3 = (window as any).ymaps3;
  const ReactDOM = await import('react-dom');

  const ymaps3React = await ymaps3.import('@yandex/ymaps3-reactify');
  const reactify = ymaps3React.reactify.bindTo(React, ReactDOM);

  const mod = reactify.module(ymaps3);
  _reactComponents = {
    YMap: mod.YMap,
    YMapDefaultSchemeLayer: mod.YMapDefaultSchemeLayer,
    YMapDefaultFeaturesLayer: mod.YMapDefaultFeaturesLayer,
    YMapFeature: mod.YMapFeature,
    YMapMarker: mod.YMapMarker,
    YMapListener: mod.YMapListener,
    reactify,
  };
  return _reactComponents;
}

// ─── Zone polygon data ─────────────────────────────────────────────────────

interface ZonePolygon {
  key: string;
  coords: [number, number][];
  style: { stroke: { color: string; width: number }[]; fill: string };
}

function getZonePolygons(locationType: string): ZonePolygon[] {
  if (locationType === 'mkad') {
    return [{
      key: 'mkad',
      coords: mkadPolygonWeb,
      style: { stroke: [{ color: ZONE_COLORS.mkad.stroke, width: 2 }], fill: ZONE_COLORS.mkad.fill },
    }];
  }
  if (locationType === 'ttk') {
    return [{
      key: 'ttk',
      coords: ttkPolygonWeb,
      style: { stroke: [{ color: ZONE_COLORS.ttk.stroke, width: 2 }], fill: ZONE_COLORS.ttk.fill },
    }];
  }
  if (locationType === 'sk') {
    return [{
      key: 'sk',
      coords: skPolygonWeb,
      style: { stroke: [{ color: ZONE_COLORS.sk.stroke, width: 2 }], fill: ZONE_COLORS.sk.fill },
    }];
  }
  // No zone selected — show all
  return [
    {
      key: 'mkad',
      coords: mkadPolygonWeb,
      style: { stroke: [{ color: ZONE_COLORS.mkad.stroke, width: 2 }], fill: ZONE_COLORS.mkad.fill },
    },
    {
      key: 'ttk',
      coords: ttkPolygonWeb,
      style: { stroke: [{ color: ZONE_COLORS.ttk.stroke, width: 2 }], fill: ZONE_COLORS.ttk.fill },
    },
    {
      key: 'sk',
      coords: skPolygonWeb,
      style: { stroke: [{ color: ZONE_COLORS.sk.stroke, width: 2 }], fill: ZONE_COLORS.sk.fill },
    },
  ];
}

// ─── Inner map component (rendered only after API is loaded) ────────────────

interface MapInnerProps {
  components: YmapsReactComponents;
  locationType: string;
  initialLon: number | '';
  initialLat: number | '';
  onSelectAddress: (data: any) => void;
  isLoadingAddress: boolean;
  /** When true, ignore locationType and render all three zones. */
  showAllZones?: boolean;
}

function MapInner({
  components,
  locationType,
  initialLon,
  initialLat,
  onSelectAddress,
  isLoadingAddress,
  showAllZones,
}: MapInnerProps) {
  const {
    YMap,
    YMapDefaultSchemeLayer,
    YMapDefaultFeaturesLayer,
    YMapFeature,
    YMapMarker,
    YMapListener,
    reactify,
  } = components;

  const [markerCoords, setMarkerCoords] = useState<[number, number] | null>(
    initialLon !== '' && initialLat !== ''
      ? [Number(initialLon), Number(initialLat)]
      : null
  );

  // When showing all zones we always start from the default (zoomed-out) level.
  const zoom = showAllZones ? 10 : (ZONE_ZOOM[locationType] || 10);
  const center = markerCoords || MOSCOW_CENTER;
  const location = reactify.useDefault({ center, zoom });

  const polygons = getZonePolygons(showAllZones ? '' : locationType);

  const handleClick = useCallback((_object: any, event: any) => {
    if (isLoadingAddress) return;
    const coords = event?.coordinates;
    if (!coords) return;
    const [lon, lat] = coords;
    setMarkerCoords([lon, lat]);
    onSelectAddress({ lon, lat });
  }, [onSelectAddress, isLoadingAddress]);

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <YMap location={location}>
        <YMapDefaultSchemeLayer />
        <YMapDefaultFeaturesLayer />
        <YMapListener onClick={handleClick} />

        {/* Zone polygons */}
        {polygons.map((p) => (
          <YMapFeature
            key={p.key}
            geometry={{ type: 'Polygon', coordinates: [p.coords] }}
            style={p.style}
          />
        ))}

        {/* Moscow center marker */}
        <YMapMarker coordinates={MOSCOW_CENTER}>
          <div style={{
            width: 20,
            height: 20,
            borderRadius: '50%',
            backgroundColor: '#3A3A3A',
            border: '3px solid #FFFFFF',
            boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
            transform: 'translate(-50%, -50%)',
          }} />
        </YMapMarker>

        {/* Selected address marker */}
        {markerCoords && (
          <YMapMarker coordinates={markerCoords}>
            <div style={{
              width: 24,
              height: 24,
              borderRadius: '50%',
              backgroundColor: '#EE505A',
              border: '3px solid #FFFFFF',
              boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
              transform: 'translate(-50%, -50%)',
            }} />
          </YMapMarker>
        )}
      </YMap>
    </div>
  );
}

// ─── Main screen component ──────────────────────────────────────────────────

export default function PassYaMapScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const locationType = (params.location_type as string) || '';
  const initialLon = params.lon ? Number(params.lon) : '';
  const initialLat = params.lat ? Number(params.lat) : '';
  const initialAddress = (params.address as string) || '';
  const autoListParam = (params.auto_list as string) || '[]';

  /**
   * True when we are re-visiting a pass address that's already selected on
   * PassScreen. In this mode: all zones are shown, `/get-address-map` is
   * called without a zone filter, and "Добавить" without a new pick is a
   * no-op (just goes back).
   */
  const isEditMode = initialAddress !== '';

  const [components, setComponents] = useState<YmapsReactComponents | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [isLoadingAddress, setIsLoadingAddress] = useState(false);
  const [addressData, setAddressData] = useState<any>(
    initialAddress ? { address: initialAddress } : null
  );
  const [wrongLocation, setWrongLocation] = useState(false);
  const [selectedCoords, setSelectedCoords] = useState<{ lon: number; lat: number } | null>(
    initialLon !== '' && initialLat !== ''
      ? { lon: Number(initialLon), lat: Number(initialLat) }
      : null
  );
  /** True after the user has tapped a new point on the map during this visit. */
  const [hasNewPick, setHasNewPick] = useState(false);

  // In edit mode the zone filter is lifted — the hook reference always points
  // at '' so every tap resolves any address, not only those inside `locationType`.
  const effectiveFilterType = isEditMode ? '' : locationType;
  const locationTypeRef = useRef(effectiveFilterType);
  locationTypeRef.current = effectiveFilterType;

  // Load Yandex Maps API
  useEffect(() => {
    getReactComponents()
      .then(setComponents)
      .catch(() => setLoadError(true));
  }, []);

  // Handle map click — fetch address from API
  const handleSelectOnMap = useCallback(async (coords: { lon: number; lat: number }) => {
    setSelectedCoords(coords);
    setWrongLocation(false);
    setIsLoadingAddress(true);
    setAddressData(null);
    setHasNewPick(true);

    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) { router.replace('/'); return; }

      const res = await api.post('/get-address-map', {
        lon: coords.lon,
        lat: coords.lat,
        location_type: locationTypeRef.current,
      });

      const data = res.data;
      if (data.auth_required === 1) {
        router.replace('/');
        return;
      }

      if (data.address_map_data?.address) {
        setAddressData(data.address_map_data);
      } else {
        // Show "out of zone" only when a zone is selected
        setWrongLocation(locationTypeRef.current !== '');
      }
    } catch (err: any) {
      if (err.response?.status === 401) {
        router.replace('/');
      }
    } finally {
      setIsLoadingAddress(false);
    }
  }, [router]);

  // "Добавить" — commit the current pin back to PassScreen. The button is
  // hidden in edit mode until the user taps a new point, so a stale-data
  // commit is not reachable from the UI.
  const handleAdd = useCallback(() => {
    if (!addressData || !selectedCoords) return;

    const mapData = JSON.stringify({
      ...addressData,
      lon: selectedCoords.lon,
      lat: selectedCoords.lat,
    });

    router.push({
      pathname: '/(authenticated)/pass' as any,
      params: {
        auto_list: autoListParam,
        address_map_data: mapData,
      },
    });
  }, [addressData, selectedCoords, autoListParam, router]);

  return (
    <View style={{ flex: 1 }}>
      {/* Header */}
      <View style={s.header}>
        <Pressable onPress={() => router.back()} style={s.backBtn}>
          <Text style={s.backBtnText}>{'<-'}</Text>
        </Pressable>
        <Text style={[s.headerTitle, noSelect]}>Добавить адрес</Text>
      </View>

      {/* Instruction */}
      <View style={s.instruction}>
        <Text style={[s.instructionText, noSelect]}>
          Укажите адрес кликом на карте
        </Text>
      </View>

      {/* Map area */}
      <View style={s.mapContainer}>
        {loadError && (
          <View style={s.centered}>
            <Text style={s.errorText}>Не удалось загрузить карту</Text>
            <Pressable
              style={s.retryBtn}
              onPress={() => {
                setLoadError(false);
                _loadPromise = null;
                _reactComponents = null;
                getReactComponents()
                  .then(setComponents)
                  .catch(() => setLoadError(true));
              }}
            >
              <Text style={[s.retryBtnText, noSelect]}>Повторить</Text>
            </Pressable>
          </View>
        )}

        {!loadError && !components && (
          <View style={s.centered}>
            <ActivityIndicator size="large" color="#3A3A3A" />
            <Text style={s.loadingText}>Загрузка карты...</Text>
          </View>
        )}

        {!loadError && components && (
          <MapInner
            components={components}
            locationType={locationType}
            initialLon={initialLon}
            initialLat={initialLat}
            onSelectAddress={handleSelectOnMap}
            isLoadingAddress={isLoadingAddress}
            showAllZones={isEditMode}
          />
        )}
      </View>

      {/* Loading address indicator */}
      {isLoadingAddress && (
        <View style={s.addressOverlay}>
          <View style={s.addressOverlayInner}>
            <ActivityIndicator size="small" color="#313131" />
            <Text style={s.addressOverlayText}>Определение адреса...</Text>
          </View>
        </View>
      )}

      {/* "Out of zone" warning */}
      {wrongLocation && !isLoadingAddress && (
        <View style={s.addressOverlay}>
          <View style={[s.addressOverlayInner, s.warningOverlay]}>
            <Text style={s.warningText}>Адрес находится вне выбранной зоны</Text>
          </View>
        </View>
      )}

      {/* Selected address display */}
      {addressData?.address && !isLoadingAddress && (
        <View style={s.addressOverlay}>
          <View style={s.addressOverlayInner}>
            <Text style={s.addressText}>{addressData.address}</Text>
          </View>
        </View>
      )}

      {/* "Добавить" — shown when there's an address to commit.
          In edit mode additionally gated on hasNewPick: nothing to commit
          when the user has not picked anything new (they can just go back). */}
      {addressData?.address && !isLoadingAddress && (!isEditMode || hasNewPick) && (
        <View style={s.footer}>
          <Pressable
            style={s.addBtn}
            onPress={handleAdd}
            accessibilityRole="button"
            accessibilityLabel="Добавить адрес"
          >
            <Text style={[s.addBtnText, noSelect]}>Добавить</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E8',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  backBtnText: { fontSize: 22, color: '#3A3A3A' },
  headerTitle: { fontSize: 22, fontWeight: '700', color: '#1A1A1A' },

  instruction: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
  },
  instructionText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#313131',
  },

  mapContainer: {
    flex: 1,
    position: 'relative',
  },

  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#656565',
  },
  errorText: {
    fontSize: 16,
    color: '#EE505A',
    marginBottom: 16,
  },
  retryBtn: {
    backgroundColor: '#3A3A3A',
    borderRadius: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  retryBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Address overlay (positioned over map)
  addressOverlay: {
    position: 'absolute',
    top: 120,
    left: 20,
    right: 20,
    zIndex: 3,
    alignItems: 'center',
  },
  addressOverlayInner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#B8B8B8',
    // Web shadow
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
    } as any : {}),
  },
  addressOverlayText: {
    marginLeft: 10,
    fontSize: 15,
    color: '#313131',
  },
  addressText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#313131',
    flex: 1,
  },
  warningOverlay: {
    borderColor: '#fee600',
  },
  warningText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fee600',
  },

  // Footer with "Добавить" button
  footer: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E8E8E8',
  },
  addBtn: {
    backgroundColor: '#3A3A3A',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
