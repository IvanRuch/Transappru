import React, { useEffect, useCallback } from 'react';
import { View, Text, FlatList, TouchableHighlight, TouchableOpacity, ActivityIndicator, Animated, StyleSheet, Image, Platform, StatusBar, Alert } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useRouter } from 'expo-router';

import { useAutoList } from '../../hooks/useAutoList';
import { useAutoActions } from '../../hooks/useAutoActions';
import { AutoListItem } from '../../components/auto/AutoListItem';
import {
  MenuAdd,
  SelMenuAdd,
  MenuUser,
  MenuContacts,
  MenuCharges,
  SelMenuDelItem,
  SelMenuPass,
  SelMenuUndoSelect,
  SelMenuAddDriver,
  MenuInviteUser,
} from '../../components/auto/AutoListMenu';
import {
  AddAutoModal,
  DeleteAutoModal,
  ContactsModal,
  LeftMenuModal,
  DebtInfoModal,
} from '../../components/auto/modals';
import { AnnounceOurServicesModal } from '../../components/auto/modals/AnnounceOurServicesModal';
import { FindAutoPanel } from '../../components/auto/FindAutoPanel';
import { useNotification } from '../../contexts/NotificationContext';
import api from '../../services/api';

export default function AutoListScreen() {
  const router = useRouter();
  const { bottom: bottomInset } = useSafeAreaInsets();
  const autoListHook = useAutoList();
  const autoActions = useAutoActions(autoListHook.refreshAutoList, autoListHook.invalidateCache);
  const { resetViewedCount } = useNotification();

  useFocusEffect(
    useCallback(() => {
      console.log('AutoListScreen focused');
      const viewedCount = resetViewedCount();
      if (viewedCount > 0) {
        autoListHook.decrementNotificationCount(viewedCount);
      }
      autoListHook.updateUserData();
      autoListHook.startPulseAnimation();
      return () => autoListHook.stopPulseAnimation();
    }, [])
  );

  useEffect(() => {
    console.log('AutoListScreen mounted');
    autoListHook.loadData(); // Используем loadData вместо getAutoList
  }, []);

  const handleItemPress = useCallback((item: any) => {
    autoActions.navigateToAuto(item);
  }, [autoActions]);

  const handleItemMark = useCallback((item: any, index: number) => {
    autoListHook.markItem(item, index);
  }, [autoListHook]);

  const handleEndReached = useCallback(() => {
    autoListHook.loadMore(); // Используем loadMore
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
    } catch (error) {
      console.error('Error ordering OSAGO policy:', error);
      Alert.alert(
        'Ошибка',
        'Не удалось отправить заявку. Попробуйте позже.',
        [{ text: 'OK' }]
      );
    }
  }, []);

  const renderItem = useCallback(({ item, index }: { item: any; index: number }) => {
    return (
      <AutoListItem
        item={item}
        index={index}
        onPress={handleItemPress}
        onMark={handleItemMark}
        onShowHideTab={autoListHook.showHideTab}
        onOrderOsagoPolicy={handleOrderOsagoPolicy}
      />
    );
  }, [handleItemPress, handleItemMark, autoListHook.showHideTab, handleOrderOsagoPolicy]);

  // Определяем состояние загрузки для UI
  const showGlobalLoading = autoListHook.isLoading && autoListHook.autoList.length === 0;
  const showSearchLoading = autoListHook.isSearching;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" translucent={false} />
      
      {/* Хедер */}
      {!!(autoListHook.userData && autoListHook.userData.firm) && (
        <View style={styles.headerContainer}>
          <TouchableHighlight
            style={styles.headerButton}
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
            style={styles.headerButton}
            activeOpacity={1}
            underlayColor="#ffffff"
            onPress={() => router.push('/(authenticated)/notifications' as any)}
          >
            <View>
              <Image source={require('../../../assets/images/notification.png')} />
              {(autoListHook.userData.notification_unviewed_count || 0) > 0 && (
                <View style={styles.notificationBadge}>
                  <Text style={styles.notificationBadgeText} numberOfLines={1}>
                    {autoListHook.userData.notification_unviewed_count}
                  </Text>
                </View>
              )}
            </View>
          </TouchableHighlight>

          {!!autoListHook.userData.debt_sum && autoListHook.userData.debt_sum !== '0.00' && (
            <TouchableHighlight
              style={styles.headerButton}
              activeOpacity={1}
              underlayColor="#ffffff"
              onPress={() => autoActions.setModalDebtInfoVisible(true)}
            >
              <Image source={require('../../../assets/images/alert-circle_2.png')} />
            </TouchableHighlight>
          )}

          <Text style={styles.header}>Мой автопарк</Text>

          {/* Индикатор поиска в хедере */}
          {showSearchLoading ? (
            <View style={styles.headerButton}>
               <ActivityIndicator size="small" color="#3A3A3A" />
            </View>
          ) : (
            autoListHook.autoList.length > 0 || autoListHook.hasActiveFilters() ? (
              <TouchableHighlight
                style={styles.headerButton}
                activeOpacity={1}
                underlayColor="#ffffff"
                onPress={() => autoActions.setFindAutoVisible(!autoActions.findAutoVisible)}
              >
                <Image source={require('../../../assets/images/filter.png')} />
              </TouchableHighlight>
            ) : (
              <View style={styles.headerButton} />
            )
          )}
        </View>
      )}

      {/* Панель активных фильтров */}
      {autoListHook.hasActiveFilters() && (
        <View style={styles.filterPanel}>
          <View style={styles.filterChipsContainer}>
            <Text style={styles.filterLabel}>Активные фильтры:</Text>
            {autoListHook.getActiveFiltersText().map((filter, index) => (
              <View key={index} style={styles.filterChip}>
                <Text style={styles.filterChipText}>{filter}</Text>
              </View>
            ))}
            <TouchableOpacity onPress={() => autoActions.setFindAutoVisible(true)} style={styles.filterAction}>
              <Text style={styles.filterActionText}>Изменить</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => autoListHook.clearAllFilters()} style={styles.filterAction}>
              <Text style={[styles.filterActionText, { color: '#EE505A' }]}>Сбросить все</Text>
            </TouchableOpacity>
          </View>
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

      {!showGlobalLoading && (
        <View style={styles.autoCountRow}>
          <View style={styles.autoCountLeft}>
            <Text style={styles.autoCountText}>
              Всего {autoListHook.autoListCount || 0} авто:
            </Text>
          </View>
          <View style={styles.autoCountRight}>
            <TouchableHighlight
              activeOpacity={1}
              underlayColor="#ffffff"
              onPress={() => autoActions.setModalAddAutoVisible(true)}
            >
              <View style={styles.addAutoButton}>
                <Text style={styles.addAutoText}>добавить авто</Text>
                <Image source={require('../../../assets/images/edit_2.png')} />
              </View>
            </TouchableHighlight>
          </View>
        </View>
      )}

      {showGlobalLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#313131" />
        </View>
      ) : (
        <FlatList
          data={autoListHook.autoList}
          renderItem={renderItem}
          keyExtractor={(item, index) => item.id || index.toString()}
          ListEmptyComponent={() => (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                {autoListHook.hasActiveFilters() ? 'Ничего не найдено' : 'Список авто пуст'}
              </Text>
              {!autoListHook.hasActiveFilters() && (
                <Text style={styles.emptySubText}>Добавьте первое авто нажав на кнопку выше</Text>
              )}
            </View>
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

      {/* Нижнее меню */}
      {!!(autoListHook.userData && autoListHook.userData.firm) && (
        <View style={[styles.bottomMenu, { paddingBottom: Math.max(bottomInset, 10) }]}>
          {autoListHook.markedCnt === 0 ? (
            <View style={styles.menuContainer}>
              <View style={styles.menuItem}>
                <TouchableHighlight activeOpacity={1} underlayColor='#EEEEEE' onPress={() => autoActions.setModalAddAutoVisible(true)}>
                  <SelMenuPass />
                </TouchableHighlight>
              </View>
              <View style={styles.menuItem}>
                <TouchableHighlight activeOpacity={1} underlayColor='#EEEEEE' onPress={autoActions.navigateToProfile}>
                  <MenuUser />
                </TouchableHighlight>
              </View>
              <View style={styles.menuItem}>
                <TouchableHighlight activeOpacity={1} underlayColor='#EEEEEE' onPress={() => router.push({ pathname: '/invite-user' as any, params: { manager_data: JSON.stringify(autoListHook.managerData) } })}>
                  <MenuInviteUser />
                </TouchableHighlight>
              </View>
              <View style={styles.menuItem}>
                <TouchableHighlight activeOpacity={1} underlayColor='#EEEEEE' onPress={autoActions.openContacts}>
                  <MenuContacts />
                </TouchableHighlight>
              </View>
            </View>
          ) : (
            <View style={styles.menuContainerSelected}>
              <View style={styles.menuItem}>
                <TouchableHighlight activeOpacity={1} underlayColor='#D9D9D9' onPress={() => autoActions.setModalDelAutoVisible(true)}>
                  <SelMenuDelItem />
                </TouchableHighlight>
              </View>
              <View style={styles.menuItem}>
                <TouchableHighlight activeOpacity={1} underlayColor='#D9D9D9' onPress={() => { const markedAutos = autoListHook.autoList.filter(item => item.marked); autoActions.navigateToPass(markedAutos); }}>
                  <SelMenuPass />
                </TouchableHighlight>
              </View>
              <View style={styles.menuItem}>
                <TouchableHighlight activeOpacity={1} underlayColor='#D9D9D9' onPress={autoListHook.undoSelect}>
                  <SelMenuUndoSelect />
                </TouchableHighlight>
              </View>
            </View>
          )}
        </View>
      )}

      {/* Модальные окна (без изменений) */}
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
          const markedIds = autoListHook.autoList.filter(item => item.marked).map(item => item.id);
          await autoActions.deleteAuto(token, markedIds);
        }}
        onCancel={() => autoActions.setModalDelAutoVisible(false)}
      />

      <ContactsModal
        visible={autoActions.modalViewContacts}
        managerData={autoListHook.managerData}
        techSupportData={autoListHook.techSupportData}
        techSupportName={autoListHook.techSupportName}
        userId={autoListHook.userData.id} // Передаем ID
        userInn={autoListHook.userData.inn} // Передаем ИНН
        onClose={() => autoActions.setModalViewContacts(false)}
        onContactPhone={autoActions.contactPhone}
        onContactEmail={autoActions.contactEmail}
      />

      <LeftMenuModal
        visible={autoActions.menuLeftVisible}
        userData={autoListHook.userData}
        ourServicesList={autoListHook.ourServicesList}
        otherUserList={autoListHook.otherUserList}
        onboardingExpired={autoListHook.onboardingExpired}
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
            onFinally
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingTop: 8,
    paddingBottom: 8,
    backgroundColor: '#fff',
  },
  headerButton: {
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 40,
    height: 40, // Фиксированная высота для предотвращения скачков при смене на спиннер
  },
  header: {
    flex: 1,
    textAlign: 'center',
    fontSize: 24,
    fontWeight: 'bold',
    color: '#313131',
    marginHorizontal: 10,
  },
  notificationBadge: {
    flexDirection: 'row',
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#EE505A',
    borderRadius: 12,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#FFFFFF',
    paddingHorizontal: 4,
  },
  autoCountRow: {
    flexDirection: 'row',
    marginTop: 10,
    marginBottom: 5,
  },
  autoCountLeft: {
    flex: 1,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  autoCountText: {
    paddingLeft: 30,
    paddingRight: 16,
    paddingBottom: 0,
    fontSize: 12,
    fontWeight: 'normal',
    color: '#656565',
  },
  autoCountRight: {
    flex: 1,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  addAutoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 30,
  },
  addAutoText: {
    paddingLeft: 16,
    paddingRight: 5,
    paddingBottom: 0,
    fontSize: 12,
    fontWeight: 'normal',
    color: '#656565',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 50,
    paddingBottom: 50,
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
  bottomMenu: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
  },
  menuContainer: {
    flexDirection: 'row',
    backgroundColor: '#EEEEEE',
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#B8B8B8',
    height: 80,
  },
  menuContainerSelected: {
    flexDirection: 'row',
    backgroundColor: '#D9D9D9',
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#B8B8B8',
    height: 80,
  },
  menuItem: {
    flex: 1,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterPanel: {
    backgroundColor: '#EEEEEE',
    borderBottomWidth: 1,
    borderBottomColor: '#B8B8B8',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  filterChipsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  filterLabel: {
    fontSize: 12,
    color: '#656565',
    marginRight: 8,
  },
  filterChip: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginRight: 6,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: '#3A3A3A',
  },
  filterChipText: {
    fontSize: 11,
    color: '#3A3A3A',
    fontWeight: '500',
  },
  filterAction: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  filterActionText: {
    fontSize: 11,
    color: '#3A3A3A',
    fontWeight: 'bold',
  },
});
