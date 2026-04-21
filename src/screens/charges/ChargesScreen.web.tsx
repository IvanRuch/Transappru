/**
 * Web version of ChargesScreen.
 *
 * Shares business logic with mobile via useCharges + useChargesSelection,
 * and UI with mobile via ChargeCard + ChargesGroupCard (ADR-003 + ADR-005).
 * Web specifics: filter pill row (mobile uses a modal panel), ScreenHeader
 * + WebScreenContainer layout.
 *
 * Does NOT wrap in WebAppLayout — the authenticated layout
 * (`_layout.web.tsx`) already provides it (see .claude/rules.md).
 */
import React, { useCallback } from 'react';
import { View, Text, Pressable, ActivityIndicator, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenHeader } from '../../components/common';
import WebScreenContainer from '../../components/web/WebScreenContainer';
import { ChargeCard, ChargesGroupCard } from '../../components/charges';
import { useCharges } from '../../hooks/useCharges';
import { useChargesSelection, ChargeFilterType } from '../../hooks/useChargesSelection';
import { SHOW_PAYMENT_UI } from '../../config/features';

const FILTERS: { id: ChargeFilterType; label: string }[] = [
  { id: 'all', label: 'Все' },
  { id: 'gibdd', label: 'ГИБДД' },
  { id: 'paidRoads', label: 'Платные дороги' },
  { id: 'fssp', label: 'ФССП' },
  { id: 'fns', label: 'ФНС' },
];

export default function ChargesScreen() {
  const router = useRouter();
  const chargesData = useCharges();
  const {
    loading, refreshing, autoCharges,
    getTotalAmount, getTotalCount, getFineTypeStats,
    loadingAutoFines, backgroundLoading, lastUpdateTime,
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

  const safeBack = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/main' as any);
  }, [router]);

  const refreshButton = (
    <Pressable
      onPress={handleRefresh}
      disabled={refreshing}
      accessibilityRole="button"
      accessibilityLabel={refreshing ? 'Обновление' : 'Обновить список'}
      className={`px-3.5 py-2 rounded-lg bg-bg-secondary cursor-pointer ${refreshing ? 'opacity-50' : ''}`}
    >
      <Text className="text-sm text-text-primary font-medium select-none">
        {refreshing ? '⏳' : '↻'} Обновить
      </Text>
    </Pressable>
  );

  return (
    <View className="flex-1">
      <ScreenHeader title="Начисления" onBack={safeBack} rightComponent={refreshButton} />

      <WebScreenContainer maxWidth={1100}>
        {/* Filter pills */}
        <View className="flex-row flex-wrap gap-2 px-5 py-2.5 bg-white">
          {FILTERS.map(f => {
            const active = activeFilter === f.id;
            return (
              <Pressable
                key={f.id}
                onPress={() => setActiveFilter(f.id)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                accessibilityLabel={`Фильтр ${f.label}`}
                className={`px-3.5 py-1.5 rounded-full border cursor-pointer ${
                  active
                    ? 'bg-accent-secondary border-accent-secondary'
                    : 'bg-bg-secondary border-border-secondary'
                }`}
              >
                <Text
                  className={`text-[13px] select-none ${
                    active ? 'text-white font-semibold' : 'text-text-secondary'
                  }`}
                >
                  {f.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Active filter reset bar */}
        {activeFilter !== 'all' && (
          <View className="flex-row justify-between items-center px-5 py-2 bg-bg-secondary border-b border-border-primary">
            <Text className="text-sm text-text-primary font-medium select-none">
              Фильтр: {FILTERS.find(f => f.id === activeFilter)?.label}
            </Text>
            <Pressable
              onPress={() => setActiveFilter('all')}
              accessibilityRole="button"
              accessibilityLabel="Сбросить фильтр"
              className="cursor-pointer"
            >
              <Text className="text-sm text-status-error font-bold select-none">Сбросить</Text>
            </Pressable>
          </View>
        )}

        {/* Last update info */}
        {lastUpdateTime > 0 && (
          <View className="px-5 py-1.5 bg-[#FAFAFA] border-b border-[#E8E8E8]">
            <Text className="text-xs text-text-muted text-center select-none">
              {refreshBlockedMessage ||
                `Обновлено: ${new Date(lastUpdateTime).toLocaleTimeString('ru-RU', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}`}
            </Text>
          </View>
        )}

        {loading ? (
          <View className="flex-1 items-center justify-center p-10">
            <ActivityIndicator size="large" color="#313131" />
          </View>
        ) : !hasCharges ? (
          <View className="flex-1 items-center justify-center p-10">
            <Text className="text-lg font-bold text-text-primary mb-2 select-none">
              Нет неоплаченных начислений
            </Text>
            <Text className="text-sm text-text-muted select-none">
              Все ваши штрафы и начисления оплачены
            </Text>
          </View>
        ) : (
          <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 100 }}>
            {backgroundLoading && (
              <View className="flex-row items-center justify-center p-3 mx-4 mt-3 bg-bg-secondary rounded-lg border border-border-primary gap-2">
                <ActivityIndicator size="small" color="#3A3A3A" />
                <Text className="text-sm text-text-primary select-none">Загрузка штрафов...</Text>
              </View>
            )}

            {filteredData.autos.length > 0 && (
              <View className="mt-3">
                <View className="flex-row justify-between items-center px-5 py-2.5 bg-white border-b border-[#E8E8E8]">
                  <Text className="text-[17px] font-bold text-text-primary select-none">По автомобилям</Text>
                  <Text className="text-[13px] text-text-secondary font-semibold select-none">
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
                        <View className="flex-row items-center justify-center p-5 gap-2">
                          <ActivityIndicator size="small" color="#3A3A3A" />
                          <Text className="text-sm text-text-muted select-none">Загрузка...</Text>
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
                        <Text className="text-sm italic text-text-muted text-center p-4 select-none">
                          Нет данных
                        </Text>
                      )}
                    </ChargesGroupCard>
                  );
                })}
              </View>
            )}

            {filteredData.other.length > 0 && (
              <View className="mt-3">
                <View className="flex-row justify-between items-center px-5 py-2.5 bg-white border-b border-[#E8E8E8]">
                  <Text className="text-[17px] font-bold text-text-primary select-none">Другие начисления</Text>
                </View>

                {(() => {
                  const isExpanded = expandedGroups['other'];
                  const hasMore = filteredData.other.length > COLLAPSED_LIMIT;
                  const displayed = isExpanded || !hasMore
                    ? filteredData.other
                    : filteredData.other.slice(0, COLLAPSED_LIMIT);

                  return (
                    <>
                      {displayed.map((charge: any) => (
                        <ChargeCard
                          key={charge.id}
                          item={charge}
                          showAutoInfo
                          onPress={handleChargePress}
                          selected={selectedCharges.has(charge.id)}
                          onSelect={SHOW_PAYMENT_UI ? toggleSelection : undefined}
                        />
                      ))}
                      {hasMore && (
                        <Pressable
                          className="py-2.5 mx-4 mt-2 rounded-lg items-center bg-bg-secondary cursor-pointer"
                          onPress={() => toggleGroup('other')}
                          accessibilityRole="button"
                          accessibilityLabel={isExpanded ? 'Скрыть' : 'Показать ещё'}
                        >
                          <Text className="text-sm font-semibold text-text-primary select-none">
                            {isExpanded
                              ? 'Скрыть'
                              : `Показать ещё ${filteredData.other.length - COLLAPSED_LIMIT}`}
                          </Text>
                        </Pressable>
                      )}
                    </>
                  );
                })()}
              </View>
            )}
          </ScrollView>
        )}
      </WebScreenContainer>

      {/* Payment footer */}
      {hasCharges && SHOW_PAYMENT_UI && (
        <View className="flex-row items-center px-5 py-3.5 bg-white border-t border-border-primary">
          <View className="flex-1">
            <Text className="text-[15px] font-semibold text-text-primary select-none">
              К оплате: {selectedAmount.toFixed(2)} ₽ ({selectedCharges.size} шт.)
            </Text>
            <Text className="text-xs text-text-secondary mt-0.5 select-none">
              Всего: {totalAmount.toFixed(2)} ₽ ({totalCount} шт.)
            </Text>
          </View>
          <Pressable
            className={`px-6 py-3 rounded-lg cursor-pointer ${
              selectedCharges.size > 0 ? 'bg-accent-secondary' : 'bg-[#CCCCCC]'
            }`}
            onPress={handlePaySelected}
            disabled={selectedCharges.size === 0}
            accessibilityRole="button"
            accessibilityLabel="Оплатить выбранное"
            accessibilityState={{ disabled: selectedCharges.size === 0 }}
          >
            <Text className="text-white text-[15px] font-bold select-none">Оплатить</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}
