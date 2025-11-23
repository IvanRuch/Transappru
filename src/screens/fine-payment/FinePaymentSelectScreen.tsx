import React, { useState, useMemo } from 'react';
import { View, Text, TouchableHighlight, ScrollView, StyleSheet, Image } from 'react-native';
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

export default function FinePaymentSelectScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  
  // Парсим список штрафов
  const fines: FineData[] = params.fines 
    ? JSON.parse(params.fines as string) 
    : [];

  const autoData = params.auto_data 
    ? JSON.parse(params.auto_data as string) 
    : null;

  // Состояние выбранных штрафов (по умолчанию все выбраны)
  const [selectedFines, setSelectedFines] = useState<Set<string>>(
    new Set(fines.map(fine => fine.uin))
  );

  // Переключение выбора штрафа
  const toggleFineSelection = (uin: string) => {
    setSelectedFines(prev => {
      const newSet = new Set(prev);
      if (newSet.has(uin)) {
        newSet.delete(uin);
      } else {
        newSet.add(uin);
      }
      return newSet;
    });
  };

  // Выбрать все / Снять все
  const toggleSelectAll = () => {
    if (selectedFines.size === fines.length) {
      setSelectedFines(new Set());
    } else {
      setSelectedFines(new Set(fines.map(fine => fine.uin)));
    }
  };

  // Расчёт общей суммы выбранных штрафов
  const totalAmount = useMemo(() => {
    return fines
      .filter(fine => selectedFines.has(fine.uin))
      .reduce((sum, fine) => {
        const amount = parseFloat(fine.sum) || 0;
        return sum + amount;
      }, 0);
  }, [fines, selectedFines]);

  // Количество выбранных штрафов
  const selectedCount = selectedFines.size;

  // Переход к оплате
  const handlePayment = () => {
    if (selectedCount === 0) {
      alert('Выберите хотя бы один штраф для оплаты');
      return;
    }

    const selectedFinesList = fines.filter(fine => selectedFines.has(fine.uin));

    // Если выбран только один штраф - переходим на обычный экран подтверждения
    if (selectedCount === 1) {
      router.push({
        pathname: '/(authenticated)/fine-payment-confirm' as any,
        params: { fine_data: JSON.stringify(selectedFinesList[0]) }
      });
    } else {
      // Для множественной оплаты переходим на специальный экран
      router.push({
        pathname: '/(authenticated)/fine-payment-multi-confirm' as any,
        params: { 
          fines: JSON.stringify(selectedFinesList),
          auto_data: JSON.stringify(autoData)
        }
      });
    }
  };

  if (fines.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <ScreenHeader 
          title="Выбор штрафов"
          onBack={() => router.back()}
        />
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Штрафы не найдены</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader 
        title="Выбор штрафов"
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

        {/* Кнопка выбрать все */}
        <View style={styles.selectAllContainer}>
          <TouchableHighlight
            style={styles.selectAllButton}
            activeOpacity={0.8}
            underlayColor='#F0F0F0'
            onPress={toggleSelectAll}
          >
            <View style={styles.selectAllContent}>
              <View style={[
                styles.checkbox,
                selectedFines.size === fines.length && styles.checkboxChecked
              ]}>
                {selectedFines.size === fines.length && (
                  <Text style={styles.checkmark}>✓</Text>
                )}
              </View>
              <Text style={styles.selectAllText}>
                {selectedFines.size === fines.length ? 'Снять выбор со всех' : 'Выбрать все'}
              </Text>
            </View>
          </TouchableHighlight>
        </View>

        {/* Список штрафов */}
        <View style={styles.finesList}>
          {fines.map((fine, index) => {
            const isSelected = selectedFines.has(fine.uin);
            const hasDiscount = fine.discount_time_left && fine.discount_time_left !== '';

            return (
              <TouchableHighlight
                key={fine.uin}
                style={[
                  styles.fineCard,
                  isSelected && styles.fineCardSelected
                ]}
                activeOpacity={0.8}
                underlayColor='#F0F0F0'
                onPress={() => toggleFineSelection(fine.uin)}
              >
                <View style={styles.fineCardContent}>
                  {/* Чекбокс */}
                  <View style={[
                    styles.checkbox,
                    isSelected && styles.checkboxChecked
                  ]}>
                    {isSelected && (
                      <Text style={styles.checkmark}>✓</Text>
                    )}
                  </View>

                  {/* Информация о штрафе */}
                  <View style={styles.fineInfo}>
                    <Text style={styles.fineDate}>Нарушение {fine.dat}</Text>
                    <Text style={styles.fineCode}>Статья КОАП {fine.code}</Text>
                    <Text style={styles.fineDescription} numberOfLines={2}>
                      {fine.description}
                    </Text>
                    <Text style={styles.fineUin}>УИН: {fine.uin}</Text>

                    {hasDiscount && (
                      <View style={styles.discountBadge}>
                        <Image 
                          source={require('../../../assets/images/whh_sale_2.png')} 
                          style={styles.discountIcon}
                        />
                        <Text style={styles.discountText}>
                          Скидка {fine.discount_percent}% еще {fine.discount_time_left}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Сумма */}
                  <View style={styles.amountContainer}>
                    {hasDiscount && (
                      <Text style={styles.fullAmount}>{fine.full_sum} ₽</Text>
                    )}
                    <Text style={styles.amount}>{fine.sum} ₽</Text>
                  </View>
                </View>
              </TouchableHighlight>
            );
          })}
        </View>
      </ScrollView>

      {/* Нижняя панель с итогом и кнопкой оплаты */}
      <View style={styles.bottomPanel}>
        <View style={styles.totalContainer}>
          <View>
            <Text style={styles.totalLabel}>Выбрано штрафов: {selectedCount}</Text>
            <Text style={styles.totalAmount}>{totalAmount.toFixed(2)} ₽</Text>
          </View>

          <TouchableHighlight
            style={[
              styles.payButton,
              selectedCount === 0 && styles.payButtonDisabled
            ]}
            activeOpacity={0.8}
            underlayColor='#2E2E2E'
            onPress={handlePayment}
            disabled={selectedCount === 0}
          >
            <Text style={styles.payButtonText}>
              Оплатить
            </Text>
          </TouchableHighlight>
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
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#656565',
  },
  autoCard: {
    margin: 20,
    marginBottom: 10,
    padding: 15,
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
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
  selectAllContainer: {
    marginHorizontal: 20,
    marginBottom: 10,
  },
  selectAllButton: {
    padding: 15,
    backgroundColor: '#F8F8F8',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  selectAllContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectAllText: {
    fontSize: 16,
    color: '#313131',
    fontWeight: '500',
  },
  finesList: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  fineCard: {
    marginBottom: 15,
    padding: 15,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E0E0E0',
  },
  fineCardSelected: {
    borderColor: '#3A3A3A',
    backgroundColor: '#F8F8F8',
  },
  fineCardContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#B8B8B8',
    marginRight: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#3A3A3A',
    borderColor: '#3A3A3A',
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  fineInfo: {
    flex: 1,
    marginRight: 10,
  },
  fineDate: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#313131',
    marginBottom: 4,
  },
  fineCode: {
    fontSize: 14,
    color: '#656565',
    marginBottom: 4,
  },
  fineDescription: {
    fontSize: 14,
    color: '#313131',
    marginBottom: 4,
  },
  fineUin: {
    fontSize: 12,
    color: '#656565',
    marginBottom: 8,
  },
  discountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    padding: 6,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  discountIcon: {
    width: 16,
    height: 16,
    marginRight: 6,
  },
  discountText: {
    fontSize: 12,
    color: '#2E7D32',
    fontWeight: '500',
  },
  amountContainer: {
    alignItems: 'flex-end',
  },
  fullAmount: {
    fontSize: 14,
    color: '#656565',
    textDecorationLine: 'line-through',
    marginBottom: 2,
  },
  amount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#313131',
  },
  bottomPanel: {
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    backgroundColor: '#FFFFFF',
    paddingBottom: 20,
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
  },
  totalLabel: {
    fontSize: 14,
    color: '#656565',
    marginBottom: 4,
  },
  totalAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#313131',
  },
  payButton: {
    backgroundColor: '#3A3A3A',
    borderRadius: 12,
    paddingVertical: 15,
    paddingHorizontal: 30,
  },
  payButtonDisabled: {
    opacity: 0.4,
  },
  payButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
});
