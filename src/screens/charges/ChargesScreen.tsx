import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, Image } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ScreenHeader } from '../../components/common';
import { ChargeCard, ChargesFilterPanel, ChargeFilterType, ChargesGroupCard } from '../../components/charges';
import { useCharges } from '../../hooks/useCharges';
import { useChargesSelection } from '../../hooks/useChargesSelection';
import { SHOW_PAYMENT_UI } from '../../config/features';

export default function ChargesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [filterVisible, setFilterVisible] = React.useState(false);

  const chargesData = useCharges();
  const {
    loading, refreshing, autoCharges, getTotalAmount, getTotalCount,
    getFineTypeStats, loadingAutoFines, backgroundLoading, lastUpdateTime,
  } = chargesData;

  const {
    activeFilter, setActiveFilter, filteredData,
    selectedCharges, selectedAmount, toggleSelection, toggleGroupSelection,
    expandedGroups, toggleGroup,
    refreshBlockedMessage, handleRefresh,
    handleChargePress, handlePaySelected, COLLAPSED_LIMIT,
  } = useChargesSelection(chargesData);

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
        <View className="flex-row justify-between items-center px-5 py-2.5 bg-bg-secondary border-b border-border-primary">
            <Text className="text-sm font-medium text-text-primary">
                Фильтр: {
                    activeFilter === 'gibdd' ? 'ГИБДД' :
                    activeFilter === 'paidRoads' ? 'Платные дороги' :
                    activeFilter === 'fssp' ? 'ФССП' :
                    activeFilter === 'fns' ? 'ФНС' : activeFilter
                }
            </Text>
            <TouchableOpacity onPress={() => setActiveFilter('all')}>
                <Text className="text-sm font-bold text-status-error">Сбросить</Text>
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
                  const finesSum = loadedCharges.reduce((sum: number, c: any) => sum + parseFloat(c.sum || '0'), 0);
                  const isAllSelected = loadedCharges.length > 0 && loadedCharges.every((c: any) => selectedCharges.has(c.id));
                  const selectedInGroupCount = loadedCharges.filter((c: any) => selectedCharges.has(c.id)).length;
                  const selectedInGroupSum = loadedCharges
                    .filter((c: any) => selectedCharges.has(c.id))
                    .reduce((sum: number, c: any) => sum + parseFloat(c.sum || '0'), 0);
                  const stats = getFineTypeStats(auto.auto_number);

                  const inlineKindTag =
                    stats && stats.gibdd.count > 0 && stats.platon.count === 0 ? 'gibdd' :
                    stats && stats.platon.count > 0 && stats.gibdd.count === 0 ? 'platon' :
                    null;
                  const detailedStats =
                    stats && stats.gibdd.count > 0 && stats.platon.count > 0 ? stats : null;
                  const selectionHint =
                    selectedInGroupCount > 0 && !isAllSelected && SHOW_PAYMENT_UI
                      ? `Выбрано: ${selectedInGroupCount} шт. • ${selectedInGroupSum.toFixed(2)} ₽`
                      : null;

                  return (
                    <ChargesGroupCard
                      key={auto.id}
                      title={`ГРЗ: ${auto.auto_number}`}
                      subtitle={`${finesCount} шт. • ${finesSum.toFixed(2)} ₽`}
                      inlineKindTag={inlineKindTag}
                      detailedStats={detailedStats}
                      selectionHint={selectionHint}
                      showCheckbox={SHOW_PAYMENT_UI}
                      isAllSelected={isAllSelected}
                      onToggleAllSelection={() => toggleGroupSelection(loadedCharges)}
                      isExpanded={isExpanded}
                      onToggleExpand={() => toggleGroup(auto.id)}
                    >
                      {isLoading ? (
                        <View className="flex-row items-center justify-center p-5 gap-2.5">
                          <ActivityIndicator size="small" color="#3A3A3A" />
                          <Text className="text-sm text-text-secondary">Загрузка...</Text>
                        </View>
                      ) : loadedCharges.length > 0 ? (
                        loadedCharges.map((charge: any) => (
                          <ChargeCard
                            key={charge.id}
                            item={charge}
                            showAutoInfo={false}
                            onPress={handleChargePress}
                            selected={selectedCharges.has(charge.id)}
                            onSelect={SHOW_PAYMENT_UI ? toggleSelection : undefined}
                          />
                        ))
                      ) : (
                        <View className="p-5 items-center">
                          <Text className="text-sm italic text-text-secondary">Нет данных</Text>
                        </View>
                      )}
                    </ChargesGroupCard>
                  );
                })}
              </View>
            )}

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

