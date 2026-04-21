import React from 'react';
import { View, Text, Image, TouchableHighlight, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenHeader } from '../../components/common';
import { SHOW_PAYMENT_UI } from '../../config/features';

interface FineData {
  is_paid: string | number;
  discount_time_left?: string;
  discount_date_end?: string;
  discount_percent?: string;
  dat: string;
  code: string;
  description: string;
  uin: string;
  sum: string;
  full_sum: string;
  vendor: string;
  comment?: string;
}

export default function AutoFineScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const fineData: FineData | null = params.fine_data
    ? JSON.parse(params.fine_data as string)
    : null;

  const safeBack = () => (router.canGoBack() ? router.back() : router.replace('/main' as any));

  if (!fineData) {
    return (
      <SafeAreaView className="flex-1 bg-white dark:bg-dark-bg" edges={['top']}>
        <ScreenHeader title="Штраф" onBack={safeBack} />
        <View className="flex-1 pt-5 items-stretch">
          <Text className="text-base text-text-primary text-center mt-5">Данные о штрафе не найдены</Text>
        </View>
      </SafeAreaView>
    );
  }

  const isPaid = fineData.is_paid === 1 || fineData.is_paid === '1';
  const hasDiscount = !isPaid && fineData.discount_time_left && fineData.discount_time_left !== '';

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-dark-bg" edges={['top']}>
      <ScreenHeader title="Штраф" onBack={safeBack} />

      <ScrollView>
        <View className="pt-5">
          {isPaid && (
            <View className="flex-row m-5 p-2.5 rounded-lg border bg-bg-secondary border-border-primary">
              <View className="flex-[5] pt-1 pl-2.5">
                <Text className="text-xl font-bold text-text-primary">Штраф погашен</Text>
              </View>
              <View className="flex-1 items-center justify-center">
                <Image
                  source={require('../../../assets/images/twemoji_star_2.png')}
                  style={{ width: 36, height: 36 }}
                />
              </View>
            </View>
          )}

          {hasDiscount && (
            <View className="flex-row m-5 p-2.5 rounded-lg border bg-bg-secondary border-border-primary">
              <View className="flex-[5] pt-1 pl-2.5">
                <Text className="text-xl font-bold text-text-primary">
                  Скидка на оплату актуальна ещё {fineData.discount_time_left}
                </Text>
              </View>
              <View className="flex-1 items-center justify-center">
                <Image
                  source={require('../../../assets/images/whh_sale_2.png')}
                  style={{ width: 36, height: 36 }}
                />
              </View>
            </View>
          )}

          <View className="m-5 p-2.5">
            <Text className="text-xl font-bold text-text-primary">Нарушение {fineData.dat}</Text>
            <Text className="text-[15px] text-text-primary">Статья КОАП {fineData.code}</Text>
            <Text className="text-[15px] text-text-primary">{fineData.description}</Text>
            <Text className="text-[15px] text-text-primary">Номер постановления: {fineData.uin}</Text>

            <Text className="pt-5 text-xl font-bold text-text-primary">
              Полная сумма штрафа без скидки: {fineData.full_sum}
            </Text>
            <Text className="text-[15px] text-text-primary">{fineData.vendor}</Text>
          </View>

          {SHOW_PAYMENT_UI && !isPaid && (
            <View className="m-5 mt-7">
              <TouchableHighlight
                className="bg-accent-secondary rounded-xl p-5 items-center justify-center"
                activeOpacity={0.8}
                underlayColor="#2E2E2E"
                onPress={() => {
                  router.push({
                    pathname: '/(authenticated)/fine-payment-confirm' as any,
                    params: { fine_data: JSON.stringify(fineData) },
                  });
                }}
                accessibilityRole="button"
                accessibilityLabel="Оплатить штраф"
              >
                <View className="items-center">
                  <Text className="text-lg font-bold text-white">Оплатить штраф</Text>
                  {fineData.discount_time_left && fineData.discount_time_left !== '' && (
                    <Text className="text-sm text-white mt-1 opacity-80">
                      со скидкой {fineData.discount_percent}%
                    </Text>
                  )}
                </View>
              </TouchableHighlight>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
