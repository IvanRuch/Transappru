import React, { useEffect } from 'react';
import { Modal, View, Text, Pressable, Platform } from 'react-native';

interface DriverDeleteModalProps {
  visible: boolean;
  /** Driver name shown in the confirmation message. */
  driverName: string;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Destructive confirmation modal for driver deletion. On web adds
 * ESC-to-cancel and overlay-click-to-cancel.
 */
export default function DriverDeleteModal({
  visible, driverName, onConfirm, onCancel,
}: DriverDeleteModalProps) {
  useEffect(() => {
    if (Platform.OS !== 'web' || !visible) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [visible, onCancel]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
      accessibilityViewIsModal
    >
      <Pressable
        className="flex-1 items-center justify-center p-4 bg-black/50"
        onPress={onCancel}
        accessibilityLabel="Отменить удаление"
      >
        <Pressable
          onPress={(e: any) => e.stopPropagation && e.stopPropagation()}
          className="bg-white rounded-2xl p-6 w-[80%] max-w-[360px] items-center web:shadow-2xl"
          accessibilityRole={Platform.OS === 'web' ? ('dialog' as any) : undefined}
          accessibilityLabel="Подтверждение удаления"
        >
          <Text className="text-xl font-bold text-text-primary text-center select-none">
            Удалить водителя?
          </Text>
          {driverName.trim() !== '' && (
            <Text className="text-base text-text-secondary mt-3 text-center select-none">
              {driverName}
            </Text>
          )}
          <View className="flex-row gap-3 mt-6 w-full">
            <Pressable
              className="flex-1 h-12 rounded-lg items-center justify-center bg-status-error cursor-pointer"
              onPress={onConfirm}
              accessibilityRole="button"
              accessibilityLabel="Подтвердить удаление"
            >
              <Text className="text-[15px] font-bold text-white select-none">Удалить</Text>
            </Pressable>
            <Pressable
              className="flex-1 h-12 rounded-lg items-center justify-center bg-white border border-border-primary cursor-pointer"
              onPress={onCancel}
              accessibilityRole="button"
              accessibilityLabel="Отменить"
            >
              <Text className="text-[15px] text-text-primary select-none">Отменить</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
