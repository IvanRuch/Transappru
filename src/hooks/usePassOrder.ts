import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';

/**
 * Shared pass-order logic for mobile and web.
 *
 * Handles: auto_list param parsing, zone selection (МКАД/ТТК/СК),
 * two-stage address autocomplete (street → house), user-address list,
 * pass order via /add-address API, map data integration.
 *
 * Map-related state (lon, lat, isLocationTypeManual, etc.) is only
 * meaningful on mobile; web ignores it.
 */
export function usePassOrder() {
  const router = useRouter();
  const params = useLocalSearchParams();

  // ── Parse auto_list from route params ─────────────────────────────────────
  const vehicles = useMemo<any[]>(() => {
    try {
      if (params.auto_list) {
        const str = Array.isArray(params.auto_list) ? params.auto_list[0] : params.auto_list;
        return typeof str === 'string' ? JSON.parse(str) : [];
      }
    } catch { /* empty */ }
    return [];
  }, [params.auto_list]);

  // ── Zone state ────────────────────────────────────────────────────────────
  const [locationType, setLocationType] = useState('');

  // Map-related state (mobile only)
  const [lon, setLon] = useState<string | number>('');
  const [lat, setLat] = useState<string | number>('');
  const [isLocationTypeManual, setIsLocationTypeManual] = useState(false);
  const [originalLocationTypeFromMap, setOriginalLocationTypeFromMap] = useState('');

  // ── Address search state ──────────────────────────────────────────────────
  const [address, setAddress] = useState('');
  const [mosRuStreet, setMosRuStreet] = useState(0);
  const [mosRuStreetP7, setMosRuStreetP7] = useState('');
  const [streetList, setStreetList] = useState<any[]>([]);
  const [mosRuAddress, setMosRuAddress] = useState(0);
  const [mosRuAddressLConcat, setMosRuAddressLConcat] = useState('');
  const [addressList, setAddressList] = useState<any[]>([]);
  const [userAddressList, setUserAddressList] = useState<any[]>([]);

  // ── Modal + submit state ──────────────────────────────────────────────────
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Refs for latest values in async callbacks
  const mosRuStreetRef = useRef(mosRuStreet);
  const mosRuStreetP7Ref = useRef(mosRuStreetP7);
  const locationTypeRef = useRef(locationType);
  mosRuStreetRef.current = mosRuStreet;
  mosRuStreetP7Ref.current = mosRuStreetP7;
  locationTypeRef.current = locationType;

  // ── Load user addresses on mount ──────────────────────────────────────────
  useEffect(() => {
    AsyncStorage.getItem('token').then(token => {
      if (!token) return;
      api.post('/get-user-address-list', { token })
        .then(res => {
          if (res.data.auth_required === 1) { router.replace('/'); return; }
          setUserAddressList(res.data.user_address_list || []);
        })
        .catch(err => {
          if (err.response?.status === 401) router.replace('/');
        });
    });
  }, []);

  // ── Toggle zone tab (aware of map coordinates) ────────────────────────────
  const toggleTab = useCallback((tab: string) => {
    const hasMapAddress = lon !== '' && lat !== '';
    if (locationType === tab) {
      setLocationType('');
      setIsLocationTypeManual(false);
    } else {
      setIsLocationTypeManual(hasMapAddress && tab !== originalLocationTypeFromMap);
      setLocationType(tab);
    }
  }, [locationType, lon, lat, originalLocationTypeFromMap]);

  // ── Address change handler (two-stage autocomplete) ───────────────────────
  const handleAddressChange = useCallback(async (value: string) => {
    setAddress(value);
    setLon('');
    setLat('');

    if (value.trim() === '') {
      setLocationType('');
      setMosRuStreet(0);
      setMosRuStreetP7('');
      setStreetList([]);
      setMosRuAddress(0);
      setMosRuAddressLConcat('');
      setAddressList([]);
      return;
    }

    let mode = '';
    let searchString = '';
    const currentStreet = mosRuStreetRef.current;
    const currentP7 = mosRuStreetP7Ref.current;

    if (currentStreet === 0) {
      if (value.length >= 3) {
        mode = 'street';
        searchString = value;
      } else {
        setStreetList([]);
        setAddressList([]);
        return;
      }
    } else {
      if (value.indexOf(currentP7) !== 0) {
        mode = 'street';
        searchString = value;
        setMosRuStreet(0);
        setMosRuStreetP7('');
        setMosRuAddress(0);
        setMosRuAddressLConcat('');
        setAddressList([]);
      } else {
        if (value.indexOf(mosRuAddressLConcat) === -1) {
          setMosRuAddress(0);
          setMosRuAddressLConcat('');
          setAddressList([]);
        }
        mode = 'address';
        searchString = value.substring(currentP7.length);
      }
    }

    if (!mode) return;

    const token = await AsyncStorage.getItem('token');
    if (!token) return;

    try {
      const res = await api.post('/get-address', {
        token,
        mode,
        string: searchString,
        mos_ru_street: currentStreet,
        location_type: locationTypeRef.current,
      });
      if (res.data.auth_required === 1) { router.replace('/'); return; }
      if (mode === 'street') {
        setStreetList(res.data.address_list || []);
        setMosRuAddress(0);
        setMosRuAddressLConcat('');
        setAddressList([]);
      } else {
        setAddressList(res.data.address_list || []);
      }
    } catch (err: any) {
      if (err.response?.status === 401) router.replace('/');
    }
  }, [mosRuAddressLConcat, router]);

  // ── Select a street from suggestions ──────────────────────────────────────
  const markStreet = useCallback((item: any) => {
    setAddress(item.p7);
    setMosRuStreet(item.id);
    setMosRuStreetP7(item.p7);
    setStreetList([]);
    setLon('');
    setLat('');

    mosRuStreetRef.current = item.id;
    mosRuStreetP7Ref.current = item.p7;

    setTimeout(() => {
      const newVal = item.p7 + ' ';
      setAddress(newVal);
      handleAddressChange(newVal);
    }, 50);
  }, [handleAddressChange]);

  // ── Select an address from suggestions ────────────────────────────────────
  const markAddress = useCallback((item: any) => {
    setAddress(mosRuStreetP7 + ' ' + item.l_concat);
    setMosRuAddress(item.id);
    setMosRuAddressLConcat(item.l_concat);
    setAddressList([]);
    setLon('');
    setLat('');
  }, [mosRuStreetP7]);

  // ── Select a previously entered address ───────────────────────────────────
  const markUserAddress = useCallback((item: any) => {
    const types = item.location_types || {};
    let detected = '';
    if (types.sk === 1) detected = 'sk';
    else if (types.ttk === 1) detected = 'ttk';
    else if (types.mkad === 1) detected = 'mkad';

    setAddress(item.mos_ru_street_p7 + ' ' + item.mos_ru_address_l_concat);
    setMosRuStreet(item.mos_ru_street);
    setMosRuStreetP7(item.mos_ru_street_p7);
    setMosRuAddress(item.mos_ru_address);
    setMosRuAddressLConcat(item.mos_ru_address_l_concat);
    setLocationType(detected);
    setLon('');
    setLat('');
    setIsLocationTypeManual(false);
    setOriginalLocationTypeFromMap('');
  }, []);

  // ── Clear address and related state ───────────────────────────────────────
  const clearAddress = useCallback(() => {
    setAddress('');
    setLocationType('');
    setMosRuStreet(0);
    setMosRuStreetP7('');
    setStreetList([]);
    setMosRuAddress(0);
    setMosRuAddressLConcat('');
    setAddressList([]);
    setLon('');
    setLat('');
    setIsLocationTypeManual(false);
    setOriginalLocationTypeFromMap('');
  }, []);

  // ── Apply map data (mobile-only, called from screen focus listener) ───────
  const applyMapData = useCallback((mapData: any) => {
    if (!mapData?.address) return;

    const mapLocationType = mapData.location_type || '';
    const newLocationType = isLocationTypeManual ? locationType : mapLocationType;

    setAddress(mapData.address);
    setMosRuAddress(mapData.mos_ru_address || 0);
    setMosRuAddressLConcat(mapData.mos_ru_address_l_concat || '');
    setMosRuStreet(mapData.mos_ru_street || 0);
    setMosRuStreetP7(mapData.mos_ru_street_p7 || '');
    setLon(mapData.lon || '');
    setLat(mapData.lat || '');
    setLocationType(newLocationType);
    setOriginalLocationTypeFromMap(mapLocationType);
  }, [isLocationTypeManual, locationType]);

  // ── Submit order ──────────────────────────────────────────────────────────
  /**
   * Calls /add-address API. Returns error message on failure, null on success.
   */
  const handleOrder = useCallback(async (): Promise<string | null> => {
    setSubmitting(true);
    const token = await AsyncStorage.getItem('token');
    if (!token) {
      router.replace('/');
      return null;
    }

    // Filter marked vehicles; fall back to all if none have `marked` flag
    const markedVehicles = vehicles.filter((a: any) => a.marked);
    const autoIds = (markedVehicles.length > 0 ? markedVehicles : vehicles)
      .map((a: any) => a.id);

    try {
      const res = await api.post('/add-address', {
        token,
        mos_ru_address: mosRuAddress,
        auto_list_ids: autoIds.join(','),
        location_type: locationType,
      });
      if (res.data.auth_required === 1) {
        router.replace('/');
        return null;
      }
      setUserAddressList(res.data.user_address_list || []);
      clearAddress();
      setShowModal(true);
      return null;
    } catch (err: any) {
      if (err.response?.status === 401) {
        router.replace('/');
        return null;
      }
      return 'Ошибка при заказе пропуска. Попробуйте позже.';
    } finally {
      setSubmitting(false);
    }
  }, [vehicles, mosRuAddress, locationType, router, clearAddress]);

  const canOrder = mosRuAddress > 0 || locationType !== '';

  return {
    // Vehicles
    vehicles,
    // Zone
    locationType, toggleTab,
    // Map state (mobile-only)
    lon, lat, isLocationTypeManual, applyMapData,
    // Address
    address,
    mosRuStreetP7,
    mosRuAddress, mosRuAddressLConcat,
    streetList, addressList, userAddressList,
    // Actions
    handleAddressChange, markStreet, markAddress, markUserAddress,
    clearAddress, handleOrder,
    // UI
    showModal, setShowModal,
    submitting, canOrder,
  };
}
