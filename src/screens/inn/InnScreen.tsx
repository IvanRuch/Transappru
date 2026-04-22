import React, { useEffect } from 'react';
import {
  View, Text, TouchableOpacity, TextInput, Image, StatusBar, Platform, Keyboard,
} from 'react-native';
import { KeyboardAwareScrollView } from '../../components/common/KeyboardAwareScrollView';
import { SafeAreaView, SafeAreaInsetsContext } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { ScreenHeader, PlateField } from '../../components/common';
import { RnisResultCard, InnConfirmationModal } from '../../components/inn';
import { useInnBinding } from '../../hooks/useInnBinding';
import { showAlert } from '../../utils/alert';

export default function InnScreen() {
  const router = useRouter();

  const {
    checkRnis, isExistingUser,
    inn, innValid, changeInn,
    autoNumberBase, autoNumberRegion, rnisButtonEnabled, rnisLoading, rnisData,
    changeAutoNumberBase, changeAutoNumberRegion,
    confirmationModal, error, clearError, managerPhone,
    closeConfirmationModal,
    handleBindInn, handleCheckRnis,
  } = useInnBinding(() => router.back());

  useEffect(() => {
    if (error) {
      showAlert('Ошибка', error);
      clearError();
    }
  }, [error, clearError]);

  const safeBack = () => (router.canGoBack() ? router.back() : router.replace('/main' as any));

  return (
    <SafeAreaView className="flex-1 bg-light-bg dark:bg-dark-bg" edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" translucent={false} />

      <InnConfirmationModal
        visible={confirmationModal}
        managerPhone={managerPhone}
        onClose={closeConfirmationModal}
      />

      <ScreenHeader
        title={checkRnis ? 'Проверить в РНИС' : 'Введите ИНН'}
        onBack={safeBack}
      />

      <SafeAreaInsetsContext.Consumer>
        {(insets) => (
          <KeyboardAwareScrollView
            enableOnAndroid
            extraScrollHeight={Platform.OS === 'ios' ? 20 : 80}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: 120 + Math.max(insets?.bottom || 0, 20) }}
          >
            {!isExistingUser && !checkRnis && (
              <Text className="px-10 pt-5 mb-5 text-sm text-text-secondary text-justify">
                для более точной идентификации Вас как клиента
              </Text>
            )}

            {!checkRnis ? (
              <>
                <View className="px-[60px]">
                  <TextInput
                    keyboardType="numeric"
                    className="h-[60px] px-[30px] text-[30px] text-center rounded border-b border-black mb-2.5 text-text-primary"
                    maxLength={12}
                    onChangeText={changeInn}
                    value={inn}
                  />
                </View>

                <TouchableOpacity
                  disabled={!innValid}
                  className={`h-[50px] rounded items-center justify-center self-stretch mx-[60px] mt-2.5 ${
                    innValid ? 'bg-accent-secondary' : 'bg-[#c0c0c0]'
                  }`}
                  onPress={handleBindInn}
                >
                  <Text className="text-xl text-white">
                    {isExistingUser ? 'Добавить' : 'Зарегистрироваться'}
                  </Text>
                </TouchableOpacity>
              </>
            ) : null}

            {!isExistingUser || checkRnis ? (
              <View className="px-[30px] items-center">
                {!checkRnis && (
                  <>
                    <Text className="px-2.5 py-5 text-sm text-text-secondary text-justify">
                      Вы можете проверить автомобиль на наличие регистрации в РНИС и передачу телематики
                    </Text>
                    <Image source={require('../../../assets/images/down_accordion.png')} />
                  </>
                )}

                <PlateField
                  base={autoNumberBase}
                  onChangeBase={changeAutoNumberBase}
                  region={autoNumberRegion}
                  onChangeRegion={changeAutoNumberRegion}
                  label="Государственный регистрационный знак:"
                />

                <View className="flex-row w-full">
                  <View className="flex-1 h-[110px] items-center justify-center">
                    <TouchableOpacity
                      disabled={!rnisButtonEnabled}
                      className={`h-[50px] m-6 rounded items-center justify-center px-8 ${
                        rnisButtonEnabled ? 'bg-accent-secondary' : 'bg-[#c0c0c0]'
                      }`}
                      onPress={() => { Keyboard.dismiss(); handleCheckRnis(); }}
                    >
                      <Text className="px-5 text-xl font-medium text-white">Проверить в РНИС</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <RnisResultCard loading={rnisLoading} data={rnisData} />
              </View>
            ) : null}
          </KeyboardAwareScrollView>
        )}
      </SafeAreaInsetsContext.Consumer>
    </SafeAreaView>
  );
}
