/**
 * Web version of InnScreen.
 *
 * Shares all business logic with mobile via useInnBinding (ADR-003) and the
 * `PlateInput`/`RnisResultCard`/`InnConfirmationModal` sub-components
 * (ADR-005). Error surfacing moved from a bespoke modal to showAlert via a
 * useEffect on `error`.
 *
 * Does NOT wrap in WebAppLayout — this screen is reached during the auth
 * flow before the authenticated layout mounts.
 */
import React, { useCallback, useEffect } from 'react';
import { View, Text, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenHeader, PlateField } from '../../components/common';
import WebScreenContainer from '../../components/web/WebScreenContainer';
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
  } = useInnBinding(() => router.replace('/(authenticated)/auto-list' as any));

  useEffect(() => {
    if (error) {
      showAlert('Ошибка', error);
      clearError();
    }
  }, [error, clearError]);

  const safeBack = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/' as any);
  }, [router]);

  return (
    <View className="flex-1">
      <ScreenHeader
        title={checkRnis ? 'Проверить в РНИС' : 'Введите ИНН'}
        onBack={safeBack}
      />

      <InnConfirmationModal
        visible={confirmationModal}
        managerPhone={managerPhone}
        onClose={closeConfirmationModal}
      />

      <WebScreenContainer maxWidth={560}>
        <ScrollView contentContainerStyle={{ padding: 20, paddingVertical: 40 }}>
          {/* INN card — hidden in RNIS-only mode (checkRnis=true), otherwise
              the card would render empty apart from a duplicate title (the
              header text is already in ScreenHeader). */}
          {!checkRnis && (
            <View className="bg-white rounded-2xl p-8 web:shadow-lg">
              {!isExistingUser && (
                <Text className="text-sm text-text-muted text-center mb-6 leading-5 select-none">
                  для более точной идентификации Вас как клиента
                </Text>
              )}

              <View className="h-16 rounded-lg border border-[#D0D0D0] mb-4 bg-[#FAFAFA] overflow-hidden justify-center">
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="ИНН организации (10 или 12 цифр)"
                  value={inn}
                  onChange={(e) => changeInn(e.target.value)}
                  autoFocus
                  style={{
                    width: '100%',
                    height: 56,
                    fontSize: 24,
                    color: '#1A1A1A',
                    border: 'none',
                    outline: 'none',
                    backgroundColor: 'transparent',
                    textAlign: 'center',
                    letterSpacing: 4,
                    fontFamily: 'inherit',
                  }}
                />
              </View>

              <Pressable
                disabled={!innValid}
                className={`h-[50px] rounded-lg items-center justify-center cursor-pointer ${
                  innValid ? 'bg-accent-secondary' : 'bg-[#C0C0C0]'
                }`}
                onPress={handleBindInn}
                accessibilityRole="button"
                accessibilityLabel={isExistingUser ? 'Добавить организацию' : 'Зарегистрироваться'}
                accessibilityState={{ disabled: !innValid }}
              >
                <Text className="text-lg font-semibold text-white select-none">
                  {isExistingUser ? 'Добавить' : 'Зарегистрироваться'}
                </Text>
              </Pressable>
            </View>
          )}

          {(!isExistingUser || checkRnis) && (
            <View className={`bg-white rounded-2xl p-8 web:shadow-lg ${checkRnis ? '' : 'mt-4'}`}>
              {!checkRnis && (
                <Text className="text-sm text-text-muted text-center mb-6 leading-5 select-none">
                  Вы можете проверить автомобиль на наличие регистрации в РНИС и передачу телематики
                </Text>
              )}

              <PlateField
                base={autoNumberBase}
                onChangeBase={changeAutoNumberBase}
                region={autoNumberRegion}
                onChangeRegion={changeAutoNumberRegion}
                label="Государственный регистрационный знак"
              />

              <Pressable
                disabled={!rnisButtonEnabled}
                className={`h-[50px] rounded-lg items-center justify-center mt-4 cursor-pointer ${
                  rnisButtonEnabled ? 'bg-accent-secondary' : 'bg-[#C0C0C0]'
                }`}
                onPress={handleCheckRnis}
                accessibilityRole="button"
                accessibilityLabel="Проверить в РНИС"
                accessibilityState={{ disabled: !rnisButtonEnabled }}
              >
                <Text className="text-lg font-semibold text-white select-none">Проверить в РНИС</Text>
              </Pressable>

              {rnisLoading && !rnisData ? (
                <View className="mt-6">
                  <ActivityIndicator size="large" color="#3A3A3A" />
                </View>
              ) : (
                <RnisResultCard loading={rnisLoading} data={rnisData} />
              )}
            </View>
          )}
        </ScrollView>
      </WebScreenContainer>
    </View>
  );
}
