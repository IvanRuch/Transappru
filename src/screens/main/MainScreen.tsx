import React, { useEffect } from 'react';
import { StyleSheet, View, Text, Image, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';

export default function MainScreen() {
  const router = useRouter();

  useEffect(() => {
    console.log('Main DidMount');
  }, []);

  const handleNavigateToAutoList = () => {
    console.log('-> move to AutoList');
    router.push('/(authenticated)/auto-list' as any);
  };

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#C9A86B" animating={true} />

      <Text style={styles.title}>Главный экран</Text>

      <View style={styles.servicesContainer}>
        <View style={styles.service}>
          <Image source={require('../../../assets/images/exclamation_triangle_circle.png')} />
          <Text style={styles.serviceText}>Проверка пропусков</Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.button}
        onPress={handleNavigateToAutoList}
      >
        <Text style={styles.buttonText}>Ваш автотранспорт</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#2c2c2c',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    paddingLeft: 20,
    paddingTop: 11,
    fontSize: 28,
    fontWeight: 'bold',
    color: '#E8E8E8',
  },
  servicesContainer: {
    flexDirection: 'row',
    padding: 10,
  },
  service: {
    padding: 10,
    alignItems: 'center',
  },
  serviceText: {
    paddingLeft: 10,
    paddingTop: 10,
    fontSize: 12,
    fontWeight: 'bold',
    color: '#E8E8E8',
  },
  button: {
    height: 50,
    margin: 25,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#C9A86B',
  },
  buttonText: {
    fontSize: 24,
    color: '#E8E8E8',
  },
});
