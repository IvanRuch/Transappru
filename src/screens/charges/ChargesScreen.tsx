import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, Alert, StyleSheet, Image, TouchableHighlight } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ScreenHeader } from '../../components/common';
import { ChargeCard, ChargesFilterPanel, ChargeFilterType } from '../../components/charges';
import { useCharges } from '../../hooks/useCharges';
import { ChargeItem } from '../../types/charges';
import { SHOW_PAYMENT_UI } from '../../config/features';

const COLLAPSED_LIMIT = 5;

export default function ChargesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    loading,
    refreshing,
    autoCharges,
    otherCharges,
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
  
  const [selectedCharges, setSelectedCharges] = useState<Set<string>>(new Set());
  
  // Фильтрация
  const [filterVisible, setFilterVisible] = useState(false);
  const [activeFilter, setActiveFilter] = useState<ChargeFilterType>('all');
  
  const autosWithFines = getAutosWithFines();

  const getChargeType = (charge: ChargeItem): ChargeFilterType => {
    if (charge.is_platon === '1' || charge.is_platon === 1) return 'paidRoads';
    if (charge.is_to_fssp === '1' || charge.is_to_fssp === 1) return 'fssp';
    return 'gibdd';
  };

  const filteredData = useMemo(() => {
    if (activeFilter === 'all') {
      return { autos: autosWithFines, other: otherCharges };
    }

    const filteredAutos = autosWithFines.map(auto => {
      const group = autoCharges[auto.auto_number];
      if (!group) return null;
      
      const filteredCharges = group.charges.filter(c => getChargeType(c) === activeFilter);
      if (filteredCharges.length === 0) return null;
      
      return {
        ...auto,
        filteredCharges
      };
    }).filter(Boolean) as any[];

    const filteredOther = otherCharges.filter(c => getChargeType(c) === activeFilter);

    return { autos: filteredAutos, other: filteredOther };
  }, [autosWithFines, otherCharges, autoCharges, activeFilter]);

  useEffect(() => {
    if (loading || refreshing || backgroundLoading) return;
    if (selectedCharges.size === 0) return;

    const allCurrentIds = new Set<string>();
    
    Object.values(autoCharges).forEach(group => {
      group.charges.forEach(c => allCurrentIds.add(c.id));
    });
    otherCharges.forEach(c => allCurrentIds.add(c.id));

    setSelectedCharges(prev => {
      const newSelected = new Set<string>();
      let changed = false;
      
      prev.forEach(id => {
        if (allCurrentIds.has(id)) {
          newSelected.add(id);
        } else {
            changed = true;
        }
      });
      
      if (!changed) return prev;
      return newSelected;
    });
  }, [autoCharges, otherCharges, loading, refreshing, backgroundLoading]);

  // Вспомогательная функция для добавления номера авто
  const enrichCharge = (charge: ChargeItem, autoNumber?: string) => {
    return {
        ...charge,
        _auto_number: autoNumber // Добавляем поле для отображения
    };
  };

  const handleChargePress = (charge: ChargeItem) => {
    console.log('-> move to AutoFine', charge);
    // Пытаемся найти номер авто
    let autoNumber: string | undefined;
    Object.entries(autoCharges).forEach(([num, group]) => {
        if (group.charges.some(c => c.id === charge.id)) {
            autoNumber = num;
        }
    });

    router.push({
      pathname: '/auto-fine' as any,
      params: { fine_data: JSON.stringify(enrichCharge(charge, autoNumber)) }
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

  const toggleSelection = (charge: ChargeItem) => {
    const newSelected = new Set(selectedCharges);
    if (newSelected.has(charge.id)) {
      newSelected.delete(charge.id);
    } else {
      newSelected.add(charge.id);
    }
    setSelectedCharges(newSelected);
  };

  const toggleGroupSelection = (charges: ChargeItem[]) => {
    const newSelected = new Set(selectedCharges);
    const allSelected = charges.every(c => newSelected.has(c.id));

    if (allSelected) {
      charges.forEach(c => newSelected.delete(c.id));
    } else {
      charges.forEach(c => newSelected.add(c.id));
    }
    setSelectedCharges(newSelected);
  };

  const selectedAmount = useMemo(() => {
    let sum = 0;
    Object.values(autoCharges).forEach(group => {
      group.charges.forEach(charge => {
        if (selectedCharges.has(charge.id)) {
          sum += parseFloat(charge.sum || '0');
        }
      });
    });
    otherCharges.forEach(charge => {
      if (selectedCharges.has(charge.id)) {
        sum += parseFloat(charge.sum || '0');
      }
    });
    return sum;
  }, [selectedCharges, autoCharges, otherCharges]);

  const handlePaySelected = () => {
    if (selectedCharges.size === 0) return;

    const chargesToPay: any[] = [];
    
    Object.entries(autoCharges).forEach(([autoNumber, group]) => {
      group.charges.forEach(c => {
        if (selectedCharges.has(c.id)) {
            chargesToPay.push(enrichCharge(c, autoNumber));
        }
      });
    });
    
    otherCharges.forEach(c => {
      if (selectedCharges.has(c.id)) {
          chargesToPay.push(enrichCharge(c));
      }
    });

    if (chargesToPay.length === 1) {
      router.push({
        pathname: 'fine-payment-confirm' as any,
        params: { fine_data: JSON.stringify(chargesToPay[0]) }
      });
    } else {
      router.push({
        pathname: 'fine-payment-confirm' as any,
        params: { charges: JSON.stringify(chargesToPay) }
      });
    }
  };

  const totalCount = getTotalCount();
  const totalAmount = getTotalAmount();
  const hasCharges = totalCount > 0 || backgroundLoading;

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-light-bg dark:bg-dark-bg" edges={['top']}>
        <ScreenHeader title="Начисления" onBack={() => router.back()} />
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#3A3A3A" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-light-bg dark:bg-dark-bg" edges={['top']}>
      <ScreenHeader 
        title="Начисления" 
        onBack={() => router.back()}
        rightComponent={
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity 
                onPress={handleRefresh} 
                className="p-2 mr-1"
                disabled={refreshing}
            >
                <Text className={`text-xl ${refreshing ? 'opacity-50' : ''}`}>
                {refreshing ? '⏳' : '🔄'}
                </Text>
            </TouchableOpacity>

            <TouchableOpacity 
                onPress={() => setFilterVisible(true)} 
                className="p-2"
            >
                <Image 
                    source={require('../../../assets/images/filter.png')} 
                    style={{ width: 24, height: 24, tintColor: activeFilter !== 'all' ? '#EE505A' : undefined }}
                />
            </TouchableOpacity>
          </View>
        }
      />
      
      {activeFilter !== 'all' && (
        <View style={styles.activeFilterPanel}>
            <Text style={styles.activeFilterText}>
                Фильтр: {
                    activeFilter === 'gibdd' ? 'ГИБДД' :
                    activeFilter === 'paidRoads' ? 'Платные дороги' :
                    activeFilter === 'fssp' ? 'ФССП' :
                    activeFilter === 'fns' ? 'ФНС' : activeFilter
                }
            </Text>
            <TouchableOpacity onPress={() => setActiveFilter('all')}>
                <Text style={styles.resetFilterText}>Сбросить</Text>
            </TouchableOpacity>
        </View>
      )}

      {lastUpdateTime > 0 && (
        <View className="px-5 py-2 bg-light-surface dark:bg-[#2A2A2A] border-b border-border-secondary dark:border-dark-border">
          <Text className="text-xs text-center text-light-textSecondary dark:text-dark-textSecondary">
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
            tintColor="#3A3A3A"
            colors={['#3A3A3A']}
          />
        }
      >
        {!hasCharges ? (
          <View className="flex-1 justify-center items-center px-10 pt-24">
            <Text className="text-xl font-bold text-center mb-2.5 text-light-text dark:text-dark-text">
              Нет неоплаченных начислений
            </Text>
            <Text className="text-sm text-center text-light-textSecondary dark:text-dark-textSecondary">
              Все ваши штрафы и начисления оплачены
            </Text>
          </View>
        ) : (
          <>
            {backgroundLoading && (
              <View className="flex-row items-center justify-center p-3 bg-[#F0F0F0] rounded-lg mx-5 mb-4 gap-2.5 border border-[#B8B8B8]">
                <ActivityIndicator size="small" color="#3A3A3A" />
                <Text className="text-sm text-[#3A3A3A]">Загрузка штрафов...</Text>
              </View>
            )}

            {/* Секция: Начисления по авто */}
            {filteredData.autos.length > 0 && (
              <View className="mb-5">
                <View className="flex-row justify-between items-center px-5 py-2.5 bg-light-surface dark:bg-dark-surface">
                  <Text className="text-lg font-bold text-light-text dark:text-dark-text">По автомобилям</Text>
                  <Text className="text-sm text-[#656565] dark:text-accent-primary font-semibold">
                    {filteredData.autos.length} авто
                  </Text>
                </View>

                {filteredData.autos.map((auto: any) => {
                  const isExpanded = expandedGroups[auto.id];
                  const isLoading = loadingAutoFines[auto.id];
                  
                  const loadedCharges = auto.filteredCharges || autoCharges[auto.auto_number]?.charges || [];
                  
                  const finesCount = loadedCharges.length;
                  const finesSum = loadedCharges.reduce((sum: number, charge: any) => sum + parseFloat(charge.sum || '0'), 0);
                  
                  const isAllSelected = loadedCharges.length > 0 && loadedCharges.every((c: any) => selectedCharges.has(c.id));
                  
                  const selectedInGroupCount = loadedCharges.filter((c: any) => selectedCharges.has(c.id)).length;
                  const selectedInGroupSum = loadedCharges
                    .filter((c: any) => selectedCharges.has(c.id))
                    .reduce((sum: number, c: any) => sum + parseFloat(c.sum || '0'), 0);

                  const fineTypeStats = getFineTypeStats(auto.auto_number);

                  return (
                    <View key={auto.id} className="mb-2.5">
                      <View className="flex-row items-center px-5 py-2 bg-light-elevated dark:bg-dark-elevated">
                        {/* Чекбокс группы (только если включена оплата) */}
                        {SHOW_PAYMENT_UI && (
                            <TouchableOpacity 
                                onPress={() => toggleGroupSelection(loadedCharges)}
                                style={styles.groupCheckboxContainer}
                                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                            >
                                <View style={[styles.checkbox, isAllSelected && styles.checkboxSelected]}>
                                    {isAllSelected && <Text style={styles.checkmark}>✓</Text>}
                                </View>
                            </TouchableOpacity>
                        )}

                        <TouchableOpacity
                            className="flex-1 flex-row justify-between items-center ml-3"
                            onPress={() => toggleGroup(auto.id)}
                        >
                            <View className="flex-1">
                              <Text className="text-base font-semibold text-light-text dark:text-dark-text">
                                ГРЗ: {auto.auto_number}
                              </Text>
                              <Text className="text-[13px] text-[#656565] dark:text-accent-primary mt-0.5">
                                {finesCount} шт. • {finesSum.toFixed(2)} ₽
                                {fineTypeStats && fineTypeStats.gibdd.count > 0 && fineTypeStats.platon.count === 0 && (
                                  <Text className="text-[11px] text-[#B0B0B0]"> (ГИБДД)</Text>
                                )}
                                {fineTypeStats && fineTypeStats.platon.count > 0 && fineTypeStats.gibdd.count === 0 && (
                                  <Text className="text-[11px] text-[#EE505A]"> (ПЛАТОН)</Text>
                                )}
                              </Text>
                              
                              {fineTypeStats && fineTypeStats.gibdd.count > 0 && fineTypeStats.platon.count > 0 && (
                                <View className="mt-1 gap-0.5">
                                  <Text className="text-[11px] text-[#B0B0B0]">
                                    ГИБДД: {fineTypeStats.gibdd.count} шт. • {fineTypeStats.gibdd.sum.toFixed(2)} ₽
                                  </Text>
                                  <Text className="text-[11px] text-[#EE505A]">
                                    ПЛАТОН: {fineTypeStats.platon.count} шт. • {fineTypeStats.platon.sum.toFixed(2)} ₽
                                  </Text>
                                </View>
                              )}

                              {selectedInGroupCount > 0 && !isAllSelected && SHOW_PAYMENT_UI && (
                                <Text className="text-[12px] text-[#EE505A] mt-0.5 font-medium">
                                  Выбрано: {selectedInGroupCount} шт. • {selectedInGroupSum.toFixed(2)} ₽
                                </Text>
                              )}
                            </View>
                            <Text className="text-base text-[#3A3A3A] dark:text-accent-primary ml-2.5">
                              {isExpanded ? '▼' : '▶'}
                            </Text>
                        </TouchableOpacity>
                      </View>
                      
                      {isExpanded && (
                        <>
                          {isLoading ? (
                            <View className="flex-row items-center justify-center p-5 gap-2.5">
                              <ActivityIndicator size="small" color="#3A3A3A" />
                              <Text className="text-sm text-light-textSecondary dark:text-dark-textSecondary">Загрузка...</Text>
                            </View>
                          ) : loadedCharges.length > 0 ? (
                            <>
                              {loadedCharges.map((charge: any) => (
                                <ChargeCard
                                  key={charge.id}
                                  item={charge}
                                  showAutoInfo={false}
                                  onPress={handleChargePress}
                                  selected={selectedCharges.has(charge.id)}
                                  onSelect={SHOW_PAYMENT_UI ? toggleSelection : undefined}
                                />
                              ))}
                            </>
                          ) : (
                            <View className="p-5 items-center">
                              <Text className="text-sm italic text-light-textSecondary dark:text-dark-textSecondary">Нет данных</Text>
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
            {filteredData.other.length > 0 && (
              <View className="mb-5">
                <View className="flex-row justify-between items-center px-5 py-2.5 bg-light-surface dark:bg-dark-surface">
                  <Text className="text-lg font-bold text-light-text dark:text-dark-text">Другие начисления</Text>
                </View>

                {(() => {
                  const isExpanded = expandedGroups['other'];
                  const hasMore = filteredData.other.length > COLLAPSED_LIMIT;
                  const displayedCharges = isExpanded || !hasMore 
                    ? filteredData.other 
                    : filteredData.other.slice(0, COLLAPSED_LIMIT);
                  
                  return (
                    <>
                      {displayedCharges.map((charge: any) => (
                        <ChargeCard
                          key={charge.id}
                          item={charge}
                          showAutoInfo={true}
                          onPress={handleChargePress}
                          selected={selectedCharges.has(charge.id)}
                          onSelect={SHOW_PAYMENT_UI ? toggleSelection : undefined}
                        />
                      ))}

                      {hasMore && (
                        <TouchableOpacity
                          className="py-3 px-5 mx-5 mt-2.5 mb-1.5 rounded-lg items-center bg-light-elevated dark:bg-dark-elevated"
                          onPress={() => toggleGroup('other')}
                        >
                          <Text className="text-sm font-semibold text-[#3A3A3A] dark:text-accent-primary">
                            {isExpanded 
                              ? 'Скрыть' 
                              : `Показать еще ${filteredData.other.length - COLLAPSED_LIMIT}`
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

      {/* Футер с оплатой (только если включена оплата) */}
      {hasCharges && SHOW_PAYMENT_UI && (
        <View 
          className="absolute bottom-0 left-0 right-0 border-t border-[#B8B8B8] px-5 pt-4 bg-light-surface dark:bg-dark-surface"
          style={{ paddingBottom: insets.bottom + 10 }}
        >
          <View className="flex-row justify-between items-center mb-3">
            <View>
              <Text className="text-base font-semibold text-light-text dark:text-dark-text">
                К оплате: {selectedAmount.toFixed(2)} ₽ ({selectedCharges.size} шт.)
              </Text>
              <Text className="text-xs text-[#656565] dark:text-accent-primary">
                Всего: {totalAmount.toFixed(2)} ₽ ({totalCount} шт.)
              </Text>
            </View>
            
            <TouchableOpacity
              className={`py-3 px-6 rounded-lg ${selectedCharges.size > 0 ? 'bg-[#3A3A3A]' : 'bg-[#B8B8B8]'}`}
              onPress={handlePaySelected}
              disabled={selectedCharges.size === 0}
            >
              <Text className="text-white font-bold text-base">
                Оплатить
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <ChargesFilterPanel
        visible={filterVisible}
        activeFilter={activeFilter}
        onSelectFilter={setActiveFilter}
        onClose={() => setFilterVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
    groupCheckboxContainer: {
        padding: 5,
    },
    checkbox: {
        width: 24,
        height: 24,
        borderWidth: 2,
        borderColor: '#3A3A3A',
        borderRadius: 4,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FFFFFF',
    },
    checkboxSelected: {
        backgroundColor: '#3A3A3A',
    },
    checkmark: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: 'bold',
    },
    activeFilterPanel: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#EEEEEE',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#B8B8B8',
    },
    activeFilterText: {
        fontSize: 14,
        color: '#313131',
        fontWeight: '500',
    },
    resetFilterText: {
        fontSize: 14,
        color: '#EE505A',
        fontWeight: 'bold',
    },
});
