import React, { useEffect } from 'react';
import { Modal, View, Text, Pressable, Image, Platform, Linking } from 'react-native';

interface InnConfirmationModalProps {
  visible: boolean;
  /** Manager phone number — triggers tel: link when present. */
  managerPhone?: string;
  onClose: () => void;
}

/**
 * "Ваша заявка зарегистрирована" modal. If `managerPhone` is provided,
 * shows a phone icon that opens a native call on mobile or a <a href="tel:">
 * on web (the platform differentiation is handled by Linking.openURL which
 * RN Web maps to a location change).
 */
export default function InnConfirmationModal({
  visible, managerPhone, onClose,
}: InnConfirmationModalProps) {
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

  const openPhone = () => {
    if (!managerPhone) return;
    const scheme = Platform.OS === 'android' ? 'tel:' : 'telprompt:';
    Linking.openURL(`${scheme}${managerPhone}`);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      accessibilityViewIsModal
    >
      <Pressable
        className="flex-1 items-center justify-center p-4 bg-black/40"
        onPress={onClose}
        accessibilityLabel="Закрыть"
      >
        <Pressable
          onPress={(e: any) => e.stopPropagation && e.stopPropagation()}
          className="bg-bg-secondary rounded-3xl p-5 w-[90%] max-w-[400px] border border-border-primary web:shadow-2xl"
          accessibilityRole={Platform.OS === 'web' ? ('dialog' as any) : undefined}
          accessibilityLabel="Заявка зарегистрирована"
        >
          <Text className="pt-5 px-4 text-xl font-bold text-text-primary select-none">
            Ваша заявка зарегистрирована!
          </Text>
          <Text className="pt-5 px-4 text-base text-text-primary">
            Дождитесь подтверждения указанного Вами ИНН
          </Text>

          {managerPhone ? (
            <Pressable
              onPress={openPhone}
              className="items-center p-1 cursor-pointer"
              accessibilityRole="button"
              accessibilityLabel={`Позвонить менеджеру ${managerPhone}`}
            >
              <Text className="pt-5 px-4 text-base text-text-primary">
                Вы можете связаться с менеджером
              </Text>
              <Image
                source={require('../../../assets/images/contact_phone_2.png')}
                style={{ margin: 15 }}
                accessibilityIgnoresInvertColors
              />
            </Pressable>
          ) : null}

          <View className="items-center">
            <Pressable
              className="h-[50px] m-6 rounded-md items-center justify-center bg-accent-secondary px-6 cursor-pointer"
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Закрыть"
            >
              <Text className="text-sm font-bold text-white select-none">Закрыть</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
