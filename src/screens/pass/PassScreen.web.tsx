/**
 * Web version of PassScreen.
 *
 * Shares all business logic with mobile via usePassOrder (ADR-003) and all
 * sub-components via src/components/pass (ADR-005). Web-specific concerns:
 *  - Responsive max-width via WebScreenContainer
 *  - ARIA combobox pattern over the address <input> and suggestion lists
 *  - Keyboard navigation (ArrowUp/Down/Enter/Escape) through suggestions
 *  - Inline loading indicator on the autocomplete
 *  - safeBack for direct URL entries (router.back when possible, else /main)
 */
import React, { useMemo, useRef, useState, useCallback } from 'react';
import {
  View, Text, Pressable, ScrollView, StyleSheet, ActivityIndicator, Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { usePassOrder } from '../../hooks/usePassOrder';
import { showAlert } from '../../utils/alert';
import { ScreenHeader } from '../../components/common';
import WebScreenContainer from '../../components/web/WebScreenContainer';
import {
  ZoneTabs,
  SuggestionItem,
  VehicleCard,
  ManualZoneBanner,
  SuccessModal,
} from '../../components/pass';
// WebAppLayout is provided by _layout.web.tsx — do NOT wrap again here.

export default function PassScreen() {
  const router = useRouter();
  const addressRef = useRef<HTMLInputElement>(null);

  const {
    vehicles,
    locationType, toggleTab,
    lon, lat, isLocationTypeManual,
    address,
    streetList, addressList, userAddressList,
    handleAddressChange, markStreet, markAddress, markUserAddress,
    clearAddress, handleOrder,
    showModal, setShowModal,
    submitting, canOrder,
  } = usePassOrder();

  // Loading indicator for address autocomplete.
  const [isSearching, setIsSearching] = useState(false);
  // Keyboard-focused index across concatenated street + address + user lists.
  const [focusedIdx, setFocusedIdx] = useState(-1);

  /** Combined list used for keyboard navigation. Streets and addresses are
   *  mutually exclusive in practice (see usePassOrder), but we combine them
   *  defensively to keep the indexing uniform.
   */
  const combined = useMemo(() => {
    const s = streetList.map((x: any) => ({ kind: 'street' as const, item: x }));
    const a = addressList.map((x: any) => ({ kind: 'address' as const, item: x }));
    const u = userAddressList.map((x: any) => ({ kind: 'user' as const, item: x }));
    return [...s, ...a, ...u];
  }, [streetList, addressList, userAddressList]);

  const onAddressChange = useCallback(async (value: string) => {
    setIsSearching(true);
    setFocusedIdx(-1);
    try {
      await handleAddressChange(value);
    } finally {
      setIsSearching(false);
    }
  }, [handleAddressChange]);

  const onMarkStreet = useCallback((item: any) => {
    markStreet(item);
    setFocusedIdx(-1);
    setTimeout(() => addressRef.current?.focus(), 60);
  }, [markStreet]);

  const onPickCombined = useCallback((idx: number) => {
    const entry = combined[idx];
    if (!entry) return;
    if (entry.kind === 'street') onMarkStreet(entry.item);
    else if (entry.kind === 'address') markAddress(entry.item);
    else markUserAddress(entry.item);
  }, [combined, markAddress, markUserAddress, onMarkStreet]);

  const onInputKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (combined.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedIdx(i => (i + 1) % combined.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedIdx(i => (i <= 0 ? combined.length - 1 : i - 1));
    } else if (e.key === 'Enter' && focusedIdx >= 0) {
      e.preventDefault();
      onPickCombined(focusedIdx);
    } else if (e.key === 'Escape') {
      if (address) {
        e.preventDefault();
        clearAddress();
        setFocusedIdx(-1);
      }
    }
  }, [combined, focusedIdx, onPickCombined, address, clearAddress]);

  const onOrder = useCallback(async () => {
    const errorMsg = await handleOrder();
    if (errorMsg) showAlert('Ошибка', errorMsg);
  }, [handleOrder]);

  const safeBack = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/main' as any);
  }, [router]);

  const hasSuggestions = combined.length > 0;
  const activeDescendantId =
    focusedIdx >= 0 && focusedIdx < combined.length
      ? `pass-suggestion-${focusedIdx}`
      : undefined;

  return (
    <View style={{ flex: 1 }}>
      <ScreenHeader title="Добавить адрес" onBack={safeBack} />

      <WebScreenContainer maxWidth={820}>
        <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent}>
          <Text style={s.sectionHint} selectable={false}>Вы можете указать зону</Text>

          <View style={{ marginTop: 20, marginBottom: 5 }}>
            <ZoneTabs value={locationType as any} onToggle={toggleTab} />
          </View>

          <ManualZoneBanner visible={isLocationTypeManual} />

          <View style={s.addressHeader}>
            <Text style={s.sectionLabel} selectable={false}>Куда едем?</Text>
            {address !== '' && (
              <Pressable style={s.clearBtn} onPress={clearAddress}>
                <Text style={s.clearBtnText} selectable={false}>Очистить</Text>
              </Pressable>
            )}
          </View>

          <View style={s.addressRow}>
            <View style={s.inputWrap}>
              <input
                ref={addressRef}
                type="text"
                value={address}
                onChange={(e) => onAddressChange(e.target.value)}
                onKeyDown={onInputKeyDown}
                placeholder="Начните вводить улицу..."
                style={inputStyle(address !== '')}
                // ARIA combobox pattern
                role="combobox"
                aria-expanded={hasSuggestions}
                aria-controls="pass-suggestions-auto pass-suggestions-user"
                aria-autocomplete="list"
                aria-activedescendant={activeDescendantId}
                autoComplete="off"
                aria-label="Адрес доставки"
              />
              {isSearching && (
                <View style={s.inputSpinner} pointerEvents="none">
                  <ActivityIndicator size="small" color="#3A3A3A" />
                </View>
              )}
            </View>
            <Pressable
              style={s.mapBtn}
              accessibilityRole="button"
              accessibilityLabel="Выбрать адрес на карте"
              onPress={() => {
                router.push({
                  pathname: '/(authenticated)/pass-yamap' as any,
                  params: {
                    location_type: locationType,
                    auto_list: JSON.stringify(vehicles),
                    lon: String(lon),
                    lat: String(lat),
                    address,
                  },
                });
              }}
            >
              <Image source={require('../../../assets/images/pass_yamap_2.png')} />
            </Pressable>
          </View>

          {/* Autocomplete results — street and address suggestions */}
          {(streetList.length > 0 || addressList.length > 0) && (
            <View nativeID="pass-suggestions-auto" accessibilityRole={'list' as any}>
              {streetList.map((item: any, idx: number) => (
                <SuggestionItem
                  key={`street-${item.id ?? idx}`}
                  nativeID={`pass-suggestion-${idx}`}
                  item={item}
                  variant="street"
                  focused={idx === focusedIdx}
                  onPress={() => onPickCombined(idx)}
                />
              ))}
              {addressList.map((item: any, idx: number) => {
                const combinedIdx = streetList.length + idx;
                return (
                  <SuggestionItem
                    key={`address-${item.id ?? idx}`}
                    nativeID={`pass-suggestion-${combinedIdx}`}
                    item={item}
                    variant="address"
                    focused={combinedIdx === focusedIdx}
                    onPress={() => onPickCombined(combinedIdx)}
                  />
                );
              })}
            </View>
          )}

          {/* Previously entered addresses — separate block with its own header */}
          {userAddressList.length > 0 && (
            <>
              <Text style={s.sectionLabelSpaced} selectable={false}>Ранее введён:</Text>
              <View nativeID="pass-suggestions-user" accessibilityRole={'list' as any}>
                {userAddressList.map((item: any, idx: number) => {
                  const combinedIdx = streetList.length + addressList.length + idx;
                  return (
                    <SuggestionItem
                      key={`user-${item.id ?? idx}`}
                      nativeID={`pass-suggestion-${combinedIdx}`}
                      item={item}
                      variant="user"
                      focused={combinedIdx === focusedIdx}
                      onPress={() => onPickCombined(combinedIdx)}
                    />
                  );
                })}
              </View>
            </>
          )}

          <Text style={s.sectionLabelSpaced} selectable={false}>Автомобили на маршрут:</Text>
          {vehicles.length === 0 ? (
            <View style={s.emptyVehicles}>
              <Text style={s.emptyText}>Автомобили не выбраны</Text>
              <Pressable
                style={s.emptyBtn}
                onPress={() => router.push({ pathname: '/(authenticated)/auto-list' as any, params: { mode: 'pass' } })}
              >
                <Text style={s.emptyBtnText} selectable={false}>Выбрать автомобили</Text>
              </Pressable>
            </View>
          ) : (
            vehicles.map((v: any) => <VehicleCard key={v.id} vehicle={v} />)
          )}

          <View style={{ height: 80 }} />
        </ScrollView>

        {canOrder && (
          <View style={s.footer}>
            <Pressable
              style={[s.orderBtn, submitting && s.orderBtnDisabled]}
              onPress={onOrder}
              disabled={submitting}
              accessibilityRole="button"
              accessibilityLabel="Заказать пропуск"
              accessibilityState={{ disabled: submitting, busy: submitting }}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={s.orderBtnText} selectable={false}>Заказать пропуск</Text>
              )}
            </Pressable>
          </View>
        )}
      </WebScreenContainer>

      <SuccessModal
        visible={showModal}
        message="В ближайшее время с Вами свяжется наш менеджер!"
        onClose={() => setShowModal(false)}
      />
    </View>
  );
}

function inputStyle(filled: boolean): React.CSSProperties {
  return {
    flex: 1,
    padding: '12px 12px',
    paddingRight: 40, // room for spinner
    fontSize: 14,
    borderRadius: 8,
    border: `1px solid ${filled ? '#656565' : '#B8B8B8'}`,
    backgroundColor: filled ? '#FFFFFF' : '#F9FAF9',
    outline: 'none',
    fontFamily: 'inherit',
    color: '#313131',
    boxSizing: 'border-box',
    width: '100%',
  };
}

const s = StyleSheet.create({
  scroll: { flex: 1 },
  scrollContent: { paddingVertical: 20, paddingBottom: 40 },

  sectionHint: { fontSize: 15, color: '#313131', paddingHorizontal: 20 },
  sectionLabel: { fontSize: 15, color: '#313131' },
  sectionLabelSpaced: {
    fontSize: 15,
    color: '#313131',
    paddingHorizontal: 20,
    paddingTop: 20,
  },

  addressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
  },
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

  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  inputWrap: { flex: 1, position: 'relative' },
  inputSpinner: { position: 'absolute', right: 12, top: 0, bottom: 0, justifyContent: 'center' },
  mapBtn: { padding: 10, marginLeft: 10 },

  emptyVehicles: {
    alignItems: 'center',
    paddingVertical: 24,
    marginHorizontal: 20,
  },
  emptyText: { fontSize: 14, color: '#999', marginBottom: 16 },
  emptyBtn: {
    backgroundColor: '#3A3A3A',
    borderRadius: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  emptyBtnText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },

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
});
