/**
 * Web version of AutoListScreen.
 *
 * Differences from mobile:
 *  - Responsive grid (1/2/3/4 columns via useWebLayout)
 *  - Inline search in header (desktop only; mobile uses FindAutoPanel)
 *  - No bottom tab bar (sidebar handles navigation)
 *  - No LeftMenuModal (sidebar provides that navigation)
 *  - Pass-mode selection footer with Reset + "Пропуск в Москву"
 *
 * Does NOT wrap in WebAppLayout — authenticated layout (`_layout.web.tsx`)
 * already provides it.
 */
import React, { useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, FlatList, TouchableHighlight, TouchableOpacity, Pressable,
  ActivityIndicator, Image,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useRouter } from 'expo-router';

import { useAutoList }    from '../../hooks/useAutoList';
import { useAutoActions } from '../../hooks/useAutoActions';
import { useWebLayout }   from '../../hooks/useWebLayout';
import { AutoListItem }   from '../../components/auto/AutoListItem';
import AutoListFilterChips from '../../components/auto/AutoListFilterChips';
import AutoCountToolbar    from '../../components/auto/AutoCountToolbar';
import AutoListEmptyState  from '../../components/auto/AutoListEmptyState';
import { SortBanner }      from '../../components/auto/SortBanner';
import {
  AddAutoModal, DeleteAutoModal, ContactsModal, DebtInfoModal,
} from '../../components/auto/modals';
import { AnnounceOurServicesModal } from '../../components/auto/modals/AnnounceOurServicesModal';
import { FindAutoPanel }  from '../../components/auto/FindAutoPanel';
import { useNotification } from '../../contexts/NotificationContext';
import { useUserData } from '../../contexts/UserDataContext';
import { showAlert } from '../../utils/alert';

// Module-level callback so sidebar "Пропуск" can open AddAutoModal in-place
// without navigation. Matches mobile behaviour.
let _openAddAutoModal: (() => void) | null = null;
export function openAddAutoModalIfMounted(): boolean {
  if (_openAddAutoModal) { _openAddAutoModal(); return true; }
  return false;
}

export default function AutoListScreen() {
  const router       = useRouter();
  const autoListHook = useAutoList();
  const autoActions  = useAutoActions(autoListHook.refreshAutoList, autoListHook.invalidateCache);
  const { resetViewedCount } = useNotification();
  const userDataCtx  = useUserData();
  const { columns }  = useWebLayout();

  useEffect(() => {
    _openAddAutoModal = () => autoActions.setModalAddAutoVisible(true);
    return () => { _openAddAutoModal = null; };
  }, [autoActions]);

  useFocusEffect(
    useCallback(() => {
      const viewedCount = resetViewedCount();
      if (viewedCount > 0) autoListHook.decrementNotificationCount(viewedCount);
      // Refresh user-data through the shared Context (ADR-020). Dedupes
      // against the WebSidebar's own mount/pathname/visibility triggers
      // so each route focus = at most one /get-auto-list, not two.
      void userDataCtx.updateUserData();
      autoListHook.startPulseAnimation();
      return () => autoListHook.stopPulseAnimation();
    }, [])
  );

  useEffect(() => { autoListHook.loadData(); }, []);

  const handleItemPress = useCallback((item: any) => autoActions.navigateToAuto(item), [autoActions]);
  const handleItemMark = useCallback((item: any, index: number) => autoListHook.markItem(item, index), [autoListHook]);
  const handleEndReached = useCallback(() => autoListHook.loadMore(), [autoListHook]);

  const handleOrderOsagoPolicy = useCallback(async (item: any) => {
    const { ok, msg } = await autoActions.orderOsagoPolicy(item);
    showAlert(ok ? 'Заявка отправлена' : 'Ошибка', msg);
  }, [autoActions]);

  // Grid cell: fixed %-width so the last row stays left-aligned (no stretching).
  // `alignSelf: 'stretch'` + inner `fillHeight` on AutoListItem together make
  // every card in a row match the tallest card's height.
  const cellStyle = useMemo(
    () => ({
      width: `${100 / columns}%` as const,
      padding: 6,
      alignSelf: 'stretch' as const,
    }),
    [columns],
  );

  const renderItem = useCallback(({ item, index }: { item: any; index: number }) => (
    <View style={cellStyle}>
      <AutoListItem
        item={item}
        index={index}
        fillHeight
        onPress={handleItemPress}
        onMark={handleItemMark}
        onShowHideTab={autoListHook.showHideTab}
        onOrderOsagoPolicy={handleOrderOsagoPolicy}
      />
    </View>
  ), [cellStyle, handleItemPress, handleItemMark, autoListHook.showHideTab, handleOrderOsagoPolicy]);

  const showGlobalLoading = autoListHook.isLoading && autoListHook.autoList.length === 0;

  return (
    <View className="flex-1 bg-[#F8F8F8]">
      {/* Header */}
      <View className="flex-row items-center justify-between px-5 py-3 bg-white border-b border-[#E8E8E8]">
        <Text className="text-[22px] font-bold text-text-primary select-none">Мой автопарк</Text>

        {columns >= 2 && (autoListHook.autoList.length > 0 || autoListHook.hasActiveFilters()) && (
          <View className="flex-1 flex-row items-center bg-bg-secondary rounded-lg px-3 mx-4 h-10 max-w-[320px]">
            <Text className="text-sm mr-2">🔍</Text>
            <input
              type="text"
              placeholder="Поиск по номеру..."
              value={autoListHook.filters.autoStr}
              onChange={(e) => autoListHook.changeAutoStr(e.target.value)}
              style={{
                flex: 1,
                height: 36,
                fontSize: 14,
                color: '#1A1A1A',
                border: 'none',
                outline: 'none',
                backgroundColor: 'transparent',
                fontFamily: 'inherit',
              }}
            />
            {autoListHook.filters.autoStr ? (
              <TouchableOpacity onPress={autoListHook.clearAutoStr} className="p-1">
                <Text className="text-text-muted text-lg">✕</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        )}

        <View className="flex-row items-center gap-1">
          <TouchableHighlight
            className="w-10 h-10 rounded-lg items-center justify-center"
            activeOpacity={1}
            underlayColor="#F0F0F0"
            onPress={() => router.push('/(authenticated)/notifications' as any)}
            accessibilityRole="button"
            accessibilityLabel="Уведомления"
          >
            <View>
              <Image source={require('../../../assets/images/notification.png')} />
              {(autoListHook.userData.notification_unviewed_count || 0) > 0 && (
                <View
                  className="absolute bg-status-error rounded-[10px] items-center justify-center px-[3px]"
                  style={{ top: -4, right: -6, minWidth: 18, height: 18 }}
                >
                  <Text className="text-[10px] font-bold text-white">
                    {autoListHook.userData.notification_unviewed_count}
                  </Text>
                </View>
              )}
            </View>
          </TouchableHighlight>

          {!!autoListHook.userData.debt_sum && autoListHook.userData.debt_sum !== '0.00' && (
            <TouchableHighlight
              className="w-10 h-10 rounded-lg items-center justify-center"
              activeOpacity={1}
              underlayColor="#F0F0F0"
              onPress={() => autoActions.setModalDebtInfoVisible(true)}
              accessibilityRole="button"
              accessibilityLabel="Информация о задолженности"
            >
              <Image source={require('../../../assets/images/alert-circle_2.png')} />
            </TouchableHighlight>
          )}

          {autoListHook.isSearching ? (
            <View className="w-10 h-10 rounded-lg items-center justify-center">
              <ActivityIndicator size="small" color="#3A3A3A" />
            </View>
          ) : (autoListHook.autoList.length > 0 || autoListHook.hasActiveFilters()) ? (
            <TouchableHighlight
              className="w-10 h-10 rounded-lg items-center justify-center"
              activeOpacity={1}
              underlayColor="#F0F0F0"
              onPress={() => autoActions.setFindAutoVisible(!autoActions.findAutoVisible)}
              accessibilityRole="button"
              accessibilityLabel="Фильтр"
            >
              <Image source={require('../../../assets/images/filter.png')} />
            </TouchableHighlight>
          ) : null}
        </View>
      </View>

      {autoListHook.hasActiveFilters() && (
        <AutoListFilterChips
          filters={autoListHook.getActiveFiltersText()}
          onEdit={() => autoActions.setFindAutoVisible(true)}
          onClearAll={autoListHook.clearAllFilters}
          label="Фильтры:"
        />
      )}

      <FindAutoPanel
        visible={autoActions.findAutoVisible}
        autoStr={autoListHook.filters.autoStr}
        autoCancelled={autoListHook.filters.autoCancelled}
        autoPassEnded={autoListHook.filters.autoPassEnded}
        autoPassEnds={autoListHook.filters.autoPassEnds}
        autoPassEndsUntilDate={autoListHook.filters.autoPassEndsUntilDate}
        onChangeAutoStr={autoListHook.changeAutoStr}
        onClearAutoStr={autoListHook.clearAutoStr}
        onClearAllFilters={autoListHook.clearAllFilters}
        onToggleCancelled={autoListHook.toggleAutoCancelled}
        onTogglePassEnded={autoListHook.toggleAutoPassEnded}
        onChangePassEndsDate={autoListHook.changeAutoPassEndsUntilDate}
        onClose={() => autoActions.setFindAutoVisible(false)}
      />

      {!showGlobalLoading && (
        <AutoCountToolbar
          count={autoListHook.autoListCount || 0}
          onAddPress={() => autoActions.setModalAddAutoVisible(true)}
          sortMode={autoListHook.sortMode}
          onSortModeChange={autoListHook.setSortMode}
        />
      )}

      {!showGlobalLoading
        && autoListHook.sortMode === 'plate_digits'
        && !autoListHook.sortBannerDismissed && (
        <SortBanner onDismiss={autoListHook.dismissSortBanner} />
      )}

      {showGlobalLoading ? (
        <View className="flex-1 items-center justify-center bg-[#F8F8F8]">
          <ActivityIndicator size="large" color="#313131" />
        </View>
      ) : (
        <FlatList
          // key forces remount when column count changes (RN requirement for numColumns)
          key={String(columns)}
          numColumns={columns}
          columnWrapperStyle={columns > 1 ? { justifyContent: 'flex-start', alignItems: 'stretch', flexWrap: 'wrap' } : undefined}
          data={autoListHook.autoList}
          renderItem={renderItem}
          keyExtractor={(item, idx) => item.id || String(idx)}
          ListEmptyComponent={() => (
            // Show a spinner while a sort-mode / filter switch is in flight
            // (isSearching) or the initial load is still resolving — without
            // this, FlatList shows the "Список авто пуст" empty state in the
            // gap between `setAutoList([])` and the new response.
            (autoListHook.isSearching || autoListHook.isLoading) ? (
              <View style={{ paddingVertical: 60, alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#313131" />
              </View>
            ) : (
              <AutoListEmptyState hasActiveFilters={autoListHook.hasActiveFilters()} />
            )
          )}
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.5}
          refreshing={autoListHook.isRefreshing}
          onRefresh={autoListHook.refreshAutoList}
          contentContainerStyle={{ padding: 8, paddingBottom: 24 }}
          style={{ flex: 1 }}
          ListFooterComponent={
            autoListHook.isLoadingMore ? (
              <View style={{ paddingVertical: 20 }}>
                <ActivityIndicator size="small" color="#313131" />
              </View>
            ) : null
          }
        />
      )}

      {/* Pass-mode selection footer */}
      {autoListHook.markedCnt > 0 && (
        <View className="p-4 bg-white border-t border-[#E8E8E8]">
          <View className="flex-row gap-3">
            <Pressable
              className="py-3.5 px-5 rounded-[10px] border border-border-primary bg-bg-secondary items-center justify-center cursor-pointer"
              onPress={autoListHook.undoSelect}
              accessibilityRole="button"
              accessibilityLabel="Сбросить выбор"
            >
              <Text className="text-base font-semibold text-text-secondary select-none">Сбросить</Text>
            </Pressable>
            <Pressable
              className="flex-1 bg-accent-secondary rounded-[10px] py-3.5 items-center cursor-pointer"
              onPress={() => {
                const marked = autoListHook.autoList.filter((i: any) => i.marked);
                autoActions.navigateToPass(marked);
              }}
              accessibilityRole="button"
              accessibilityLabel="Заказать пропуск"
            >
              <Text className="text-base font-bold text-white select-none">Пропуск в Москву</Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* Modals */}
      <AddAutoModal
        visible={autoActions.modalAddAutoVisible}
        autoNumberBase={autoActions.autoNumberBase}
        autoNumberBaseOk={autoActions.autoNumberBaseOk}
        autoNumberRegionCode={autoActions.autoNumberRegionCode}
        autoNumberRegionCodeOk={autoActions.autoNumberRegionCodeOk}
        sts={autoActions.sts}
        stsOk={autoActions.stsOk}
        stsByAutoNumberIndicator={autoActions.stsByAutoNumberIndicator}
        modalAddAutoButtonDisabled={autoActions.modalAddAutoButtonDisabled}
        onChangeAutoNumberBase={autoActions.changeAutoNumberBase}
        onChangeAutoNumberRegionCode={autoActions.changeAutoNumberRegionCode}
        onChangeSts={autoActions.changeSts}
        onSubmit={async () => {
          const token = await AsyncStorage.getItem('token');
          await autoActions.addAuto(token);
        }}
        onCancel={autoActions.modalAddAutoCancel}
      />

      <DeleteAutoModal
        visible={autoActions.modalDelAutoVisible}
        markedCount={autoListHook.markedCnt}
        onConfirm={async () => {
          const token = await AsyncStorage.getItem('token');
          const ids = autoListHook.autoList.filter(i => i.marked).map(i => i.id);
          await autoActions.deleteAuto(token, ids);
        }}
        onCancel={() => autoActions.setModalDelAutoVisible(false)}
      />

      <ContactsModal
        visible={autoActions.modalViewContacts}
        managerData={autoListHook.managerData}
        techSupportData={autoListHook.techSupportData}
        techSupportName={autoListHook.techSupportName}
        userId={autoListHook.userData.id}
        userInn={autoListHook.userData.inn}
        onClose={() => autoActions.setModalViewContacts(false)}
        onContactPhone={autoActions.contactPhone}
        onContactEmail={autoActions.contactEmail}
      />

      <AnnounceOurServicesModal
        visible={autoListHook.announceOurServicesVisible}
        onClose={autoListHook.closeAnnounceOurServices}
      />

      <DebtInfoModal
        visible={autoActions.modalDebtInfoVisible}
        debtSum={autoListHook.userData.debt_sum || '0'}
        onClose={() => autoActions.setModalDebtInfoVisible(false)}
      />
    </View>
  );
}
