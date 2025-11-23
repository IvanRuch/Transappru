import React, { useEffect } from 'react';
import { View, Text, TouchableHighlight, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function DeletedScreen() {
  const router = useRouter();

  useEffect(() => {
    // Очищаем токен если еще не очищен
    AsyncStorage.removeItem('token');
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Ваш профиль был удален</Text>
      <Text style={styles.message}>Спасибо, что были с нами!</Text>
      
      <TouchableHighlight
        style={styles.button}
        activeOpacity={1}
        underlayColor='#2E2E2E'
        onPress={() => router.replace('/' as any)}
      >
        <Text style={styles.buttonText}>Вернуться к авторизации</Text>
      </TouchableHighlight>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'stretch',
    justifyContent: 'flex-start',
  },
  header: {
    textAlign: 'center',
    paddingLeft: 20,
    paddingRight: 20,
    paddingTop: 70,
    fontSize: 24,
    fontWeight: 'bold',
    color: '#313131',
  },
  message: {
    paddingLeft: 20,
    paddingRight: 20,
    paddingTop: 20,
    fontSize: 15,
    fontWeight: 'normal',
    color: '#313131',
    textAlign: 'center',
  },
  button: {
    marginTop: 40,
    marginHorizontal: 20,
    height: 50,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3A3A3A',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
