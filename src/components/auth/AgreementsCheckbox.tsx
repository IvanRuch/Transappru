import React from 'react';
import { View, Text, Pressable, Image } from 'react-native';

interface AgreementsCheckboxProps {
  checked: boolean;
  onToggle: () => void;
  onOpenAgreement: () => void;
  onOpenPrivacy: () => void;
}

/**
 * "Нажимая «Отправить», я соглашаюсь с данными:" + checkbox + two links
 * (user agreement + privacy policy). Shared between mobile and web AuthScreen.
 */
export default function AgreementsCheckbox({
  checked, onToggle, onOpenAgreement, onOpenPrivacy,
}: AgreementsCheckboxProps) {
  return (
    <View>
      <View className="flex-row items-center mb-3 mt-5">
        <Text className="flex-1 text-xs text-text-primary leading-[18px] mr-2 select-none">
          Нажимая «Отправить», я соглашаюсь с данными:
        </Text>
        <Pressable
          className="w-8 h-8 items-center justify-center cursor-pointer"
          onPress={onToggle}
          accessibilityRole="checkbox"
          accessibilityState={{ checked }}
          accessibilityLabel="Согласие с условиями"
        >
          <Image
            className="w-6 h-6"
            source={
              checked
                ? require('../../../assets/images/checkbox_checked_512x512.png')
                : require('../../../assets/images/checkbox_unchecked_512x512.png')
            }
            accessibilityIgnoresInvertColors
          />
        </Pressable>
      </View>

      <Pressable onPress={onOpenAgreement} accessibilityRole="link" accessibilityLabel="Пользовательское соглашение">
        <Text className="text-[13px] text-[#3A7FD5] text-center mt-1.5">
          Пользовательское соглашение
        </Text>
      </Pressable>
      <Pressable onPress={onOpenPrivacy} accessibilityRole="link" accessibilityLabel="Политика конфиденциальности">
        <Text className="text-[13px] text-[#3A7FD5] text-center mt-1.5">
          Политика конфиденциальности
        </Text>
      </Pressable>
    </View>
  );
}
