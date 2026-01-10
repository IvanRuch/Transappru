import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ScreenHeader } from '../../components/common';
import { ChargeCard } from '../../components/charges';
import { useCharges } from '../../hooks/useCharges';
import { ChargeItem } from '../../types/charges';

const COLLAPSED_LIMIT = 5;

/**
 * ПРИМЕР МИГРАЦИИ ChargesScreen на NativeWind
 * 
 * Этот файл демонстрирует, как мигрировать существующий экран на NativeWind.
 * Сравните с оригинальным ChargesScreen.tsx чтобы увидеть разницу.
 * 
 * ОСНОВНЫЕ ИЗМЕНЕНИЯ:
 * 1. Заменили StyleSheet.create() на className
 * 2. Использовали кастомные цвета из tailwind.config.js
 * 3. Удалили весь блок styles внизу файла (экономия ~230 строк)
 * 4. Улучшили читаемость - стили прямо в JSX
 */
export default function ChargesScreenNativeWind() {
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
    getFineTypeStats,
    loadAutoFines,
    loadingAutoFines,
    backgroundLoading,
    lastUpdateTime
  } = useCharges();

  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [refreshBlockedMessage, setRefreshBlockedMessage] = useState<string | null>(null);
  
  const autosWithFines = getAutosWithFines();

  const handleChargePress = (charge: ChargeItem) => {
    console.log('-> move to AutoFine', charge);
    router.push({
      pathname: '/(authenticated)/auto-fine' as any,
      params: { fine_data: JSON.stringify(charge) }
    });
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
    
    if (isExpanding && !autoCharges[autoId]) {
      await loadAutoFines(autoId);
    }
  };

  const totalAmount = getTotalAmount();
  const totalCount = getTotalCount();
  const hasCharges = totalCount > 0 || backgroundLoading;

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-dark-bg" edges={['top']}>
        <ScreenHeader title="Начисления" onBack={() => router.back()} />
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#C9A86B" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-dark-bg" edges={['top']}>
      <ScreenHeader 
        title="Начисления" 
        onBack={() => router.back()}
        rightComponent={
          <TouchableOpacity 
            onPress={handleRefresh} 
            className="p-2"
            disabled={refreshing}
          >
            <Text className={`text-xl ${refreshing ? 'opacity-50' : ''}`}>
              {refreshing ? '⏳' : '🔄'}
            </Text>
          </TouchableOpacity>
        }
      />
      
      {/* Время последней актуализации */}
      {lastUpdateTime > 0 && (
        <View className="px-5 py-2 bg-[#2A2A2A] border-b border-dark-border">
          <Text className="text-xs text-text-secondary text-center">
            {refreshBlockedMessage || `Обновлено: ${new Date(lastUpdateTime).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })} • Потяните вниз для обновления`}
          </Text>
        </View>
      )}
      
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingTop: 10, paddingBottom: insets.bottom + 100 }}
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
          <View className="flex-1 justify-center items-center px-10 pt-24">
            <Text className="text-xl font-bold text-text-primary text-center mb-2.5">
              Нет неоплаченных начислений
            </Text>
            <Text className="text-sm text-text-secondary text-center">
              Все ваши штрафы и начисления оплачены
            </Text>
          </View>
        ) : (
          <>
            {/* Индикатор фоновой загрузки */}
            {backgroundLoading && (
              <View className="flex-row items-center justify-center p-3 bg-accent-primary/10 rounded-lg mx-5 mb-4 gap-2.5">
                <ActivityIndicator size="small" color="#C9A86B" />
                <Text className="text-sm text-accent-primary">Загрузка штрафов...</Text>
              </View>
            )}

            {/* Секция: Начисления по авто */}
            {autosWithFines.length > 0 && (
              <View className="mb-5">
                <View className="flex-row justify-between items-center px-5 py-2.5 bg-dark-surface">
                  <Text className="text-lg font-bold text-text-primary">По автомобилям</Text>
                  <Text className="text-sm text-accent-primary font-semibold">
                    {autosWithFines.length} авто • {Object.values(autoCharges).reduce((sum, group) => sum + group.charges.length, 0)} шт.
                  </Text>
                </View>

                {autosWithFines.map((auto) => {
                  const isExpanded = expandedGroups[auto.id];
                  const isLoading = loadingAutoFines[auto.id];
                  const loadedCharges = autoCharges[auto.auto_number]?.charges || [];
                  
                  const finesCount = loadedCharges.length;
                  const finesSum = loadedCharges.reduce((sum, charge) => sum + parseFloat(charge.sum || '0'), 0);
                  const fineTypeStats = getFineTypeStats(auto.auto_number);
                  
                  return (
                    <View key={auto.id} className="mb-2.5">
                      <TouchableOpacity
                        className="flex-row justify-between items-center px-5 py-2 bg-dark-elevated active:opacity-70"
                        onPress={() => toggleGroup(auto.id)}
                      >
                        <View className="flex-1">
                          <Text className="text-base font-semibold text-text-primary">
                            ГРЗ: {auto.auto_number}
                          </Text>
                          <Text className="text-[13px] text-accent-primary mt-0.5">
                            {finesCount} шт. • {finesSum.toFixed(2)} ₽
                            {fineTypeStats && fineTypeStats.gibdd.count > 0 && fineTypeStats.platon.count === 0 && (
                              <Text className="text-[11px] text-[#B0B0B0]"> (ГИБДД)</Text>
                            )}
                            {fineTypeStats && fineTypeStats.platon.count > 0 && fineTypeStats.gibdd.count === 0 && (
                              <Text className="text-[11px] text-status-platon"> (ПЛАТОН)</Text>
                            )}
                          </Text>
                          {fineTypeStats && fineTypeStats.gibdd.count > 0 && fineTypeStats.platon.count > 0 && (
                            <View className="mt-1 gap-0.5">
                              <Text className="text-[11px] text-[#B0B0B0]">
                                ГИБДД: {fineTypeStats.gibdd.count} шт. • {fineTypeStats.gibdd.sum.toFixed(2)} ₽
                              </Text>
                              <Text className="text-[11px] text-status-platon">
                                ПЛАТОН: {fineTypeStats.platon.count} шт. • {fineTypeStats.platon.sum.toFixed(2)} ₽
                              </Text>
                            </View>
                          )}
                        </View>
                        <Text className="text-base text-accent-primary ml-2.5">
                          {isExpanded ? '▼' : '▶'}
                        </Text>
                      </TouchableOpacity>
                      
                      {isExpanded && (
                        <>
                          {isLoading ? (
                            <View className="flex-row items-center justify-center p-5 gap-2.5">
                              <ActivityIndicator size="small" color="#C9A86B" />
                              <Text className="text-sm text-text-secondary">Загрузка...</Text>
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
                            <View className="p-5 items-center">
                              <Text className="text-sm text-text-secondary italic">Нет данных</Text>
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
              <View className="mb-5">
                <View className="flex-row justify-between items-center px-5 py-2.5 bg-dark-surface">
                  <Text className="text-lg font-bold text-text-primary">Другие начисления</Text>
                  <Text className="text-sm text-accent-primary font-semibold">
                    {otherCharges.length} шт.
                  </Text>
                </View>

                <Text className="text-[13px] text-text-secondary px-5 pt-2.5 pb-1.5 italic">
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
                          className="bg-dark-elevated py-3 px-5 mx-5 mt-2.5 mb-1.5 rounded-lg items-center"
                          onPress={() => toggleGroup('other')}
                        >
                          <Text className="text-sm font-semibold text-accent-primary">
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
        <View 
          className="absolute bottom-0 left-0 right-0 bg-dark-surface border-t border-accent-primary px-5 pt-4"
          style={{ paddingBottom: insets.bottom + 10 }}
        >
          <View className="flex-row justify-between items-center mb-1.5">
            <Text className="text-base font-semibold text-text-primary">Итого к оплате:</Text>
            <Text className="text-xl font-bold text-accent-primary">{totalAmount.toFixed(2)} ₽</Text>
          </View>
          <Text className="text-[13px] text-text-secondary text-center">
            Всего начислений: {totalCount}
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
}
