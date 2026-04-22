import React from 'react';
import { View, Text, ScrollView, ActivityIndicator, Pressable, Image } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { ScreenHeader, ConfirmModal } from '../src/components/common';
import { ContactCard, ContactEditModal, UserProfileInfo } from '../src/components/user';
import { useUserProfile } from '../src/hooks/useUserProfile';
import { useTheme } from '../src/contexts/ThemeContext';
import { showAlert } from '../src/utils/alert';

export default function UserScreen() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();

  const {
    loading, saving,
    userData, contactList,
    contactForm, editMode, isPhoneValid, updateContactField,
    editModalVisible, openAddContact, openEditContact, closeEditContact,
    deleteContactVisible, openDeleteContact, closeDeleteContact,
    logoutVisible, openLogout, closeLogout,
    deleteProfileVisible, openDeleteProfile, closeDeleteProfile,
    saveContact, deleteContact, logout, deleteProfile,
  } = useUserProfile();

  const onSave = async () => {
    const err = await saveContact();
    if (err) showAlert('Ошибка', err);
  };
  const onDeleteContact = async () => {
    const err = await deleteContact();
    if (err) showAlert('Ошибка', err);
  };
  const onDeleteProfile = async () => {
    const err = await deleteProfile();
    if (err) showAlert('Ошибка', err);
  };

  const cycleTheme = () => {
    const order: Array<'auto' | 'light' | 'dark'> = ['auto', 'light', 'dark'];
    setTheme(order[(order.indexOf(theme) + 1) % order.length]);
  };

  const safeBack = () => (router.canGoBack() ? router.back() : router.replace('/main' as any));

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-light-bg dark:bg-dark-bg">
        <ActivityIndicator size="large" color="#3A8FD9" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-light-bg dark:bg-dark-bg">
      <ScreenHeader title="Профиль" onBack={safeBack} />

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>
        <UserProfileInfo user={userData} />

        {__DEV__ && (
          <View className="bg-white rounded-xl p-5 mb-4">
            <Text className="text-[17px] font-bold text-text-primary mb-3 select-none">
              Тема приложения
            </Text>
            <Pressable
              className="h-14 px-5 rounded-lg border bg-white border-text-secondary flex-row items-center justify-between"
              onPress={cycleTheme}
            >
              <View className="flex-row items-center">
                <Text className="text-2xl mr-3">
                  {theme === 'dark' ? '🌙' : theme === 'light' ? '☀️' : '🔄'}
                </Text>
                <Text className="text-lg text-text-primary">
                  {theme === 'light' ? 'Светлая' : theme === 'dark' ? 'Темная' : 'Авто'}
                </Text>
              </View>
              <Text className="text-sm text-text-secondary select-none">Нажмите для смены</Text>
            </Pressable>
          </View>
        )}

        <View className="bg-white rounded-xl p-5 mb-4">
          <View className="flex-row justify-between items-center mb-3">
            <Text className="text-[17px] font-bold text-text-primary select-none">Контакты</Text>
            <Pressable
              className="flex-row items-center"
              onPress={openAddContact}
              accessibilityRole="button"
              accessibilityLabel="Добавить контакт"
            >
              <Image source={require('../assets/images/add_button_2.png')} />
              <Text className="text-[15px] text-text-primary ml-2 select-none">Добавить</Text>
            </Pressable>
          </View>

          {contactList.length === 0 ? (
            <Text className="text-sm italic text-text-muted select-none">
              Контакты не добавлены
            </Text>
          ) : (
            contactList.map(c => (
              <ContactCard key={c.id} contact={c} onPress={openEditContact} />
            ))
          )}
        </View>

        {__DEV__ && (
          <Pressable
            className="bg-[#FF9800] rounded-lg p-4 mb-4 items-center cursor-pointer"
            onPress={async () => {
              try {
                await AsyncStorage.clear();
                showAlert('Готово', 'Данные приложения очищены. Приложение будет перезапущено.');
                router.replace('/' as any);
              } catch {
                showAlert('Ошибка', 'Ошибка при очистке данных');
              }
            }}
          >
            <Text className="text-base font-bold text-white">🗑️ Очистить данные (DEV)</Text>
          </Pressable>
        )}

        <Pressable
          className="py-4 rounded-xl items-center border border-border-primary bg-white mb-3"
          onPress={() => router.push('/(authenticated)/notification-settings' as any)}
          accessibilityRole="button"
          accessibilityLabel="Настройки уведомлений"
        >
          <Text className="text-base font-medium text-text-primary select-none">
            Настройки уведомлений
          </Text>
        </Pressable>

        <Pressable
          className="py-4 rounded-xl items-center border border-border-primary bg-white mb-3"
          onPress={openLogout}
          accessibilityRole="button"
          accessibilityLabel="Выйти из аккаунта"
        >
          <Text className="text-base font-medium text-text-primary select-none">
            Выйти из аккаунта
          </Text>
        </Pressable>

        <Pressable
          className="py-4 rounded-xl items-center bg-accent-secondary mb-3 flex-row justify-center cursor-pointer"
          onPress={openDeleteProfile}
          accessibilityRole="button"
          accessibilityLabel="Удалить профиль"
        >
          <Image source={require('../assets/images/delete_white_2.png')} />
          <Text className="text-lg font-semibold text-white ml-2.5 select-none">
            Удалить профиль
          </Text>
        </Pressable>
      </ScrollView>

      <ContactEditModal
        visible={editModalVisible}
        mode={editMode}
        form={contactForm}
        isPhoneValid={isPhoneValid}
        saving={saving}
        onChangeField={updateContactField}
        onSave={onSave}
        onClose={closeEditContact}
        onRequestDelete={editMode === 'edit' ? openDeleteContact : undefined}
      />

      <ConfirmModal
        visible={deleteContactVisible}
        title="Удалить контакт?"
        confirmLabel="Удалить"
        confirmVariant="danger"
        onConfirm={onDeleteContact}
        onCancel={closeDeleteContact}
      />

      <ConfirmModal
        visible={logoutVisible}
        title="Вы действительно хотите выйти из аккаунта?"
        confirmLabel="Выйти"
        onConfirm={() => { closeLogout(); logout(); }}
        onCancel={closeLogout}
      />

      <ConfirmModal
        visible={deleteProfileVisible}
        title="Удалить профиль?"
        message="Все ваши данные будут удалены вместе с ним"
        confirmLabel="Удалить профиль"
        confirmVariant="danger"
        onConfirm={() => { closeDeleteProfile(); onDeleteProfile(); }}
        onCancel={closeDeleteProfile}
      />
    </View>
  );
}

