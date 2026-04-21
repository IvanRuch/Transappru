import React, { useEffect } from 'react';
import { Modal, View, Text, Pressable, Platform } from 'react-native';

export type ConfirmVariant = 'primary' | 'danger';

interface ConfirmModalProps {
  visible: boolean;
  title: string;
  /** Optional extra context line under the title (explanation). */
  message?: string;
  /** Label for the confirm button. Default: "ОК". */
  confirmLabel?: string;
  /** Visual intent of the confirm button. */
  confirmVariant?: ConfirmVariant;
  /** Label for the cancel button. Default: "Отмена". */
  cancelLabel?: string;
  /** Hide the cancel button (single-action dialog, e.g. error alert). */
  hideCancel?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Generic confirmation dialog. Cross-platform; on web adds Esc-to-cancel
 * and overlay-click-to-cancel. Used for logout, delete-profile,
 * delete-contact confirmations across the app.
 */
export default function ConfirmModal({
  visible, title, message, confirmLabel = 'ОК', confirmVariant = 'primary',
  cancelLabel = 'Отмена', hideCancel, onConfirm, onCancel,
}: ConfirmModalProps) {
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

  const confirmBg = confirmVariant === 'danger' ? 'bg-status-error' : 'bg-accent-secondary';

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
        accessibilityLabel={cancelLabel}
      >
        <Pressable
          onPress={(e: any) => e.stopPropagation && e.stopPropagation()}
          className="bg-white rounded-2xl p-6 w-[90%] max-w-[420px] web:shadow-2xl"
          accessibilityRole={Platform.OS === 'web' ? ('dialog' as any) : undefined}
          accessibilityLabel={title}
        >
          <Text className="text-lg font-bold text-text-primary select-none">{title}</Text>
          {message ? (
            <Text className="text-sm text-text-secondary mt-3 select-none">{message}</Text>
          ) : null}

          <View className="flex-row gap-3 mt-5 flex-wrap">
            <Pressable
              className={`flex-1 h-12 rounded-lg items-center justify-center cursor-pointer ${confirmBg}`}
              onPress={onConfirm}
              accessibilityRole="button"
              accessibilityLabel={confirmLabel}
            >
              <Text className="text-[15px] font-bold text-white select-none">{confirmLabel}</Text>
            </Pressable>
            {!hideCancel && (
              <Pressable
                className="flex-1 h-12 rounded-lg items-center justify-center bg-white border border-border-primary cursor-pointer"
                onPress={onCancel}
                accessibilityRole="button"
                accessibilityLabel={cancelLabel}
              >
                <Text className="text-[15px] text-text-primary select-none">{cancelLabel}</Text>
              </Pressable>
            )}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
