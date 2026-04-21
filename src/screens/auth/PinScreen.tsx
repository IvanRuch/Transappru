import React, { useState } from 'react';
import { Text, View, TextInput, TouchableOpacity, Image, Platform } from 'react-native';

import { usePinConfirm } from '../../hooks/usePinConfirm';
import { ConfirmModal } from '../../components/common';

export default function PinScreen() {
  const {
    modalVisible, msg, canGoBack,
    submitPin, handleGoBack, handleChangeNumber, closeErrorModal,
  } = usePinConfirm();

  const [code, setCode] = useState('');
  const disabled = !/^\d{4}$/.test(code);

  return (
    <View className="flex-1 bg-white items-center justify-center">
      <ConfirmModal
        visible={modalVisible}
        title={msg}
        confirmLabel="Получить ещё раз"
        hideCancel
        onConfirm={closeErrorModal}
        onCancel={closeErrorModal}
      />

      {canGoBack && (
        <TouchableOpacity
          className="absolute left-5 p-2.5 z-10"
          style={{ top: Platform.OS === 'ios' ? 60 : 20 }}
          onPress={handleGoBack}
          accessibilityRole="button"
          accessibilityLabel="Назад"
        >
          <Image source={require('../../../assets/images/back_2.png')} />
        </TouchableOpacity>
      )}

      <Text className="text-[22px] font-bold text-[#4C4C4C]">Код подтверждения</Text>
      <Text className="text-[#4C4C4C]">Введите 4-значный код из SMS</Text>

      <TextInput
        keyboardType="numeric"
        className="h-[60px] w-[100px] text-[#4C4C4C] text-[34px] text-center rounded border-b border-black mb-2.5"
        maxLength={4}
        placeholder="0000"
        placeholderTextColor="#c0c0c0"
        onChangeText={setCode}
      />

      <TouchableOpacity
        disabled={disabled}
        className={`h-[50px] w-[185px] rounded items-center justify-center ${
          disabled ? 'bg-[#c0c0c0]' : 'bg-accent-secondary'
        }`}
        onPress={() => submitPin(code)}
        accessibilityRole="button"
        accessibilityState={{ disabled }}
      >
        <Text className="text-xl text-white">Подтвердить</Text>
      </TouchableOpacity>

      <TouchableOpacity
        className="mt-8"
        onPress={handleChangeNumber}
        accessibilityRole="button"
        accessibilityLabel="Войти с другим номером"
      >
        <Text className="text-sm text-[#666666] underline">Войти с другим номером</Text>
      </TouchableOpacity>
    </View>
  );
}
