import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, TouchableHighlight, Image, Linking, Modal, ScrollView, Platform, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { useAuthFlow } from '../../hooks/useAuthFlow';
import { SessionData } from '../../types/api';

interface AuthScreenProps {
  initialSessionData?: SessionData;
}

export default function AuthScreen(props: AuthScreenProps) {
  const router = useRouter();

  const {
    phoneDigits,
    phoneValid,
    changePhoneDigits,
    checked,
    setChecked,
    userAgreement,
    modalUserAgreement,
    setModalUserAgreement,
    privacyPolicy,
    modalPrivacyPolicy,
    setModalPrivacyPolicy,
    modalWaitConfirmation,
    sessionData,
    isCheckingToken,
    isSubmitting,
    handleSubmit,
    handleRelogin,
  } = useAuthFlow(props.initialSessionData);

  // ── Local phone display ─────────────────────────────────────────────────────
  const [phoneFocused, setPhoneFocused] = useState(false);
  const displayPhone = phoneDigits ? '+7' + phoneDigits : (phoneFocused ? '+7' : '');
  const disabled = !phoneValid;

  const focusPhone = () => {
    setPhoneFocused(true);
  };

  const changePhone = (value: string) => {
    let cleaned = value.replace(/\D/g, '');
    if (cleaned.length === 0) {
      changePhoneDigits('');
      return;
    }
    if (cleaned.startsWith('7') || cleaned.startsWith('8')) {
      cleaned = cleaned.substring(1);
    }
    changePhoneDigits(cleaned);
  };

  // ── Platform-specific helpers ───────────────────────────────────────────────
  const contactPhone = (phoneNumber: string) => {
    const phoneStr = Platform.OS === 'android' ? `tel:${phoneNumber}` : `telprompt:${phoneNumber}`;
    Linking.openURL(phoneStr);
  };

  const getButtonStyle = () => {
    const backgroundColor = disabled || !checked || isSubmitting ? '#c0c0c0' : '#3A3A3A';
    return {
      height: 50,
      width: 275,
      borderRadius: 5,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      backgroundColor,
    };
  };

  // ── Loading state ───────────────────────────────────────────────────────────
  if (isCheckingToken) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]} />
    );
  }

  return (
    <View style={styles.container}>
      {/* User agreement modal */}
      <Modal
        animationType="slide"
        transparent={false}
        visible={modalUserAgreement}
        onRequestClose={() => setModalUserAgreement(false)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
          <View style={{ flex: 1, paddingHorizontal: 20, paddingTop: 20 }}>
            <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#000000', marginBottom: 20, textAlign: 'center' }}>
              Пользовательское соглашение
            </Text>
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator>
              <Text style={{ color: '#000000', fontSize: 14, lineHeight: 22, textAlign: 'left' }}>
                {userAgreement}
              </Text>
            </ScrollView>
            <TouchableOpacity
              style={{
                position: 'absolute', bottom: 20, left: 20, right: 20, height: 50,
                borderRadius: 5, alignItems: 'center', justifyContent: 'center',
                backgroundColor: '#3A3A3A',
                shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.25, shadowRadius: 3.84, elevation: 5,
              }}
              onPress={() => setModalUserAgreement(false)}
            >
              <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#FFFFFF' }}>Закрыть</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Privacy policy modal */}
      <Modal
        animationType="slide"
        transparent={false}
        visible={modalPrivacyPolicy}
        onRequestClose={() => setModalPrivacyPolicy(false)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
          <View style={{ flex: 1, paddingHorizontal: 20, paddingTop: 20 }}>
            <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#000000', marginBottom: 20, textAlign: 'center' }}>
              Политика конфиденциальности
            </Text>
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator>
              <Text style={{ color: '#000000', fontSize: 14, lineHeight: 22, textAlign: 'left' }}>
                {privacyPolicy}
              </Text>
            </ScrollView>
            <TouchableOpacity
              style={{
                position: 'absolute', bottom: 20, left: 20, right: 20, height: 50,
                borderRadius: 5, alignItems: 'center', justifyContent: 'center',
                backgroundColor: '#3A3A3A',
                shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.25, shadowRadius: 3.84, elevation: 5,
              }}
              onPress={() => setModalPrivacyPolicy(false)}
            >
              <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#FFFFFF' }}>Закрыть</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Back button (if user came via "Выйти") */}
      {router.canGoBack() && (
        <TouchableOpacity
          style={{
            position: 'absolute',
            top: Platform.OS === 'ios' ? 60 : 20,
            left: 20, padding: 10, zIndex: 10,
          }}
          onPress={() => router.back()}
        >
          <Image source={require('../../../assets/images/back_2.png')} />
        </TouchableOpacity>
      )}

      <Text style={{ fontSize: 22, fontWeight: 'bold', color: '#4C4C4C' }}>Введите номер телефона</Text>
      <Text style={{ color: '#4C4C4C' }}>чтобы войти или зарегистрироваться</Text>
      <TextInput
        keyboardType="phone-pad"
        textAlign="center"
        style={{
          height: 60, width: 275, color: '#4C4C4C', fontSize: 30,
          borderRadius: 5, borderBottomColor: 'black', borderBottomWidth: 1, marginBottom: 10,
        }}
        maxLength={12}
        placeholder="+70000000000"
        placeholderTextColor="#c0c0c0"
        onFocus={focusPhone}
        onChangeText={changePhone}
        value={displayPhone}
      />
      <TouchableOpacity
        disabled={disabled || !checked || isSubmitting}
        style={getButtonStyle()}
        onPress={handleSubmit}
      >
        <Text style={{ fontSize: 20, color: '#FFFFFF' }}>
          {isSubmitting ? 'Отправка...' : 'Отправить'}
        </Text>
      </TouchableOpacity>

      <View style={{ marginTop: 30, width: 300, flexDirection: 'row' }}>
        <View style={{ flex: 5 }}>
          <Text style={{ fontSize: 12, fontWeight: 'normal' }}>
            Нажимая на кнопку &quot;Отправить&quot;, я соглашаюсь с данными:
          </Text>
        </View>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <TouchableHighlight
            style={{ width: 32, height: 32 }}
            activeOpacity={1}
            underlayColor="#FFFFFF"
            onPress={() => setChecked(!checked)}
          >
            {checked ? (
              <Image style={{ width: 24, height: 24 }} source={require('../../../assets/images/checkbox_checked_512x512.png')} />
            ) : (
              <Image style={{ width: 24, height: 24 }} source={require('../../../assets/images/checkbox_unchecked_512x512.png')} />
            )}
          </TouchableHighlight>
        </View>
      </View>

      <Text style={{ marginTop: 10, color: 'blue' }} onPress={() => setModalUserAgreement(true)}>
        Пользовательское соглашение
      </Text>
      <Text style={{ marginTop: 10, color: 'blue' }} onPress={() => setModalPrivacyPolicy(true)}>
        Политика конфиденциальности
      </Text>

      {/* Wait-for-confirmation modal */}
      <Modal
        animationType="slide"
        transparent={false}
        visible={modalWaitConfirmation}
        onRequestClose={() => {}}
      >
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <View style={{
            backgroundColor: '#EEEEEE', borderRadius: 25, alignItems: 'stretch',
            justifyContent: 'center', padding: 20, borderWidth: 1, borderColor: '#B8B8B8', maxWidth: 350,
          }}>
            <Text style={{ paddingLeft: 16, paddingRight: 16, paddingTop: 24, fontSize: 20, fontWeight: 'bold', color: '#313131' }}>
              Ваша заявка зарегистрирована!
            </Text>
            <Text style={{ paddingLeft: 16, paddingRight: 16, paddingTop: 24, fontSize: 16, fontWeight: 'normal', color: '#313131' }}>
              Наш менеджер скоро свяжется с Вами по указанному при регистрации номеру для заключения договора оказания услуг и ответит на все сопутствующие вопросы
            </Text>

            {sessionData?.user_data?.manager_data?.mobile_phone && (
              <TouchableHighlight
                onPress={() => contactPhone(sessionData.user_data?.manager_data?.mobile_phone || '')}
              >
                <View style={{ alignItems: 'center', padding: 5 }}>
                  <Text style={{ paddingLeft: 16, paddingRight: 16, paddingTop: 24, fontSize: 16, fontWeight: 'normal', color: '#313131' }}>
                    Вы можете связаться с менеджером
                  </Text>
                  <Image style={{ margin: 15 }} source={require('../../../assets/images/contact_phone_2.png')} />
                </View>
              </TouchableHighlight>
            )}

            <TouchableOpacity
              style={{
                marginTop: 24, marginHorizontal: 16, height: 44, borderRadius: 5,
                alignItems: 'center', justifyContent: 'center',
                backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#3A3A3A',
              }}
              onPress={handleRelogin}
            >
              <Text style={{ fontSize: 14, color: '#3A3A3A' }}>Войти с другим номером</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
