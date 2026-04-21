import React from 'react';
import { View, Text, Switch, TextInput } from 'react-native';

interface PaymentDataCardProps {
  fio: string;
  onChangeFio: (value: string) => void;
  fioError: string;
  kvit: boolean;
  onChangeKvit: (value: boolean) => void;
}

const SWITCH_TRACK = { false: '#767577', true: '#3A3A3A' };

/**
 * Third card on payment confirm: FIO input + "order receipt" toggle.
 * On web the TextInput is rendered by react-native-web but we keep it
 * as RN TextInput for parity (NativeWind classes apply). The FIO error
 * box is also inlined here to keep related UI together.
 */
export default function PaymentDataCard({
  fio, onChangeFio, fioError, kvit, onChangeKvit,
}: PaymentDataCardProps) {
  return (
    <View className="bg-[#F8F8F8] rounded-xl p-5 mb-5 border border-border-secondary">
      <Text className="text-lg font-bold text-text-primary mb-4 select-none">Данные для оплаты</Text>

      <View className="mb-4">
        <Text className="text-sm text-text-secondary mb-1 select-none">Ф.И.О. плательщика</Text>
        <TextInput
          className={`bg-white rounded-lg p-3 text-base text-text-primary border ${
            fioError ? 'border-[#C62828]' : 'border-border-primary'
          }`}
          value={fio}
          onChangeText={onChangeFio}
          placeholder="Иванов Иван Иванович"
          placeholderTextColor="#B0B0B0"
          maxLength={100}
          autoCapitalize="words"
          autoCorrect={false}
        />
      </View>

      {fioError ? (
        <View className="bg-[#FFEBEE] rounded-lg p-2.5 mb-3">
          <Text className="text-[13px] text-[#C62828]">{fioError}</Text>
        </View>
      ) : null}

      <View className="flex-row justify-between items-center mb-2.5">
        <Text className="flex-1 text-base text-text-primary select-none">Заказать квитанцию</Text>
        <Switch
          trackColor={SWITCH_TRACK}
          thumbColor="#f4f3f4"
          ios_backgroundColor="#3e3e3e"
          value={kvit}
          onValueChange={onChangeKvit}
          accessibilityLabel="Заказать квитанцию"
        />
      </View>
      <Text className="text-xs text-text-muted italic">
        Если включено, вам будет предложено ввести e-mail или телефон на странице оплаты.
      </Text>
    </View>
  );
}

