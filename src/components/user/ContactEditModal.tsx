import React, { useEffect } from 'react';
import {
  Modal, View, Text, Pressable, TextInput, ScrollView, Platform,
} from 'react-native';
import { ContactData } from '../../types/user';

interface ContactEditModalProps {
  visible: boolean;
  mode: 'add' | 'edit';
  form: ContactData;
  isPhoneValid: boolean;
  saving: boolean;
  onChangeField: <K extends keyof ContactData>(field: K, value: string) => void;
  onSave: () => void;
  onClose: () => void;
  /** Present only in edit mode — triggers the delete confirmation flow. */
  onRequestDelete?: () => void;
}

/**
 * Add/edit contact form modal. Fields: ФИО, E-mail, Телефон (with auto
 * '+7' prefix), Должность. The save button is gated on phone validity
 * (exactly +7XXXXXXXXXX). Delete action appears only in edit mode.
 * On web: Esc closes.
 */
export default function ContactEditModal({
  visible, mode, form, isPhoneValid, saving,
  onChangeField, onSave, onClose, onRequestDelete,
}: ContactEditModalProps) {
  useEffect(() => {
    if (Platform.OS !== 'web' || !visible) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
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
          onPress={(e: any) => e.stopPropagation && e.stopPropagation()}
          className="bg-white rounded-2xl w-full max-w-[480px] max-h-[90%] p-6 web:shadow-2xl"
          accessibilityRole={Platform.OS === 'web' ? ('dialog' as any) : undefined}
          accessibilityLabel="Контактные данные"
        >
          <ScrollView>
            <View className="flex-row justify-between items-center mb-5">
              <Text className="text-lg font-bold text-text-primary select-none">
                {mode === 'add' ? 'Добавить контакт' : 'Редактировать контакт'}
              </Text>
              <Pressable
                onPress={onClose}
                className="p-1 cursor-pointer"
                accessibilityRole="button"
                accessibilityLabel="Закрыть"
              >
                <Text className="text-xl text-text-muted select-none">✕</Text>
              </Pressable>
            </View>

            <Text className="text-[13px] text-text-secondary mb-1 select-none">ФИО</Text>
            <TextInput
              className="h-11 px-3.5 text-base bg-white rounded-lg border border-[#CCC] text-text-primary mb-3"
              value={form.fio}
              onChangeText={v => onChangeField('fio', v)}
              placeholder="ФИО"
              placeholderTextColor="#8C8C8C"
            />

            <Text className="text-[13px] text-text-secondary mb-1 select-none">E-mail</Text>
            <TextInput
              className="h-11 px-3.5 text-base bg-white rounded-lg border border-[#CCC] text-text-primary mb-3"
              value={form.email}
              onChangeText={v => onChangeField('email', v)}
              placeholder="E-mail"
              placeholderTextColor="#8C8C8C"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              inputMode="email"
            />

            <Text className="text-[13px] text-text-secondary mb-1 select-none">Телефон *</Text>
            <TextInput
              className="h-11 px-3.5 text-base bg-white rounded-lg border border-[#CCC] text-text-primary mb-3"
              value={form.phone}
              onChangeText={v => onChangeField('phone', v)}
              placeholder="+7XXXXXXXXXX"
              placeholderTextColor="#8C8C8C"
              keyboardType="phone-pad"
              inputMode="tel"
              maxLength={12}
            />

            <Text className="text-[13px] text-text-secondary mb-1 select-none">Должность</Text>
            <TextInput
              className="h-11 px-3.5 text-base bg-white rounded-lg border border-[#CCC] text-text-primary mb-3"
              value={form.position}
              onChangeText={v => onChangeField('position', v)}
              placeholder="Должность"
              placeholderTextColor="#8C8C8C"
            />

            <View className="flex-row gap-3 mt-3 flex-wrap">
              <Pressable
                className={`flex-1 h-12 rounded-lg items-center justify-center cursor-pointer ${
                  isPhoneValid && !saving ? 'bg-accent-secondary' : 'bg-[#C0C0C0]'
                }`}
                onPress={onSave}
                disabled={!isPhoneValid || saving}
                accessibilityRole="button"
                accessibilityLabel={mode === 'add' ? 'Добавить контакт' : 'Сохранить контакт'}
                accessibilityState={{ disabled: !isPhoneValid || saving, busy: saving }}
              >
                <Text className="text-[15px] font-semibold text-white select-none">
                  {saving ? 'Сохранение...' : mode === 'add' ? 'Добавить' : 'Сохранить'}
                </Text>
              </Pressable>
              {mode === 'edit' && onRequestDelete && (
                <Pressable
                  className="flex-1 h-12 rounded-lg items-center justify-center bg-status-error cursor-pointer"
                  onPress={onRequestDelete}
                  accessibilityRole="button"
                  accessibilityLabel="Удалить контакт"
                >
                  <Text className="text-[15px] font-bold text-white select-none">Удалить</Text>
                </Pressable>
              )}
            </View>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
