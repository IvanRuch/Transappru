import React from 'react';
import { TouchableHighlight, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface SafeBottomButtonProps {
  title: string;
  onPress: () => void;
  backgroundColor?: string;
  textColor?: string;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

/**
 * Кнопка с автоматическим учётом SafeAreaInsets для Android
 * Используется для кнопок, которые прижаты к низу экрана
 */
export const SafeBottomButton: React.FC<SafeBottomButtonProps> = ({
  title,
  onPress,
  backgroundColor = '#3A3A3A',
  textColor = '#FFFFFF',
  disabled = false,
  style,
  textStyle,
}) => {
  const insets = useSafeAreaInsets();

  return (
    <TouchableHighlight
      style={[
        styles.button,
        {
          backgroundColor: disabled ? '#7A7A7A' : backgroundColor,
          bottom: Math.max(insets.bottom, 10),
        },
        style,
      ]}
      onPress={onPress}
      disabled={disabled}
      underlayColor={disabled ? '#7A7A7A' : '#2A2A2A'}
    >
      <Text style={[styles.buttonText, { color: textColor }, textStyle]}>
        {title}
      </Text>
    </TouchableHighlight>
  );
};

const styles = StyleSheet.create({
  button: {
    position: 'absolute',
    left: 10,
    right: 10,
    height: 50,
    margin: 25,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 24,
    fontWeight: 'normal',
  },
});
