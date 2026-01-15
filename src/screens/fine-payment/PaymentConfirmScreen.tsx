import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, Image, TouchableHighlight, ScrollView, StyleSheet, ActivityIndicator, Alert, TouchableOpacity, TextInput, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScreenHeader, InfoPopup } from '../../components/common';
import PaymentService, { CommissionResponse, ChargeItemDTO } from '../../services/payment';
import { ChargeItem } from '../../types/charges';

export default function PaymentConfirmScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [loading, setLoading] = useState(false);
  const [commissionData, setCommissionData] = useState<CommissionResponse | null>(null);
  const [calculating, setCalculating] = useState(true);
  const [showDiscountInfo, setShowDiscountInfo] = useState(false);
  const [showAllCharges, setShowAllCharges] = useState(false);
  
  const [fio, setFio] = useState('');
  const [kvit, setKvit] = useState(false);
  
  // Используем useMemo для charges, чтобы объект был стабильным
  const charges: ChargeItem[] = React.useMemo(() => {
    if (params.charges) {
      try {
        const chargesStr = Array.isArray(params.charges) ? params.charges[0] : params.charges;
        if (typeof chargesStr === 'string') {
            return JSON.parse(chargesStr);
        }
      } catch (e) {
        console.error('Error parsing charges:', e);
        return [];
      }
    } else if (params.fine_data) {
      try {
        const fineDataStr = Array.isArray(params.fine_data) ? params.fine_data[0] : params.fine_data;
        if (typeof fineDataStr === 'string') {
            const singleCharge = JSON.parse(fineDataStr);
            return [singleCharge];
        }
      } catch (e) {
        console.error('Error parsing fine_data:', e);
        return [];
      }
    }
    return [];
  }, [params.charges, params.fine_data]);

  const isSingle = charges.length === 1;
  const firstCharge = charges[0];

  const totalAmount = charges.reduce((sum, charge) => sum + parseFloat(charge.sum || '0'), 0);
  
  const hasDiscount = isSingle && firstCharge.discount_time_left && firstCharge.discount_time_left !== '';
  const discountPercent = hasDiscount ? parseInt(firstCharge.discount_percent || '0') : 0;
  const fullAmount = isSingle ? parseFloat(firstCharge.full_sum || firstCharge.sum || '0') : totalAmount;
  const discountAmount = hasDiscount ? fullAmount * (discountPercent / 100) : 0;
  
  const getDepType = (charge: ChargeItem) => 
    (charge.is_platon === '1' || charge.is_platon === 1) ? 'paidRoads' : 'gibdd';

  const calculateCommission = useCallback(async () => {
    if (charges.length === 0) return;

    try {
      setCalculating(true);
      let data;
      
      if (isSingle) {
        const depType = getDepType(firstCharge);
        data = await PaymentService.calculateCommission(totalAmount, depType);
      } else {
        const chargesDTO: ChargeItemDTO[] = charges.map(c => ({
            amount: parseFloat(c.sum || '0'),
            depType: getDepType(c)
        }));
        data = await PaymentService.calculateMultiCommission(chargesDTO);
      }
      
      setCommissionData(data);
    } catch (error) {
      console.error('Error calculating commission:', error);
      Alert.alert('Внимание', 'Не удалось рассчитать комиссию');
    } finally {
      setCalculating(false);
    }
  }, [charges, isSingle, firstCharge, totalAmount]);

  useEffect(() => {
    calculateCommission();
  }, [calculateCommission]);

  if (charges.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <ScreenHeader title="Оплата" onBack={() => router.back()} />
        <View style={styles.content}>
          <Text>Данные о начислениях не найдены</Text>
        </View>
      </SafeAreaView>
    );
  }

  const handlePayment = async () => {
    const trimmedFio = fio.trim();
    if (!trimmedFio) {
      Alert.alert('Внимание', 'Пожалуйста, укажите ФИО плательщика');
      return;
    }

    const words = trimmedFio.split(/\s+/);
    if (words.length < 2) {
      Alert.alert('Внимание', 'Пожалуйста, укажите Фамилию и Имя (минимум два слова)');
      return;
    }
    if (words.length > 6) {
      Alert.alert('Внимание', 'ФИО слишком длинное. Пожалуйста, проверьте правильность ввода.');
      return;
    }

    const fioRegex = /^[а-яА-ЯёЁ\s-]+$/;
    if (!fioRegex.test(trimmedFio)) {
      Alert.alert('Внимание', 'ФИО должно содержать только кириллицу.');
      return;
    }

    setLoading(true);
    
    try {
      let response;
      
      if (isSingle) {
        response = await PaymentService.initiatePayment(
          firstCharge.uin,
          totalAmount,
          `Оплата начисления ${firstCharge.uin}`,
          trimmedFio,
          undefined,
          kvit
        );
      } else {
        const uins = charges.map(c => c.uin);
        // Берем тип первого штрафа как основной (для совместимости с API)
        const depType = getDepType(firstCharge);
        
        response = await PaymentService.initiateMultiPayment(
          uins,
          totalAmount,
          trimmedFio,
          undefined,
          kvit,
          depType
        );
      }
      
      if (response && response.payment_url) {
        router.push({
          pathname: '/(authenticated)/fine-payment-webview' as any,
          params: { 
            payment_url: response.payment_url,
            fine_data: JSON.stringify(firstCharge),
            payment_id: response.payment_id
          }
        });
      } else {
        throw new Error('Не удалось получить ссылку на оплату');
      }
    } catch (error: any) {
      console.error('Error getting payment URL:', error);
      const errorMessage = error.response?.data?.detail || error.response?.data?.message || 'Не удалось инициализировать оплату. Попробуйте позже.';
      Alert.alert('Внимание', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const getTypeName = (type: string) => {
    switch (type) {
        case 'gibdd': return 'ГИБДД';
        case 'paidRoads': return 'Платные дороги';
        case 'fssp': return 'ФССП';
        case 'fns': return 'ФНС';
        default: return 'Прочее';
    }
  };

  const renderChargeItem = (charge: any, index: number) => {
    const isPlaton = charge.is_platon === '1' || charge.is_platon === 1;
    const autoNumber = charge._auto_number || charge.user_auto?.auto_number;
    
    let description = '';
    if (isPlaton) {
        description = 'Платон';
    } else {
        const parts = [];
        if (charge.code) parts.push(charge.code);
        if (charge.description) parts.push(charge.description);
        description = parts.join(' - ');
    }
    
    const metaParts = [];
    if (autoNumber && autoNumber !== 'Неизвестно') metaParts.push(autoNumber);
    if (charge.dat) metaParts.push(charge.dat);
    const metaText = metaParts.join(' • ');

    return (
        <View key={charge.id || index} style={styles.chargeItem}>
            <View style={styles.chargeContent}>
                <View style={styles.chargeLeft}>
                    {metaText ? (
                        <Text style={styles.chargeMeta}>
                            {metaText}
                        </Text>
                    ) : null}
                    <Text style={styles.chargeDescription} numberOfLines={2}>
                        {description}
                    </Text>
                </View>
                <View style={styles.chargeRight}>
                    <Text style={styles.chargeSum}>{charge.sum} ₽</Text>
                </View>
            </View>
            {index < (showAllCharges ? charges.length : 3) - 1 && <View style={styles.chargeDivider} />}
        </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader 
        title="Подтверждение оплаты"
        onBack={() => router.back()}
      />

      <ScrollView 
        style={styles.content} 
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        {/* Информация о штрафе/штрафах */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            {isSingle ? "Информация о начислении" : `Оплата ${charges.length} начислений`}
          </Text>
          
          {isSingle ? (
            <>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Нарушение:</Text>
                <Text style={styles.infoValue}>{firstCharge.dat}</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Статья КОАП:</Text>
                <Text style={styles.infoValue}>{firstCharge.code}</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Постановление:</Text>
                <Text style={styles.infoValue}>{firstCharge.uin}</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Орган:</Text>
                <Text style={styles.infoValue}>{firstCharge.vendor}</Text>
              </View>
            </>
          ) : (
            <View>
                {charges.slice(0, showAllCharges ? undefined : 3).map(renderChargeItem)}
                
                {charges.length > 3 && (
                    <TouchableOpacity 
                        style={styles.showMoreButton}
                        onPress={() => setShowAllCharges(!showAllCharges)}
                    >
                        <Text style={styles.showMoreText}>
                            {showAllCharges ? 'Скрыть' : `Показать еще ${charges.length - 3}`}
                        </Text>
                    </TouchableOpacity>
                )}
            </View>
          )}
        </View>

        {/* Расчет стоимости */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Стоимость</Text>
          
          <View style={styles.amountRow}>
            <Text style={styles.amountLabel}>
                {isSingle ? "Сумма начисления:" : "Сумма начислений:"}
            </Text>
            <Text style={styles.amountValue}>
                {isSingle ? firstCharge.full_sum : totalAmount.toFixed(2)} ₽
            </Text>
          </View>

          {hasDiscount && (
            <>
              <View style={styles.amountRow}>
                <Text style={styles.discountLabel}>Скидка {discountPercent}%:</Text>
                <Text style={styles.discountValue}>-{discountAmount.toFixed(2)} ₽</Text>
              </View>
              
              <View style={styles.discountBadge}>
                <Image 
                  source={require('../../../assets/images/whh_sale_2.png')} 
                  style={styles.discountIcon}
                />
                <Text style={styles.discountText}>
                  Скидка действует еще {firstCharge.discount_time_left}
                </Text>
                <TouchableOpacity onPress={() => setShowDiscountInfo(true)}>
                  <Text style={styles.infoIcon}>ⓘ</Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          {calculating ? (
            <ActivityIndicator size="small" color="#3A3A3A" style={{ marginVertical: 10 }} />
          ) : commissionData ? (
            <>
              {/* Детализация комиссии по типам */}
              {commissionData.details && commissionData.details.length > 0 && (
                <View style={styles.detailsContainer}>
                    {commissionData.details.map((detail, index) => (
                        <View key={index} style={styles.detailRow}>
                            <View style={styles.detailLeft}>
                                <Text style={styles.detailLabel}>
                                    {getTypeName(detail.type)} ({detail.count} шт.):
                                </Text>
                                <Text style={styles.detailSubLabel}>
                                    (Платежная система: {detail.kazna_percent}%, TransApp: {detail.transapp_percent}%)
                                </Text>
                            </View>
                            <View style={styles.detailRight}>
                                <Text style={styles.detailValue}>
                                    {detail.amount.toFixed(2)} ₽
                                </Text>
                                <Text style={styles.detailCommission}>
                                    + {detail.commission.toFixed(2)} ₽ ком.
                                </Text>
                            </View>
                        </View>
                    ))}
                    <View style={styles.divider} />
                </View>
              )}

              <View style={styles.amountRow}>
                <Text style={styles.amountLabel}>Комиссия сервиса:</Text>
                <Text style={styles.amountValue}>
                  {(commissionData.kazna_commission + commissionData.transapp_commission).toFixed(2)} ₽
                </Text>
              </View>
              
              <View style={styles.commissionDetails}>
                <Text style={styles.commissionText}>
                  {commissionData.details && commissionData.details.length > 1 
                    ? "Включает комиссию платежной системы и комиссию TransApp (см. детализацию выше)"
                    : `Включает комиссию платежной системы (${commissionData.kazna_percent}%) и комиссию TransApp (${commissionData.transapp_percent}%)`
                  }
                </Text>
              </View>
              
              <View style={styles.divider} />

              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Итого к оплате:</Text>
                <Text style={styles.totalValue}>{commissionData.total_amount.toFixed(2)} ₽</Text>
              </View>
            </>
          ) : (
            <Text style={{ color: 'red', textAlign: 'center' }}>Ошибка расчета</Text>
          )}
        </View>

        {/* Данные для оплаты */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Данные для оплаты</Text>
          
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Ф.И.О. плательщика</Text>
            <TextInput
              style={styles.input}
              value={fio}
              onChangeText={setFio}
              placeholder="Иванов Иван Иванович"
              placeholderTextColor="#B0B0B0"
              maxLength={100}
            />
          </View>

          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Заказать квитанцию</Text>
            <Switch
              trackColor={{ false: "#767577", true: "#3A3A3A" }}
              thumbColor={kvit ? "#f4f3f4" : "#f4f3f4"}
              ios_backgroundColor="#3e3e3e"
              onValueChange={setKvit}
              value={kvit}
            />
          </View>
          <Text style={styles.switchHint}>
            Если включено, вам будет предложено ввести e-mail или телефон на странице оплаты.
          </Text>
        </View>

        <View style={styles.warningCard}>
          <Text style={styles.warningText}>
            ⚠️ После нажатия кнопки «Оплатить» вы будете перенаправлены на защищённую страницу платёжного сервиса
          </Text>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableHighlight
            style={[styles.payButton, (loading || calculating) && styles.payButtonDisabled]}
            activeOpacity={0.8}
            underlayColor='#2E2E2E'
            onPress={handlePayment}
            disabled={loading || calculating}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.payButtonText}>
                Оплатить {commissionData ? commissionData.total_amount.toFixed(2) : totalAmount.toFixed(2)} ₽
              </Text>
            )}
          </TouchableHighlight>

          <TouchableHighlight
            style={styles.cancelButton}
            activeOpacity={0.8}
            underlayColor='#F0F0F0'
            onPress={() => router.back()}
          >
            <Text style={styles.cancelButtonText}>Отменить</Text>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  card: {
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#313131',
    marginBottom: 15,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  infoLabel: {
    fontSize: 14,
    color: '#656565',
    flex: 1,
  },
  infoValue: {
    fontSize: 14,
    color: '#313131',
    flex: 2,
    textAlign: 'right',
  },
  inputContainer: {
    marginBottom: 15,
  },
  inputLabel: {
    fontSize: 14,
    color: '#656565',
    marginBottom: 5,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#B8B8B8',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#313131',
  },
  inputHint: {
    fontSize: 12,
    color: '#888888',
    marginTop: 5,
    fontStyle: 'italic',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  switchLabel: {
    fontSize: 16,
    color: '#313131',
    flex: 1,
  },
  switchHint: {
    fontSize: 12,
    color: '#888888',
    fontStyle: 'italic',
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  amountLabel: {
    fontSize: 16,
    color: '#313131',
  },
  amountValue: {
    fontSize: 16,
    color: '#313131',
    fontWeight: '500',
  },
  discountLabel: {
    fontSize: 16,
    color: '#4CAF50',
  },
  discountValue: {
    fontSize: 16,
    color: '#4CAF50',
    fontWeight: '500',
  },
  discountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
    marginBottom: 15,
  },
  discountIcon: {
    width: 24,
    height: 24,
    marginRight: 10,
  },
  discountText: {
    fontSize: 14,
    color: '#2E7D32',
    flex: 1,
  },
  infoIcon: {
    fontSize: 18,
    color: '#2E7D32',
    marginLeft: 10,
    fontWeight: 'bold',
  },
  commissionDetails: {
    marginTop: -5,
    marginBottom: 10,
  },
  commissionText: {
    fontSize: 12,
    color: '#888888',
    fontStyle: 'italic',
  },
  divider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginVertical: 15,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  totalLabel: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#313131',
  },
  totalValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#3A3A3A',
  },
  warningCard: {
    backgroundColor: '#FFF3CD',
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#FFE082',
  },
  warningText: {
    fontSize: 14,
    color: '#856404',
    lineHeight: 20,
  },
  buttonContainer: {
    marginBottom: 40,
  },
  payButton: {
    backgroundColor: '#3A3A3A',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
  },
  payButtonDisabled: {
    opacity: 0.6,
  },
  payButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  cancelButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#B8B8B8',
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#313131',
  },
  detailsContainer: {
    marginBottom: 10,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    alignItems: 'flex-start',
  },
  detailLeft: {
    flex: 1,
    marginRight: 10,
  },
  detailRight: {
    alignItems: 'flex-end',
  },
  detailLabel: {
    fontSize: 14,
    color: '#313131',
    fontWeight: '500',
  },
  detailSubLabel: {
    fontSize: 11,
    color: '#888888',
    fontStyle: 'italic',
    marginTop: 2,
  },
  detailValue: {
    fontSize: 14,
    color: '#313131',
    fontWeight: '500',
  },
  detailCommission: {
    fontSize: 12,
    color: '#656565',
  },
  chargeItem: {
    marginBottom: 10,
  },
  chargeContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  chargeLeft: {
    flex: 1,
    marginRight: 10,
  },
  chargeRight: {
    alignItems: 'flex-end',
  },
  chargeMeta: {
    fontSize: 12,
    color: '#656565',
    marginBottom: 2,
  },
  chargeDescription: {
    fontSize: 14,
    color: '#313131',
    fontWeight: '500',
  },
  chargeSum: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#313131',
  },
  chargeDivider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginTop: 10,
    marginBottom: 10,
  },
  showMoreButton: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  showMoreText: {
    color: '#3A3A3A',
    fontWeight: 'bold',
  },
});
