import React, { useEffect } from 'react';
import { Modal, View, Text, Pressable, Image, Platform, Linking } from 'react-native';

interface WaitConfirmationModalProps {
  visible: boolean;
  /** Optional manager phone — when present, shows a call link. */
  managerPhone?: string;
  /** "Войти с другим номером" — clears auth state and returns to phone input. */
  onRelogin: () => void;
}

/**
 * "Ваша заявка зарегистрирована" modal shown on AuthScreen when the user
 * has signed up but is awaiting manager confirmation. Optionally shows a
 * tel: link to the manager. The relogin action is passive (no dismiss button)
 * — the modal stays open until the user either relogins or the polling
 * completes.
 */
export default function WaitConfirmationModal({
  visible, managerPhone, onRelogin,
}: WaitConfirmationModalProps) {
  useEffect(() => {
    if (Platform.OS !== 'web' || !visible) return;
    // No Esc close — this screen intentionally blocks interaction.
  }, [visible]);

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
      onRequestClose={() => { /* non-dismissable */ }}
      accessibilityViewIsModal
    >
      <View className="flex-1 items-center justify-center p-6 bg-black/50">
        <View
          className="bg-white rounded-2xl p-7 w-full max-w-[420px] web:shadow-2xl"
          accessibilityRole={Platform.OS === 'web' ? ('dialog' as any) : undefined}
          accessibilityLabel="Заявка зарегистрирована"
        >
          <Text className="text-xl font-bold text-text-primary mb-4 select-none">
            Ваша заявка зарегистрирована!
          </Text>
          <Text className="text-[15px] text-text-primary leading-[22px] mb-5">
            Наш менеджер скоро свяжется с Вами по указанному при регистрации номеру
            для заключения договора оказания услуг и ответит на все сопутствующие вопросы.
          </Text>

          {managerPhone ? (
            <Pressable
              className="flex-row items-center justify-center mb-4 py-2.5 cursor-pointer"
              onPress={openPhone}
              accessibilityRole="button"
              accessibilityLabel={`Позвонить менеджеру ${managerPhone}`}
            >
              <Text className="text-[15px] text-text-primary font-semibold select-none">
                Позвонить менеджеру
              </Text>
              <Image
                source={require('../../../assets/images/contact_phone_2.png')}
                style={{ width: 28, height: 28, marginLeft: 8 }}
                accessibilityIgnoresInvertColors
              />
            </Pressable>
          ) : null}

          <Pressable
            className="h-11 rounded-lg border border-accent-secondary bg-white items-center justify-center cursor-pointer"
            onPress={onRelogin}
            accessibilityRole="button"
            accessibilityLabel="Войти с другим номером"
          >
            <Text className="text-sm text-accent-secondary select-none">Войти с другим номером</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
