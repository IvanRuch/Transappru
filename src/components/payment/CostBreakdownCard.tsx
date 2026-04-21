import React from 'react';
import { View, Text, Pressable, ActivityIndicator, Image } from 'react-native';
import { CommissionResponse } from '../../services/payment';

interface CostBreakdownCardProps {
  isSingle: boolean;
  /** Display amount without commission and before discount. */
  baseAmount: string;
  // Discount (only single-charge, only if applicable)
  hasDiscount: boolean;
  discountPercent: number;
  discountAmount: number;
  discountTimeLeft?: string;
  // Commission
  calculating: boolean;
  commissionData: CommissionResponse | null;
  getTypeName: (type: string) => string;
  // Discount info expander (mobile & web — state-driven)
  showDiscountInfo: boolean;
  onToggleDiscountInfo: () => void;
  /**
   * If true, renders the discount info as an inline expandable box (web UX).
   * When false, the parent screen is expected to render the info as a modal
   * (mobile uses the shared InfoPopup).
   */
  inlineDiscountInfo?: boolean;
}

/**
 * Cost card — source amount, optional discount badge, commission breakdown
 * by type, commission total, and grand total row. The discount info box is
 * rendered inline on web (controlled by `inlineDiscountInfo`); mobile uses a
 * modal at the screen level.
 */
export default function CostBreakdownCard({
  isSingle, baseAmount,
  hasDiscount, discountPercent, discountAmount, discountTimeLeft,
  calculating, commissionData, getTypeName,
  showDiscountInfo, onToggleDiscountInfo, inlineDiscountInfo,
}: CostBreakdownCardProps) {
  return (
    <View className="bg-[#F8F8F8] rounded-xl p-5 mb-5 border border-border-secondary">
      <Text className="text-lg font-bold text-text-primary mb-4 select-none">Стоимость</Text>

      <View className="flex-row justify-between mb-2.5">
        <Text className="text-base text-text-primary select-none">
          {isSingle ? 'Сумма начисления:' : 'Сумма начислений:'}
        </Text>
        <Text className="text-base text-text-primary font-medium select-none">{baseAmount} ₽</Text>
      </View>

      {hasDiscount && (
        <>
          <View className="flex-row justify-between mb-2.5">
            <Text className="text-base text-[#4CAF50] select-none">Скидка {discountPercent}%:</Text>
            <Text className="text-base text-[#4CAF50] font-medium select-none">
              -{discountAmount.toFixed(2)} ₽
            </Text>
          </View>

          <View className="flex-row items-center bg-[#E8F5E9] p-2.5 rounded-lg mt-2.5 mb-4">
            <Image
              source={require('../../../assets/images/whh_sale_2.png')}
              style={{ width: 24, height: 24, marginRight: 10 }}
              accessibilityIgnoresInvertColors
            />
            <Text className="flex-1 text-sm text-[#2E7D32]">
              Скидка действует ещё {discountTimeLeft}
            </Text>
            <Pressable
              onPress={onToggleDiscountInfo}
              accessibilityRole="button"
              accessibilityLabel="Подробнее о скидке"
            >
              <Text className="text-lg text-[#2E7D32] ml-2.5 font-bold">ⓘ</Text>
            </Pressable>
          </View>

          {inlineDiscountInfo && showDiscountInfo && (
            <View className="bg-[#F1F8E9] rounded-lg p-3.5 mb-3 border border-[#C8E6C9]">
              <Text className="text-[15px] font-bold text-[#2E7D32] mb-1.5 select-none">
                Скидка {discountPercent}%
              </Text>
              <Text className="text-[13px] text-[#33691E] leading-5">
                В соответствии с Кодексом Российской Федерации об административных правонарушениях
                при оплате в срок до 20 дней с момента вынесения постановления предоставляется
                возможность оплаты штрафа со скидкой.
              </Text>
              <Pressable
                onPress={onToggleDiscountInfo}
                className="self-end mt-2 cursor-pointer"
                accessibilityRole="button"
                accessibilityLabel="Закрыть"
              >
                <Text className="text-[13px] text-[#2E7D32] font-semibold select-none">Закрыть</Text>
              </Pressable>
            </View>
          )}
        </>
      )}

      {calculating ? (
        <View className="my-2.5"><ActivityIndicator size="small" color="#3A3A3A" /></View>
      ) : commissionData ? (
        <>
          {commissionData.details && commissionData.details.length > 0 && (
            <View className="mb-2.5">
              {commissionData.details.map((detail, index) => (
                <View key={index} className="flex-row justify-between mb-2 items-start">
                  <View className="flex-1 mr-2.5">
                    <Text className="text-sm text-text-primary font-medium select-none">
                      {getTypeName(detail.type)} ({detail.count} шт.):
                    </Text>
                    <Text className="text-[11px] text-text-muted italic mt-0.5">
                      (Платёжная система: {detail.kazna_percent}%, TransApp: {detail.transapp_percent}%)
                    </Text>
                  </View>
                  <View className="items-end">
                    <Text className="text-sm text-text-primary font-medium select-none">
                      {detail.amount.toFixed(2)} ₽
                    </Text>
                    <Text className="text-xs text-text-secondary">
                      + {detail.commission.toFixed(2)} ₽ ком.
                    </Text>
                  </View>
                </View>
              ))}
              <View className="h-px bg-[#E0E0E0] my-4" />
            </View>
          )}

          <View className="flex-row justify-between mb-2.5">
            <Text className="text-base text-text-primary select-none">Комиссия сервиса:</Text>
            <Text className="text-base text-text-primary font-medium select-none">
              {(commissionData.kazna_commission + commissionData.transapp_commission).toFixed(2)} ₽
            </Text>
          </View>

          <View className="-mt-1.5 mb-2.5">
            <Text className="text-xs text-text-muted italic">
              {commissionData.details && commissionData.details.length > 1
                ? 'Включает комиссию платёжной системы и комиссию TransApp (см. детализацию выше)'
                : `Включает комиссию платёжной системы (${commissionData.kazna_percent}%) и комиссию TransApp (${commissionData.transapp_percent}%)`}
            </Text>
          </View>

          <View className="h-px bg-[#E0E0E0] my-4" />

          <View className="flex-row justify-between">
            <Text className="text-xl font-bold text-text-primary select-none">Итого к оплате:</Text>
            <Text className="text-2xl font-bold text-accent-secondary select-none">
              {commissionData.total_amount.toFixed(2)} ₽
            </Text>
          </View>
        </>
      ) : (
        <Text className="text-status-error text-center">Ошибка расчёта</Text>
      )}
    </View>
  );
}
