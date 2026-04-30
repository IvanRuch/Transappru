import React, { useState } from 'react';
import { View, Text, TouchableHighlight, Image, ScrollView, Platform, Animated, StatusBar, Dimensions } from 'react-native';
import Modal from 'react-native-modal';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { UserData, OurService } from '../../../types/auto';
import { OrgListItem } from '../../sidebar';

interface LeftMenuModalProps {
  visible: boolean;
  userData: UserData;
  ourServicesList: OurService[];
  otherUserList: UserData[];
  /**
   * Total cars in the active organization. Comes from `useAutoData.autoListCount`
   * (= `data.auto_list_count` from `/get-auto-list`). Needed because the
   * backend does NOT include `user_auto_count` on `data.user_data` for the
   * active org — only on each entry of `data.other_user_list`. Without this
   * prop the active row would always show 0.
   */
  autoListCount: number;
  onboardingExpired: number;
  pulseFontSize: any;
  onClose: () => void;
  onNavigateToOnBoarding: () => void;
  onNavigateToDriverList: () => void;
  onNavigateToInn: (userData: UserData, checkRnis: boolean) => void;
  onSwitchOrganization: (inn: string, onSuccess?: () => void, onFinally?: () => void) => void;
}

export const LeftMenuModal: React.FC<LeftMenuModalProps> = ({
  visible,
  userData,
  ourServicesList,
  otherUserList,
  autoListCount,
  onboardingExpired,
  pulseFontSize,
  onClose,
  onNavigateToOnBoarding,
  onNavigateToDriverList,
  onNavigateToInn,
  onSwitchOrganization,
}) => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [ourServicesVisible, setOurServicesVisible] = useState(false);
  // INN currently being switched to (null = idle). Drives per-row spinner.
  const [switchingInn, setSwitchingInn] = useState<string | null>(null);
  
  // Адаптивная ширина меню: максимум 75% экрана или 340px
  const screenWidth = Dimensions.get('window').width;
  const menuWidth = Math.min(screenWidth * 0.75, 340);
  
  return (
    <Modal
      isVisible={visible}
      animationIn="slideInLeft"
      animationOut="slideOutLeft"
      onBackButtonPress={onClose}
      onBackdropPress={onClose}
      style={{
        flex: 1,
        flexDirection: 'column',
        alignItems: 'flex-start',
        margin: 0,
      }}
    >
      <View style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <View style={{
          backgroundColor: '#FFFFFF',
          alignItems: 'stretch',
          justifyContent: 'flex-start',
          position: 'absolute',
          left: 0,
          width: menuWidth,
          height: '100%',
        }}>
          {/* Шапка меню */}
          <View style={{
            backgroundColor: '#B8B8B8',
            alignItems: 'stretch',
            justifyContent: 'center',
            paddingTop: Platform.OS === 'ios' ? 30 : (StatusBar.currentHeight || 0),
            width: '100%'
          }}>
            <Text style={{ 
              paddingLeft: 16, 
              paddingRight: 16, 
              paddingTop: 24, 
              fontSize: 16, 
              fontWeight: 'bold', 
              color: '#FFFFFF' 
            }}>
              {userData.firm || ''}
            </Text>

            <Text style={{ 
              paddingLeft: 16, 
              paddingRight: 16, 
              fontSize: 12, 
              fontWeight: 'bold', 
              color: '#FFFFFF' 
            }}>
              инн: {userData.inn || ''}
            </Text>

            <Text style={{ 
              paddingLeft: 16, 
              paddingRight: 16, 
              paddingBottom: 24, 
              paddingTop: 10, 
              fontSize: 12, 
              fontWeight: 'normal', 
              color: '#FFFFFF' 
            }}>
              +{userData.phone || ''}
            </Text>
          </View>

          <ScrollView contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 20) + 40 }}>
            {/* 1. Наши услуги */}
            <TouchableHighlight 
              style={{ paddingTop: 20, borderTopWidth: 1, borderTopColor: '#B8B8B8' }}
              activeOpacity={1}
              underlayColor='#FFFFFF'
              onPress={() => setOurServicesVisible(!ourServicesVisible)}
            >
              <View style={{ flexDirection: 'row', alignItems: 'stretch' }}>              
                <View style={{ flex: 1, alignItems: 'center', height: 29, padding: 5 }}>
                  <Image source={require('../../../../assets/images/menu_left_our_services.png')} />
                </View>
                <Animated.View style={{
                  flex: 7,
                  alignItems: 'flex-start',
                  alignSelf: 'flex-start',
                  height: 29,
                  paddingTop: 5,
                  paddingBottom: 5,
                  paddingLeft: 10,
                }}>
                  <Animated.Text style={{ 
                    fontSize: pulseFontSize || 14, 
                    fontWeight: 'bold', 
                    color: '#3A3A3A' 
                  }}>
                    Наши услуги
                  </Animated.Text>
                </Animated.View>            
              </View>
            </TouchableHighlight>

            {/* Список услуг (раскрывается) */}
            {ourServicesVisible && (
              <View>
                {ourServicesList.map((item, index) => (
                  <TouchableHighlight
                    key={index}
                    style={{ paddingTop: 10, paddingBottom: 10 }}
                    activeOpacity={1}
                    underlayColor='#F0F0F0'
                    onPress={() => {
                      onClose();
                      router.push({
                        pathname: '/(authenticated)/services' as any,
                        params: { service_data: JSON.stringify(item) }
                      });
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'stretch' }}>
                      <View style={{ flex: 8, alignItems: 'flex-start', paddingLeft: 55, paddingRight: 16 }}>
                        <Text style={{ fontSize: 13, fontWeight: 'bold', color: '#3A3A3A' }}>
                          {'\u2192'}  {item.header}
                        </Text>
                      </View>
                    </View>
                  </TouchableHighlight>
                ))}
              </View>
            )}

            {/* 2. Проверить в РНИС */}
            <TouchableHighlight 
              style={{ paddingTop: 20 }}
              activeOpacity={1}
              underlayColor='#FFFFFF'
              onPress={() => {
                onClose();
                onNavigateToInn({} as UserData, true);
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'stretch' }}>              
                <View style={{ flex: 1, alignItems: 'center', height: 29, padding: 5 }}>
                  <Image source={require('../../../../assets/images/menu_left_check_rnis.png')} />
                </View>
                <View style={{
                  flex: 7,
                  alignItems: 'flex-start',
                  height: 29,
                  paddingTop: 5,
                  paddingBottom: 5,
                  paddingLeft: 10,
                }}>
                  <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#3A3A3A' }}>
                    Проверить в РНИС
                  </Text>
                </View>            
              </View>
            </TouchableHighlight>

            {/* 3. Добавить аккаунт */}
            <TouchableHighlight 
              style={{ paddingTop: 20 }}
              activeOpacity={1}
              underlayColor='#FFFFFF'
              onPress={() => {
                onClose();
                onNavigateToInn(userData, false);
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'stretch' }}>              
                <View style={{ flex: 1, alignItems: 'center', height: 29, padding: 5 }}>
                  <Image source={require('../../../../assets/images/menu_left_add.png')} />
                </View>
                <View style={{
                  flex: 7,
                  alignItems: 'flex-start',
                  height: 29,
                  paddingTop: 5,
                  paddingBottom: 5,
                  paddingLeft: 10,
                }}>
                  <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#3A3A3A' }}>
                    Добавить аккаунт
                  </Text>
                </View>            
              </View>
            </TouchableHighlight>

            {/* 4. Организации — single-select radio list.
                 Current org is prepended as the filled-radio row so the
                 group always has a "selected" item; the rest are switch
                 targets. Without this the list reads as a bunch of empty
                 radios with nothing selected. */}
            {otherUserList.length > 0 && !!userData.inn && (
              <View style={{ paddingTop: 10 }}>
                <OrgListItem
                  key={`current-${userData.inn}`}
                  org={{
                    inn: userData.inn,
                    firm: userData.firm,
                    // Backend omits `user_auto_count` from `user_data` for the
                    // active org — fall back to `autoListCount` (the same
                    // `auto_list_count` the parent screen reads).
                    user_auto_count: autoListCount,
                    notification_unviewed_count: userData.notification_unviewed_count,
                    user_confirmed: 1,
                    phone_inn_confirmed: 1,
                  }}
                  current
                  onPress={() => {}}
                />
                {otherUserList.map((item, index) => (
                  <OrgListItem
                    key={item.inn || index}
                    org={item}
                    disabled={switchingInn !== null && switchingInn !== item.inn}
                    loading={switchingInn === item.inn}
                    onPress={(inn) => {
                      setSwitchingInn(inn);
                      onSwitchOrganization(
                        inn,
                        () => onClose(),
                        () => setSwitchingInn(null),
                      );
                    }}
                  />
                ))}
              </View>
            )}

            {/* 5. Список водителей */}
            <TouchableHighlight 
              style={{ paddingTop: 20 }}
              activeOpacity={1}
              underlayColor='#FFFFFF'
              onPress={() => {
                onClose();
                onNavigateToDriverList();
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'stretch' }}>              
                <View style={{ flex: 1, alignItems: 'center', height: 29, padding: 5 }}>
                  <Image source={require('../../../../assets/images/menu_left_driver_list.png')} />
                </View>
                <View style={{
                  flex: 7,
                  alignItems: 'flex-start',
                  height: 29,
                  paddingTop: 5,
                  paddingBottom: 5,
                  paddingLeft: 10,
                }}>
                  <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#3A3A3A' }}>
                    Список водителей
                  </Text>
                </View>            
              </View>
            </TouchableHighlight>

            {/* 6. Начисления */}
            <TouchableHighlight 
              style={{ paddingTop: 20 }}
              activeOpacity={1}
              underlayColor='#FFFFFF'
              onPress={() => {
                onClose();
                router.push('/charges' as any);
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'stretch' }}>              
                <View style={{ flex: 1, alignItems: 'center', height: 29, padding: 5 }}>
                  <Image source={require('../../../../assets/images/menu_charges_2.png')} />
                </View>
                <View style={{
                  flex: 7,
                  alignItems: 'flex-start',
                  height: 29,
                  paddingTop: 5,
                  paddingBottom: 5,
                  paddingLeft: 10,
                }}>
                  <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#3A3A3A' }}>
                    Начисления
                  </Text>
                </View>            
              </View>
            </TouchableHighlight>

            {/* 7. Профиль */}
            <TouchableHighlight
              style={{ paddingTop: 20 }}
              activeOpacity={1}
              underlayColor='#FFFFFF'
              onPress={() => {
                onClose();
                router.push('/user' as any);
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'stretch' }}>              
                <View style={{ flex: 1, alignItems: 'center', height: 29, padding: 5 }}>
                  <Image source={require('../../../../assets/images/menu_user_2.png')} />
                </View>
                <View style={{
                  flex: 7,
                  alignItems: 'flex-start',
                  height: 29,
                  paddingTop: 5,
                  paddingBottom: 5,
                  paddingLeft: 10,
                }}>
                  <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#3A3A3A' }}>
                    Профиль
                  </Text>
                </View>            
              </View>
            </TouchableHighlight>

            {/* 8. Как работать в приложении */}
            {onboardingExpired === 0 && (
              <TouchableHighlight 
                style={{ paddingTop: 20, paddingBottom: 40 }}
                activeOpacity={1}
                underlayColor='#FFFFFF'
                onPress={() => {
                  onClose();
                  onNavigateToOnBoarding();
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'stretch' }}>              
                  <View style={{ flex: 1, alignItems: 'center', height: 29, padding: 5 }}>
                    <Image source={require('../../../../assets/images/menu_left_onboarding.png')} />
                  </View>
                  <View style={{
                    flex: 7,
                    alignItems: 'flex-start',
                    height: 29,
                    paddingTop: 5,
                    paddingBottom: 5,
                    paddingLeft: 10,
                  }}>
                    <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#3A3A3A' }}>
                      Как работать в приложении?
                    </Text>
                  </View>            
                </View>
              </TouchableHighlight>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};
