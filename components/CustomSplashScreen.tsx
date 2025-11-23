import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';

/**
 * Кастомный splash screen с иконкой и текстом "TransApp"
 * Показывается пока приложение загружается
 * Дизайн соответствует старому LaunchScreen.storyboard
 */
export default function CustomSplashScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Image 
          source={require('../assets/images/icon.png')} 
          style={styles.icon}
          resizeMode="contain"
        />
        <Text style={styles.title}>TransApp</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    width: 120,
    height: 120,
    marginBottom: 20,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#000000',
  },
});
