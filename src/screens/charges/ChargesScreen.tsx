import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, StyleSheet, RefreshControl } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ScreenHeader } from '../../components/common';
import { ChargeCard } from '../../components/charges';
import { useCharges } from '../../hooks/useCharges';
import { ChargeItem } from '../../types/charges';

const COLLAPSED_LIMIT = 5;

export default function ChargesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    loading,
    refreshing,
    autoCharges,
    otherCharges,
    autoList,
    refresh,
    getTotalAmount,
    getTotalCount,
    getAutosWithFines,
    loadAutoFines,
    loadingAutoFines,
    backgroundLoading,
    lastUpdateTime
  } = useCharges();

  // Состояние для отслеживания свернутых/развернутых групп
  // Ключ - это autoId для авто или 'other' для otherCharges
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [refreshBlockedMessage, setRefreshBlockedMessage] = useState<string | null>(null);
  
  // Получаем авто с неоплаченными штрафами
  const autosWithFines = getAutosWithFines();

  const handleChargePress = (charge: ChargeItem) => {
    console.log('-> move to AutoFine', charge);
    router.push({
      pathname: '/(authenticated)/auto-fine' as any,
      params: { fine_data: JSON.stringify(charge) }
    });
  };

  const handlePaySelected = () => {
    // TODO: Реализовать множественную оплату выбранных начислений
    console.log('Pay selected charges');
  };

  const handleRefresh = async () => {
    const result = await refresh();
    if (result?.blocked) {
      setRefreshBlockedMessage(`Подождите ${result.remainingSeconds} сек.`);
      setTimeout(() => setRefreshBlockedMessage(null), 3000);
    }
  };

  const toggleGroup = async (autoId: string) => {
    const isExpanding = !expandedGroups[autoId];
    
    setExpandedGroups(prev => ({
      ...prev,
      [autoId]: isExpanding
    }));
    
    // Если раскрываем и детали еще не загружены - загружаем
    if (isExpanding && !autoCharges[autoId]) {
      await loadAutoFines(autoId);
    }
  };

  const totalAmount = getTotalAmount();
  const totalCount = getTotalCount();
  // Не показываем пустое состояние если идет фоновая загрузка или есть хотя бы одно начисление
  const hasCharges = totalCount > 0 || backgroundLoading;

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <ScreenHeader title="Начисления" onBack={() => router.back()} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#C9A86B" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader 
        title="Начисления" 
        onBack={() => router.back()}
        rightButton={
          <TouchableOpacity 
            onPress={handleRefresh} 
            style={styles.refreshButton}
            disabled={refreshing}
          >
            <Text style={[styles.refreshButtonText, refreshing && styles.refreshButtonTextDisabled]}>
              {refreshing ? '⏳' : '🔄'}
            </Text>
          </TouchableOpacity>
        }
      />
      
      {/* Время последней актуализации */}
      {lastUpdateTime > 0 && (
        <View style={styles.updateTimeContainer}>
          <Text style={styles.updateTimeText}>
            {refreshBlockedMessage || `Обновлено: ${new Date(lastUpdateTime).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })} • Потяните вниз для обновления`}
          </Text>
        </View>
      )}
      
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 100 }
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#C9A86B"
            colors={['#C9A86B']}
          />
        }
      >
        {!hasCharges ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>Нет неоплаченных начислений</Text>
            <Text style={styles.emptySubtitle}>
              Все ваши штрафы и начисления оплачены
            </Text>
          </View>
        ) : (
          <>
            {/* Индикатор фоновой загрузки */}
            {backgroundLoading && (
              <View style={styles.backgroundLoadingIndicator}>
                <ActivityIndicator size="small" color="#C9A86B" />
                <Text style={styles.backgroundLoadingText}>Загрузка штрафов...</Text>
              </View>
            )}

            {/* Секция: Начисления по авто */}
            {autosWithFines.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>По автомобилям</Text>
                  <Text style={styles.sectionCount}>
                    {autosWithFines.length} авто • {Object.values(autoCharges).reduce((sum, group) => sum + group.charges.length, 0)} шт.
                  </Text>
                </View>

                {autosWithFines.map((auto) => {
                  const isExpanded = expandedGroups[auto.id];
                  const isLoading = loadingAutoFines[auto.id];
                  const loadedCharges = autoCharges[auto.auto_number]?.charges || [];
                  
                  const finesCount = loadedCharges.length;
                  const finesSum = loadedCharges.reduce((sum, charge) => sum + parseFloat(charge.sum || '0'), 0);
                  
                  return (
                    <View key={auto.id} style={styles.autoGroup}>
                      <TouchableOpacity
                        style={styles.autoHeader}
                        onPress={() => toggleGroup(auto.id)}
                        activeOpacity={0.7}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={styles.autoGrz}>ГРЗ: {auto.auto_number}</Text>
                          <Text style={styles.autoSummary}>
                            {finesCount} шт. • {finesSum.toFixed(2)} ₽
                          </Text>
                        </View>
                        <Text style={styles.expandIcon}>{isExpanded ? '▼' : '▶'}</Text>
                      </TouchableOpacity>
                      
                      {isExpanded && (
                        <>
                          {isLoading ? (
                            <View style={styles.loadingGroup}>
                              <ActivityIndicator size="small" color="#C9A86B" />
                              <Text style={styles.loadingText}>Загрузка...</Text>
                            </View>
                          ) : loadedCharges.length > 0 ? (
                            <>
                              {loadedCharges.map((charge) => (
                                <ChargeCard
                                  key={charge.id}
                                  item={charge}
                                  showAutoInfo={false}
                                  onPress={handleChargePress}
                                />
                              ))}
                            </>
                          ) : (
                            <View style={styles.emptyGroup}>
                              <Text style={styles.emptyGroupText}>Нет данных</Text>
                            </View>
                          )}
                        </>
                      )}
                    </View>
                  );
                })}
              </View>
            )}

            {/* Секция: Другие начисления */}
            {otherCharges.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Другие начисления</Text>
                  <Text style={styles.sectionCount}>{otherCharges.length} шт.</Text>
                </View>

                <Text style={styles.sectionDescription}>
                  Начисления, не привязанные к конкретному автомобилю
                </Text>

                {(() => {
                  const isExpanded = expandedGroups['other'];
                  const hasMore = otherCharges.length > COLLAPSED_LIMIT;
                  const displayedCharges = isExpanded || !hasMore 
                    ? otherCharges 
                    : otherCharges.slice(0, COLLAPSED_LIMIT);
                  
                  return (
                    <>
                      {displayedCharges.map((charge) => (
                        <ChargeCard
                          key={charge.id}
                          item={charge}
                          showAutoInfo={true}
                          onPress={handleChargePress}
                        />
                      ))}

                      {hasMore && (
                        <TouchableOpacity
                          style={styles.toggleButton}
                          onPress={() => toggleGroup('other')}
                        >
                          <Text style={styles.toggleButtonText}>
                            {isExpanded 
                              ? 'Скрыть' 
                              : `Показать еще ${otherCharges.length - COLLAPSED_LIMIT}`
                            }
                          </Text>
                        </TouchableOpacity>
                      )}
                    </>
                  );
                })()}
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* Нижняя панель с итоговой суммой */}
      {hasCharges && (
        <View style={[styles.bottomPanel, { paddingBottom: insets.bottom + 10 }]}>
          <View style={styles.totalContainer}>
            <Text style={styles.totalLabel}>Итого к оплате:</Text>
            <Text style={styles.totalAmount}>{totalAmount.toFixed(2)} ₽</Text>
          </View>
          <Text style={styles.totalCount}>Всего начислений: {totalCount}</Text>
          
          {/* TODO: Добавить функционал множественной оплаты */}
          {/* 
          <TouchableOpacity
            style={styles.payButton}
            onPress={handlePaySelected}
          >
            <Text style={styles.payButtonText}>Оплатить выбранные</Text>
          </TouchableOpacity>
          */}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#2c2c2c',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 10,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingTop: 100,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#E8E8E8',
    textAlign: 'center',
    marginBottom: 10,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#909090',
    textAlign: 'center',
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#3A3A3A',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#E8E8E8',
  },
  sectionCount: {
    fontSize: 14,
    color: '#C9A86B',
    fontWeight: '600',
  },
  sectionDescription: {
    fontSize: 13,
    color: '#909090',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 5,
    fontStyle: 'italic',
  },
  autoGroup: {
    marginBottom: 10,
  },
  autoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: '#454545',
  },
  autoGrz: {
    fontSize: 16,
    fontWeight: '600',
    color: '#E8E8E8',
  },
  autoCount: {
    fontSize: 14,
    color: '#C9A86B',
  },
  autoSummary: {
    fontSize: 13,
    color: '#909090',
    marginTop: 4,
  },
  expandIcon: {
    fontSize: 16,
    color: '#C9A86B',
    marginLeft: 10,
  },
  loadingGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    gap: 10,
  },
  loadingText: {
    fontSize: 14,
    color: '#909090',
  },
  emptyGroup: {
    padding: 20,
    alignItems: 'center',
  },
  emptyGroupText: {
    fontSize: 14,
    color: '#909090',
    fontStyle: 'italic',
  },
  backgroundLoadingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    backgroundColor: 'rgba(201, 168, 107, 0.1)',
    borderRadius: 8,
    marginHorizontal: 20,
    marginBottom: 16,
    gap: 10,
  },
  backgroundLoadingText: {
    fontSize: 14,
    color: '#C9A86B',
  },
  refreshButton: {
    padding: 8,
  },
  refreshButtonText: {
    fontSize: 20,
  },
  refreshButtonTextDisabled: {
    opacity: 0.5,
  },
  updateTimeContainer: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: '#2A2A2A',
    borderBottomWidth: 1,
    borderBottomColor: '#3A3A3A',
  },
  updateTimeText: {
    fontSize: 12,
    color: '#909090',
    textAlign: 'center',
  },
  bottomPanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#3A3A3A',
    borderTopWidth: 1,
    borderTopColor: '#C9A86B',
    paddingHorizontal: 20,
    paddingTop: 15,
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#E8E8E8',
  },
  totalAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#C9A86B',
  },
  totalCount: {
    fontSize: 13,
    color: '#909090',
    textAlign: 'center',
  },
  payButton: {
    backgroundColor: '#C9A86B',
    borderRadius: 8,
    paddingVertical: 12,
    marginTop: 10,
    alignItems: 'center',
  },
  payButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c2c2c',
  },
  toggleButton: {
    backgroundColor: '#454545',
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginHorizontal: 20,
    marginTop: 10,
    marginBottom: 5,
    borderRadius: 8,
    alignItems: 'center',
  },
  toggleButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#C9A86B',
  },
});
