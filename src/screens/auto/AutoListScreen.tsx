import React, { useEffect, useCallback } from 'react';
import { View, Text, FlatList, TouchableHighlight, TouchableOpacity, ActivityIndicator, Animated, StyleSheet, Image, Platform, StatusBar } from 'react-native';
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

export default function AutoListScreen() {
  // Хуки
  const router = useRouter();
  const { bottom: bottomInset } = useSafeAreaInsets();
  const autoListHook = useAutoList();
  const autoActions = useAutoActions(autoListHook.refreshAutoList, autoListHook.invalidateCache);

  // При фокусе на экран - обновляем данные пользователя и запускаем анимацию
  useFocusEffect(
    useCallback(() => {
      console.log('AutoListScreen focused');
      // Обновляем счетчики уведомлений
      autoListHook.updateUserData();
      // Запускаем анимацию
      autoListHook.startPulseAnimation();
      
      return () => {
        autoListHook.stopPulseAnimation();
      };
    }, [])
  );

  // При первом рендере
  useEffect(() => {
    console.log('AutoListScreen mounted');
    AsyncStorage.getItem('token').then(token => {
      autoListHook.getAutoList(token);
    });
  }, []);

  // Обработчик нажатия на элемент списка (переход к деталям)
  const handleItemPress = useCallback((item: any) => {
    autoActions.navigateToAuto(item);
  }, [autoActions]);

  // Обработчик отметки элемента
  const handleItemMark = useCallback((item: any, index: number) => {
    autoListHook.markItem(item, index);
  }, [autoListHook]);

  // Обработчик пагинации
  const handleEndReached = useCallback(() => {
    autoListHook.onEndReached();
  }, [autoListHook]);

  // Рендер элемента списка
  const renderItem = useCallback(({ item, index }: { item: any; index: number }) => {
    return (
      <AutoListItem
        item={item}
        index={index}
        onPress={handleItemPress}
        onMark={handleItemMark}
        onShowHideTab={autoListHook.showHideTab}
      />
    );
  }, [handleItemPress, handleItemMark, autoListHook.showHideTab]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar 
        barStyle="dark-content"
        backgroundColor="#ffffff"
        translucent={false}
      />
      
      {/* Хедер с заголовком и кнопками */}
      {autoListHook.userData && autoListHook.userData.firm && (
        <View style={styles.headerContainer}>
          {/* Кнопка меню слева (гамбургер) */}
          <TouchableHighlight
            style={styles.headerButton}
            activeOpacity={1}
            underlayColor="#ffffff"
            onPress={() => {
              console.log('-> call MenuLeft');
              autoActions.setMenuLeftVisible(true);
            }}
          >
            <Image 
              source={
                (autoListHook.userData.other_user_notification_unviewed_count || 0) > 0
                  ? require('../../../assets/images/menu_left_notification_unviewed.png')
                  : require('../../../assets/images/menu_left.png')
              } 
            />
          </TouchableHighlight>

          {/* Кнопка уведомлений (колокольчик) */}
          <TouchableHighlight
            style={styles.headerButton}
            activeOpacity={1}
            underlayColor="#ffffff"
            onPress={() => {
              console.log('-> move to NotificationList');
              router.push('/(authenticated)/notifications' as any);
            }}
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

          {/* Кнопка задолженности (если есть) */}
          {autoListHook.userData.debt_sum && autoListHook.userData.debt_sum !== '0.00' && (
            <TouchableHighlight
              style={styles.headerButton}
              activeOpacity={1}
              underlayColor="#ffffff"
              onPress={() => {
                console.log('-> show debt info');
                autoActions.setModalDebtInfoVisible(true);
              }}
            >
              <Image source={require('../../../assets/images/alert-circle_2.png')} />
            </TouchableHighlight>
          )}

          {/* Заголовок "Мой автопарк" */}
          <Text style={styles.header}>Мой автопарк</Text>

          {/* Кнопка фильтра (если есть авто) */}
          {autoListHook.autoList.length > 0 ? (
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
          )}
        </View>
      )}

      {/* Панель активных фильтров */}
      {autoListHook.hasActiveFilters() && !autoListHook.indicator && (
        <View style={{
          backgroundColor: '#EEEEEE',
          borderBottomWidth: 1,
          borderBottomColor: '#B8B8B8',
          paddingHorizontal: 20,
          paddingVertical: 10,
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
            <Text style={{ fontSize: 12, color: '#656565', marginRight: 8 }}>
              Активные фильтры:
            </Text>
            {autoListHook.getActiveFiltersText().map((filter, index) => (
              <View
                key={index}
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: 12,
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  marginRight: 6,
                  marginBottom: 4,
                  borderWidth: 1,
                  borderColor: '#3A3A3A',
                }}
              >
                <Text style={{ fontSize: 11, color: '#3A3A3A', fontWeight: '500' }}>
                  {filter}
                </Text>
              </View>
            ))}
            <TouchableOpacity
              onPress={() => autoActions.setFindAutoVisible(true)}
              style={{
                paddingHorizontal: 8,
                paddingVertical: 4,
              }}
            >
              <Text style={{ fontSize: 11, color: '#3A3A3A', fontWeight: 'bold' }}>
                Изменить
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => autoListHook.clearAllFilters()}
              style={{
                paddingHorizontal: 8,
                paddingVertical: 4,
                marginLeft: 4,
              }}
            >
              <Text style={{ fontSize: 11, color: '#EE505A', fontWeight: 'bold' }}>
                Сбросить все
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Панель фильтрации (модальное окно снизу) */}
      <FindAutoPanel
        visible={autoActions.findAutoVisible}
        autoStr={autoListHook.autoStr}
        autoCancelled={autoListHook.autoCancelled}
        autoPassEnded={autoListHook.autoPassEnded}
        autoPassEnds={autoListHook.autoPassEnds}
        autoPassEndsUntilDate={autoListHook.autoPassEndsUntilDate}
        onChangeAutoStr={autoListHook.changeAutoStr}
        onClearAutoStr={autoListHook.clearAutoStr}
        onClearAllFilters={autoListHook.clearAllFilters}
        onToggleCancelled={autoListHook.toggleAutoCancelled}
        onTogglePassEnded={autoListHook.toggleAutoPassEnded}
        onChangePassEndsDate={autoListHook.changeAutoPassEndsUntilDate}
        onClose={() => autoActions.setFindAutoVisible(false)}
      />

      {/* Счетчик и "добавить авто" */}
      {!autoListHook.indicator && (
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

      {/* Индикатор загрузки списка */}
      {autoListHook.indicator && (
        <ActivityIndicator size="large" color="#313131" />
      )}

      {/* Список авто */}
      <FlatList
        data={autoListHook.autoList}
        renderItem={renderItem}
        keyExtractor={(item, index) => item.id || index.toString()}
        ListEmptyComponent={() => (
          !autoListHook.indicator ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Список авто пуст</Text>
              <Text style={styles.emptySubText}>
                Добавьте первое авто нажав на кнопку выше
              </Text>
            </View>
          ) : null
        )}
        onEndReached={autoListHook.autoList.length > 0 && !autoListHook.indicator ? handleEndReached : undefined}
        onEndReachedThreshold={0.5}
        refreshing={false}
        onRefresh={autoListHook.refreshAutoList}
        contentContainerStyle={{ 
          paddingBottom: 80 + Math.max(bottomInset, 10) + 20
        }}
        style={{ flex: 1 }}
      />

      {/* Нижнее меню - как в оригинале (position: absolute) */}
      {autoListHook.userData && autoListHook.userData.firm && (
        <View style={[styles.bottomMenu, { paddingBottom: Math.max(bottomInset, 10) }]}>
          {autoListHook.markedCnt === 0 ? (
            // Обычное меню
            <View style={styles.menuContainer}>
              <View style={styles.menuItem}>
                <TouchableHighlight
                  activeOpacity={1}
                  underlayColor='#EEEEEE'
                  onPress={() => autoActions.setModalAddAutoVisible(true)}
                >
                  <SelMenuPass />
                </TouchableHighlight>
              </View>

              <View style={styles.menuItem}>
                <TouchableHighlight
                  activeOpacity={1}
                  underlayColor='#EEEEEE'
                  onPress={autoActions.navigateToProfile}
                >
                  <MenuUser />
                </TouchableHighlight>
              </View>

              <View style={styles.menuItem}>
                <TouchableHighlight
                  activeOpacity={1}
                  underlayColor='#EEEEEE'
                  onPress={() => {
                    console.log('-> move to invite user');
                    router.push({
                      pathname: '/invite-user' as any,
                      params: {
                        manager_data: JSON.stringify(autoListHook.managerData)
                      }
                    });
                  }}
                >
                  <MenuInviteUser />
                </TouchableHighlight>
              </View>

              <View style={styles.menuItem}>
                <TouchableHighlight
                  activeOpacity={1}
                  underlayColor='#EEEEEE'
                  onPress={autoActions.openContacts}
                >
                  <MenuContacts />
                </TouchableHighlight>
              </View>
            </View>
            ) : (
              // Меню с выделенными элементами
              <View style={styles.menuContainerSelected}>
                <View style={styles.menuItem}>
                  <TouchableHighlight
                    activeOpacity={1}
                    underlayColor='#D9D9D9'
                    onPress={() => autoActions.setModalDelAutoVisible(true)}
                  >
                    <SelMenuDelItem />
                  </TouchableHighlight>
                </View>

              <View style={styles.menuItem}>
                <TouchableHighlight
                  activeOpacity={1}
                  underlayColor='#D9D9D9'
                  onPress={() => {
                    const markedAutos = autoListHook.autoList.filter(item => item.marked);
                    autoActions.navigateToPass(markedAutos);
                  }}
                >
                  <SelMenuPass />
                </TouchableHighlight>
              </View>

              <View style={styles.menuItem}>
                <TouchableHighlight
                  activeOpacity={1}
                  underlayColor='#D9D9D9'
                  onPress={autoListHook.undoSelect}
                >
                  <SelMenuUndoSelect />
                </TouchableHighlight>
              </View>
            </View>
          )}
        </View>
      )}

      {/* Модальные окна */}
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
          const markedIds = autoListHook.autoList
            .filter(item => item.marked)
            .map(item => item.id);
          await autoActions.deleteAuto(token, markedIds);
        }}
        onCancel={() => autoActions.setModalDelAutoVisible(false)}
      />

      <ContactsModal
        visible={autoActions.modalViewContacts}
        managerData={autoListHook.managerData}
        techSupportData={autoListHook.techSupportData}
        techSupportName={autoListHook.techSupportName}
        onClose={() => autoActions.setModalViewContacts(false)}
        onContactPhone={autoActions.contactPhone}
        onContactEmail={autoActions.contactEmail}
      />

      {/* Левое меню */}
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
        onSwitchOrganization={(inn, onSuccess) => {
          autoActions.switchOrganization(inn, () => {
            // Перезагружаем данные после переключения
            autoListHook.reloadData();
            if (onSuccess) onSuccess();
          });
        }}
      />

      {/* Модальное окно "Наши услуги" */}
      <AnnounceOurServicesModal
        visible={autoListHook.announceOurServicesVisible}
        onClose={autoListHook.closeAnnounceOurServices}
      />

      {/* Модальное окно задолженности */}
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
  loadingText: {
    marginTop: 20,
    fontSize: 16,
    color: '#666',
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
});
