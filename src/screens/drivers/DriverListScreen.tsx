import React from 'react';
import { View, Text, ActivityIndicator, Pressable, ScrollView, StatusBar, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ScreenHeader } from '../../components/common';
import { DriverCard, DriverEditModal, DriverDeleteModal } from '../../components/drivers';
import { useDriverList } from '../../hooks/useDriverList';
import { showAlert } from '../../utils/alert';

export default function DriverListScreen() {
  const router = useRouter();
  const {
    drivers, loading, saving,
    form, editMode, isFormValid, changeField,
    editModalVisible, deleteModalVisible,
    saveDriver, deleteDriver,
    openAdd, openEdit, closeEditModal, openDeleteConfirm, closeDeleteModal,
  } = useDriverList();

  const onSave = async () => {
    const err = await saveDriver();
    if (err) showAlert('Ошибка', err);
  };

  const onDelete = async () => {
    const err = await deleteDriver();
    if (err) showAlert('Ошибка', err);
  };

  const safeBack = () => (router.canGoBack() ? router.back() : router.replace('/main' as any));

  return (
    <SafeAreaView className="flex-1 bg-light-bg dark:bg-dark-bg" edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" translucent={false} />

      <ScreenHeader title="Водители" onBack={safeBack} />

      {loading && (
        <View className="mt-4">
          <ActivityIndicator size="large" color="#313131" />
        </View>
      )}

      <Pressable
        className="flex-row items-center pl-[30px] pt-5"
        onPress={openAdd}
        accessibilityRole="button"
        accessibilityLabel="Добавить водителя"
      >
        <Image source={require('../../../assets/images/add_button_2.png')} />
        <Text className="text-[22px] text-text-primary ml-2">Добавить</Text>
      </Pressable>

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 20 }}>
        {!loading && drivers.length === 0 && (
          <Text className="text-base text-text-muted text-center mt-6">Водители не добавлены</Text>
        )}
        {drivers.map(driver => (
          <DriverCard key={driver.id} driver={driver} onEdit={openEdit} />
        ))}
      </ScrollView>

      <DriverEditModal
        visible={editModalVisible}
        mode={editMode}
        form={form}
        isFormValid={isFormValid}
        saving={saving}
        onChangeField={changeField}
        onSave={onSave}
        onClose={closeEditModal}
        onRequestDelete={editMode === 'edit' ? openDeleteConfirm : undefined}
      />

      <DriverDeleteModal
        visible={deleteModalVisible}
        driverName={`${form.name_f} ${form.name_i}`.trim()}
        onConfirm={onDelete}
        onCancel={closeDeleteModal}
      />
    </SafeAreaView>
  );
}
