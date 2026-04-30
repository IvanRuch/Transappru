/**
 * Web version of PinScreen.
 *
 * Shares business logic with mobile via usePinConfirm (ADR-003). Layout
 * uses the cross-screen `AuthCardLayout` for the responsive 2-col desktop
 * / centered mobile shell. Error modal via the shared `ConfirmModal` with
 * `hideCancel` (single-action alert).
 */
import React, { useState, useRef, useCallback } from 'react';
import { View, Text, Pressable } from 'react-native';

import { usePinConfirm } from '../../hooks/usePinConfirm';
import { ConfirmModal } from '../../components/common';
import { AuthCardLayout } from '../../components/auth';

export default function PinScreen() {
  const {
    modalVisible, msg, canGoBack,
    submitPin, handleGoBack, handleChangeNumber, closeErrorModal,
  } = usePinConfirm();

  const [digits, setDigits] = useState<string[]>(['', '', '', '']);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([null, null, null, null]);

  const code = digits.join('');
  const disabled = !/^\d{4}$/.test(code);

  const handleDigitChange = useCallback((index: number, value: string) => {
    const pasted = value.replace(/\D/g, '');
    if (pasted.length >= 4) {
      setDigits(pasted.substring(0, 4).split(''));
      inputRefs.current[3]?.focus();
      return;
    }
    const digit = pasted.slice(-1);
    setDigits(prev => {
      const next = [...prev];
      next[index] = digit;
      return next;
    });
    if (digit && index < 3) inputRefs.current[index + 1]?.focus();
  }, []);

  const handleDigitKeyDown = useCallback((index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace') {
      if (!digits[index] && index > 0) {
        setDigits(prev => {
          const next = [...prev];
          next[index - 1] = '';
          return next;
        });
        inputRefs.current[index - 1]?.focus();
      } else {
        setDigits(prev => {
          const next = [...prev];
          next[index] = '';
          return next;
        });
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 3) {
      inputRefs.current[index + 1]?.focus();
    } else if (e.key === 'Enter') {
      // Submit when all 4 digits are entered, regardless of which field
      // currently has focus. Mirrors the `disabled` prop on the button so
      // the gating cannot drift between mouse-click and keyboard paths.
      const fullCode = digits.join('');
      if (/^\d{4}$/.test(fullCode)) {
        e.preventDefault();
        submitPin(fullCode);
      }
    }
  }, [digits, submitPin]);

  return (
    <>
      <ConfirmModal
        visible={modalVisible}
        title={msg}
        confirmLabel="Получить ещё раз"
        hideCancel
        onConfirm={closeErrorModal}
        onCancel={closeErrorModal}
      />

      <AuthCardLayout onBack={canGoBack ? handleGoBack : undefined}>
        <Text className="text-[22px] font-bold text-text-primary mb-1.5 text-center select-none">
          Код подтверждения
        </Text>
        <Text className="text-sm text-text-muted text-center mb-6 select-none">
          Введите 4-значный код из SMS
        </Text>

        <View className="flex-row justify-center gap-3 mb-6">
          {[0, 1, 2, 3].map(i => (
            <input
              key={i}
              ref={(el) => { inputRefs.current[i] = el; }}
              type="tel"
              inputMode="numeric"
              maxLength={4}
              placeholder="0"
              value={digits[i]}
              autoFocus={i === 0}
              onChange={(e) => handleDigitChange(i, e.target.value)}
              onKeyDown={(e) => handleDigitKeyDown(i, e)}
              onFocus={(e) => (e.target as HTMLInputElement).select()}
              aria-label={`Цифра ${i + 1} из 4`}
              style={{
                width: 56,
                height: 56,
                fontSize: 28,
                color: '#1A1A1A',
                border: '1px solid #D0D0D0',
                borderRadius: 8,
                outline: 'none',
                backgroundColor: digits[i] ? '#FFFFFF' : '#FAFAFA',
                textAlign: 'center',
                fontFamily: 'inherit',
                fontWeight: 600,
                caretColor: '#3A3A3A',
              }}
            />
          ))}
        </View>

        <Pressable
          disabled={disabled}
          className={`h-[50px] rounded-lg items-center justify-center mb-5 cursor-pointer ${
            disabled ? 'bg-[#C0C0C0]' : 'bg-accent-secondary'
          }`}
          onPress={() => submitPin(code)}
          accessibilityRole="button"
          accessibilityLabel="Подтвердить"
          accessibilityState={{ disabled }}
        >
          <Text className="text-lg font-semibold text-white select-none">Подтвердить</Text>
        </Pressable>

        <Pressable
          onPress={handleChangeNumber}
          className="items-center cursor-pointer"
          accessibilityRole="button"
          accessibilityLabel="Войти с другим номером"
        >
          <Text className="text-sm text-text-muted underline select-none">Войти с другим номером</Text>
        </Pressable>
      </AuthCardLayout>
    </>
  );
}
