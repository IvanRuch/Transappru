import React, { useRef } from 'react';
import {
  View, Text, TouchableHighlight, TouchableOpacity, TextInput, Image,
  StatusBar, Platform,
} from 'react-native';
import { KeyboardAwareScrollView } from '../../components/common/KeyboardAwareScrollView';
import { SafeAreaView, SafeAreaInsetsContext } from 'react-native-safe-area-context';
import { ScreenHeader } from '../../components/common';
import { useRouter } from 'expo-router';

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
    <SafeAreaView className="flex-1 bg-light-bg dark:bg-dark-bg" edges={['top']}>
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
            <Text className="pt-[15px] px-5 text-[15px] text-text-primary">Вы можете указать зону</Text>

            <View className="mt-5 mb-[5px] mx-5">
              <ZoneTabs value={locationType as any} onToggle={toggleTab} />
            </View>

            <ManualZoneBanner visible={isLocationTypeManual} />

            <View className="flex-row items-center px-5 pt-2.5">
              <Text className="text-[15px] text-text-primary">Куда едем?</Text>
              {address !== '' && (
                <TouchableOpacity
                  className="ml-3 px-3 py-1.5 rounded-md border bg-white border-border-primary"
                  onPress={clearAddress}
                >
                  <Text className="text-[13px] text-text-secondary">Очистить</Text>
                </TouchableOpacity>
              )}
            </View>

            <View className="flex-row items-start px-[30px] pt-5">
              <TextInput
                ref={addressInputRef}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                className={`flex-1 min-h-[45px] max-h-[90px] text-sm px-2.5 py-3 border rounded-lg text-text-primary ${
                  address !== '' ? 'bg-white border-text-secondary' : 'bg-white border-border-primary'
                }`}
                onChangeText={handleAddressChange}
                value={address}
              />
              <TouchableHighlight
                className="p-2.5 ml-2.5"
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
              <Text className="px-5 pt-5 text-[15px] text-text-primary">Ранее введён:</Text>
            )}
            {userAddressList.map((item, idx) => (
              <SuggestionItem
                key={item.id ?? idx}
                item={item}
                variant="user"
                onPress={() => markUserAddress(item)}
              />
            ))}

            <Text className="px-5 pt-5 text-[15px] text-text-primary">Автомобили на маршрут:</Text>
            {vehicles.length === 0 ? (
              <View className="items-center py-6 mx-5">
                <Text className="text-sm text-text-muted mb-4">Автомобили не выбраны</Text>
                <TouchableOpacity
                  className="bg-accent-secondary rounded-lg px-6 py-3"
                  onPress={() => router.push({ pathname: '/(authenticated)/auto-list' as any, params: { mode: 'pass' } })}
                >
                  <Text className="text-[15px] font-bold text-white">Выбрать автомобили</Text>
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
              className="absolute left-2.5 right-2.5 h-[50px] m-6 rounded items-center justify-center bg-accent-secondary"
              style={{ bottom: Math.max(insets?.bottom || 0, 10) }}
              onPress={onOrder}
              disabled={submitting}
            >
              <Text className="text-2xl text-white">Заказать пропуск</Text>
            </TouchableHighlight>
          ) : null
        )}
      </SafeAreaInsetsContext.Consumer>
    </SafeAreaView>
  );
}
