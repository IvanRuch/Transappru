import React, { useState } from 'react';
import { View, Text, TouchableHighlight, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScreenHeader } from '../../components/common';

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

export default function FinePaymentMultiConfirmScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [loading, setLoading] = useState(false);
  
  // Парсим список штрафов
  const fines: FineData[] = params.fines 
    ? JSON.parse(params.fines as string) 
    : [];

  const autoData = params.auto_data 
    ? JSON.parse(params.auto_data as string) 
    : null;

  if (fines.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <ScreenHeader 
          title="Оплата штрафов"
          onBack={() => router.back()}
        />
        <View style={styles.content}>
          <Text>Штрафы не найдены</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Расчёт общей суммы
  const totalAmount = fines.reduce((sum, fine) => {
    return sum + parseFloat(fine.sum);
  }, 0);

  const totalFullAmount = fines.reduce((sum, fine) => {
    return sum + parseFloat(fine.full_sum);
  }, 0);

  const totalDiscount = totalFullAmount - totalAmount;
  const hasDiscount = totalDiscount > 0;

  const handlePayment = async () => {
    setLoading(true);
    
    try {
      // TODO: Здесь будет запрос к API для получения ссылки на оплату нескольких штрафов
      // const response = await Api.post('/get-multi-payment-url', {
      //   uins: fines.map(f => f.uin),
      //   amount: totalAmount
      // });
      
      // Временно используем тестовую ссылку
      const paymentUrl = 'https://example.com/payment';
      
      // Переходим на экран с WebView
      router.push({
        pathname: '/(authenticated)/fine-payment-webview' as any,
        params: { 
          payment_url: paymentUrl,
          fine_data: JSON.stringify(fines[0]), // Для обратной совместимости
          fines: JSON.stringify(fines)
        }
      });
    } catch (error) {
      console.error('Error getting payment URL:', error);
      alert('Ошибка при получении ссылки на оплату');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader 
        title="Подтверждение оплаты"
        onBack={() => router.back()}
      />

      <ScrollView style={styles.content}>
        {/* Информация об автомобиле */}
        {autoData && (
          <View style={styles.autoCard}>
            <Text style={styles.autoTitle}>
              {autoData.mark} {autoData.model}
            </Text>
            <Text style={styles.autoNumber}>{autoData.number}</Text>
          </View>
        )}

        {/* Список штрафов */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Штрафы к оплате ({fines.length})</Text>
          
          {fines.map((fine, index) => (
            <View key={fine.uin} style={styles.fineItem}>
              <View style={styles.fineItemContent}>
                <View style={styles.fineItemInfo}>
                  <Text style={styles.fineItemDate}>{fine.dat}</Text>
                  <Text style={styles.fineItemCode}>Статья {fine.code}</Text>
                  <Text style={styles.fineItemUin} numberOfLines={1}>
                    УИН: {fine.uin}
                  </Text>
                </View>
                <Text style={styles.fineItemAmount}>{fine.sum} ₽</Text>
              </View>
              {index < fines.length - 1 && <View style={styles.divider} />}
            </View>
          ))}
        </View>

        {/* Сумма к оплате */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Сумма к оплате</Text>
          
          {hasDiscount && (
            <>
              <View style={styles.amountRow}>
                <Text style={styles.amountLabel}>Полная сумма:</Text>
                <Text style={styles.amountValue}>{totalFullAmount.toFixed(2)} ₽</Text>
              </View>

              <View style={styles.amountRow}>
                <Text style={styles.discountLabel}>Скидка:</Text>
                <Text style={styles.discountValue}>-{totalDiscount.toFixed(2)} ₽</Text>
              </View>

              <View style={styles.discountInfo}>
                <Text style={styles.discountInfoText}>
                  💰 Вы экономите {totalDiscount.toFixed(2)} ₽ благодаря скидкам
                </Text>
              </View>

              <View style={styles.divider} />
            </>
          )}

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Итого к оплате:</Text>
            <Text style={styles.totalValue}>{totalAmount.toFixed(2)} ₽</Text>
          </View>
        </View>

        {/* Предупреждение */}
        <View style={styles.warningCard}>
          <Text style={styles.warningText}>
            ⚠️ После нажатия кнопки "Оплатить" вы будете перенаправлены на защищённую страницу платёжного сервиса
          </Text>
        </View>

        {/* Кнопки */}
        <View style={styles.buttonContainer}>
          <TouchableHighlight
            style={[styles.payButton, loading && styles.payButtonDisabled]}
            activeOpacity={0.8}
            underlayColor='#2E2E2E'
            onPress={handlePayment}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.payButtonText}>
                Оплатить {totalAmount.toFixed(2)} ₽
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
  autoCard: {
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  autoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#313131',
    marginBottom: 5,
  },
  autoNumber: {
    fontSize: 16,
    color: '#656565',
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
  fineItem: {
    marginBottom: 10,
  },
  fineItemContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  fineItemInfo: {
    flex: 1,
    marginRight: 10,
  },
  fineItemDate: {
    fontSize: 14,
    fontWeight: '500',
    color: '#313131',
    marginBottom: 2,
  },
  fineItemCode: {
    fontSize: 13,
    color: '#656565',
    marginBottom: 2,
  },
  fineItemUin: {
    fontSize: 12,
    color: '#656565',
  },
  fineItemAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#313131',
  },
  divider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginVertical: 10,
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
  discountInfo: {
    backgroundColor: '#E8F5E9',
    padding: 10,
    borderRadius: 8,
    marginTop: 5,
    marginBottom: 15,
  },
  discountInfoText: {
    fontSize: 14,
    color: '#2E7D32',
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
});
