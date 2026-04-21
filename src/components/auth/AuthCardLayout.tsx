import React from 'react';
import { View, Text, Image, ScrollView, Pressable, useWindowDimensions } from 'react-native';

interface AuthCardLayoutProps {
  /** The form card content (input + button + links). */
  children: React.ReactNode;
  /** Optional back button shown on the brand panel (desktop) or above the card (mobile). */
  onBack?: () => void;
}

/**
 * Web-only two-column layout for auth flow (AuthScreen + PinScreen).
 * Desktop (>=768px): dark brand panel on the left, form card on the right.
 * Mobile web (<768px): centered single-column form card.
 */
export default function AuthCardLayout({ children, onBack }: AuthCardLayoutProps) {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  const backButton = onBack ? (
    <Pressable
      className={isDesktop ? 'absolute top-6 left-6 p-2 z-10' : 'self-start p-2 mb-4'}
      onPress={onBack}
      accessibilityRole="button"
      accessibilityLabel="Назад"
    >
      <Image
        source={require('../../../assets/images/back_2.png')}
        style={{ width: 24, height: 24, tintColor: isDesktop ? '#FFFFFF' : undefined }}
        resizeMode="contain"
      />
    </Pressable>
  ) : null;

  const brandPanel = (
    <View className="flex-1 items-center justify-center px-12 bg-[#1A1A1A]">
      {isDesktop && backButton}
      <Image
        source={require('../../../assets/images/icon.png')}
        style={{ width: 72, height: 72, marginBottom: 24, borderRadius: 16 }}
        resizeMode="contain"
      />
      <Text className="text-4xl font-bold text-white mb-3 select-none">TransApp</Text>
      <Text className="text-base text-[#B0B0B0] text-center leading-6 select-none">
        Транспортные решения{'\n'}для вашего бизнеса
      </Text>
    </View>
  );

  const cardShell = (
    <View className="bg-white rounded-2xl p-8 w-full web:shadow-lg" style={isDesktop ? { maxWidth: 400 } : undefined}>
      {children}
    </View>
  );

  return (
    <View className="flex-1 bg-[#F0F2F5]">
      {isDesktop ? (
        <View className="flex-1 flex-row">
          {brandPanel}
          <View className="flex-1 items-center justify-center px-8 py-10">
            {cardShell}
          </View>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20, paddingVertical: 40 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {!isDesktop && onBack && backButton}
          {cardShell}
        </ScrollView>
      )}
    </View>
  );
}
