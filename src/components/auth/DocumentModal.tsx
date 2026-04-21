import React, { useEffect } from 'react';
import { Modal, View, Text, Pressable, ScrollView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface DocumentModalProps {
  visible: boolean;
  title: string;
  text: string;
  onClose: () => void;
}

/**
 * Full-screen (mobile) / overlay (web) scrollable document viewer — used for
 * user agreement and privacy policy. Cross-platform layout; Esc-close on web.
 */
export default function DocumentModal({ visible, title, text, onClose }: DocumentModalProps) {
  useEffect(() => {
    if (Platform.OS !== 'web' || !visible) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose(); }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [visible, onClose]);

  return (
    <Modal
      visible={visible}
      transparent={Platform.OS === 'web'}
      animationType={Platform.OS === 'web' ? 'fade' : 'slide'}
      onRequestClose={onClose}
    >
      {Platform.OS === 'web' ? (
        <Pressable
          className="flex-1 items-center justify-center p-6 bg-black/50"
          onPress={onClose}
          accessibilityLabel="Закрыть"
        >
          <Pressable
            onPress={(e: any) => e.stopPropagation && e.stopPropagation()}
            className="bg-white rounded-xl p-6 w-full max-w-[600px] max-h-[80%] web:shadow-2xl"
            accessibilityRole={'dialog' as any}
            accessibilityLabel={title}
          >
            <Text className="text-lg font-bold text-text-primary mb-4 text-center select-none">
              {title}
            </Text>
            <ScrollView className="flex-1 mb-4" showsVerticalScrollIndicator>
              <Text className="text-sm text-text-primary leading-[22px]">{text}</Text>
            </ScrollView>
            <Pressable
              className="h-[46px] rounded-lg bg-accent-secondary items-center justify-center cursor-pointer"
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Закрыть"
            >
              <Text className="text-[15px] font-semibold text-white select-none">Закрыть</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      ) : (
        <SafeAreaView className="flex-1 bg-white">
          <View className="flex-1 px-5 pt-5">
            <Text className="text-xl font-bold text-black mb-5 text-center">{title}</Text>
            <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator>
              <Text className="text-sm text-black leading-[22px]">{text}</Text>
            </ScrollView>
            <Pressable
              className="absolute bottom-5 left-5 right-5 h-[50px] rounded bg-accent-secondary items-center justify-center"
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Закрыть"
            >
              <Text className="text-base font-bold text-white">Закрыть</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      )}
    </Modal>
  );
}
