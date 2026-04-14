import React, { useRef, useEffect } from 'react';
import { View, Text, TouchableHighlight, TouchableOpacity, TextInput, Image, Modal, Pressable, StatusBar, Platform, Alert } from 'react-native';
import { KeyboardAwareScrollView } from '../../components/common/KeyboardAwareScrollView';
import { SafeAreaView, SafeAreaInsetsContext } from 'react-native-safe-area-context';
import { ScreenHeader } from '../../components/common';
import { useRouter, useLocalSearchParams, useNavigation } from 'expo-router';

import styles from '../../styles/Styles.js';
import { usePassOrder } from '../../hooks/usePassOrder';

export default function PassScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const navigation = useNavigation();
  const addressInputRef = useRef<TextInput>(null);

  const {
    vehicles,
    locationType, toggleTab,
    lon, lat, isLocationTypeManual, applyMapData,
    address,
    mosRuStreetP7,
    mosRuAddress, mosRuAddressLConcat,
    streetList, addressList, userAddressList,
    handleAddressChange, markStreet, markAddress, markUserAddress,
    clearAddress, handleOrder,
    showModal, setShowModal,
    submitting, canOrder,
  } = usePassOrder();

  // Watch for map data returned from PassYaMap screen
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      if (params.address_map_data) {
        try {
          const str = Array.isArray(params.address_map_data) ? params.address_map_data[0] : params.address_map_data;
          if (typeof str === 'string') {
            applyMapData(JSON.parse(str));
          }
        } catch (e) {
          console.log('Error parsing address_map_data:', e);
        }
      }
    });
    return unsubscribe;
  }, [navigation, params.address_map_data, applyMapData]);

  const onMarkStreet = (item: any, index: number) => {
    markStreet(item);
    addressInputRef.current?.focus();
  };

  const onOrder = async () => {
    const errorMsg = await handleOrder();
    if (errorMsg) {
      Alert.alert('Ошибка', errorMsg);
    }
  };

  const setTabStyle = (tab: string) => ({
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    height: 50,
    backgroundColor: locationType === tab ? '#D7D7D7' : '#EEEEEE',
    borderRadius: 8,
  });

  // ── Render helpers ────────────────────────────────────────────────────────

  const renderLocationTypes = (locationTypes: any) => {
    const types = locationTypes || {};
    return (
      <View style={{ flex: 1, flexDirection: 'column' }}>
        <View style={{ alignItems: 'center', margin: 1, borderRadius: 2, backgroundColor: types.mkad === 1 ? '#57B6ED' : '#8C8C8C' }}>
          <Text style={{ fontSize: 10, fontWeight: 'bold' }}>МКАД</Text>
        </View>
        <View style={{ alignItems: 'center', margin: 1, borderRadius: 2, backgroundColor: types.ttk === 1 ? '#19B28D' : '#8C8C8C' }}>
          <Text style={{ fontSize: 10, fontWeight: 'bold' }}>ТТК</Text>
        </View>
        <View style={{ alignItems: 'center', margin: 1, borderRadius: 2, backgroundColor: types.sk === 1 ? '#EE505A' : '#8C8C8C' }}>
          <Text style={{ fontSize: 10, fontWeight: 'bold' }}>СК</Text>
        </View>
      </View>
    );
  };

  const renderStreetItem = (item: any, index: number) => (
    <Pressable key={item.id} onPress={() => onMarkStreet(item, index)}>
      <View style={{ flexDirection: 'row', margin: 20, padding: 10, backgroundColor: '#EEEEEE', borderRadius: 8, borderWidth: 1, borderColor: '#B8B8B8' }}>
        {renderLocationTypes(item.location_types)}
        <View style={{ flex: 5, flexDirection: 'column', paddingLeft: 10 }}>
          {item.p2 ? <Text style={{ fontSize: 11, color: '#313131' }}>{item.p2}</Text> : null}
          {item.p3 ? <Text style={{ fontSize: 11, color: '#313131' }}>{item.p3}</Text> : null}
          {item.p4 ? <Text style={{ fontSize: 11, color: '#313131' }}>{item.p4}</Text> : null}
          {item.p5 ? <Text style={{ fontSize: 11, color: '#313131' }}>{item.p5}</Text> : null}
          {item.p6 ? <Text style={{ fontSize: 11, color: '#313131' }}>{item.p6}</Text> : null}
          {item.p7 ? <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#313131' }}>{item.p7}</Text> : null}
        </View>
      </View>
    </Pressable>
  );

  const renderAddressItem = (item: any, index: number) => (
    <Pressable key={item.id} onPress={() => markAddress(item)}>
      <View style={{ flexDirection: 'row', margin: 20, padding: 10, backgroundColor: '#EEEEEE', borderRadius: 8, borderWidth: 1, borderColor: '#B8B8B8' }}>
        {renderLocationTypes(item.location_types)}
        <View style={{ flex: 5, flexDirection: 'column', paddingLeft: 10 }}>
          {item.l_concat ? <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#313131' }}>{item.l_concat}</Text> : null}
        </View>
      </View>
    </Pressable>
  );

  const renderUserAddressItem = (item: any, index: number) => (
    <Pressable key={item.id} onPress={() => markUserAddress(item)}>
      <View style={{ flexDirection: 'row', margin: 20, padding: 10, backgroundColor: '#EEEEEE', borderRadius: 8, borderWidth: 1, borderColor: '#B8B8B8' }}>
        {renderLocationTypes(item.location_types)}
        <View style={{ flex: 5, flexDirection: 'column', paddingLeft: 10 }}>
          <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#313131' }}>{item.mos_ru_street_p7} {item.mos_ru_address_l_concat}</Text>
        </View>
      </View>
    </Pressable>
  );

  const renderVehicleItem = (item: any) => (
    <View key={item.id} style={{ flexDirection: 'row', margin: 20, padding: 10, backgroundColor: '#EEEEEE', borderRadius: 8, borderWidth: 1, borderColor: '#B8B8B8' }}>
      <View style={{ flex: 3, alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
        <Image source={require('../../../assets/images/truck.png')} style={{ width: 47, height: 36 }} />
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
          <Text style={{ paddingTop: 5, fontSize: 14, fontWeight: 'bold', color: '#313131' }}>
            {item.auto_number_base}{item.auto_number_region_code}
          </Text>
        </View>
      </View>
      <View style={{ flex: 5, flexDirection: 'column', paddingLeft: 10 }}>
        <View style={{ flexDirection: 'row' }}>
          <Text style={{ color: '#313131' }}>Пропуск - {item.check_passes_string}</Text>
        </View>
      </View>
    </View>
  );

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" translucent={false} />

      <ScreenHeader title="Добавить адрес" onBack={() => router.back()} />

      {/* Success modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showModal}
        onRequestClose={() => setShowModal(false)}
      >
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <View style={{
            backgroundColor: '#8C8C8C',
            borderRadius: 25,
            alignItems: 'stretch',
            justifyContent: 'center',
          }}>
            <Text style={{ paddingLeft: 16, paddingRight: 16, paddingTop: 24, fontSize: 16, fontWeight: 'normal', color: '#4C4C4C' }}>
              В ближайшее время с Вами свяжется наш менеджер!
            </Text>
            <View style={{ alignItems: 'center', justifyContent: 'center' }}>
              <View style={{ flexDirection: 'row', width: 400 }}>
                <View style={{ flex: 1, height: 100, alignItems: 'center', justifyContent: 'center' }}>
                  <TouchableOpacity
                    style={{ height: 50, margin: 25, borderRadius: 5, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FEE600' }}
                    onPress={() => setShowModal(false)}
                  >
                    <Text style={{ paddingLeft: 20, paddingRight: 20, fontSize: 14, color: '#2B2D33' }}>ОК</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      <SafeAreaInsetsContext.Consumer>
        {(insets) => (
          <KeyboardAwareScrollView
            enableOnAndroid={true}
            extraScrollHeight={Platform.OS === 'ios' ? 20 : 80}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: 120 + Math.max(insets?.bottom || 0, 20) }}
          >
            <Text style={{ paddingTop: 15, paddingLeft: 20, paddingRight: 20, fontSize: 15, fontWeight: 'normal', color: '#313131' }}>
              Вы можете указать зону
            </Text>

            {/* Zone tabs */}
            <View style={{ flexDirection: 'row' }}>
              <Pressable style={{ flex: 1, marginTop: 20, marginBottom: 5, marginLeft: 20, marginRight: 10 }} onPress={() => toggleTab('mkad')}>
                <View style={setTabStyle('mkad')}>
                  <Text style={{ fontSize: 15, fontWeight: 'bold', color: '#313131' }}>МКАД</Text>
                </View>
              </Pressable>
              <Pressable style={{ flex: 1, marginTop: 20, marginBottom: 5, marginLeft: 10, marginRight: 10 }} onPress={() => toggleTab('ttk')}>
                <View style={setTabStyle('ttk')}>
                  <Text style={{ fontSize: 15, fontWeight: 'bold', color: '#313131' }}>ТТК</Text>
                </View>
              </Pressable>
              <Pressable style={{ flex: 1, marginTop: 20, marginBottom: 5, marginLeft: 10, marginRight: 20 }} onPress={() => toggleTab('sk')}>
                <View style={setTabStyle('sk')}>
                  <Text style={{ fontSize: 15, fontWeight: 'bold', color: '#313131' }}>СК</Text>
                </View>
              </Pressable>
            </View>

            {/* Manual zone warning */}
            {lon !== '' && lat !== '' && isLocationTypeManual && (
              <View style={{
                marginLeft: 20, marginRight: 20, marginBottom: 15, padding: 10,
                backgroundColor: '#FFF3CD', borderRadius: 5, borderWidth: 1, borderColor: '#FFE69C',
              }}>
                <Text style={{ fontSize: 12, color: '#856404', textAlign: 'center' }}>
                  Зона изменена вручную. Убедитесь, что выбранная зона соответствует адресу.
                </Text>
              </View>
            )}

            <View style={{ height: 10 }} />

            {/* Address label + clear button */}
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingLeft: 20, paddingRight: 20 }}>
              <Text style={{ fontSize: 15, fontWeight: 'normal', color: '#313131' }}>Куда едем?</Text>
              {address !== '' && (
                <TouchableOpacity
                  style={{
                    marginLeft: 12, paddingHorizontal: 12, paddingVertical: 6,
                    borderRadius: 6, borderWidth: 1, borderColor: '#B8B8B8', backgroundColor: '#F9FAF9',
                  }}
                  onPress={clearAddress}
                >
                  <Text style={{ fontSize: 13, color: '#656565' }}>Очистить</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Address input + map button */}
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', paddingLeft: 30, paddingRight: 30, paddingTop: 20 }}>
              <TextInput
                ref={addressInputRef}
                multiline={true}
                numberOfLines={3}
                textAlignVertical="top"
                style={[
                  {
                    flex: 1, minHeight: 45, maxHeight: 90, fontSize: 14,
                    paddingLeft: 10, paddingRight: 10, paddingTop: 12, paddingBottom: 12,
                    borderWidth: 1, borderRadius: 8, color: '#313131',
                  },
                  { backgroundColor: address !== '' ? '#FFFFFF' : '#F9FAF9' },
                  { borderColor: address !== '' ? '#656565' : '#B8B8B8' },
                ]}
                onChangeText={handleAddressChange}
                value={address}
              />
              <TouchableHighlight
                style={{ padding: 10, marginLeft: 10 }}
                activeOpacity={1}
                underlayColor='#FFFFFF'
                onPress={() => {
                  router.push({
                    pathname: '/(authenticated)/pass-yamap' as any,
                    params: {
                      location_type: locationType,
                      auto_list: JSON.stringify(vehicles),
                      lon: String(lon),
                      lat: String(lat),
                      address: address,
                    },
                  });
                }}
              >
                <Image source={require('../../../assets/images/pass_yamap_2.png')} />
              </TouchableHighlight>
            </View>

            {/* Street suggestions */}
            <View>
              {streetList.map((item, index) => renderStreetItem(item, index))}
            </View>

            {/* Address suggestions */}
            <View>
              {addressList.map((item, index) => renderAddressItem(item, index))}
            </View>

            {/* Previously entered addresses */}
            {userAddressList.length > 0 && (
              <Text style={{ paddingLeft: 20, paddingRight: 20, paddingTop: 20, fontSize: 15, fontWeight: 'normal', color: '#313131' }}>
                Ранее введен:
              </Text>
            )}
            <View>
              {userAddressList.map((item, index) => renderUserAddressItem(item, index))}
            </View>

            {/* Vehicle list */}
            <Text style={{ paddingLeft: 20, paddingRight: 20, paddingTop: 20, fontSize: 15, fontWeight: 'normal', color: '#313131' }}>
              Автомобили на маршрут:
            </Text>
            <View>
              {vehicles.map((item) => renderVehicleItem(item))}
            </View>
          </KeyboardAwareScrollView>
        )}
      </SafeAreaInsetsContext.Consumer>

      {/* Order button */}
      <SafeAreaInsetsContext.Consumer>
        {(insets) => (
          canOrder ? (
            <TouchableHighlight
              style={{
                position: 'absolute', left: 10, bottom: Math.max(insets?.bottom || 0, 10),
                right: 10, height: 50, margin: 25, borderRadius: 5,
                alignItems: 'center', justifyContent: 'center', backgroundColor: '#3A3A3A',
              }}
              onPress={onOrder}
              disabled={submitting}
            >
              <Text style={{ fontSize: 24, color: '#FFFFFF' }}>Заказать пропуск</Text>
            </TouchableHighlight>
          ) : null
        )}
      </SafeAreaInsetsContext.Consumer>
    </SafeAreaView>
  );
}
