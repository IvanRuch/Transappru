/**
 * DriversTab — web driver CRUD panel, used in two places:
 *   - `src/screens/drivers/DriverListScreen.web.tsx` — standalone sidebar route.
 *   - `src/screens/auto/AutoDetailScreen.web.tsx` — tab inside auto detail.
 *
 * Business logic lives in `useDriverList` (ADR-003). UI pieces come from
 * `src/components/drivers/` (ADR-005). This file is a thin orchestrator.
 */
import React from 'react';
import { View, Text, Pressable, ActivityIndicator, ScrollView } from 'react-native';
import { DriverCard, DriverEditModal, DriverDeleteModal } from '../../../components/drivers';
import { useDriverList } from '../../../hooks/useDriverList';
import { showAlert } from '../../../utils/alert';

export function DriversTab() {
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

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center p-10">
        <ActivityIndicator size="large" color="#313131" />
      </View>
    );
  }

  return (
    <ScrollView className="flex-1" contentContainerStyle={{ padding: 20 }}>
      <Pressable
        className="flex-row items-center mb-4 cursor-pointer"
        onPress={openAdd}
        accessibilityRole="button"
        accessibilityLabel="Добавить водителя"
      >
        <Text className="text-[28px] text-text-primary mr-2 font-light select-none">+</Text>
        <Text className="text-lg text-text-primary select-none">Добавить водителя</Text>
      </Pressable>

      {drivers.length === 0 && (
        <Text className="text-[15px] text-text-muted mt-3">Водители не добавлены</Text>
      )}

      <View accessibilityRole={'list' as any} aria-label="Список водителей">
        {drivers.map(driver => (
          <DriverCard key={driver.id} driver={driver} onEdit={openEdit} />
        ))}
      </View>

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
    </ScrollView>
  );
}
