import React from 'react';
import { View, Text, TouchableHighlight } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';

interface FineData {
  uin: string;
  dat: string;
  sum: string;
  [key: string]: any;
}

export default function FinePaymentSuccessScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const fineData: FineData | null = params.fine_data
    ? JSON.parse(params.fine_data as string)
    : null;

  const goToList = () => router.replace('/(authenticated)/auto-list' as any);
  const goToFineDetails = () => {
    if (fineData) {
      router.replace({
        pathname: '/(authenticated)/auto-fine' as any,
        params: { fine_data: JSON.stringify(fineData) },
      });
    } else {
      goToList();
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-dark-bg" edges={['top']}>
      <View className="flex-1 p-5 justify-center items-center">
        <View className="mb-7">
          <View
            className="w-[100px] h-[100px] rounded-full justify-center items-center bg-[#4CAF50]"
            style={{ elevation: 8 }}
          >
            <Text className="text-6xl font-bold text-white">✓</Text>
          </View>
        </View>

        <Text className="text-[28px] font-bold text-text-primary text-center mb-4 select-none">
          Оплата прошла успешно!
        </Text>

        <Text className="text-base text-text-secondary text-center leading-6 mb-7 px-5 select-none">
          Платёж обрабатывается. Информация о штрафе обновится в течение нескольких минут.
        </Text>

        {fineData && (
          <View className="w-full bg-[#F8F8F8] rounded-xl p-5 mb-5 border border-[#E0E0E0]">
            <InfoRow label="Постановление:" value={fineData.uin} />
            <InfoRow label="Дата нарушения:" value={fineData.dat} />
            <InfoRow label="Сумма:" value={`${fineData.sum} ₽`} />
          </View>
        )}

        <View className="w-full bg-[#E3F2FD] rounded-xl p-4 mb-7 border border-[#90CAF9]">
          <Text className="text-sm text-[#1565C0] leading-5">
            💡 Статус оплаты можно проверить в разделе «Штрафы» через несколько минут
          </Text>
        </View>

        <View className="w-full">
          <TouchableHighlight
            className="bg-accent-secondary rounded-xl p-5 items-center justify-center mb-4"
            activeOpacity={0.8}
            underlayColor="#2E2E2E"
            onPress={goToList}
            accessibilityRole="button"
            accessibilityLabel="Вернуться к списку авто"
          >
            <Text className="text-lg font-bold text-white">Вернуться к списку</Text>
          </TouchableHighlight>

          {fineData && (
            <TouchableHighlight
              className="bg-white rounded-xl p-5 items-center justify-center border border-border-primary"
              activeOpacity={0.8}
              underlayColor="#F0F0F0"
              onPress={goToFineDetails}
              accessibilityRole="button"
              accessibilityLabel="К деталям штрафа"
            >
              <Text className="text-base text-text-primary">К деталям штрафа</Text>
            </TouchableHighlight>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row justify-between mb-2.5">
      <Text className="text-sm text-text-secondary">{label}</Text>
      <Text className="text-sm text-text-primary font-medium">{value}</Text>
    </View>
  );
}
