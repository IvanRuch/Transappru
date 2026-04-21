import React, { useEffect, useRef } from 'react';
import {
  Modal, View, Text, Pressable, TextInput, ScrollView, Platform, findNodeHandle,
} from 'react-native';
import { DriverData } from '../../types/drivers';

interface DriverEditModalProps {
  visible: boolean;
  mode: 'add' | 'edit';
  form: DriverData;
  isFormValid: boolean;
  saving: boolean;
  onChangeField: (field: keyof DriverData, value: string) => void;
  onSave: () => void;
  onClose: () => void;
  /** Shown only in edit mode — triggers delete confirmation. */
  onRequestDelete?: () => void;
}

/**
 * Add/edit driver modal. Validation-driven save button; delete action
 * appears only in edit mode. On web adds ESC-close and overlay-click-close.
 */
export default function DriverEditModal({
  visible,
  mode,
  form,
  isFormValid,
  saving,
  onChangeField,
  onSave,
  onClose,
  onRequestDelete,
}: DriverEditModalProps) {
  const dialogRef = useRef<any>(null);
  const prevFocusRef = useRef<Element | null>(null);

  // Web-only: Escape closes; restore focus on unmount.
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    if (!visible) return;

    prevFocusRef.current = typeof document !== 'undefined' ? document.activeElement : null;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    // Focus first input shortly after mount for keyboard usability.
    const t = setTimeout(() => {
      const node = dialogRef.current;
      if (!node) return;
      const dom = (node.focus ? node : findNodeHandle(node)) as HTMLElement | null;
      const input = dom?.querySelector('input') as HTMLInputElement | null;
      if (input) input.focus();
    }, 30);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      clearTimeout(t);
      const prev = prevFocusRef.current as HTMLElement | null;
      if (prev && typeof prev.focus === 'function') prev.focus();
    };
  }, [visible, onClose]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      accessibilityViewIsModal
    >
      <Pressable
        className="flex-1 items-center justify-center p-4 bg-black/50"
        onPress={onClose}
        accessibilityLabel="Закрыть окно"
      >
        <Pressable
          ref={dialogRef}
          onPress={(e: any) => e.stopPropagation && e.stopPropagation()}
          className="bg-white rounded-2xl w-full max-w-[480px] max-h-[90%] p-6 web:shadow-2xl"
          accessibilityRole={Platform.OS === 'web' ? ('dialog' as any) : undefined}
          accessibilityLabel="Данные водителя"
        >
          <ScrollView>
            <View className="flex-row justify-between items-center mb-5">
              <Text className="text-[22px] font-bold text-text-primary select-none">Данные водителя</Text>
              <Pressable
                onPress={onClose}
                className="p-1 cursor-pointer"
                accessibilityRole="button"
                accessibilityLabel="Закрыть"
              >
                <Text className="text-xl text-text-muted select-none">✕</Text>
              </Pressable>
            </View>

            {/* License block */}
            <View className="bg-[#F5F5F5] rounded-xl p-4 mb-4">
              <Text className="text-sm text-text-primary mb-2 mt-1 select-none">
                Номер водительского удостоверения *
              </Text>
              <TextInput
                className="h-12 text-base px-3.5 bg-white rounded-lg border mb-3 text-text-primary border-[#CCC]"
                value={form.vu}
                onChangeText={v => onChangeField('vu', v)}
                placeholder="0000000000"
                placeholderTextColor="#8C8C8C"
                maxLength={10}
                keyboardType="numeric"
                inputMode="numeric"
              />
              <Text className="text-sm text-text-primary mb-2 mt-1 select-none">
                Дата выдачи *
              </Text>
              <TextInput
                className="h-12 text-base px-3.5 bg-white rounded-lg border mb-3 text-text-primary border-[#CCC]"
                value={form.vu_reg}
                onChangeText={v => onChangeField('vu_reg', v)}
                placeholder="00.00.0000"
                placeholderTextColor="#8C8C8C"
                maxLength={10}
                keyboardType="numeric"
                inputMode="numeric"
              />
            </View>

            {/* Name block */}
            <View className="bg-[#F5F5F5] rounded-xl p-4 mb-4">
              <Text className="text-sm text-text-primary mb-2 mt-1 select-none">Владелец</Text>
              <TextInput
                className="h-12 text-base px-3.5 bg-white rounded-lg border mb-3 text-text-primary border-[#CCC]"
                value={form.name_f}
                onChangeText={v => onChangeField('name_f', v)}
                placeholder="Фамилия *"
                placeholderTextColor="#8C8C8C"
              />
              <TextInput
                className="h-12 text-base px-3.5 bg-white rounded-lg border mb-3 text-text-primary border-[#CCC]"
                value={form.name_i}
                onChangeText={v => onChangeField('name_i', v)}
                placeholder="Имя *"
                placeholderTextColor="#8C8C8C"
              />
              <TextInput
                className="h-12 text-base px-3.5 bg-white rounded-lg border mb-3 text-text-primary border-[#CCC]"
                value={form.name_o}
                onChangeText={v => onChangeField('name_o', v)}
                placeholder="Отчество"
                placeholderTextColor="#8C8C8C"
              />
            </View>

            {/* Buttons */}
            <View className="flex-row gap-3 mt-1">
              <Pressable
                className={`flex-1 h-12 rounded-lg items-center justify-center cursor-pointer ${
                  isFormValid && !saving ? 'bg-accent-secondary' : 'bg-[#C0C0C0]'
                }`}
                onPress={onSave}
                disabled={!isFormValid || saving}
                accessibilityRole="button"
                accessibilityLabel={mode === 'add' ? 'Добавить водителя' : 'Сохранить водителя'}
                accessibilityState={{ disabled: !isFormValid || saving, busy: saving }}
              >
                <Text className="text-[15px] font-semibold text-white select-none">
                  {saving ? 'Сохранение...' : mode === 'add' ? 'Добавить' : 'Сохранить'}
                </Text>
              </Pressable>
              {mode === 'edit' && onRequestDelete && (
                <Pressable
                  className="flex-1 h-12 rounded-lg items-center justify-center border bg-white border-border-primary cursor-pointer"
                  onPress={onRequestDelete}
                  accessibilityRole="button"
                  accessibilityLabel="Удалить водителя"
                >
                  <Text className="text-[15px] text-text-primary select-none">Удалить</Text>
                </Pressable>
              )}
            </View>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
