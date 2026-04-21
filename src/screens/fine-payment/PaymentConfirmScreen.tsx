import React from 'react';
import { View, Text, TouchableHighlight, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ScreenHeader, InfoPopup } from '../../components/common';
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

  const safeBack = () => (router.canGoBack() ? router.back() : router.replace('/main' as any));

  if (charges.length === 0) {
    return (
      <SafeAreaView className="flex-1 bg-light-bg dark:bg-dark-bg" edges={['top']}>
        <ScreenHeader title="Оплата" onBack={safeBack} />
        <View className="flex-1 items-center justify-center p-5">
          <Text className="text-base text-text-muted text-center">Данные о начислениях не найдены</Text>
        </View>
      </SafeAreaView>
    );
  }

  const handlePayment = async () => {
    const errorMsg = await handlePay();
    if (errorMsg) showAlert('Внимание', errorMsg);
  };

  const baseAmount = isSingle ? (firstCharge.full_sum ?? firstCharge.sum ?? '0') : totalAmount.toFixed(2);

  return (
    <SafeAreaView className="flex-1 bg-light-bg dark:bg-dark-bg" edges={['top']}>
      <ScreenHeader title="Подтверждение оплаты" onBack={safeBack} />

      <ScrollView
        className="flex-1 p-5"
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
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
          // Mobile uses the shared InfoPopup modal (see below), not inline.
          inlineDiscountInfo={false}
        />

        <PaymentDataCard
          fio={fio}
          onChangeFio={(v) => { setFio(v); setFioError(''); }}
          fioError={fioError}
          kvit={kvit}
          onChangeKvit={setKvit}
        />

        <View className="bg-warning-bg rounded-xl p-4 mb-5 border border-[#FFE082]">
          <Text className="text-sm text-warning-text leading-5">
            ⚠️ После нажатия кнопки «Оплатить» вы будете перенаправлены на защищённую страницу платёжного сервиса
          </Text>
        </View>

        <View className="mb-10">
          <TouchableHighlight
            className={`rounded-xl p-4 items-center justify-center mb-4 bg-accent-secondary ${
              loading || calculating ? 'opacity-60' : ''
            }`}
            underlayColor="#2E2E2E"
            onPress={handlePayment}
            disabled={loading || calculating}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text className="text-lg font-bold text-white">
                Оплатить {commissionData ? commissionData.total_amount.toFixed(2) : totalAmount.toFixed(2)} ₽
              </Text>
            )}
          </TouchableHighlight>

          <TouchableHighlight
            className="rounded-xl p-4 items-center justify-center bg-white border border-border-primary"
            underlayColor="#F0F0F0"
            onPress={safeBack}
          >
            <Text className="text-base text-text-primary">Отменить</Text>
          </TouchableHighlight>
        </View>
      </ScrollView>

      <InfoPopup
        visible={showDiscountInfo}
        onClose={() => setShowDiscountInfo(false)}
        title={`СКИДКА ${discountPercent}%`}
        content="В соответствии с Кодексом Российской Федерации об административных правонарушениях при оплате в срок до 20 дней с момента вынесения постановления предоставляется возможность оплаты штрафа со скидкой."
      />
    </SafeAreaView>
  );
}
