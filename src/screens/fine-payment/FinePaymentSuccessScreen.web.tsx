/**
 * Web version of FinePaymentSuccessScreen.
 *
 * Simple terminal success screen after Kazna payment completion. Offers two
 * navigation paths: auto-list or back to the fine detail view.
 *
 * Does NOT wrap in WebAppLayout — authenticated layout
 * (`_layout.web.tsx`) already provides it.
 */
import React, { useMemo } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

export default function FinePaymentSuccessScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const fineData = useMemo(() => {
    try {
      return params.fine_data ? JSON.parse(params.fine_data as string) : null;
    } catch {
      return null;
    }
  }, [params.fine_data]);

  return (
    <View className="flex-1 items-center justify-center p-10">
      <View className="bg-white rounded-2xl p-10 items-center w-full max-w-[480px] web:shadow-lg">
        <Text className="text-5xl text-[#4CAF50] mb-4">✓</Text>
        <Text className="text-[22px] font-bold text-text-primary mb-2 text-center select-none">
          Оплата прошла успешно
        </Text>
        <Text className="text-[15px] text-text-muted text-center mb-6 select-none">
          Статус штрафа обновится в ближайшее время
        </Text>

        {fineData && (
          <View className="bg-[#F8F8F8] rounded-[10px] p-4 w-full items-center mb-6">
            <Text className="text-sm text-text-secondary select-none">
              Постановление от {fineData.dat}
            </Text>
            <Text className="text-xl font-bold text-text-primary mt-1 select-none">
              {fineData.sum} ₽
            </Text>
          </View>
        )}

        <View className="w-full gap-2.5">
          <Pressable
            className="bg-accent-secondary rounded-[10px] py-3.5 items-center cursor-pointer"
            onPress={() => router.replace('/(authenticated)/auto-list' as any)}
            accessibilityRole="button"
            accessibilityLabel="Вернуться к списку"
          >
            <Text className="text-white text-base font-semibold select-none">Вернуться к списку</Text>
          </Pressable>

          {fineData && (
            <Pressable
              className="rounded-[10px] py-3.5 items-center border border-border-primary cursor-pointer"
              onPress={() =>
                router.replace({
                  pathname: '/(authenticated)/auto-fine' as any,
                  params: { fine_data: JSON.stringify(fineData) },
                })
              }
              accessibilityRole="button"
              accessibilityLabel="К деталям штрафа"
            >
              <Text className="text-text-primary text-base select-none">К деталям штрафа</Text>
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}
