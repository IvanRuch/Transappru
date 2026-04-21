/**
 * Web version of AutoFineScreen.
 *
 * Display-only detail view — data arrives via route params. Payment button
 * navigates to /fine-payment-confirm.
 *
 * Does NOT wrap in WebAppLayout — authenticated layout
 * (`_layout.web.tsx`) already provides it.
 */
import React, { useCallback, useMemo } from 'react';
import { View, Text, Pressable, ScrollView, Image } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScreenHeader } from '../../components/common';
import WebScreenContainer from '../../components/web/WebScreenContainer';
import { SHOW_PAYMENT_UI } from '../../config/features';

export default function AutoFineScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const fineData = useMemo(() => {
    try {
      return params.fine_data ? JSON.parse(params.fine_data as string) : null;
    } catch {
      return null;
    }
  }, [params.fine_data]);

  const safeBack = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/main' as any);
  }, [router]);

  const handlePay = useCallback(() => {
    router.push({
      pathname: '/(authenticated)/fine-payment-confirm' as any,
      params: { fine_data: JSON.stringify(fineData) },
    });
  }, [router, fineData]);

  if (!fineData) {
    return (
      <View className="flex-1">
        <ScreenHeader title="Штраф" onBack={safeBack} />
        <WebScreenContainer maxWidth={720}>
          <View className="flex-1 items-center justify-center p-10">
            <Text className="text-base text-text-muted text-center">Данные штрафа не найдены</Text>
            <Pressable onPress={safeBack} className="mt-3 cursor-pointer">
              <Text className="text-base text-text-primary underline">Вернуться назад</Text>
            </Pressable>
          </View>
        </WebScreenContainer>
      </View>
    );
  }

  const isPaid = fineData.is_paid === '1' || fineData.is_paid === 1;
  const isPlaton = fineData.is_platon === '1' || fineData.is_platon === 1;
  const hasDiscount = !isPaid && fineData.discount_time_left;
  const autoNumber = fineData._auto_number || fineData.user_auto?.auto_number || '';

  const rightSlot = autoNumber ? (
    <Text className="text-sm text-text-muted ml-3 select-none">{autoNumber}</Text>
  ) : undefined;

  return (
    <View className="flex-1">
      <ScreenHeader title="Штраф" onBack={safeBack} rightComponent={rightSlot} />

      <WebScreenContainer maxWidth={720}>
        <ScrollView className="flex-1" contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>
          {isPaid && (
            <View className="flex-row items-center p-3.5 rounded-[10px] mb-4 gap-2.5 bg-[#E8F5E9]">
              <Image
                source={require('../../../assets/images/twemoji_star_2.png')}
                style={{ width: 28, height: 28 }}
              />
              <Text className="flex-1 text-[15px] text-text-primary select-none">Штраф погашен</Text>
            </View>
          )}
          {hasDiscount && (
            <View className="flex-row items-center p-3.5 rounded-[10px] mb-4 gap-2.5 bg-[#FFF3E0]">
              <Image
                source={require('../../../assets/images/whh_sale_2.png')}
                style={{ width: 28, height: 28 }}
              />
              <Text className="flex-1 text-[15px] text-text-primary select-none">
                Скидка на оплату актуальна ещё {fineData.discount_time_left}
              </Text>
            </View>
          )}

          <View className="bg-white rounded-xl p-5 mb-5">
            <Text className="text-lg font-bold text-text-primary mb-3.5 select-none">
              Нарушение {fineData.dat}
            </Text>

            <InfoRow label="Статья КОАП:" value={fineData.code} />
            <View className="mb-2.5">
              <Text className="text-sm text-text-primary leading-5">{fineData.description}</Text>
            </View>
            {fineData.offence_place && (
              <View className="mb-2.5">
                <Text className="text-[13px] text-text-secondary leading-[18px]">{fineData.offence_place}</Text>
              </View>
            )}
            <InfoRow label="Номер постановления:" value={fineData.uin} />

            {isPlaton && (
              <View className="flex-row items-start mb-2">
                <Text className="text-xs font-bold text-status-error bg-[#FFF0F0] px-2 py-0.5 rounded select-none">
                  ПЛАТОН
                </Text>
              </View>
            )}

            <View className="h-px bg-[#F0F0F0] my-3" />

            <View className="flex-row items-start mb-2">
              <Text className="text-sm text-text-muted mr-2 min-w-[140px] select-none">Сумма штрафа:</Text>
              <Text className="text-lg font-bold text-text-primary select-none">{fineData.sum} ₽</Text>
            </View>

            {fineData.full_sum && fineData.full_sum !== fineData.sum && (
              <View className="flex-row items-start mb-2">
                <Text className="text-sm text-text-muted mr-2 min-w-[140px] select-none">Полная сумма без скидки:</Text>
                <Text className="text-sm text-text-muted line-through select-none">{fineData.full_sum} ₽</Text>
              </View>
            )}
            {fineData.discount_percent && (
              <View className="flex-row items-start mb-2">
                <Text className="text-sm text-text-muted mr-2 min-w-[140px] select-none">Скидка:</Text>
                <Text className="text-sm font-semibold text-[#4CAF50] select-none">{fineData.discount_percent}%</Text>
              </View>
            )}
            {fineData.discount_date_end && (
              <InfoRow label="Скидка действует до:" value={fineData.discount_date_end} />
            )}

            {fineData.vendor && (
              <>
                <View className="h-px bg-[#F0F0F0] my-3" />
                <InfoRow label="Получатель:" value={fineData.vendor} />
              </>
            )}

            {fineData.comment && (
              <View className="mb-2.5">
                <Text className="text-[13px] text-text-secondary italic">{fineData.comment}</Text>
              </View>
            )}
          </View>

          {SHOW_PAYMENT_UI && !isPaid && (
            <Pressable
              className="bg-accent-secondary rounded-xl py-4 items-center cursor-pointer"
              onPress={handlePay}
              accessibilityRole="button"
              accessibilityLabel="Оплатить штраф"
            >
              <Text className="text-[17px] font-bold text-white select-none">Оплатить штраф</Text>
              {fineData.discount_percent && (
                <Text className="text-[13px] text-[#B0B0B0] mt-0.5 select-none">
                  со скидкой {fineData.discount_percent}%
                </Text>
              )}
            </Pressable>
          )}
        </ScrollView>
      </WebScreenContainer>
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-start mb-2">
      <Text className="text-sm text-text-muted mr-2 min-w-[140px] select-none">{label}</Text>
      <Text className="flex-1 text-sm text-text-primary">{value}</Text>
    </View>
  );
}
