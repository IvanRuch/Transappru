/**
 * Web-only version of AutoListScreen.
 * Key differences from native:
 *  - Responsive grid (4 / 3 / 2 / 1 columns)
 *  - No bottom tab bar (sidebar handles navigation)
 *  - No LeftMenuModal (sidebar provides that navigation)
 *  - No SafeAreaView / StatusBar
 *  - FlatList key resets when numColumns changes
 *  - Cards have fixed %-width so the last row stays left-aligned (no stretching)
 */
import React, { useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableHighlight,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Image,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useRouter } from 'expo-router';

import { useAutoList }    from '../../hooks/useAutoList';
import { useAutoActions } from '../../hooks/useAutoActions';
import { useWebLayout }   from '../../hooks/useWebLayout';
import { AutoListItem }   from '../../components/auto/AutoListItem';
import {
  AddAutoModal,
  DeleteAutoModal,
  ContactsModal,
  DebtInfoModal,
} from '../../components/auto/modals';
import { AnnounceOurServicesModal } from '../../components/auto/modals/AnnounceOurServicesModal';
import { FindAutoPanel }  from '../../components/auto/FindAutoPanel';
import { useNotification } from '../../contexts/NotificationContext';
import api from '../../services/api';

export default function AutoListScreen() {
  const router       = useRouter();
  const autoListHook = useAutoList();
  const autoActions  = useAutoActions(autoListHook.refreshAutoList, autoListHook.invalidateCache);
  const { resetViewedCount } = useNotification();
  const { columns }  = useWebLayout();

  useFocusEffect(
    useCallback(() => {
      const viewedCount = resetViewedCount();
      if (viewedCount > 0) autoListHook.decrementNotificationCount(viewedCount);
      autoListHook.updateUserData();
      autoListHook.startPulseAnimation();
      return () => autoListHook.stopPulseAnimation();
    }, [])
  );

  useEffect(() => {
    autoListHook.loadData();
  }, []);

  const handleItemPress = useCallback((item: any) => {
    autoActions.navigateToAuto(item);
  }, [autoActions]);

  const handleItemMark = useCallback((item: any, index: number) => {
    autoListHook.markItem(item, index);
  }, [autoListHook]);

  const handleEndReached = useCallback(() => {
    autoListHook.loadMore();
  }, [autoListHook]);

  const handleOrderOsagoPolicy = useCallback(async (item: any) => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) return;
      await api.post('/order-osago-policy', { token, id: item.id });
      Alert.alert(
        'Заявка отправлена',
        'Ваша заявка на оформление полиса ОСАГО принята. Мы свяжемся с вами в ближайшее время.',
        [{ text: 'OK' }]
      );
    } catch {
      Alert.alert('Ошибка', 'Не удалось отправить заявку. Попробуйте позже.', [{ text: 'OK' }]);
    }
  }, []);

  // Фиксированный % ширины на ячейку — карточки не растягиваются в неполной строке
  const cellStyle = useMemo(
    () => ({ width: `${100 / columns}%` as const, padding: 4 }),
    [columns],
  );

  const renderItem = useCallback(({ item, index }: { item: any; index: number }) => (
    <View style={cellStyle}>
      <AutoListItem
        item={item}
        index={index}
        onPress={handleItemPress}
        onMark={handleItemMark}
        onShowHideTab={autoListHook.showHideTab}
        onOrderOsagoPolicy={handleOrderOsagoPolicy}
      />
    </View>
  ), [cellStyle, handleItemPress, handleItemMark, autoListHook.showHideTab, handleOrderOsagoPolicy]);

  const showGlobalLoading = autoListHook.isLoading && autoListHook.autoList.length === 0;

  return (
    <View style={styles.container}>

      {/* ── Header ─────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Мой автопарк</Text>

        {/* Inline search — desktop only */}
        {columns >= 2 && (autoListHook.autoList.length > 0 || autoListHook.hasActiveFilters()) && (
          <View style={styles.inlineSearch}>
            <Text style={styles.inlineSearchIcon}>🔍</Text>
            <input
              type="text"
              placeholder="Поиск по номеру..."
              value={autoListHook.filters.autoStr}
              onChange={(e: any) => autoListHook.changeAutoStr(e.target.value)}
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
              <TouchableOpacity onPress={autoListHook.clearAutoStr} style={{ padding: 4 }}>
                <Text style={{ color: '#999', fontSize: 18 }}>✕</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        )}

        <View style={styles.headerActions}>
          {/* Уведомления */}
          <TouchableHighlight
            style={styles.headerBtn}
            activeOpacity={1}
            underlayColor="#F0F0F0"
            onPress={() => router.push('/(authenticated)/notifications' as any)}
          >
            <View>
              <Image source={require('../../../assets/images/notification.png')} />
              {(autoListHook.userData.notification_unviewed_count || 0) > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {autoListHook.userData.notification_unviewed_count}
                  </Text>
                </View>
              )}
            </View>
          </TouchableHighlight>

          {/* Долг */}
          {!!autoListHook.userData.debt_sum && autoListHook.userData.debt_sum !== '0.00' && (
            <TouchableHighlight
              style={styles.headerBtn}
              activeOpacity={1}
              underlayColor="#F0F0F0"
              onPress={() => autoActions.setModalDebtInfoVisible(true)}
            >
              <Image source={require('../../../assets/images/alert-circle_2.png')} />
            </TouchableHighlight>
          )}

          {/* Фильтр */}
          {autoListHook.isSearching ? (
            <View style={styles.headerBtn}>
              <ActivityIndicator size="small" color="#3A3A3A" />
            </View>
          ) : (autoListHook.autoList.length > 0 || autoListHook.hasActiveFilters()) ? (
            <TouchableHighlight
              style={styles.headerBtn}
              activeOpacity={1}
              underlayColor="#F0F0F0"
              onPress={() => autoActions.setFindAutoVisible(!autoActions.findAutoVisible)}
            >
              <Image source={require('../../../assets/images/filter.png')} />
            </TouchableHighlight>
          ) : null}
        </View>
      </View>

      {/* ── Active filter chips ─────────────────────────────────────── */}
      {autoListHook.hasActiveFilters() && (
        <View style={styles.filterBar}>
          <Text style={styles.filterLabel}>Фильтры:</Text>
          {autoListHook.getActiveFiltersText().map((f, i) => (
            <View key={i} style={styles.filterChip}>
              <Text style={styles.filterChipText}>{f}</Text>
            </View>
          ))}
          <TouchableOpacity onPress={() => autoActions.setFindAutoVisible(true)} style={styles.filterLink}>
            <Text style={styles.filterLinkText}>Изменить</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={autoListHook.clearAllFilters} style={styles.filterLink}>
            <Text style={[styles.filterLinkText, { color: '#EE505A' }]}>Сбросить</Text>
          </TouchableOpacity>
        </View>
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

      {/* ── Count + Add button ──────────────────────────────────────── */}
      {!showGlobalLoading && (
        <View style={styles.toolbar}>
          <Text style={styles.countText}>
            Всего {autoListHook.autoListCount || 0} авто
          </Text>
          <TouchableHighlight
            activeOpacity={1}
            underlayColor="#F0F0F0"
            onPress={() => autoActions.setModalAddAutoVisible(true)}
            style={styles.addBtn}
          >
            <View style={styles.addBtnInner}>
              <Text style={styles.addBtnText}>Добавить авто</Text>
              <Image source={require('../../../assets/images/edit_2.png')} />
            </View>
          </TouchableHighlight>
        </View>
      )}

      {/* ── List / Grid ─────────────────────────────────────────────── */}
      {showGlobalLoading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color="#313131" />
        </View>
      ) : (
        <FlatList
          // key forces remount when column count changes (RN requirement for numColumns)
          key={String(columns)}
          numColumns={columns}
          // flex-start: неполная последняя строка выравнивается влево, а не растягивается
          columnWrapperStyle={columns > 1 ? styles.row : undefined}
          data={autoListHook.autoList}
          renderItem={renderItem}
          keyExtractor={(item, idx) => item.id || String(idx)}
          ListEmptyComponent={() => (
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyText}>
                {autoListHook.hasActiveFilters() ? 'Ничего не найдено' : 'Список авто пуст'}
              </Text>
              {!autoListHook.hasActiveFilters() && (
                <Text style={styles.emptySubText}>
                  Добавьте первое авто нажав на кнопку выше
                </Text>
              )}
            </View>
          )}
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.5}
          refreshing={autoListHook.isRefreshing}
          onRefresh={autoListHook.refreshAutoList}
          contentContainerStyle={styles.listContent}
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

      {/* ── Modals ──────────────────────────────────────────────────── */}
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

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F8F8',
  },

  // ── Header ────────────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E8',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  inlineSearch: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginHorizontal: 16,
    maxWidth: 320,
    height: 40,
  },
  inlineSearchIcon: {
    fontSize: 14,
    marginRight: 8,
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -6,
    backgroundColor: '#EE505A',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // ── Filter bar ────────────────────────────────────────────────────────────
  filterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F0F0F0',
    borderBottomWidth: 1,
    borderBottomColor: '#D8D8D8',
    gap: 6,
  },
  filterLabel: {
    fontSize: 12,
    color: '#666',
  },
  filterChip: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: '#3A3A3A',
  },
  filterChipText: {
    fontSize: 11,
    color: '#3A3A3A',
    fontWeight: '500',
  },
  filterLink: {
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  filterLinkText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#3A3A3A',
  },

  // ── Toolbar ───────────────────────────────────────────────────────────────
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E8',
  },
  countText: {
    fontSize: 13,
    color: '#666',
  },
  addBtn: {
    borderRadius: 8,
  },
  addBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
  },
  addBtnText: {
    fontSize: 13,
    color: '#3A3A3A',
  },

  // ── List/Grid ─────────────────────────────────────────────────────────────
  listContent: {
    padding: 8,
    paddingBottom: 24,
  },
  // Строка сетки: выравнивание влево, чтобы неполная последняя строка не растягивалась
  row: {
    justifyContent: 'flex-start',
    flexWrap: 'wrap',
  },
  // Базовый стиль ячейки (ширина задаётся через cellStyle — useMemo)
  gridCell: {
    padding: 4,
  },

  // ── States ────────────────────────────────────────────────────────────────
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8F8F8',
  },
  emptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
    paddingBottom: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
  },
  emptySubText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginTop: 10,
  },
});
