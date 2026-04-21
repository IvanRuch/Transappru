import React, { useRef } from 'react';
import {
  View, Text, TouchableHighlight, TouchableOpacity, TextInput, Image,
  Pressable, StatusBar, Platform,
} from 'react-native';
import { KeyboardAwareScrollView } from '../../components/common/KeyboardAwareScrollView';
import { SafeAreaView, SafeAreaInsetsContext } from 'react-native-safe-area-context';
import { ScreenHeader } from '../../components/common';
import { useRouter } from 'expo-router';

import styles from '../../styles/Styles.js';
import { usePassOrder } from '../../hooks/usePassOrder';
import { showAlert } from '../../utils/alert';
import {
  ZoneTabs,
  SuggestionItem,
  VehicleCard,
  ManualZoneBanner,
  SuccessModal,
} from '../../components/pass';

export default function PassScreen() {
  const router = useRouter();
  const addressInputRef = useRef<TextInput>(null);

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

  const onMarkStreet = (item: any) => {
    markStreet(item);
    addressInputRef.current?.focus();
  };

  const onOrder = async () => {
    const errorMsg = await handleOrder();
    if (errorMsg) showAlert('Ошибка', errorMsg);
  };

  const safeBack = () => (router.canGoBack() ? router.back() : router.replace('/main' as any));

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" translucent={false} />

      <ScreenHeader title="Добавить адрес" onBack={safeBack} />

      <SuccessModal
        visible={showModal}
        message="В ближайшее время с Вами свяжется наш менеджер!"
        onClose={() => setShowModal(false)}
      />

      <SafeAreaInsetsContext.Consumer>
        {(insets) => (
          <KeyboardAwareScrollView
            enableOnAndroid={true}
            extraScrollHeight={Platform.OS === 'ios' ? 20 : 80}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: 120 + Math.max(insets?.bottom || 0, 20) }}
          >
            <Text style={sheet.sectionHint}>Вы можете указать зону</Text>

            <View style={sheet.tabsWrapper}>
              <ZoneTabs value={locationType as any} onToggle={toggleTab} />
            </View>

            <ManualZoneBanner visible={isLocationTypeManual} />

            <View style={sheet.addressHeaderRow}>
              <Text style={sheet.sectionLabel}>Куда едем?</Text>
              {address !== '' && (
                <TouchableOpacity style={sheet.clearBtn} onPress={clearAddress}>
                  <Text style={sheet.clearBtnText}>Очистить</Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={sheet.addressInputRow}>
              <TextInput
                ref={addressInputRef}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                style={[
                  sheet.addressInput,
                  { backgroundColor: address !== '' ? '#FFFFFF' : '#F9FAF9' },
                  { borderColor: address !== '' ? '#656565' : '#B8B8B8' },
                ]}
                onChangeText={handleAddressChange}
                value={address}
              />
              <TouchableHighlight
                style={sheet.mapBtn}
                activeOpacity={1}
                underlayColor="#FFFFFF"
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
              </TouchableHighlight>
            </View>

            {streetList.map((item, idx) => (
              <SuggestionItem
                key={item.id ?? idx}
                item={item}
                variant="street"
                onPress={() => onMarkStreet(item)}
              />
            ))}

            {addressList.map((item, idx) => (
              <SuggestionItem
                key={item.id ?? idx}
                item={item}
                variant="address"
                onPress={() => markAddress(item)}
              />
            ))}

            {userAddressList.length > 0 && (
              <Text style={sheet.sectionLabel}>Ранее введён:</Text>
            )}
            {userAddressList.map((item, idx) => (
              <SuggestionItem
                key={item.id ?? idx}
                item={item}
                variant="user"
                onPress={() => markUserAddress(item)}
              />
            ))}

            <Text style={sheet.sectionLabel}>Автомобили на маршрут:</Text>
            {vehicles.length === 0 ? (
              <View style={sheet.emptyVehicles}>
                <Text style={sheet.emptyText}>Автомобили не выбраны</Text>
                <TouchableOpacity
                  style={sheet.emptyBtn}
                  onPress={() => router.push({ pathname: '/(authenticated)/auto-list' as any, params: { mode: 'pass' } })}
                >
                  <Text style={sheet.emptyBtnText}>Выбрать автомобили</Text>
                </TouchableOpacity>
              </View>
            ) : (
              vehicles.map((v: any) => <VehicleCard key={v.id} vehicle={v} />)
            )}
          </KeyboardAwareScrollView>
        )}
      </SafeAreaInsetsContext.Consumer>

      <SafeAreaInsetsContext.Consumer>
        {(insets) => (
          canOrder ? (
            <TouchableHighlight
              style={[
                sheet.orderBtn,
                { bottom: Math.max(insets?.bottom || 0, 10) },
              ]}
              onPress={onOrder}
              disabled={submitting}
            >
              <Text style={sheet.orderBtnText}>Заказать пропуск</Text>
            </TouchableHighlight>
          ) : null
        )}
      </SafeAreaInsetsContext.Consumer>
    </SafeAreaView>
  );
}

import { StyleSheet } from 'react-native';

const sheet = StyleSheet.create({
  sectionHint: {
    paddingTop: 15,
    paddingHorizontal: 20,
    fontSize: 15,
    color: '#313131',
  },
  tabsWrapper: {
    marginTop: 20,
    marginBottom: 5,
    marginHorizontal: 20,
  },
  addressHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  sectionLabel: {
    paddingHorizontal: 20,
    paddingTop: 20,
    fontSize: 15,
    color: '#313131',
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
  addressInputRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 30,
    paddingTop: 20,
  },
  addressInput: {
    flex: 1,
    minHeight: 45,
    maxHeight: 90,
    fontSize: 14,
    paddingHorizontal: 10,
    paddingVertical: 12,
    borderWidth: 1,
    borderRadius: 8,
    color: '#313131',
  },
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
  orderBtn: {
    position: 'absolute',
    left: 10,
    right: 10,
    height: 50,
    margin: 25,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3A3A3A',
  },
  orderBtnText: { fontSize: 24, color: '#FFFFFF' },
});
