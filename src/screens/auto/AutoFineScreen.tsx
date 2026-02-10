import React from 'react';
import { View, Text, Image, TouchableHighlight, ScrollView, StyleSheet } from 'react-native';
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
  
  // Парсим fine_data из параметров
  const fineData: FineData = params.fine_data 
    ? JSON.parse(params.fine_data as string) 
    : null;

  console.log('AutoFineScreen - fineData:', fineData);
  console.log('is_paid:', fineData?.is_paid, 'type:', typeof fineData?.is_paid);
  console.log('discount_time_left:', fineData?.discount_time_left);

  if (!fineData) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <ScreenHeader 
          title="Штраф" 
          onBack={() => router.back()}
        />
        <View style={styles.content}>
          <Text style={styles.errorText}>Данные о штрафе не найдены</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader 
        title="Штраф" 
        onBack={() => router.back()}
      />

      <ScrollView>
        <View style={styles.content}>
          {/* Штраф погашен */}
          {(fineData.is_paid === 1 || fineData.is_paid === '1') && (
            <View style={styles.statusCard}>
              <View style={styles.statusTextContainer}>
                <Text style={styles.statusTitle}>Штраф погашен</Text>
              </View>
              <View style={styles.statusIconContainer}>
                <Image 
                  source={require('../../../assets/images/twemoji_star_2.png')} 
                  style={styles.statusIcon}
                />
              </View>
            </View>
          )}

          {/* Скидка актуальна */}
          {(fineData.is_paid === 0 || fineData.is_paid === '0') && fineData.discount_time_left && fineData.discount_time_left !== '' && (
            <View style={styles.statusCard}>
              <View style={styles.statusTextContainer}>
                <Text style={styles.statusTitle}>
                  Скидка на оплату актуальна еще {fineData.discount_time_left}
                </Text>
              </View>
              <View style={styles.statusIconContainer}>
                <Image 
                  source={require('../../../assets/images/whh_sale_2.png')} 
                  style={styles.statusIcon}
                />
              </View>
            </View>
          )}

          {/* Информация о штрафе */}
          <View style={styles.infoContainer}>
            <Text style={styles.infoTitle}>Нарушение {fineData.dat}</Text>
            <Text style={styles.infoText}>Статья КОАП {fineData.code}</Text>
            <Text style={styles.infoText}>{fineData.description}</Text>
            <Text style={styles.infoText}>Номер постановления: {fineData.uin}</Text>

            <Text style={styles.sumTitle}>
              Полная сумма штрафа без скидки: {fineData.full_sum}
            </Text>
            <Text style={styles.infoText}>{fineData.vendor}</Text>
          </View>

          {/* Кнопка оплаты (только для неоплаченных штрафов и если включена оплата) */}
          {SHOW_PAYMENT_UI && (fineData.is_paid === 0 || fineData.is_paid === '0') && (
            <View style={styles.paymentButtonContainer}>
              <TouchableHighlight
                style={styles.paymentButton}
                activeOpacity={0.8}
                underlayColor='#2E2E2E'
                onPress={() => {
                  console.log('-> move to FinePaymentConfirm');
                  router.push({
                    pathname: '/(authenticated)/fine-payment-confirm' as any,
                    params: { fine_data: JSON.stringify(fineData) }
                  });
                }}
              >
                <View style={styles.paymentButtonContent}>
                  <Text style={styles.paymentButtonText}>Оплатить штраф</Text>
                  {fineData.discount_time_left && fineData.discount_time_left !== '' && (
                    <Text style={styles.paymentButtonSubtext}>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flex: 1,
    paddingTop: 20,
    alignItems: 'stretch',
    justifyContent: 'flex-start',
  },
  errorText: {
    fontSize: 16,
    color: '#313131',
    textAlign: 'center',
    marginTop: 20,
  },
  statusCard: {
    flexDirection: 'row',
    margin: 20,
    padding: 10,
    backgroundColor: '#EEEEEE',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#B8B8B8',
  },
  statusTextContainer: {
    flex: 5,
    flexDirection: 'column',
    paddingTop: 5,
    paddingLeft: 10,
  },
  statusTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#313131',
  },
  statusIconContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusIcon: {
    width: 36,
    height: 36,
  },
  infoContainer: {
    flexDirection: 'column',
    margin: 20,
    padding: 10,
  },
  infoTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#313131',
  },
  infoText: {
    fontSize: 15,
    color: '#313131',
  },
  sumTitle: {
    paddingTop: 20,
    fontSize: 20,
    fontWeight: 'bold',
    color: '#313131',
  },
  paymentButtonContainer: {
    margin: 20,
    marginTop: 30,
  },
  paymentButton: {
    backgroundColor: '#3A3A3A',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paymentButtonContent: {
    alignItems: 'center',
  },
  paymentButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  paymentButtonSubtext: {
    fontSize: 14,
    color: '#FFFFFF',
    marginTop: 5,
    opacity: 0.8,
  },
});
