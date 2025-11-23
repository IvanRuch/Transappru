import React, { useState } from 'react';
import { View, Text, Image, TouchableHighlight, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
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

export default function FinePaymentConfirmScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [loading, setLoading] = useState(false);
  
  // Парсим fine_data из параметров
  const fineData: FineData = params.fine_data 
    ? JSON.parse(params.fine_data as string) 
    : null;

  if (!fineData) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <ScreenHeader 
          title="Оплата штрафа"
          onBack={() => router.back()}
        />
        <View style={styles.content}>
          <Text>Данные о штрафе не найдены</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Вычисляем сумму к оплате (с учётом скидки если есть)
  const hasDiscount = fineData.discount_time_left && fineData.discount_time_left !== '';
  const discountPercent = hasDiscount ? parseInt(fineData.discount_percent || '0') : 0;
  const fullAmount = parseFloat(fineData.full_sum);
  const discountAmount = hasDiscount ? fullAmount * (discountPercent / 100) : 0;
  const paymentAmount = fullAmount - discountAmount;

  const handlePayment = async () => {
    setLoading(true);
    
    try {
      // TODO: Здесь будет запрос к API для получения ссылки на оплату
      // const response = await Api.post('/get-payment-url', {
      //   uin: fineData.uin,
      //   amount: paymentAmount
      // });
      
      // Временно используем тестовую ссылку
      const paymentUrl = 'https://example.com/payment';
      
      // Переходим на экран с WebView
      router.push({
        pathname: '/(authenticated)/fine-payment-webview' as any,
        params: { 
          payment_url: paymentUrl,
          fine_data: JSON.stringify(fineData)
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
        {/* Информация о штрафе */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Информация о штрафе</Text>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Нарушение:</Text>
            <Text style={styles.infoValue}>{fineData.dat}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Статья КОАП:</Text>
            <Text style={styles.infoValue}>{fineData.code}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Постановление:</Text>
            <Text style={styles.infoValue}>{fineData.uin}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Орган:</Text>
            <Text style={styles.infoValue}>{fineData.vendor}</Text>
          </View>
        </View>

        {/* Сумма к оплате */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Сумма к оплате</Text>
          
          <View style={styles.amountRow}>
            <Text style={styles.amountLabel}>Полная сумма:</Text>
            <Text style={styles.amountValue}>{fineData.full_sum} ₽</Text>
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
                  Скидка действует еще {fineData.discount_time_left}
                </Text>
              </View>
            </>
          )}

          <View style={styles.divider} />

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Итого к оплате:</Text>
            <Text style={styles.totalValue}>{paymentAmount.toFixed(2)} ₽</Text>
          </View>
        </View>

        {/* Предупреждение */}
        <View style={styles.warningCard}>
          <Text style={styles.warningText}>
            ⚠️ После нажатия кнопки "Оплатить" вы будете перенаправлены на защищённую страницу платёжного сервиса
          </Text>
        </View>

        {/* Кнопка оплаты */}
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
                Оплатить {paymentAmount.toFixed(2)} ₽
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
});
