/**
 * Web version of PaymentConfirmScreen.
 * Uses shared usePaymentConfirm hook for business logic.
 * Platform-specific: WebAppLayout, Pressable, native <input>, custom toggle,
 * inline discount info box, window.alert for errors.
 */
import React from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import WebAppLayout from '../../components/web/WebAppLayout';
import { usePaymentConfirm } from '../../hooks/usePaymentConfirm';

const noSelect = Platform.OS === 'web' ? { userSelect: 'none' as const } : {};

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

  if (charges.length === 0) {
    return (
      <WebAppLayout>
        <View style={s.header}>
          <Pressable onPress={() => router.back()} style={s.backBtn}>
            <Text style={s.backBtnText}>←</Text>
          </Pressable>
          <Text style={[s.headerTitle, noSelect]}>Оплата</Text>
        </View>
        <View style={s.center}>
          <Text style={s.emptyText}>Данные о начислениях не найдены</Text>
        </View>
      </WebAppLayout>
    );
  }

  const handlePayment = async () => {
    const errorMsg = await handlePay();
    if (errorMsg) {
      window.alert(errorMsg);
    }
  };

  const renderChargeItem = (charge: any, index: number) => {
    const isPlaton = charge.is_platon === '1' || charge.is_platon === 1;
    const autoNumber = charge._auto_number || charge.user_auto?.auto_number;
    let description = '';
    if (isPlaton) {
      description = 'Платон';
    } else {
      const parts: string[] = [];
      if (charge.code) parts.push(charge.code);
      if (charge.description) parts.push(charge.description);
      description = parts.join(' — ');
    }
    const metaParts: string[] = [];
    if (autoNumber && autoNumber !== 'Неизвестно') metaParts.push(autoNumber);
    if (charge.dat) metaParts.push(charge.dat);
    const metaText = metaParts.join(' • ');
    const visibleCount = showAllCharges ? charges.length : 3;

    return (
      <View key={charge.id || index} style={s.chargeItem}>
        <View style={s.chargeContent}>
          <View style={s.chargeLeft}>
            {metaText ? <Text style={s.chargeMeta}>{metaText}</Text> : null}
            <Text style={s.chargeDescription} numberOfLines={2}>{description}</Text>
          </View>
          <View style={s.chargeRight}>
            <Text style={s.chargeSum}>{charge.sum} ₽</Text>
          </View>
        </View>
        {index < visibleCount - 1 && <View style={s.chargeDivider} />}
      </View>
    );
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '12px',
    fontSize: '16px',
    borderRadius: '8px',
    border: fioError ? '1px solid #C62828' : '1px solid #B8B8B8',
    outline: 'none',
    fontFamily: 'inherit',
    color: '#313131',
    boxSizing: 'border-box',
  };

  return (
    <WebAppLayout>
      {/* Header */}
      <View style={s.header}>
        <Pressable onPress={() => router.back()} style={s.backBtn}>
          <Text style={s.backBtnText}>←</Text>
        </Pressable>
        <Text style={[s.headerTitle, noSelect]}>Подтверждение оплаты</Text>
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent}>
        {/* Charge info card */}
        <View style={s.card}>
          <Text style={[s.cardTitle, noSelect]}>
            {isSingle ? 'Информация о начислении' : `Оплата ${charges.length} начислений`}
          </Text>

          {isSingle ? (
            <>
              <View style={s.infoRow}>
                <Text style={[s.infoLabel, noSelect]}>Нарушение:</Text>
                <Text style={s.infoValue}>{firstCharge.dat}</Text>
              </View>
              <View style={s.infoRow}>
                <Text style={[s.infoLabel, noSelect]}>Статья КОАП:</Text>
                <Text style={s.infoValue}>{firstCharge.code}</Text>
              </View>
              <View style={s.infoRow}>
                <Text style={[s.infoLabel, noSelect]}>Постановление:</Text>
                <Text style={s.infoValue}>{firstCharge.uin}</Text>
              </View>
              <View style={s.infoRow}>
                <Text style={[s.infoLabel, noSelect]}>Орган:</Text>
                <Text style={s.infoValue}>{firstCharge.vendor}</Text>
              </View>
            </>
          ) : (
            <View>
              {charges.slice(0, showAllCharges ? undefined : 3).map(renderChargeItem)}
              {charges.length > 3 && (
                <Pressable style={s.showMoreButton} onPress={() => setShowAllCharges(!showAllCharges)}>
                  <Text style={[s.showMoreText, noSelect]}>
                    {showAllCharges ? 'Скрыть' : `Показать ещё ${charges.length - 3}`}
                  </Text>
                </Pressable>
              )}
            </View>
          )}
        </View>

        {/* Cost card */}
        <View style={s.card}>
          <Text style={[s.cardTitle, noSelect]}>Стоимость</Text>

          <View style={s.amountRow}>
            <Text style={[s.amountLabel, noSelect]}>
              {isSingle ? 'Сумма начисления:' : 'Сумма начислений:'}
            </Text>
            <Text style={[s.amountValue, noSelect]}>
              {isSingle ? firstCharge.full_sum : totalAmount.toFixed(2)} ₽
            </Text>
          </View>

          {hasDiscount && (
            <>
              <View style={s.amountRow}>
                <Text style={[s.discountLabel, noSelect]}>Скидка {discountPercent}%:</Text>
                <Text style={[s.discountValue, noSelect]}>-{discountAmount.toFixed(2)} ₽</Text>
              </View>
              <View style={s.discountBadge}>
                <Text style={{ fontSize: 20, marginRight: 8 }}>🏷</Text>
                <Text style={[s.discountText, noSelect]}>
                  Скидка действует ещё {firstCharge.discount_time_left}
                </Text>
                <Pressable onPress={() => setShowDiscountInfo(!showDiscountInfo)}>
                  <Text style={s.infoIcon}>ⓘ</Text>
                </Pressable>
              </View>
              {showDiscountInfo && (
                <View style={s.discountInfoBox}>
                  <Text style={[s.discountInfoTitle, noSelect]}>Скидка {discountPercent}%</Text>
                  <Text style={s.discountInfoText}>
                    В соответствии с Кодексом Российской Федерации об административных правонарушениях
                    при оплате в срок до 20 дней с момента вынесения постановления предоставляется
                    возможность оплаты штрафа со скидкой.
                  </Text>
                  <Pressable onPress={() => setShowDiscountInfo(false)} style={s.discountInfoClose}>
                    <Text style={[s.discountInfoCloseText, noSelect]}>Закрыть</Text>
                  </Pressable>
                </View>
              )}
            </>
          )}

          {calculating ? (
            <ActivityIndicator size="small" color="#3A3A3A" style={{ marginVertical: 10 }} />
          ) : commissionData ? (
            <>
              {/* Commission details by type */}
              {commissionData.details && commissionData.details.length > 0 && (
                <View style={s.detailsContainer}>
                  {commissionData.details.map((detail, index) => (
                    <View key={index} style={s.detailRow}>
                      <View style={s.detailLeft}>
                        <Text style={[s.detailLabel, noSelect]}>
                          {getTypeName(detail.type)} ({detail.count} шт.):
                        </Text>
                        <Text style={s.detailSubLabel}>
                          (Платёжная система: {detail.kazna_percent}%, TransApp: {detail.transapp_percent}%)
                        </Text>
                      </View>
                      <View style={s.detailRight}>
                        <Text style={[s.detailValue, noSelect]}>{detail.amount.toFixed(2)} ₽</Text>
                        <Text style={s.detailCommission}>+ {detail.commission.toFixed(2)} ₽ ком.</Text>
                      </View>
                    </View>
                  ))}
                  <View style={s.divider} />
                </View>
              )}

              <View style={s.amountRow}>
                <Text style={[s.amountLabel, noSelect]}>Комиссия сервиса:</Text>
                <Text style={[s.amountValue, noSelect]}>
                  {(commissionData.kazna_commission + commissionData.transapp_commission).toFixed(2)} ₽
                </Text>
              </View>

              <View style={s.commissionDetails}>
                <Text style={s.commissionText}>
                  {commissionData.details && commissionData.details.length > 1
                    ? 'Включает комиссию платёжной системы и комиссию TransApp (см. детализацию выше)'
                    : `Включает комиссию платёжной системы (${commissionData.kazna_percent}%) и комиссию TransApp (${commissionData.transapp_percent}%)`}
                </Text>
              </View>

              <View style={s.divider} />

              <View style={s.totalRow}>
                <Text style={[s.totalLabel, noSelect]}>Итого к оплате:</Text>
                <Text style={[s.totalValue, noSelect]}>{commissionData.total_amount.toFixed(2)} ₽</Text>
              </View>
            </>
          ) : (
            <Text style={{ color: 'red', textAlign: 'center' }}>Ошибка расчёта</Text>
          )}
        </View>

        {/* Payment data card */}
        <View style={s.card}>
          <Text style={[s.cardTitle, noSelect]}>Данные для оплаты</Text>

          <View style={s.inputContainer}>
            <Text style={[s.inputLabel, noSelect]}>Ф.И.О. плательщика</Text>
            <input
              type="text"
              value={fio}
              onChange={(e: any) => { setFio(e.target.value); setFioError(''); }}
              placeholder="Иванов Иван Иванович"
              maxLength={100}
              style={inputStyle}
            />
          </View>

          {fioError ? (
            <View style={s.errorBox}>
              <Text style={s.errorText}>{fioError}</Text>
            </View>
          ) : null}

          <Pressable style={s.switchRow} onPress={() => setKvit(!kvit)}>
            <Text style={[s.switchLabel, noSelect]}>Заказать квитанцию</Text>
            <View style={[s.toggle, kvit && s.toggleActive]}>
              <View style={[s.toggleKnob, kvit && s.toggleKnobActive]} />
            </View>
          </Pressable>
          <Text style={s.switchHint}>
            Если включено, вам будет предложено ввести e-mail или телефон на странице оплаты.
          </Text>
        </View>

        {/* Warning */}
        <View style={s.warningCard}>
          <Text style={s.warningText}>
            После нажатия кнопки «Оплатить» вы будете перенаправлены на защищённую страницу платёжного сервиса
          </Text>
        </View>

        {/* Action buttons */}
        <View style={s.buttonContainer}>
          <Pressable
            style={[s.payButton, (loading || calculating) && s.payButtonDisabled]}
            onPress={handlePayment}
            disabled={loading || calculating}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={[s.payButtonText, noSelect]}>
                Оплатить {commissionData ? commissionData.total_amount.toFixed(2) : totalAmount.toFixed(2)} ₽
              </Text>
            )}
          </Pressable>

          <Pressable style={s.cancelButton} onPress={() => router.back()}>
            <Text style={[s.cancelButtonText, noSelect]}>Отменить</Text>
          </Pressable>
        </View>
      </ScrollView>
    </WebAppLayout>
  );
}

const s = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E8',
  },
  backBtn: { width: 40, height: 40, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  backBtnText: { fontSize: 22, color: '#3A3A3A' },
  headerTitle: { fontSize: 22, fontWeight: '700', color: '#1A1A1A' },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyText: { fontSize: 16, color: '#999', textAlign: 'center' },

  scroll: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 60 },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  cardTitle: { fontSize: 18, fontWeight: '700', color: '#313131', marginBottom: 15 },

  // Info rows (single charge)
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  infoLabel: { fontSize: 14, color: '#656565', flex: 1 },
  infoValue: { fontSize: 14, color: '#313131', flex: 2, textAlign: 'right' },

  // Multi-charge items
  chargeItem: { marginBottom: 10 },
  chargeContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  chargeLeft: { flex: 1, marginRight: 10 },
  chargeRight: { alignItems: 'flex-end' },
  chargeMeta: { fontSize: 12, color: '#656565', marginBottom: 2 },
  chargeDescription: { fontSize: 14, color: '#313131', fontWeight: '500' },
  chargeSum: { fontSize: 14, fontWeight: '700', color: '#313131' },
  chargeDivider: { height: 1, backgroundColor: '#E0E0E0', marginVertical: 10 },
  showMoreButton: { alignItems: 'center', paddingVertical: 10 },
  showMoreText: { color: '#3A3A3A', fontWeight: '700' },

  // Amount rows
  amountRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  amountLabel: { fontSize: 16, color: '#313131' },
  amountValue: { fontSize: 16, color: '#313131', fontWeight: '500' },

  // Discount
  discountLabel: { fontSize: 16, color: '#4CAF50' },
  discountValue: { fontSize: 16, color: '#4CAF50', fontWeight: '500' },
  discountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
    marginBottom: 15,
  },
  discountText: { fontSize: 14, color: '#2E7D32', flex: 1 },
  infoIcon: { fontSize: 18, color: '#2E7D32', marginLeft: 10, fontWeight: 'bold' },

  // Discount info popup (inline)
  discountInfoBox: {
    backgroundColor: '#F1F8E9',
    borderRadius: 8,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#C8E6C9',
  },
  discountInfoTitle: { fontSize: 15, fontWeight: '700', color: '#2E7D32', marginBottom: 6 },
  discountInfoText: { fontSize: 13, color: '#33691E', lineHeight: 19 },
  discountInfoClose: { marginTop: 8, alignSelf: 'flex-end' },
  discountInfoCloseText: { fontSize: 13, color: '#2E7D32', fontWeight: '600' },

  // Commission details
  detailsContainer: { marginBottom: 10 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8, alignItems: 'flex-start' },
  detailLeft: { flex: 1, marginRight: 10 },
  detailRight: { alignItems: 'flex-end' },
  detailLabel: { fontSize: 14, color: '#313131', fontWeight: '500' },
  detailSubLabel: { fontSize: 11, color: '#888888', fontStyle: 'italic', marginTop: 2 },
  detailValue: { fontSize: 14, color: '#313131', fontWeight: '500' },
  detailCommission: { fontSize: 12, color: '#656565' },

  commissionDetails: { marginTop: -5, marginBottom: 10 },
  commissionText: { fontSize: 12, color: '#888888', fontStyle: 'italic' },

  divider: { height: 1, backgroundColor: '#E0E0E0', marginVertical: 15 },

  totalRow: { flexDirection: 'row', justifyContent: 'space-between' },
  totalLabel: { fontSize: 20, fontWeight: '700', color: '#313131' },
  totalValue: { fontSize: 24, fontWeight: '700', color: '#3A3A3A' },

  // FIO input
  inputContainer: { marginBottom: 15 },
  inputLabel: { fontSize: 14, color: '#656565', marginBottom: 5 },

  // Error
  errorBox: { backgroundColor: '#FFEBEE', borderRadius: 8, padding: 10, marginBottom: 12 },
  errorText: { fontSize: 13, color: '#C62828' },

  // Toggle switch
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  switchLabel: { fontSize: 16, color: '#313131', flex: 1 },
  toggle: {
    width: 50,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#B0B0B0',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleActive: { backgroundColor: '#3A3A3A' },
  toggleKnob: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
  },
  toggleKnobActive: { alignSelf: 'flex-end' },
  switchHint: { fontSize: 12, color: '#888888', fontStyle: 'italic' },

  // Warning
  warningCard: {
    backgroundColor: '#FFF3CD',
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#FFE082',
  },
  warningText: { fontSize: 14, color: '#856404', lineHeight: 20 },

  // Buttons
  buttonContainer: { marginBottom: 40 },
  payButton: {
    backgroundColor: '#3A3A3A',
    borderRadius: 12,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
  },
  payButtonDisabled: { opacity: 0.6 },
  payButtonText: { fontSize: 18, fontWeight: '700', color: '#FFFFFF' },
  cancelButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#B8B8B8',
  },
  cancelButtonText: { fontSize: 16, color: '#313131' },
});
