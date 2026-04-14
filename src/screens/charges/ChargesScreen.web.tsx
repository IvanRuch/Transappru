/**
 * Web version of ChargesScreen.
 * Grouped unpaid fines by auto, filter panel, selection & payment footer.
 * Uses shared useCharges hook (resolves to api.web.ts on web).
 */
import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, Pressable, ActivityIndicator, ScrollView, StyleSheet, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import WebAppLayout from '../../components/web/WebAppLayout';
import { useCharges } from '../../hooks/useCharges';
import { ChargeItem } from '../../types/charges';
import { SHOW_PAYMENT_UI } from '../../config/features';

const noSelect = Platform.OS === 'web' ? { userSelect: 'none' as const } : {};

type ChargeFilterType = 'all' | 'gibdd' | 'paidRoads' | 'fssp' | 'fns';

const FILTERS: { id: ChargeFilterType; label: string }[] = [
  { id: 'all', label: 'Все' },
  { id: 'gibdd', label: 'ГИБДД' },
  { id: 'paidRoads', label: 'Платные дороги' },
  { id: 'fssp', label: 'ФССП' },
  { id: 'fns', label: 'ФНС' },
];

const COLLAPSED_LIMIT = 5;

// ── Inline ChargeCard for web (no image assets) ──────────────────────────

function WebChargeCard({
  item,
  showAutoInfo,
  onPress,
  selected,
  onSelect,
}: {
  item: ChargeItem;
  showAutoInfo?: boolean;
  onPress?: (item: ChargeItem) => void;
  selected?: boolean;
  onSelect?: (item: ChargeItem) => void;
}) {
  const isPaid = item.is_paid === '1' || item.is_paid === 1;
  const isPlaton = item.is_platon === '1' || item.is_platon === 1;
  const isFssp = item.is_to_fssp === '1' || item.is_to_fssp === 1;

  return (
    <View style={cs.card}>
      {/* Checkbox or status icon */}
      <View style={cs.iconCol}>
        {onSelect && !isPaid ? (
          <Pressable onPress={() => onSelect(item)} style={cs.checkboxTouch}>
            <View style={[cs.checkbox, selected && cs.checkboxOn]}>
              {selected && <Text style={cs.checkmark}>✓</Text>}
            </View>
          </Pressable>
        ) : (
          <Text style={isPaid ? cs.statusOk : cs.statusWarn}>{isPaid ? '✔' : '⚠'}</Text>
        )}
      </View>

      {/* Content */}
      <View style={cs.contentCol}>
        <Text style={cs.text}>Постановление от {item.dat}</Text>
        {isPlaton ? (
          <Text style={cs.errorText}>Штраф системы ПЛАТОН {item.sum} ₽</Text>
        ) : (
          <Text style={cs.text}>Штраф {item.sum} ₽</Text>
        )}
        {isFssp && <Text style={cs.errorText}>Передано в ФССП {item.to_fssp_at}</Text>}
        {item.discount_str && <Text style={cs.text}>{item.discount_str}</Text>}
        <Text style={cs.text}>{item.description}</Text>
        {item.offence_place && <Text style={cs.smallText}>{item.offence_place}</Text>}
        {showAutoInfo && !item.user_auto && (
          <Text style={cs.noAutoText}>Не привязано к авто</Text>
        )}
      </View>

      {/* Arrow */}
      {onPress && (
        <Pressable onPress={() => onPress(item)} style={cs.arrowBtn}>
          <Text style={cs.arrowText}>→</Text>
        </Pressable>
      )}
    </View>
  );
}

const cs = StyleSheet.create({
  card: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginVertical: 4,
    padding: 12,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  iconCol: { width: 40, alignItems: 'center', justifyContent: 'center' },
  checkboxTouch: { padding: 4 },
  checkbox: {
    width: 22, height: 22, borderWidth: 2, borderColor: '#3A3A3A',
    borderRadius: 4, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF',
  },
  checkboxOn: { backgroundColor: '#3A3A3A' },
  checkmark: { color: '#FFF', fontSize: 14, fontWeight: 'bold' },
  statusOk: { fontSize: 18, color: '#4CAF50' },
  statusWarn: { fontSize: 18, color: '#EE505A' },
  contentCol: { flex: 1, paddingLeft: 10 },
  text: { color: '#313131', fontSize: 14, marginBottom: 2 },
  errorText: { color: '#EE505A', fontSize: 14, marginBottom: 2 },
  smallText: { color: '#656565', fontSize: 12, marginBottom: 2 },
  noAutoText: { color: '#909090', fontSize: 12, fontStyle: 'italic', marginTop: 4 },
  arrowBtn: { width: 36, alignItems: 'center', justifyContent: 'center' },
  arrowText: { fontSize: 20, color: '#888' },
});

// ── Main screen ──────────────────────────────────────────────────────────

export default function ChargesScreen() {
  const router = useRouter();
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
    lastUpdateTime,
  } = useCharges();

  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [refreshBlockedMessage, setRefreshBlockedMessage] = useState<string | null>(null);
  const [selectedCharges, setSelectedCharges] = useState<Set<string>>(new Set());
  const [activeFilter, setActiveFilter] = useState<ChargeFilterType>('all');

  const autosWithFines = getAutosWithFines();

  // ── Filtering ──

  const getChargeType = (charge: ChargeItem): ChargeFilterType => {
    if (charge.is_platon === '1' || charge.is_platon === 1) return 'paidRoads';
    if (charge.is_to_fssp === '1' || charge.is_to_fssp === 1) return 'fssp';
    return 'gibdd';
  };

  const filteredData = useMemo(() => {
    if (activeFilter === 'all') {
      return { autos: autosWithFines, other: otherCharges };
    }
    const filteredAutos = autosWithFines
      .map(auto => {
        const group = autoCharges[auto.auto_number];
        if (!group) return null;
        const filteredCharges = group.charges.filter(c => getChargeType(c) === activeFilter);
        if (filteredCharges.length === 0) return null;
        return { ...auto, filteredCharges };
      })
      .filter(Boolean) as any[];
    const filteredOther = otherCharges.filter(c => getChargeType(c) === activeFilter);
    return { autos: filteredAutos, other: filteredOther };
  }, [autosWithFines, otherCharges, autoCharges, activeFilter]);

  // ── Clean up stale selections ──

  useEffect(() => {
    if (loading || refreshing || backgroundLoading) return;
    if (selectedCharges.size === 0) return;

    const allCurrentIds = new Set<string>();
    Object.values(autoCharges).forEach(g => g.charges.forEach(c => allCurrentIds.add(c.id)));
    otherCharges.forEach(c => allCurrentIds.add(c.id));

    setSelectedCharges(prev => {
      const next = new Set<string>();
      let changed = false;
      prev.forEach(id => {
        if (allCurrentIds.has(id)) next.add(id);
        else changed = true;
      });
      return changed ? next : prev;
    });
  }, [autoCharges, otherCharges, loading, refreshing, backgroundLoading]);

  // ── Helpers ──

  const enrichCharge = (charge: ChargeItem, autoNumber?: string) => ({
    ...charge,
    _auto_number: autoNumber,
  });

  const handleChargePress = (charge: ChargeItem) => {
    let autoNumber: string | undefined;
    Object.entries(autoCharges).forEach(([num, group]) => {
      if (group.charges.some(c => c.id === charge.id)) autoNumber = num;
    });
    router.push({
      pathname: '/auto-fine' as any,
      params: { fine_data: JSON.stringify(enrichCharge(charge, autoNumber)) },
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
    setExpandedGroups(prev => ({ ...prev, [autoId]: isExpanding }));
    if (isExpanding && !autoCharges[autoId]) {
      await loadAutoFines(autoId);
    }
  };

  const toggleSelection = (charge: ChargeItem) => {
    setSelectedCharges(prev => {
      const next = new Set(prev);
      if (next.has(charge.id)) next.delete(charge.id);
      else next.add(charge.id);
      return next;
    });
  };

  const toggleGroupSelection = (charges: ChargeItem[]) => {
    setSelectedCharges(prev => {
      const next = new Set(prev);
      const allSelected = charges.every(c => next.has(c.id));
      if (allSelected) charges.forEach(c => next.delete(c.id));
      else charges.forEach(c => next.add(c.id));
      return next;
    });
  };

  const selectedAmount = useMemo(() => {
    let sum = 0;
    Object.values(autoCharges).forEach(group => {
      group.charges.forEach(c => { if (selectedCharges.has(c.id)) sum += parseFloat(c.sum || '0'); });
    });
    otherCharges.forEach(c => { if (selectedCharges.has(c.id)) sum += parseFloat(c.sum || '0'); });
    return sum;
  }, [selectedCharges, autoCharges, otherCharges]);

  const handlePaySelected = () => {
    if (selectedCharges.size === 0) return;
    const chargesToPay: any[] = [];
    Object.entries(autoCharges).forEach(([autoNumber, group]) => {
      group.charges.forEach(c => { if (selectedCharges.has(c.id)) chargesToPay.push(enrichCharge(c, autoNumber)); });
    });
    otherCharges.forEach(c => { if (selectedCharges.has(c.id)) chargesToPay.push(enrichCharge(c)); });

    if (chargesToPay.length === 1) {
      router.push({ pathname: 'fine-payment-confirm' as any, params: { fine_data: JSON.stringify(chargesToPay[0]) } });
    } else {
      router.push({ pathname: 'fine-payment-confirm' as any, params: { charges: JSON.stringify(chargesToPay) } });
    }
  };

  const totalCount = getTotalCount();
  const totalAmount = getTotalAmount();
  const hasCharges = totalCount > 0 || backgroundLoading;

  // ── Render ──

  return (
    <WebAppLayout>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.title}>Начисления</Text>
        <View style={s.headerRight}>
          <Pressable onPress={handleRefresh} style={[s.refreshBtn, refreshing && s.refreshBtnDisabled]} disabled={refreshing}>
            <Text style={s.refreshBtnText}>{refreshing ? '⏳' : '↻'} Обновить</Text>
          </Pressable>
        </View>
      </View>

      {/* Filter pills */}
      <View style={s.filterRow}>
        {FILTERS.map(f => (
          <Pressable
            key={f.id}
            style={[s.filterPill, activeFilter === f.id && s.filterPillActive]}
            onPress={() => setActiveFilter(f.id)}
          >
            <Text style={[s.filterPillText, activeFilter === f.id && s.filterPillTextActive, noSelect]}>
              {f.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Active filter reset bar */}
      {activeFilter !== 'all' && (
        <View style={s.activeFilterBar}>
          <Text style={s.activeFilterText}>
            Фильтр: {FILTERS.find(f => f.id === activeFilter)?.label}
          </Text>
          <Pressable onPress={() => setActiveFilter('all')}>
            <Text style={s.resetFilterText}>Сбросить</Text>
          </Pressable>
        </View>
      )}

      {/* Last update info */}
      {lastUpdateTime > 0 && (
        <View style={s.updateBar}>
          <Text style={s.updateText}>
            {refreshBlockedMessage || `Обновлено: ${new Date(lastUpdateTime).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`}
          </Text>
        </View>
      )}

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color="#313131" />
        </View>
      ) : !hasCharges ? (
        <View style={s.center}>
          <Text style={s.emptyTitle}>Нет неоплаченных начислений</Text>
          <Text style={s.emptySubtitle}>Все ваши штрафы и начисления оплачены</Text>
        </View>
      ) : (
        <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent}>
          {/* Background loading indicator */}
          {backgroundLoading && (
            <View style={s.bgLoadingBar}>
              <ActivityIndicator size="small" color="#3A3A3A" />
              <Text style={s.bgLoadingText}>Загрузка штрафов...</Text>
            </View>
          )}

          {/* Auto charges groups */}
          {filteredData.autos.length > 0 && (
            <View style={s.section}>
              <View style={s.sectionHeader}>
                <Text style={[s.sectionTitle, noSelect]}>По автомобилям</Text>
                <Text style={[s.sectionCount, noSelect]}>{filteredData.autos.length} авто</Text>
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
                const fineTypeStats = getFineTypeStats(auto.auto_number);

                return (
                  <View key={auto.id} style={s.groupCard}>
                    <View style={s.groupHeader}>
                      {/* Group checkbox */}
                      {SHOW_PAYMENT_UI && (
                        <Pressable onPress={() => toggleGroupSelection(loadedCharges)} style={s.groupCheckbox}>
                          <View style={[cs.checkbox, isAllSelected && cs.checkboxOn]}>
                            {isAllSelected && <Text style={cs.checkmark}>✓</Text>}
                          </View>
                        </Pressable>
                      )}

                      <Pressable style={s.groupTitleArea} onPress={() => toggleGroup(auto.id)}>
                        <View style={{ flex: 1 }}>
                          <Text style={[s.groupTitle, noSelect]}>ГРЗ: {auto.auto_number}</Text>
                          <Text style={[s.groupSubtitle, noSelect]}>
                            {finesCount} шт. • {finesSum.toFixed(2)} ₽
                            {fineTypeStats && fineTypeStats.gibdd.count > 0 && fineTypeStats.platon.count === 0 && (
                              <Text style={s.tagGibdd}> (ГИБДД)</Text>
                            )}
                            {fineTypeStats && fineTypeStats.platon.count > 0 && fineTypeStats.gibdd.count === 0 && (
                              <Text style={s.tagPlaton}> (ПЛАТОН)</Text>
                            )}
                          </Text>

                          {fineTypeStats && fineTypeStats.gibdd.count > 0 && fineTypeStats.platon.count > 0 && (
                            <View style={{ marginTop: 2 }}>
                              <Text style={s.tagGibdd}>
                                ГИБДД: {fineTypeStats.gibdd.count} шт. • {fineTypeStats.gibdd.sum.toFixed(2)} ₽
                              </Text>
                              <Text style={s.tagPlaton}>
                                ПЛАТОН: {fineTypeStats.platon.count} шт. • {fineTypeStats.platon.sum.toFixed(2)} ₽
                              </Text>
                            </View>
                          )}

                          {selectedInGroupCount > 0 && !isAllSelected && SHOW_PAYMENT_UI && (
                            <Text style={s.selectedInfo}>
                              Выбрано: {selectedInGroupCount} шт. • {selectedInGroupSum.toFixed(2)} ₽
                            </Text>
                          )}
                        </View>
                        <Text style={[s.expandArrow, noSelect]}>{isExpanded ? '▼' : '▶'}</Text>
                      </Pressable>
                    </View>

                    {isExpanded && (
                      <View style={s.groupBody}>
                        {isLoading ? (
                          <View style={s.groupLoading}>
                            <ActivityIndicator size="small" color="#3A3A3A" />
                            <Text style={s.groupLoadingText}>Загрузка...</Text>
                          </View>
                        ) : loadedCharges.length > 0 ? (
                          loadedCharges.map((charge: any) => (
                            <WebChargeCard
                              key={charge.id}
                              item={charge}
                              showAutoInfo={false}
                              onPress={handleChargePress}
                              selected={selectedCharges.has(charge.id)}
                              onSelect={SHOW_PAYMENT_UI ? toggleSelection : undefined}
                            />
                          ))
                        ) : (
                          <Text style={s.noData}>Нет данных</Text>
                        )}
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          )}

          {/* Other charges */}
          {filteredData.other.length > 0 && (
            <View style={s.section}>
              <View style={s.sectionHeader}>
                <Text style={[s.sectionTitle, noSelect]}>Другие начисления</Text>
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
                      <WebChargeCard
                        key={charge.id}
                        item={charge}
                        showAutoInfo
                        onPress={handleChargePress}
                        selected={selectedCharges.has(charge.id)}
                        onSelect={SHOW_PAYMENT_UI ? toggleSelection : undefined}
                      />
                    ))}
                    {hasMore && (
                      <Pressable style={s.showMoreBtn} onPress={() => toggleGroup('other')}>
                        <Text style={[s.showMoreText, noSelect]}>
                          {isExpanded ? 'Скрыть' : `Показать ещё ${filteredData.other.length - COLLAPSED_LIMIT}`}
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

      {/* Payment footer */}
      {hasCharges && SHOW_PAYMENT_UI && (
        <View style={s.paymentFooter}>
          <View style={{ flex: 1 }}>
            <Text style={[s.paymentAmount, noSelect]}>
              К оплате: {selectedAmount.toFixed(2)} ₽ ({selectedCharges.size} шт.)
            </Text>
            <Text style={[s.paymentTotal, noSelect]}>
              Всего: {totalAmount.toFixed(2)} ₽ ({totalCount} шт.)
            </Text>
          </View>
          <Pressable
            style={[s.payBtn, selectedCharges.size === 0 && s.payBtnDisabled]}
            onPress={handlePaySelected}
            disabled={selectedCharges.size === 0}
          >
            <Text style={[s.payBtnText, noSelect]}>Оплатить</Text>
          </Pressable>
        </View>
      )}
    </WebAppLayout>
  );
}

const s = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E8',
  },
  title: { fontSize: 24, fontWeight: '700', color: '#1A1A1A' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  refreshBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F0F0F0',
  },
  refreshBtnDisabled: { opacity: 0.5 },
  refreshBtnText: { fontSize: 14, color: '#313131', fontWeight: '500' },

  // Filter row
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#F0F0F0',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  filterPillActive: {
    backgroundColor: '#3A3A3A',
    borderColor: '#3A3A3A',
  },
  filterPillText: { fontSize: 13, color: '#656565' },
  filterPillTextActive: { color: '#FFFFFF', fontWeight: '600' },

  // Active filter bar
  activeFilterBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: '#EEEEEE',
    borderBottomWidth: 1,
    borderBottomColor: '#D0D0D0',
  },
  activeFilterText: { fontSize: 14, color: '#313131', fontWeight: '500' },
  resetFilterText: { fontSize: 14, color: '#EE505A', fontWeight: 'bold' },

  // Update bar
  updateBar: {
    paddingHorizontal: 20,
    paddingVertical: 6,
    backgroundColor: '#FAFAFA',
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E8',
  },
  updateText: { fontSize: 12, color: '#888', textAlign: 'center' },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#313131', marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: '#888' },

  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 100 },

  // Background loading
  bgLoadingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: '#F0F0F0',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D0D0D0',
    gap: 8,
  },
  bgLoadingText: { fontSize: 14, color: '#3A3A3A' },

  // Section
  section: { marginTop: 12 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E8',
  },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#1A1A1A' },
  sectionCount: { fontSize: 13, color: '#656565', fontWeight: '600' },

  // Group
  groupCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  groupCheckbox: { padding: 4, marginRight: 8 },
  groupTitleArea: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  groupTitle: { fontSize: 15, fontWeight: '600', color: '#313131' },
  groupSubtitle: { fontSize: 13, color: '#656565', marginTop: 2 },
  tagGibdd: { fontSize: 11, color: '#B0B0B0' },
  tagPlaton: { fontSize: 11, color: '#EE505A' },
  selectedInfo: { fontSize: 12, color: '#EE505A', fontWeight: '500', marginTop: 2 },
  expandArrow: { fontSize: 13, color: '#888', marginLeft: 8 },

  groupBody: {
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    paddingVertical: 8,
  },
  groupLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    gap: 8,
  },
  groupLoadingText: { fontSize: 14, color: '#888' },
  noData: { fontSize: 14, color: '#888', fontStyle: 'italic', textAlign: 'center', padding: 16 },

  // Show more
  showMoreBtn: {
    paddingVertical: 10,
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  showMoreText: { fontSize: 14, fontWeight: '600', color: '#3A3A3A' },

  // Payment footer
  paymentFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  paymentAmount: { fontSize: 15, fontWeight: '600', color: '#313131' },
  paymentTotal: { fontSize: 12, color: '#656565', marginTop: 2 },
  payBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#3A3A3A',
  },
  payBtnDisabled: { backgroundColor: '#CCCCCC' },
  payBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
});
