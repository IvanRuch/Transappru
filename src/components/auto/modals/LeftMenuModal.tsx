import React, { useState } from 'react';
import { View, Text, TouchableHighlight, Image, ScrollView, Platform, Animated, StatusBar, Dimensions } from 'react-native';
import Modal from 'react-native-modal';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { UserData, OurService } from '../../../types/auto';

interface LeftMenuModalProps {
  visible: boolean;
  userData: UserData;
  ourServicesList: OurService[];
  otherUserList: UserData[];
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
  const [isSwitching, setIsSwitching] = useState(false);
  
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

            {/* 4. Другие организации */}
            {otherUserList.length > 0 && (
              <View>
                {otherUserList.map((item, index) => (
                  <TouchableHighlight
                    key={index}
                    style={{ paddingTop: 10, paddingBottom: 10, opacity: isSwitching ? 0.5 : 1 }}
                    activeOpacity={1}
                    underlayColor='#F0F0F0'
                    disabled={isSwitching}
                    onPress={() => {
                      if (isSwitching) return;
                      
                      console.log('Switching to organization:', item.inn, 'user_confirmed:', item.user_confirmed, 'phone_inn_confirmed:', item.phone_inn_confirmed);
                      // Проверяем подтверждение перед переключением (как в старом проекте)
                      // Значения могут быть как числом, так и строкой
                      const isUserConfirmed = item.user_confirmed === 1 || item.user_confirmed === '1';
                      const isPhoneConfirmed = item.phone_inn_confirmed === 1 || item.phone_inn_confirmed === '1';
                      
                      if (isUserConfirmed && isPhoneConfirmed) {
                        setIsSwitching(true);
                        onSwitchOrganization(
                          item.inn, 
                          () => onClose(), // onSuccess
                          () => setIsSwitching(false) // onFinally
                        );
                      } else {
                        console.log('Organization not confirmed, click ignored');
                      }
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <View style={{ width: 40, alignItems: 'center', padding: 5, position: 'relative' }}>
                        <Image source={require('../../../../assets/images/menu_left_other_user.png')} />
                        {(item.notification_unviewed_count || 0) > 0 && (
                          <View style={{ 
                            position: 'absolute',
                            top: 17,
                            left: 17, 
                            backgroundColor: '#EE505A', 
                            borderRadius: 12,
                            minWidth: 16,
                            height: 16,
                            alignItems: 'center',
                            justifyContent: 'center',
                            paddingHorizontal: 4
                          }}>
                            <Text style={{ 
                              textAlign: 'center',
                              fontSize: 10,
                              fontWeight: 'bold', 
                              color: '#FFFFFF'
                            }} numberOfLines={1}>
                              {item.notification_unviewed_count}
                            </Text>
                          </View>
                        )}
                      </View>
                      <View style={{ flex: 1, alignItems: 'flex-start', paddingLeft: 10, paddingRight: 16 }}>
                        {/* Название компании */}
                        <Text 
                          style={{ 
                            fontSize: 14, 
                            fontWeight: ((item.user_confirmed === 1 || item.user_confirmed === '1') && (item.phone_inn_confirmed === 1 || item.phone_inn_confirmed === '1')) ? 'bold' : 'normal',
                            color: ((item.user_confirmed === 1 || item.user_confirmed === '1') && (item.phone_inn_confirmed === 1 || item.phone_inn_confirmed === '1')) ? '#3A3A3A' : '#656565'
                          }}
                          numberOfLines={2}
                          ellipsizeMode="tail"
                        >
                          {item.firm}
                        </Text>
                        
                        {/* ИНН */}
                        <Text style={{ 
                          fontSize: 12, 
                          fontWeight: 'normal',
                          color: ((item.user_confirmed === 1 || item.user_confirmed === '1') && (item.phone_inn_confirmed === 1 || item.phone_inn_confirmed === '1')) ? '#3A3A3A' : '#656565'
                        }}>
                          инн: {item.inn}
                        </Text>
                        
                        {/* Количество авто (как в старом проекте) */}
                        <Text style={{ fontSize: 12, fontWeight: 'normal', color: '#3A3A3A' }}>
                          количество авто: {item.user_auto_count || 0}
                        </Text>
                        
                        {/* Статусы подтверждения (как в старом проекте) */}
                        {(item.user_confirmed === 0 || item.user_confirmed === '0') && (
                          <Text style={{ fontSize: 12, fontWeight: 'normal', color: '#656565' }}>
                            инн ожидает подтверждения
                          </Text>
                        )}
                        
                        {(item.phone_inn_confirmed === 0 || item.phone_inn_confirmed === '0') && (
                          <Text style={{ fontSize: 12, fontWeight: 'normal', color: '#656565' }}>
                            телефон ожидает подтверждения
                          </Text>
                        )}
                      </View>
                    </View>
                  </TouchableHighlight>
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
