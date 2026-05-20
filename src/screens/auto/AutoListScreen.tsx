import React, { useEffect, useCallback, useRef } from 'react';
import { View, Text, FlatList, TouchableHighlight, ActivityIndicator, StatusBar, Image } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useRouter } from 'expo-router';

import { useAutoList } from '../../hooks/useAutoList';
import { useAutoActions } from '../../hooks/useAutoActions';
import { AutoListItem } from '../../components/auto/AutoListItem';
import AutoListFilterChips from '../../components/auto/AutoListFilterChips';
import AutoCountToolbar from '../../components/auto/AutoCountToolbar';
import AutoListEmptyState from '../../components/auto/AutoListEmptyState';
import AutoListLoadError from '../../components/auto/AutoListLoadError';
import { SortBanner } from '../../components/auto/SortBanner';
import {
  MenuUser, MenuContacts, SelMenuDelItem, SelMenuPass, SelMenuUndoSelect, MenuInviteUser,
} from '../../components/auto/AutoListMenu';
import {
  AddAutoModal, DeleteAutoModal, ContactsModal, LeftMenuModal, DebtInfoModal,
} from '../../components/auto/modals';
import { AnnounceOurServicesModal } from '../../components/auto/modals/AnnounceOurServicesModal';
import { FindAutoPanel } from '../../components/auto/FindAutoPanel';
import { useNotification } from '../../contexts/NotificationContext';
import { showAlert } from '../../utils/alert';

export default function AutoListScreen() {
  const router = useRouter();
  const { bottom: bottomInset } = useSafeAreaInsets();
  const autoListHook = useAutoList();
  const autoActions = useAutoActions(autoListHook.refreshAutoList, autoListHook.invalidateCache);
  const { resetViewedCount } = useNotification();

  // On the very first focus (= initial mount) loadData() below already
  // owns the userData refresh — it issues a full /get-auto-list which
  // updates userData via the success path. Calling updateUserData()
  // here on top of that issues a second concurrent /get-auto-list
  // (limit=0) racing the first, doubling backend load for the same
  // session and competing for the same DB lock. On subsequent focuses
  // (user returned from another screen) loadData isn't re-run, so we
  // do want the lightweight refresh for profile/notifications/onboarding.
  // See ADR-024.
  const firstFocusRef = useRef(true);

  useFocusEffect(
    useCallback(() => {
      const viewedCount = resetViewedCount();
      if (viewedCount > 0) autoListHook.decrementNotificationCount(viewedCount);
      if (firstFocusRef.current) {
        firstFocusRef.current = false;
      } else {
        autoListHook.updateUserData();
      }
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

  const renderItem = useCallback(({ item, index }: { item: any; index: number }) => (
    <AutoListItem
      item={item}
      index={index}
      onPress={handleItemPress}
      onMark={handleItemMark}
      onShowHideTab={autoListHook.showHideTab}
      onOrderOsagoPolicy={handleOrderOsagoPolicy}
    />
  ), [handleItemPress, handleItemMark, autoListHook.showHideTab, handleOrderOsagoPolicy]);

  const showGlobalLoading = autoListHook.isLoading && autoListHook.autoList.length === 0;

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-dark-bg" edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" translucent={false} />

      {/* Header.
       *
       * Always rendered while authenticated — the user must be able to
       * open the left-menu drawer (which carries logout & org switch)
       * and the filter button even when /get-auto-list hasn't returned
       * usable userData yet. Earlier this view was gated on
       * `userData.firm`, which silently hid the entire chrome whenever
       * the backend timed out, trapping the user in a screen with no
       * way out (see plan 2026-05-20-auto-list-resilient-bootstrap).
       *
       * Data-dependent inner elements (notification badge, debt
       * indicator) stay condition-rendered on their own fields.
       */}
      <View className="flex-row items-center justify-between px-[15px] py-2 bg-white">
          <TouchableHighlight
            className="p-1 justify-center items-center min-w-10 h-10"
            activeOpacity={1}
            underlayColor="#ffffff"
            onPress={() => autoActions.setMenuLeftVisible(true)}
          >
            <Image
              source={
                (autoListHook.userData.other_user_notification_unviewed_count || 0) > 0
                  ? require('../../../assets/images/menu_left_notification_unviewed.png')
                  : require('../../../assets/images/menu_left.png')
              }
            />
          </TouchableHighlight>

          <TouchableHighlight
            className="p-1 justify-center items-center min-w-10 h-10"
            activeOpacity={1}
            underlayColor="#ffffff"
            onPress={() => router.push('/(authenticated)/notifications' as any)}
          >
            <View>
              <Image source={require('../../../assets/images/notification.png')} />
              {(autoListHook.userData.notification_unviewed_count || 0) > 0 && (
                <View className="absolute top-0 right-0 bg-status-error rounded-[12px] min-w-5 h-5 items-center justify-center flex-row">
                  <Text className="text-[10px] font-bold text-white px-1" numberOfLines={1}>
                    {autoListHook.userData.notification_unviewed_count}
                  </Text>
                </View>
              )}
            </View>
          </TouchableHighlight>

          {!!autoListHook.userData.debt_sum && autoListHook.userData.debt_sum !== '0.00' && (
            <TouchableHighlight
              className="p-1 justify-center items-center min-w-10 h-10"
              activeOpacity={1}
              underlayColor="#ffffff"
              onPress={() => autoActions.setModalDebtInfoVisible(true)}
            >
              <Image source={require('../../../assets/images/alert-circle_2.png')} />
            </TouchableHighlight>
          )}

          <Text className="flex-1 text-center text-2xl font-bold text-text-primary mx-2.5">Мой автопарк</Text>

          {autoListHook.isSearching ? (
            <View className="p-1 justify-center items-center min-w-10 h-10">
              <ActivityIndicator size="small" color="#3A3A3A" />
            </View>
          ) : (autoListHook.autoList.length > 0 || autoListHook.hasActiveFilters()) ? (
            <TouchableHighlight
              className="p-1 justify-center items-center min-w-10 h-10"
              activeOpacity={1}
              underlayColor="#ffffff"
              onPress={() => autoActions.setFindAutoVisible(!autoActions.findAutoVisible)}
            >
              <Image source={require('../../../assets/images/filter.png')} />
            </TouchableHighlight>
          ) : (
            <View className="p-1 justify-center items-center min-w-10 h-10" />
          )}
      </View>

      {autoListHook.hasActiveFilters() && (
        <AutoListFilterChips
          filters={autoListHook.getActiveFiltersText()}
          onEdit={() => autoActions.setFindAutoVisible(true)}
          onClearAll={autoListHook.clearAllFilters}
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
        <View className="flex-1 items-center justify-center bg-white">
          <ActivityIndicator size="large" color="#313131" />
        </View>
      ) : (
        <FlatList
          data={autoListHook.autoList}
          renderItem={renderItem}
          keyExtractor={(item, index) => item.id || index.toString()}
          ListEmptyComponent={() => (
            // Resolution order matters:
            //   1. In-flight (initial load / sort-mode / filter switch) →
            //      spinner. Without this, FlatList briefly shows the
            //      empty state in the gap between `setAutoList([])` and
            //      the new response.
            //   2. Last fetch failed (timeout / network / 5xx) →
            //      AutoListLoadError with Retry. Otherwise the user
            //      would see "Список авто пуст" with no signal that
            //      anything went wrong and no way to retry.
            //   3. Genuine empty list.
            (autoListHook.isSearching || autoListHook.isLoading) ? (
              <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#313131" />
              </View>
            ) : autoListHook.loadError ? (
              <AutoListLoadError
                kind={autoListHook.loadError.kind}
                onRetry={autoListHook.refreshAutoList}
              />
            ) : (
              <AutoListEmptyState hasActiveFilters={autoListHook.hasActiveFilters()} />
            )
          )}
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.5}
          refreshing={autoListHook.isRefreshing}
          onRefresh={autoListHook.refreshAutoList}
          contentContainerStyle={{ paddingBottom: 80 + Math.max(bottomInset, 10) + 20 }}
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

      {/* Bottom menu.
       *
       * Always visible while authenticated — same reasoning as the
       * header above. The action buttons themselves remain functional
       * regardless of whether userData has hydrated yet (add-auto,
       * navigate-to-profile, invite-user, contacts).
       */}
      <View
        className="absolute bottom-0 left-0 right-0 bg-white"
        style={{ paddingBottom: Math.max(bottomInset, 10) }}
      >
          {autoListHook.markedCnt === 0 ? (
            <View className="flex-row rounded-[25px] border border-border-primary h-20 bg-bg-secondary">
              <View className="flex-1 h-20 items-center justify-center">
                <TouchableHighlight activeOpacity={1} underlayColor="#EEEEEE" onPress={() => autoActions.setModalAddAutoVisible(true)}>
                  <SelMenuPass />
                </TouchableHighlight>
              </View>
              <View className="flex-1 h-20 items-center justify-center">
                <TouchableHighlight activeOpacity={1} underlayColor="#EEEEEE" onPress={autoActions.navigateToProfile}>
                  <MenuUser />
                </TouchableHighlight>
              </View>
              <View className="flex-1 h-20 items-center justify-center">
                <TouchableHighlight
                  activeOpacity={1}
                  underlayColor="#EEEEEE"
                  onPress={() => router.push({
                    pathname: '/invite-user' as any,
                    params: { manager_data: JSON.stringify(autoListHook.managerData) },
                  })}
                >
                  <MenuInviteUser />
                </TouchableHighlight>
              </View>
              <View className="flex-1 h-20 items-center justify-center">
                <TouchableHighlight activeOpacity={1} underlayColor="#EEEEEE" onPress={autoActions.openContacts}>
                  <MenuContacts />
                </TouchableHighlight>
              </View>
            </View>
          ) : (
            <View className="flex-row rounded-[25px] border border-border-primary h-20 bg-[#D9D9D9]">
              <View className="flex-1 h-20 items-center justify-center">
                <TouchableHighlight activeOpacity={1} underlayColor="#D9D9D9" onPress={() => autoActions.setModalDelAutoVisible(true)}>
                  <SelMenuDelItem />
                </TouchableHighlight>
              </View>
              <View className="flex-1 h-20 items-center justify-center">
                <TouchableHighlight
                  activeOpacity={1}
                  underlayColor="#D9D9D9"
                  onPress={() => {
                    const marked = autoListHook.autoList.filter(item => item.marked);
                    autoActions.navigateToPass(marked);
                  }}
                >
                  <SelMenuPass />
                </TouchableHighlight>
              </View>
              <View className="flex-1 h-20 items-center justify-center">
                <TouchableHighlight activeOpacity={1} underlayColor="#D9D9D9" onPress={autoListHook.undoSelect}>
                  <SelMenuUndoSelect />
                </TouchableHighlight>
              </View>
            </View>
          )}
      </View>

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
          const ids = autoListHook.autoList.filter(item => item.marked).map(item => item.id);
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

      <LeftMenuModal
        visible={autoActions.menuLeftVisible}
        userData={autoListHook.userData}
        ourServicesList={autoListHook.ourServicesList}
        otherUserList={autoListHook.otherUserList}
        autoListCount={Number(autoListHook.autoListCount) || 0}
        onboardingExpired={Number(autoListHook.onboardingExpired) || 0}
        pulseFontSize={autoListHook.pulseFontSize}
        onClose={() => autoActions.setMenuLeftVisible(false)}
        onNavigateToOnBoarding={autoActions.navigateToOnBoarding}
        onNavigateToDriverList={autoActions.navigateToDriverList}
        onNavigateToInn={autoActions.navigateToInn}
        onSwitchOrganization={(inn, onSuccess, onFinally) => {
          autoActions.switchOrganization(
            inn,
            () => {
              autoListHook.resetAutoList();
              if (onSuccess) onSuccess();
            },
            onFinally,
          );
        }}
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
    </SafeAreaView>
  );
}
