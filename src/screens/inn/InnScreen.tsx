import React from 'react';
import { Text, View, Image, TouchableOpacity, TouchableHighlight, Modal, TextInput, ActivityIndicator, Platform, Linking, Keyboard, StatusBar } from 'react-native';
import { KeyboardAwareScrollView } from '../../components/common/KeyboardAwareScrollView';
import { SafeAreaView, SafeAreaInsetsContext } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import styles from '../../styles/Styles.js';
import { ScreenHeader } from '../../components/common';
import { useInnBinding } from '../../hooks/useInnBinding';

export default function InnScreen() {
  const router = useRouter();

  const {
    userData, checkRnis, isExistingUser,
    inn, innValid, changeInn,
    autoNumberBase, autoNumberRegion, rnisButtonEnabled, rnisLoading, rnisData,
    changeAutoNumberBase, changeAutoNumberRegion,
    confirmationModal, errorModal, errorMsg, managerPhone,
    closeErrorModal, closeConfirmationModal,
    handleBindInn, handleCheckRnis,
  } = useInnBinding(() => router.back());

  const contactPhone = (phone: string) => {
    const phoneStr = Platform.OS === 'android' ? `tel:${phone}` : `telprompt:${phone}`;
    Linking.openURL(phoneStr);
  };

  const innDisabled = !innValid;

  const setButtonStyle = () => ({
    height: 50,
    borderRadius: 5,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    backgroundColor: innDisabled ? '#c0c0c0' : '#3A3A3A',
    alignSelf: 'stretch' as const,
    marginHorizontal: 60,
    marginTop: 10,
  });

  const setCheckRnisButtonStyle = () => ({
    height: 50,
    margin: 25,
    borderRadius: 5,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    backgroundColor: !rnisButtonEnabled ? '#c0c0c0' : '#3A3A3A',
  });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="#ffffff"
        translucent={false}
      />

      {/* Confirmation modal */}
      <Modal
        animationType="slide"
        transparent={false}
        visible={confirmationModal}
        onRequestClose={closeConfirmationModal}
      >
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <View style={{
            backgroundColor: '#EEEEEE',
            borderRadius: 25,
            alignItems: 'stretch',
            justifyContent: 'center',
            padding: 20,
            borderWidth: 1,
            borderColor: '#B8B8B8',
          }}>
            <Text style={{ paddingLeft: 16, paddingRight: 16, paddingTop: 24, fontSize: 20, fontWeight: 'bold', color: '#313131' }}>
              Ваша заявка зарегистрирована!
            </Text>
            <Text style={{ paddingLeft: 16, paddingRight: 16, paddingTop: 24, fontSize: 16, color: '#313131' }}>
              Дождитесь подтверждения указанного Вами ИНН
            </Text>

            {managerPhone ? (
              <TouchableHighlight
                activeOpacity={1}
                underlayColor='#EEEEEE'
                onPress={() => contactPhone(managerPhone)}
              >
                <View style={{ alignItems: 'center', padding: 5 }}>
                  <Text style={{ paddingLeft: 16, paddingRight: 16, paddingTop: 24, fontSize: 16, color: '#313131' }}>
                    Вы можете связаться с менеджером
                  </Text>
                  <Image style={{ margin: 15 }} source={require('../../../assets/images/contact_phone_2.png')} />
                </View>
              </TouchableHighlight>
            ) : null}

            <View style={{ flexDirection: 'row' }}>
              <View style={{ flex: 1, height: 100, alignItems: 'center', justifyContent: 'center' }}>
                <TouchableOpacity
                  style={{
                    height: 50,
                    margin: 25,
                    borderRadius: 5,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#3A3A3A',
                  }}
                  onPress={closeConfirmationModal}
                >
                  <Text style={{ paddingLeft: 20, paddingRight: 20, fontSize: 14, fontWeight: 'bold', color: '#FFFFFF' }}>
                    Закрыть
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* Error modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={errorModal}
        onRequestClose={closeErrorModal}
      >
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <View style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 20,
            padding: 35,
            alignItems: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.25,
            shadowRadius: 4,
            elevation: 5,
            margin: 20,
          }}>
            <Text style={{ marginBottom: 15, textAlign: 'center', fontSize: 16 }}>{errorMsg}</Text>
            <TouchableOpacity
              style={{
                borderRadius: 8,
                padding: 10,
                paddingHorizontal: 30,
                backgroundColor: '#3A3A3A',
              }}
              onPress={closeErrorModal}
            >
              <Text style={{ color: '#FFFFFF', fontWeight: 'bold' }}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Header */}
      <ScreenHeader
        title={checkRnis ? 'Проверить в РНИС' : 'Введите ИНН'}
        onBack={() => router.back()}
      />

      <SafeAreaInsetsContext.Consumer>
        {(insets) => (
          <KeyboardAwareScrollView
            enableOnAndroid={true}
            extraScrollHeight={Platform.OS === 'ios' ? 20 : 80}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: 120 + Math.max(insets?.bottom || 0, 20) }}
          >
            {!isExistingUser && !checkRnis && (
              <Text style={{ paddingLeft: 40, paddingRight: 40, paddingTop: 20, marginBottom: 20, fontSize: 14, color: '#656565', textAlign: 'justify' }}>
                для более точной идентификации Вас как клиента
              </Text>
            )}

            {!checkRnis ? (
              <>
                <View style={{ alignItems: 'stretch', paddingLeft: 60, paddingRight: 60 }}>
                  <TextInput
                    keyboardType='numeric'
                    style={{
                      height: 60,
                      paddingLeft: 30,
                      paddingRight: 30,
                      color: '#4C4C4C',
                      textAlign: 'center',
                      fontSize: 30,
                      borderRadius: 5,
                      borderBottomColor: 'black',
                      borderBottomWidth: 1,
                      marginBottom: 10,
                    }}
                    maxLength={12}
                    onChangeText={changeInn}
                    value={inn}
                  />
                </View>

                <TouchableOpacity
                  disabled={innDisabled}
                  style={setButtonStyle()}
                  onPress={handleBindInn}
                >
                  <Text style={{ fontSize: 20, color: '#FFFFFF' }}>
                    {isExistingUser ? 'Добавить' : 'Зарегистрироваться'}
                  </Text>
                </TouchableOpacity>
              </>
            ) : null}

            {!isExistingUser || checkRnis ? (
              <View style={{ paddingLeft: 30, paddingRight: 30, justifyContent: 'center', alignItems: 'center' }}>
                {!checkRnis && (
                  <>
                    <Text style={{ paddingLeft: 10, paddingRight: 10, paddingTop: 20, paddingBottom: 20, fontSize: 14, color: '#656565', textAlign: 'justify' }}>
                      Вы можете проверить автомобиль на наличие регистрации в РНИС и передачу телематики
                    </Text>
                    <Image source={require('../../../assets/images/down_accordion.png')} />
                  </>
                )}

                <View style={{
                  backgroundColor: '#F7F7F7',
                  borderRadius: 25,
                  marginTop: 24,
                  paddingTop: 14,
                  paddingBottom: 14,
                  paddingLeft: 10,
                  paddingRight: 10,
                  borderWidth: 1,
                  borderColor: '#B8B8B8',
                }}>
                  <Text style={{ fontSize: 13, color: '#313131', textAlign: 'center' }}>
                    Государственный регистрационный знак:
                  </Text>
                  <View style={{ alignItems: 'center', paddingTop: 20 }}>
                    <View style={{ flexDirection: 'row', width: 255, height: 75 }}>
                      <View style={{
                        flex: 188,
                        backgroundColor: '#FFFFFF',
                        height: 75,
                        borderBottomLeftRadius: 8,
                        borderTopLeftRadius: 8,
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderWidth: 1,
                        borderColor: '#B8B8B8',
                      }}>
                        <TextInput
                          style={{ paddingTop: 5, fontSize: 29, textAlign: 'center' }}
                          maxLength={6}
                          placeholder='А000АА'
                          autoCapitalize='characters'
                          onChangeText={changeAutoNumberBase}
                          value={autoNumberBase}
                        />
                      </View>
                      <View style={{ flex: 1, backgroundColor: '#B8B8B8', height: 75 }} />
                      <View style={{
                        flex: 114,
                        flexDirection: 'column',
                        backgroundColor: '#FFFFFF',
                        height: 75,
                        borderBottomRightRadius: 8,
                        borderTopRightRadius: 8,
                        alignItems: 'center',
                        borderWidth: 1,
                        borderColor: '#B8B8B8',
                      }}>
                        <TextInput
                          keyboardType='numeric'
                          style={{ paddingBottom: -20, height: 45, fontSize: 29, textAlign: 'center' }}
                          maxLength={3}
                          placeholder='777'
                          onChangeText={changeAutoNumberRegion}
                          value={autoNumberRegion}
                        />
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 20 }}>
                          <Text style={{ paddingRight: 5, fontSize: 14, color: '#2c2c2c' }}>RUS</Text>
                          <Image source={require('../../../assets/images/flag_rus.png')} style={{ width: 24, height: 12 }} />
                        </View>
                      </View>
                    </View>
                  </View>
                </View>

                <View style={{ flexDirection: 'row' }}>
                  <View style={{ flex: 1, height: 110, alignItems: 'center', justifyContent: 'center' }}>
                    <TouchableOpacity
                      disabled={!rnisButtonEnabled}
                      style={setCheckRnisButtonStyle()}
                      onPress={() => {
                        Keyboard.dismiss();
                        handleCheckRnis();
                      }}
                    >
                      <Text style={{
                        paddingLeft: 20,
                        paddingRight: 20,
                        fontSize: 20,
                        fontWeight: '500',
                        color: '#FFFFFF',
                        marginHorizontal: 30,
                      }}>
                        Проверить в РНИС
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* RNIS results */}
                {(rnisLoading || rnisData) && (
                  <View style={{
                    marginTop: 20,
                    padding: 20,
                    backgroundColor: '#EEEEEE',
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: '#B8B8B8',
                  }}>
                    {rnisLoading ? (
                      <ActivityIndicator size="large" color="#313131" />
                    ) : (
                      <View>
                        <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#313131', marginBottom: 10 }}>
                          Результат проверки:
                        </Text>

                        {rnisData?.rnis_status ? (
                          <View>
                            <Text style={{ fontSize: 16, color: '#313131', marginBottom: 5 }}>
                              Статус: {rnisData.rnis_status}
                            </Text>
                            {rnisData.rnis_owner && (
                              <Text style={{ fontSize: 16, color: '#313131', marginBottom: 5 }}>
                                Владелец: {rnisData.rnis_owner}
                              </Text>
                            )}
                            {rnisData.rnis_brand && (
                              <Text style={{ fontSize: 16, color: '#313131', marginBottom: 5 }}>
                                Марка: {rnisData.rnis_brand}
                              </Text>
                            )}
                            {rnisData.rnis_model && (
                              <Text style={{ fontSize: 16, color: '#313131', marginBottom: 5 }}>
                                Модель: {rnisData.rnis_model}
                              </Text>
                            )}
                            {rnisData.rnis_year && (
                              <Text style={{ fontSize: 16, color: '#313131', marginBottom: 5 }}>
                                Год выпуска: {rnisData.rnis_year}
                              </Text>
                            )}
                          </View>
                        ) : (
                          <Text style={{ fontSize: 16, color: '#656565' }}>
                            Данные не найдены
                          </Text>
                        )}
                      </View>
                    )}
                  </View>
                )}
              </View>
            ) : null}
          </KeyboardAwareScrollView>
        )}
      </SafeAreaInsetsContext.Consumer>
    </SafeAreaView>
  );
}
