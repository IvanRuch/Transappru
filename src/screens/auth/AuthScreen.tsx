import React, { useState } from 'react';
import { Text, View, TextInput, TouchableOpacity, Image, Platform } from 'react-native';
import { useRouter } from 'expo-router';

import { useAuthFlow } from '../../hooks/useAuthFlow';
import { SessionData } from '../../types/api';
import {
  DocumentModal, AgreementsCheckbox, WaitConfirmationModal,
} from '../../components/auth';

interface AuthScreenProps {
  initialSessionData?: SessionData;
}

export default function AuthScreen(props: AuthScreenProps) {
  const router = useRouter();

  const {
    phoneDigits, phoneValid, changePhoneDigits,
    checked, setChecked,
    userAgreement, modalUserAgreement, setModalUserAgreement,
    privacyPolicy, modalPrivacyPolicy, setModalPrivacyPolicy,
    modalWaitConfirmation, sessionData,
    isCheckingToken, isSubmitting,
    handleSubmit, handleRelogin,
  } = useAuthFlow(props.initialSessionData);

  const [phoneFocused, setPhoneFocused] = useState(false);
  const displayPhone = phoneDigits ? '+7' + phoneDigits : (phoneFocused ? '+7' : '');
  const disabled = !phoneValid;

  const changePhone = (value: string) => {
    let cleaned = value.replace(/\D/g, '');
    if (cleaned.length === 0) return changePhoneDigits('');
    if (cleaned.startsWith('7') || cleaned.startsWith('8')) cleaned = cleaned.substring(1);
    changePhoneDigits(cleaned);
  };

  if (isCheckingToken) {
    return <View className="flex-1 bg-white items-center justify-center" />;
  }

  const buttonDisabled = disabled || !checked || isSubmitting;

  return (
    <View className="flex-1 bg-white items-center justify-center">
      <DocumentModal
        visible={modalUserAgreement}
        title="Пользовательское соглашение"
        text={userAgreement}
        onClose={() => setModalUserAgreement(false)}
      />
      <DocumentModal
        visible={modalPrivacyPolicy}
        title="Политика конфиденциальности"
        text={privacyPolicy}
        onClose={() => setModalPrivacyPolicy(false)}
      />

      {router.canGoBack() && (
        <TouchableOpacity
          className="absolute left-5 p-2.5 z-10"
          style={{ top: Platform.OS === 'ios' ? 60 : 20 }}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Назад"
        >
          <Image source={require('../../../assets/images/back_2.png')} />
        </TouchableOpacity>
      )}

      <Text className="text-[22px] font-bold text-[#4C4C4C]">Введите номер телефона</Text>
      <Text className="text-[#4C4C4C]">чтобы войти или зарегистрироваться</Text>

      <TextInput
        keyboardType="phone-pad"
        className="h-[60px] w-[275px] text-[#4C4C4C] text-[30px] text-center rounded border-b border-black mb-2.5"
        maxLength={12}
        placeholder="+70000000000"
        placeholderTextColor="#c0c0c0"
        onFocus={() => setPhoneFocused(true)}
        onChangeText={changePhone}
        value={displayPhone}
      />

      <TouchableOpacity
        disabled={buttonDisabled}
        className={`h-[50px] w-[275px] rounded items-center justify-center ${
          buttonDisabled ? 'bg-[#c0c0c0]' : 'bg-accent-secondary'
        }`}
        onPress={handleSubmit}
        accessibilityRole="button"
        accessibilityState={{ disabled: buttonDisabled, busy: isSubmitting }}
      >
        <Text className="text-xl text-white">{isSubmitting ? 'Отправка...' : 'Отправить'}</Text>
      </TouchableOpacity>

      <View className="mt-8 w-[300px]">
        <AgreementsCheckbox
          checked={checked}
          onToggle={() => setChecked(!checked)}
          onOpenAgreement={() => setModalUserAgreement(true)}
          onOpenPrivacy={() => setModalPrivacyPolicy(true)}
        />
      </View>

      <WaitConfirmationModal
        visible={modalWaitConfirmation}
        managerPhone={sessionData?.user_data?.manager_data?.mobile_phone}
        onRelogin={handleRelogin}
      />
    </View>
  );
}
