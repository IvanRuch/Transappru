/**
 * Web version of PassScreen.
 *
 * Shares all business logic with mobile via usePassOrder (ADR-003) and all
 * sub-components via src/components/pass (ADR-005). Styling uses NativeWind
 * classNames + shared tailwind design tokens. Web-specific concerns:
 *  - Responsive max-width via WebScreenContainer
 *  - ARIA combobox pattern over the address <input> and suggestion lists
 *  - Keyboard navigation (ArrowUp/Down/Enter/Escape) through suggestions
 *  - Inline loading indicator on the autocomplete
 *  - safeBack for direct URL entries (router.back when possible, else /main)
 */
import React, { useMemo, useRef, useState, useCallback } from 'react';
import { View, Text, Pressable, ScrollView, ActivityIndicator, Image } from 'react-native';
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

  const [isSearching, setIsSearching] = useState(false);
  const [focusedIdx, setFocusedIdx] = useState(-1);

  /** Combined list used for keyboard navigation (across street + address + user). */
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
    <View className="flex-1">
      <ScreenHeader title="Добавить адрес" onBack={safeBack} />

      <WebScreenContainer maxWidth={820}>
        <ScrollView className="flex-1" contentContainerStyle={{ paddingVertical: 20, paddingBottom: 40 }}>
          <Text className="px-5 text-[15px] text-text-primary select-none">
            Вы можете указать зону
          </Text>

          <View className="mt-5 mb-[5px] px-5">
            <ZoneTabs value={locationType as any} onToggle={toggleTab} />
          </View>

          <ManualZoneBanner visible={isLocationTypeManual} />

          <View className="flex-row items-center px-5 pt-2.5">
            <Text className="text-[15px] text-text-primary select-none">Куда едем?</Text>
            {address !== '' && (
              <Pressable
                className="ml-3 px-3 py-1.5 rounded-md border bg-white border-border-primary cursor-pointer"
                onPress={clearAddress}
              >
                <Text className="text-[13px] text-text-secondary select-none">Очистить</Text>
              </Pressable>
            )}
          </View>

          <View className="flex-row items-center px-5 pt-3 pb-2">
            <View className="flex-1 relative">
              <input
                ref={addressRef}
                type="text"
                value={address}
                onChange={(e) => onAddressChange(e.target.value)}
                onKeyDown={onInputKeyDown}
                placeholder="Начните вводить улицу..."
                style={inputStyle(address !== '')}
                role="combobox"
                aria-expanded={hasSuggestions}
                aria-controls="pass-suggestions-auto pass-suggestions-user"
                aria-autocomplete="list"
                aria-activedescendant={activeDescendantId}
                autoComplete="off"
                aria-label="Адрес доставки"
              />
              {isSearching && (
                <View className="absolute right-3 top-0 bottom-0 justify-center" pointerEvents="none">
                  <ActivityIndicator size="small" color="#3A3A3A" />
                </View>
              )}
            </View>
            <Pressable
              className="p-2.5 ml-2.5 cursor-pointer"
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

          {/* Autocomplete: street + address suggestions */}
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

          {/* Previously entered addresses */}
          {userAddressList.length > 0 && (
            <>
              <Text className="px-5 pt-5 text-[15px] text-text-primary select-none">Ранее введён:</Text>
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

          <Text className="px-5 pt-5 text-[15px] text-text-primary select-none">Автомобили на маршрут:</Text>
          {vehicles.length === 0 ? (
            <View className="items-center py-6 mx-5">
              <Text className="text-sm text-text-muted mb-4">Автомобили не выбраны</Text>
              <Pressable
                className="bg-accent-secondary rounded-lg px-6 py-3 cursor-pointer"
                onPress={() => router.push({ pathname: '/(authenticated)/auto-list' as any, params: { mode: 'pass' } })}
              >
                <Text className="text-[15px] font-bold text-white select-none">Выбрать автомобили</Text>
              </Pressable>
            </View>
          ) : (
            vehicles.map((v: any) => <VehicleCard key={v.id} vehicle={v} />)
          )}

          <View className="h-20" />
        </ScrollView>

        {canOrder && (
          <View className="p-4 border-t border-border-secondary bg-white">
            <Pressable
              className={`rounded-[10px] py-4 items-center cursor-pointer bg-accent-secondary ${submitting ? 'opacity-60' : ''}`}
              onPress={onOrder}
              disabled={submitting}
              accessibilityRole="button"
              accessibilityLabel="Заказать пропуск"
              accessibilityState={{ disabled: submitting, busy: submitting }}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text className="text-lg font-bold text-white select-none">Заказать пропуск</Text>
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

/**
 * Raw HTML <input> cannot be styled via NativeWind className (RN Web doesn't
 * bridge it as a RN component). So we keep a minimal inline CSS object that
 * uses the same visual tokens where possible.
 */
function inputStyle(filled: boolean): React.CSSProperties {
  return {
    flex: 1,
    padding: '12px 12px',
    paddingRight: 40, // room for spinner
    fontSize: 14,
    borderRadius: 8,
    border: `1px solid ${filled ? '#656565' : '#B8B8B8'}`,
    backgroundColor: '#FFFFFF',
    outline: 'none',
    fontFamily: 'inherit',
    color: '#313131',
    boxSizing: 'border-box',
    width: '100%',
  };
}
