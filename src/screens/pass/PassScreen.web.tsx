/**
 * Web version of PassScreen.
 * Two-stage autocomplete (street → address), zone tabs (МКАД/ТТК/СК),
 * vehicle list, order pass via /add-address API.
 * Map unavailable on web — button navigates to pass-yamap stub.
 */
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import WebAppLayout from '../../components/web/WebAppLayout';
import api from '../../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

const noSelect = Platform.OS === 'web' ? { userSelect: 'none' as const } : {};

export default function PassScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const addressRef = useRef<HTMLInputElement>(null);

  // Parse auto_list from route params (comes pre-filled from AutoDetailScreen)
  const paramAutoList = useMemo(() => {
    try {
      return params.auto_list ? JSON.parse(params.auto_list as string) : [];
    } catch { return []; }
  }, [params.auto_list]);

  const [vehicles] = useState<any[]>(paramAutoList);
  const [locationType, setLocationType] = useState('');
  const [address, setAddress] = useState('');
  const [mosRuStreet, setMosRuStreet] = useState(0);
  const [mosRuStreetP7, setMosRuStreetP7] = useState('');
  const [streetList, setStreetList] = useState<any[]>([]);
  const [mosRuAddress, setMosRuAddress] = useState(0);
  const [mosRuAddressLConcat, setMosRuAddressLConcat] = useState('');
  const [addressList, setAddressList] = useState<any[]>([]);
  const [userAddressList, setUserAddressList] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Refs to use latest state in async callbacks
  const mosRuStreetRef = useRef(mosRuStreet);
  const mosRuStreetP7Ref = useRef(mosRuStreetP7);
  const locationTypeRef = useRef(locationType);
  mosRuStreetRef.current = mosRuStreet;
  mosRuStreetP7Ref.current = mosRuStreetP7;
  locationTypeRef.current = locationType;

  // Load user address list on mount
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

  const toggleTab = (tab: string) => {
    setLocationType(prev => prev === tab ? '' : tab);
  };

  const handleAddressChange = useCallback(async (value: string) => {
    setAddress(value);

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

  const markStreet = (item: any) => {
    setAddress(item.p7);
    setMosRuStreet(item.id);
    setMosRuStreetP7(item.p7);
    setStreetList([]);

    // Need to update refs immediately for the subsequent changeAddress call
    mosRuStreetRef.current = item.id;
    mosRuStreetP7Ref.current = item.p7;

    // Trigger address search after street selection
    setTimeout(() => {
      const newVal = item.p7 + ' ';
      setAddress(newVal);
      handleAddressChange(newVal);
      addressRef.current?.focus();
    }, 50);
  };

  const markAddress = (item: any) => {
    setAddress(mosRuStreetP7 + ' ' + item.l_concat);
    setMosRuAddress(item.id);
    setMosRuAddressLConcat(item.l_concat);
    setAddressList([]);
  };

  const markUserAddress = (item: any) => {
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
  };

  const clearAddress = () => {
    setAddress('');
    setLocationType('');
    setMosRuStreet(0);
    setMosRuStreetP7('');
    setStreetList([]);
    setMosRuAddress(0);
    setMosRuAddressLConcat('');
    setAddressList([]);
  };

  const handleOrder = async () => {
    setSubmitting(true);
    const token = await AsyncStorage.getItem('token');
    if (!token) return;

    const markedIds = vehicles.map((a: any) => a.id);

    try {
      const res = await api.post('/add-address', {
        token,
        mos_ru_address: mosRuAddress,
        auto_list_ids: markedIds.join(','),
        location_type: locationType,
      });
      if (res.data.auth_required === 1) { router.replace('/'); return; }
      setUserAddressList(res.data.user_address_list || []);
      clearAddress();
      setShowModal(true);
    } catch (err: any) {
      if (err.response?.status === 401) { router.replace('/'); return; }
      window.alert('Ошибка при заказе пропуска. Попробуйте позже.');
    } finally {
      setSubmitting(false);
    }
  };

  const canOrder = mosRuAddress > 0 || locationType !== '';

  const renderLocationBadges = (types: any) => {
    const t = types || {};
    return (
      <View style={s.badges}>
        <View style={[s.badge, t.mkad === 1 ? s.badgeMkad : s.badgeInactive]}>
          <Text style={s.badgeText}>МКАД</Text>
        </View>
        <View style={[s.badge, t.ttk === 1 ? s.badgeTtk : s.badgeInactive]}>
          <Text style={s.badgeText}>ТТК</Text>
        </View>
        <View style={[s.badge, t.sk === 1 ? s.badgeSk : s.badgeInactive]}>
          <Text style={s.badgeText}>СК</Text>
        </View>
      </View>
    );
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '12px',
    fontSize: '14px',
    borderRadius: '8px',
    border: `1px solid ${address ? '#656565' : '#B8B8B8'}`,
    backgroundColor: address ? '#FFFFFF' : '#F9FAF9',
    outline: 'none',
    fontFamily: 'inherit',
    color: '#313131',
    boxSizing: 'border-box',
    resize: 'none',
    minHeight: '45px',
  };

  return (
    <WebAppLayout>
      {/* Header */}
      <View style={s.header}>
        <Pressable onPress={() => router.back()} style={s.backBtn}>
          <Text style={s.backBtnText}>←</Text>
        </Pressable>
        <Text style={[s.headerTitle, noSelect]}>Добавить адрес</Text>
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent}>
        {/* Zone tabs */}
        <Text style={[s.sectionLabel, noSelect]}>Вы можете указать зону</Text>
        <View style={s.tabRow}>
          {(['mkad', 'ttk', 'sk'] as const).map(tab => (
            <Pressable
              key={tab}
              style={[s.tabBtn, locationType === tab && s.tabBtnActive]}
              onPress={() => toggleTab(tab)}
            >
              <Text style={[s.tabBtnText, noSelect]}>
                {tab === 'mkad' ? 'МКАД' : tab === 'ttk' ? 'ТТК' : 'СК'}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Address input */}
        <View style={s.addressHeader}>
          <Text style={[s.sectionLabel, noSelect]}>Куда едем?</Text>
          {address !== '' && (
            <Pressable style={s.clearBtn} onPress={clearAddress}>
              <Text style={[s.clearBtnText, noSelect]}>Очистить</Text>
            </Pressable>
          )}
        </View>

        <View style={s.addressRow}>
          <input
            ref={addressRef}
            type="text"
            value={address}
            onChange={(e: any) => handleAddressChange(e.target.value)}
            placeholder="Начните вводить улицу..."
            style={inputStyle}
          />
        </View>

        {/* Street suggestions */}
        {streetList.length > 0 && (
          <View style={s.suggestionsBlock}>
            {streetList.map((item, idx) => (
              <Pressable key={item.id || idx} style={s.suggestionItem} onPress={() => markStreet(item)}>
                {renderLocationBadges(item.location_types)}
                <View style={s.suggestionText}>
                  {item.p2 ? <Text style={s.suggestionSub}>{item.p2}</Text> : null}
                  {item.p3 ? <Text style={s.suggestionSub}>{item.p3}</Text> : null}
                  {item.p4 ? <Text style={s.suggestionSub}>{item.p4}</Text> : null}
                  {item.p5 ? <Text style={s.suggestionSub}>{item.p5}</Text> : null}
                  {item.p6 ? <Text style={s.suggestionSub}>{item.p6}</Text> : null}
                  {item.p7 ? <Text style={s.suggestionMain}>{item.p7}</Text> : null}
                </View>
              </Pressable>
            ))}
          </View>
        )}

        {/* Address suggestions */}
        {addressList.length > 0 && (
          <View style={s.suggestionsBlock}>
            {addressList.map((item, idx) => (
              <Pressable key={item.id || idx} style={s.suggestionItem} onPress={() => markAddress(item)}>
                {renderLocationBadges(item.location_types)}
                <View style={s.suggestionText}>
                  <Text style={s.suggestionMain}>{item.l_concat}</Text>
                </View>
              </Pressable>
            ))}
          </View>
        )}

        {/* Previously entered addresses */}
        {userAddressList.length > 0 && (
          <>
            <Text style={[s.sectionLabel, { marginTop: 20 }, noSelect]}>Ранее введён:</Text>
            <View style={s.suggestionsBlock}>
              {userAddressList.map((item, idx) => (
                <Pressable key={item.id || idx} style={s.suggestionItem} onPress={() => markUserAddress(item)}>
                  {renderLocationBadges(item.location_types)}
                  <View style={s.suggestionText}>
                    <Text style={s.suggestionMain}>
                      {item.mos_ru_street_p7} {item.mos_ru_address_l_concat}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </View>
          </>
        )}

        {/* Vehicle list */}
        <Text style={[s.sectionLabel, { marginTop: 20 }, noSelect]}>Автомобили на маршрут:</Text>
        {vehicles.length === 0 ? (
          <View style={s.emptyVehicles}>
            <Text style={s.emptyVehiclesText}>Автомобили не выбраны</Text>
            <Pressable
              style={s.emptyVehiclesBtn}
              onPress={() => router.push({ pathname: '/(authenticated)/auto-list' as any, params: { mode: 'pass' } })}
            >
              <Text style={[s.emptyVehiclesBtnText, noSelect]}>Выбрать автомобили</Text>
            </Pressable>
          </View>
        ) : (
          vehicles.map((item: any) => (
            <View key={item.id} style={s.vehicleCard}>
              <View style={s.vehicleLeft}>
                <Text style={s.vehicleIcon}>🚛</Text>
                <Text style={s.vehicleNumber}>
                  {item.auto_number_base}{item.auto_number_region_code}
                </Text>
              </View>
              <View style={s.vehicleRight}>
                <Text style={s.vehiclePass}>Пропуск — {item.check_passes_string}</Text>
              </View>
            </View>
          ))
        )}

        {/* Spacer for fixed button */}
        <View style={{ height: 80 }} />
      </ScrollView>

      {/* Order button */}
      {canOrder && (
        <View style={s.footer}>
          <Pressable
            style={[s.orderBtn, submitting && s.orderBtnDisabled]}
            onPress={handleOrder}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={[s.orderBtnText, noSelect]}>Заказать пропуск</Text>
            )}
          </Pressable>
        </View>
      )}

      {/* Success modal */}
      {showModal && (
        <View style={s.modalOverlay}>
          <View style={s.modalContent}>
            <Text style={s.modalText}>В ближайшее время с Вами свяжется наш менеджер!</Text>
            <Pressable style={s.modalBtn} onPress={() => setShowModal(false)}>
              <Text style={[s.modalBtnText, noSelect]}>ОК</Text>
            </Pressable>
          </View>
        </View>
      )}
    </WebAppLayout>
  );
}

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
  backBtn: { width: 40, height: 40, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  backBtnText: { fontSize: 22, color: '#3A3A3A' },
  headerTitle: { fontSize: 22, fontWeight: '700', color: '#1A1A1A' },

  scroll: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 40 },

  sectionLabel: { fontSize: 15, color: '#313131', marginBottom: 10 },

  // Zone tabs
  tabRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  tabBtn: {
    flex: 1,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EEEEEE',
    borderRadius: 8,
  },
  tabBtnActive: { backgroundColor: '#D7D7D7' },
  tabBtnText: { fontSize: 15, fontWeight: '700', color: '#313131' },

  // Address input
  addressHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  clearBtn: {
    marginLeft: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#B8B8B8',
    backgroundColor: '#F9FAF9',
  },
  clearBtnText: { fontSize: 13, color: '#656565' },
  addressRow: { marginBottom: 10 },

  // Suggestions
  suggestionsBlock: { marginBottom: 10 },
  suggestionItem: {
    flexDirection: 'row',
    padding: 10,
    marginBottom: 8,
    backgroundColor: '#EEEEEE',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#B8B8B8',
  },
  suggestionText: { flex: 5, paddingLeft: 10 },
  suggestionMain: { fontSize: 16, fontWeight: '700', color: '#313131' },
  suggestionSub: { fontSize: 11, color: '#313131' },

  // Location badges
  badges: { width: 40 },
  badge: { alignItems: 'center', margin: 1, borderRadius: 2, paddingVertical: 1 },
  badgeMkad: { backgroundColor: '#57B6ED' },
  badgeTtk: { backgroundColor: '#19B28D' },
  badgeSk: { backgroundColor: '#EE505A' },
  badgeInactive: { backgroundColor: '#8C8C8C' },
  badgeText: { fontSize: 10, fontWeight: '700', color: '#FFFFFF' },

  // Vehicle cards
  vehicleCard: {
    flexDirection: 'row',
    padding: 12,
    marginBottom: 8,
    backgroundColor: '#EEEEEE',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#B8B8B8',
    alignItems: 'center',
  },
  vehicleLeft: { alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  vehicleIcon: { fontSize: 28 },
  vehicleNumber: { fontSize: 14, fontWeight: '700', color: '#313131', marginTop: 4 },
  vehicleRight: { flex: 1, justifyContent: 'center' },
  vehiclePass: { fontSize: 14, color: '#313131' },

  // Empty vehicle state
  emptyVehicles: {
    alignItems: 'center',
    paddingVertical: 24,
    marginBottom: 12,
  },
  emptyVehiclesText: {
    fontSize: 14,
    color: '#999',
    marginBottom: 16,
  },
  emptyVehiclesBtn: {
    backgroundColor: '#3A3A3A',
    borderRadius: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  emptyVehiclesBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Footer order button
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E8E8E8',
    backgroundColor: '#FFFFFF',
  },
  orderBtn: {
    backgroundColor: '#3A3A3A',
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: 'center',
  },
  orderBtnDisabled: { opacity: 0.6 },
  orderBtnText: { fontSize: 18, fontWeight: '700', color: '#FFFFFF' },

  // Modal overlay
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    maxWidth: 400,
    width: '90%',
    alignItems: 'center',
  },
  modalText: { fontSize: 16, color: '#313131', textAlign: 'center', marginBottom: 20 },
  modalBtn: {
    backgroundColor: '#3A3A3A',
    borderRadius: 8,
    paddingHorizontal: 40,
    paddingVertical: 12,
  },
  modalBtnText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
});
