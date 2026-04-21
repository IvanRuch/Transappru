/**
 * Web version of AuthScreen.
 *
 * Shares business logic with mobile via useAuthFlow (ADR-003). Layout via
 * `AuthCardLayout` — desktop: dark brand panel + white form card; mobile web:
 * centered card. Agreements/privacy/wait-confirmation modals are shared
 * cross-platform components.
 */
import React from 'react';
import { View, Text, Pressable, ActivityIndicator } from 'react-native';

import { useAuthFlow } from '../../hooks/useAuthFlow';
import { SessionData } from '../../types/api';
import {
  DocumentModal, AgreementsCheckbox, WaitConfirmationModal, AuthCardLayout,
} from '../../components/auth';

interface AuthScreenProps {
  initialSessionData?: SessionData;
}

export default function AuthScreen({ initialSessionData }: AuthScreenProps) {
  const {
    phoneDigits, phoneValid, changePhoneDigits,
    checked, setChecked,
    userAgreement, modalUserAgreement, setModalUserAgreement,
    privacyPolicy, modalPrivacyPolicy, setModalPrivacyPolicy,
    modalWaitConfirmation, sessionData,
    isCheckingToken, isSubmitting,
    handleSubmit, handleRelogin,
  } = useAuthFlow(initialSessionData);

  const disabled = !phoneValid;
  const buttonDisabled = disabled || !checked || isSubmitting;

  const formatPhone = (d: string) => {
    if (!d) return '';
    const parts = [d.substring(0, 3), d.substring(3, 6), d.substring(6, 8), d.substring(8, 10)];
    return '+7 ' + parts.filter(Boolean).join(' ');
  };

  if (isCheckingToken) {
    return (
      <View className="flex-1 justify-center items-center bg-white">
        <ActivityIndicator size="large" color="#3A3A3A" />
      </View>
    );
  }

  return (
    <>
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

      <WaitConfirmationModal
        visible={modalWaitConfirmation}
        managerPhone={sessionData?.user_data?.manager_data?.mobile_phone}
        onRelogin={async () => {
          await handleRelogin();
          try { localStorage.removeItem('ta_onboarding_done'); } catch { /* ignore */ }
        }}
      />

      <AuthCardLayout>
        <Text className="text-[22px] font-bold text-text-primary mb-1.5 text-center select-none">
          Введите номер телефона
        </Text>
        <Text className="text-sm text-text-muted text-center mb-6 select-none">
          чтобы войти или зарегистрироваться
        </Text>

        <View className="h-14 rounded-lg border border-[#D0D0D0] mb-4 bg-[#FAFAFA] overflow-hidden justify-center">
          <input
            type="tel"
            placeholder="+7 000 000 00 00"
            value={phoneDigits.length > 0 ? formatPhone(phoneDigits) : ''}
            onChange={(e) => {
              const val = e.target.value;
              let digits: string;
              if (val.startsWith('+7')) {
                digits = val.substring(2).replace(/\D/g, '');
              } else {
                const raw = val.replace(/\D/g, '');
                digits = (raw.startsWith('7') || raw.startsWith('8')) && raw.length > 10
                  ? raw.substring(1) : raw;
              }
              changePhoneDigits(digits);
            }}
            onFocus={(e) => {
              const input = e.target as HTMLInputElement;
              if (!input.value) input.value = '+7 ';
              setTimeout(() => {
                const minPos = 3;
                if ((input.selectionStart ?? 0) < minPos) {
                  const end = input.value.length;
                  input.setSelectionRange(end, end);
                }
              }, 0);
            }}
            onSelect={(e) => {
              const input = e.target as HTMLInputElement;
              if (input.value && input.value.startsWith('+7')) {
                const minPos = 3;
                if ((input.selectionStart ?? 0) < minPos) {
                  input.setSelectionRange(minPos, Math.max(minPos, input.selectionEnd ?? minPos));
                }
              }
            }}
            autoComplete="tel"
            style={{
              width: '100%',
              height: 56,
              fontSize: 24,
              color: '#1A1A1A',
              border: 'none',
              outline: 'none',
              backgroundColor: 'transparent',
              textAlign: 'center',
              letterSpacing: 1,
              fontFamily: 'inherit',
            }}
          />
        </View>

        <Pressable
          className={`h-[50px] rounded-lg items-center justify-center mb-5 cursor-pointer ${
            buttonDisabled ? 'bg-[#C0C0C0]' : 'bg-accent-secondary'
          }`}
          onPress={handleSubmit}
          disabled={buttonDisabled}
          accessibilityRole="button"
          accessibilityLabel="Отправить"
          accessibilityState={{ disabled: buttonDisabled, busy: isSubmitting }}
        >
          <Text className="text-base font-semibold text-white select-none">
            {isSubmitting ? 'Отправка...' : 'Отправить'}
          </Text>
        </Pressable>

        <AgreementsCheckbox
          checked={checked}
          onToggle={() => setChecked(v => !v)}
          onOpenAgreement={() => setModalUserAgreement(true)}
          onOpenPrivacy={() => setModalPrivacyPolicy(true)}
        />
      </AuthCardLayout>
    </>
  );
}
