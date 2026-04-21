/**
 * Web version of PaymentConfirmScreen.
 *
 * Shares all business logic with mobile via usePaymentConfirm (ADR-003)
 * and the `ChargeInfoCard`/`CostBreakdownCard`/`PaymentDataCard`
 * sub-components (ADR-005). Web specifics:
 *  - ScreenHeader + WebScreenContainer (desktop max-width)
 *  - Discount info rendered inline (web has horizontal space for it)
 *  - showAlert for errors instead of Alert.alert / window.alert
 *
 * Does NOT wrap in WebAppLayout — authenticated layout
 * (`_layout.web.tsx`) already provides it (see .claude/rules.md).
 */
import React, { useCallback } from 'react';
import { View, Text, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenHeader } from '../../components/common';
import WebScreenContainer from '../../components/web/WebScreenContainer';
import { ChargeInfoCard, CostBreakdownCard, PaymentDataCard } from '../../components/payment';
import { usePaymentConfirm } from '../../hooks/usePaymentConfirm';
import { showAlert } from '../../utils/alert';

export default function PaymentConfirmScreen() {
  const router = useRouter();
  const {
    charges, isSingle, firstCharge, totalAmount,
    hasDiscount, discountPercent, discountAmount,
    calculating, commissionData,
    fio, setFio, fioError, setFioError,
    kvit, setKvit,
    loading,
    showDiscountInfo, setShowDiscountInfo,
    showAllCharges, setShowAllCharges,
    handlePay, getTypeName,
  } = usePaymentConfirm();

  const safeBack = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/main' as any);
  }, [router]);

  const handlePayment = useCallback(async () => {
    const errorMsg = await handlePay();
    if (errorMsg) showAlert('Внимание', errorMsg);
  }, [handlePay]);

  if (charges.length === 0) {
    return (
      <View className="flex-1">
        <ScreenHeader title="Оплата" onBack={safeBack} />
        <WebScreenContainer maxWidth={720}>
          <View className="flex-1 items-center justify-center p-10">
            <Text className="text-base text-text-muted text-center">
              Данные о начислениях не найдены
            </Text>
          </View>
        </WebScreenContainer>
      </View>
    );
  }

  const baseAmount = isSingle ? (firstCharge.full_sum ?? firstCharge.sum ?? '0') : totalAmount.toFixed(2);

  return (
    <View className="flex-1">
      <ScreenHeader title="Подтверждение оплаты" onBack={safeBack} />

      <WebScreenContainer maxWidth={720}>
        <ScrollView className="flex-1" contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>
          <ChargeInfoCard
            charges={charges}
            isSingle={isSingle}
            firstCharge={firstCharge}
            showAll={showAllCharges}
            onToggleShowAll={() => setShowAllCharges(!showAllCharges)}
          />

          <CostBreakdownCard
            isSingle={isSingle}
            baseAmount={String(baseAmount)}
            hasDiscount={!!hasDiscount}
            discountPercent={discountPercent}
            discountAmount={discountAmount}
            discountTimeLeft={firstCharge?.discount_time_left}
            calculating={calculating}
            commissionData={commissionData}
            getTypeName={getTypeName}
            showDiscountInfo={showDiscountInfo}
            onToggleDiscountInfo={() => setShowDiscountInfo(!showDiscountInfo)}
            inlineDiscountInfo
          />

          <PaymentDataCard
            fio={fio}
            onChangeFio={(v) => { setFio(v); setFioError(''); }}
            fioError={fioError}
            kvit={kvit}
            onChangeKvit={setKvit}
          />

          <View className="bg-warning-bg rounded-xl p-4 mb-5 border border-[#FFE082]">
            <Text className="text-sm text-warning-text leading-5 select-none">
              После нажатия кнопки «Оплатить» вы будете перенаправлены на защищённую страницу платёжного сервиса
            </Text>
          </View>

          <View className="mb-10">
            <Pressable
              className={`rounded-xl py-[18px] items-center justify-center mb-4 bg-accent-secondary cursor-pointer ${
                loading || calculating ? 'opacity-60' : ''
              }`}
              onPress={handlePayment}
              disabled={loading || calculating}
              accessibilityRole="button"
              accessibilityLabel="Оплатить"
              accessibilityState={{ disabled: loading || calculating, busy: loading }}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text className="text-lg font-bold text-white select-none">
                  Оплатить {commissionData ? commissionData.total_amount.toFixed(2) : totalAmount.toFixed(2)} ₽
                </Text>
              )}
            </Pressable>

            <Pressable
              className="rounded-xl py-[18px] items-center justify-center bg-white border border-border-primary cursor-pointer"
              onPress={safeBack}
              accessibilityRole="button"
              accessibilityLabel="Отменить"
            >
              <Text className="text-base text-text-primary select-none">Отменить</Text>
            </Pressable>
          </View>
        </ScrollView>
      </WebScreenContainer>
    </View>
  );
}
