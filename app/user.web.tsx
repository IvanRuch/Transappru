/**
 * Web version of User / Profile screen.
 *
 * Shares all business logic with mobile via useUserProfile (ADR-003) and
 * the `ContactCard`/`ContactEditModal`/`UserProfileInfo`/`ConfirmModal`
 * sub-components (ADR-005).
 *
 * Does NOT wrap in WebAppLayout — authenticated layout (`_layout.web.tsx`)
 * already provides it (see .claude/rules.md).
 */
import React, { useCallback } from 'react';
import { View, Text, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenHeader, ConfirmModal } from '../src/components/common';
import WebScreenContainer from '../src/components/web/WebScreenContainer';
import { ContactCard, ContactEditModal, UserProfileInfo } from '../src/components/user';
import { useUserProfile } from '../src/hooks/useUserProfile';
import { showAlert } from '../src/utils/alert';

export default function UserScreenWeb() {
  const router = useRouter();

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

  const onSave = useCallback(async () => {
    const err = await saveContact();
    if (err) showAlert('Ошибка', err);
  }, [saveContact]);

  const onDeleteContact = useCallback(async () => {
    const err = await deleteContact();
    if (err) showAlert('Ошибка', err);
  }, [deleteContact]);

  const onDeleteProfile = useCallback(async () => {
    const err = await deleteProfile();
    if (err) showAlert('Ошибка', err);
  }, [deleteProfile]);

  const safeBack = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/main' as any);
  }, [router]);

  return (
    <View className="flex-1">
      <ScreenHeader title="Профиль" onBack={safeBack} />

      <WebScreenContainer maxWidth={820}>
        {loading ? (
          <View className="flex-1 items-center justify-center p-10">
            <ActivityIndicator size="large" color="#313131" />
          </View>
        ) : (
          <ScrollView className="flex-1" contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>
            <UserProfileInfo user={userData} />

            <View className="bg-white rounded-xl p-5 mb-4">
              <View className="flex-row justify-between items-center mb-3">
                <Text className="text-[17px] font-bold text-text-primary select-none">Контакты</Text>
                <Pressable
                  className="px-3.5 py-1.5 rounded-lg bg-bg-secondary cursor-pointer"
                  onPress={openAddContact}
                  accessibilityRole="button"
                  accessibilityLabel="Добавить контакт"
                >
                  <Text className="text-sm text-text-primary font-semibold select-none">+ Добавить</Text>
                </Pressable>
              </View>

              {contactList.length === 0 ? (
                <Text className="text-sm italic text-text-muted select-none">Контакты не добавлены</Text>
              ) : (
                <View accessibilityRole={'list' as any} aria-label="Список контактов">
                  {contactList.map(c => (
                    <ContactCard key={c.id} contact={c} onPress={openEditContact} />
                  ))}
                </View>
              )}
            </View>

            <View className="bg-white rounded-xl p-5 mb-4">
              <Pressable
                className="flex-row justify-between items-center cursor-pointer"
                onPress={() => router.push('/(authenticated)/notification-settings' as any)}
                accessibilityRole="button"
                accessibilityLabel="Настройки уведомлений"
              >
                <Text className="text-[15px] font-semibold text-text-primary select-none">
                  Настройки уведомлений
                </Text>
                <Text className="text-xl text-text-muted select-none">›</Text>
              </Pressable>
            </View>

            <View className="bg-white rounded-xl p-5 mb-4">
              <Pressable
                className="py-3.5 rounded-xl items-center border border-border-primary bg-white mb-3 cursor-pointer"
                onPress={openLogout}
                accessibilityRole="button"
                accessibilityLabel="Выйти из аккаунта"
              >
                <Text className="text-[15px] font-medium text-text-primary select-none">
                  Выйти из аккаунта
                </Text>
              </Pressable>
              <Pressable
                className="py-3.5 rounded-xl items-center bg-status-error cursor-pointer"
                onPress={openDeleteProfile}
                accessibilityRole="button"
                accessibilityLabel="Удалить профиль"
              >
                <Text className="text-[15px] font-semibold text-white select-none">Удалить профиль</Text>
              </Pressable>
            </View>
          </ScrollView>
        )}
      </WebScreenContainer>

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
        title="Выйти из аккаунта?"
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
