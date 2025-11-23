import React from 'react';
import { View, Text, Image, TouchableHighlight, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';

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

export default function FinePaymentSuccessScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  
  const fineData: FineData = params.fine_data 
    ? JSON.parse(params.fine_data as string) 
    : null;

  const handleGoToList = () => {
    // Возвращаемся к списку автомобилей
    router.replace('/(authenticated)/auto-list' as any);
  };

  const handleGoToFineDetails = () => {
    // Возвращаемся к деталям штрафа
    if (fineData) {
      router.replace({
        pathname: '/(authenticated)/auto-fine' as any,
        params: { fine_data: JSON.stringify(fineData) }
      });
    } else {
      handleGoToList();
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.content}>
        {/* Иконка успеха */}
        <View style={styles.iconContainer}>
          <View style={styles.successCircle}>
            <Text style={styles.checkmark}>✓</Text>
          </View>
        </View>

        {/* Заголовок */}
        <Text style={styles.title}>Оплата прошла успешно!</Text>

        {/* Описание */}
        <Text style={styles.description}>
          Платёж обрабатывается. Информация о штрафе обновится в течение нескольких минут.
        </Text>

        {/* Информация о штрафе */}
        {fineData && (
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Постановление:</Text>
              <Text style={styles.infoValue}>{fineData.uin}</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Дата нарушения:</Text>
              <Text style={styles.infoValue}>{fineData.dat}</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Сумма:</Text>
              <Text style={styles.infoValue}>{fineData.sum} ₽</Text>
            </View>
          </View>
        )}

        {/* Дополнительная информация */}
        <View style={styles.noteCard}>
          <Text style={styles.noteText}>
            💡 Статус оплаты можно проверить в разделе "Штрафы" через несколько минут
          </Text>
        </View>

        {/* Кнопки */}
        <View style={styles.buttonContainer}>
          <TouchableHighlight
            style={styles.primaryButton}
            activeOpacity={0.8}
            underlayColor='#2E2E2E'
            onPress={handleGoToList}
          >
            <Text style={styles.primaryButtonText}>Вернуться к списку</Text>
          </TouchableHighlight>

          {fineData && (
            <TouchableHighlight
              style={styles.secondaryButton}
              activeOpacity={0.8}
              underlayColor='#F0F0F0'
              onPress={handleGoToFineDetails}
            >
              <Text style={styles.secondaryButtonText}>К деталям штрафа</Text>
            </TouchableHighlight>
          )}
        </View>
      </View>
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 30,
  },
  successCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  checkmark: {
    fontSize: 60,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#313131',
    textAlign: 'center',
    marginBottom: 15,
  },
  description: {
    fontSize: 16,
    color: '#656565',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 30,
    paddingHorizontal: 20,
  },
  infoCard: {
    width: '100%',
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  infoLabel: {
    fontSize: 14,
    color: '#656565',
  },
  infoValue: {
    fontSize: 14,
    color: '#313131',
    fontWeight: '500',
  },
  noteCard: {
    width: '100%',
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    padding: 15,
    marginBottom: 30,
    borderWidth: 1,
    borderColor: '#90CAF9',
  },
  noteText: {
    fontSize: 14,
    color: '#1565C0',
    lineHeight: 20,
  },
  buttonContainer: {
    width: '100%',
  },
  primaryButton: {
    backgroundColor: '#3A3A3A',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
  },
  primaryButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  secondaryButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#B8B8B8',
  },
  secondaryButtonText: {
    fontSize: 16,
    color: '#313131',
  },
});
