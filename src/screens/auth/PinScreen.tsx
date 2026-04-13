import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Alert, Pressable, Modal, Image, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';

import api from '../../services/api';

export default function PinScreen() {
  const router = useRouter();
  
  // State
  const [code, setCode] = useState('');
  const [disabled, setDisabled] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [msg, setMsg] = useState('');
  const [canGoBack, setCanGoBack] = useState(false);

  // Проверяем, есть ли старый токен (пользователь пришёл через "Выйти")
  useEffect(() => {
    console.log('PinScreen mounted');
    
    const checkCanGoBack = async () => {
      // Проверяем, есть ли сохранённый токен от предыдущей сессии
      // Если пользователь пришёл через "Выйти", токен будет сохранён
      const savedToken = await AsyncStorage.getItem('saved_token_for_return');
      if (savedToken) {
        console.log('🔑 Saved token exists, user can go back to old session');
        setCanGoBack(true);
      }
    };
    
    checkCanGoBack();
  }, []);

  // Handlers
  const changeCode = (value: string) => {
    console.log('changeCode. value = ' + value);
    setCode(value);

    if (value.match(/(\d{4})/)) {
      setDisabled(false);
    } else {
      setDisabled(true);
    }
  };

  const confirmToken = async (value: string | null) => {
    console.log('confirmToken. value = ' + value);

    if (!value) {
      console.log('No token found');
      return;
    }

    try {
      const res = await api.post('/confirm-token', { token: value, code });
      const data = res.data;
      
      console.log('========================================');
      console.log('PIN SCREEN - confirm-token response:');
      console.log('error:', data.error);
      console.log('phone_inn_bind:', data.phone_inn_bind);
      console.log('is_manager:', data.is_manager);
      const needsOnboarding = data.onboarding_expired === 0 || data.onboarding_expired === '0';
      console.log('onboarding_expired:', data.onboarding_expired,
        needsOnboarding ? '→ should show onboarding' : '→ skip onboarding');
      console.log('========================================');

      if (data.error === 1) {
        setMsg(data.msg);
        setModalVisible(true);
      } else {

        if ((data.phone_inn_bind === 1 || data.phone_inn_bind === "1") ||
            (data.is_manager === 1 || data.is_manager === "1")) {
          if (needsOnboarding) {
            console.log('📋 Redirecting to onboarding');
            router.replace('/onboarding' as any);
          } else {
            console.log('✅ Navigating to AutoList');
            router.replace('/(authenticated)/auto-list' as any);
          }
        } else {
          console.log('⚠️ Need Inn setup, navigating to Inn');
          router.replace('/(authenticated)/inn' as any);
        }
      }
    } catch (error) {
      console.log('❌ Error confirming PIN:', error);
      console.log(error);
    }
  };

  const getButtonStyle = () => {
    let backgroundColor = disabled ? "#c0c0c0" : "#3A3A3A";
    return { 
      height: 50, 
      width: 185, 
      borderRadius: 5, 
      alignItems: 'center' as const, 
      justifyContent: 'center' as const, 
      backgroundColor 
    };
  };

  const getButtonTextStyle = () => {
    let color = disabled ? "#FFFFFF" : "#FFFFFF";
    return { fontSize: 20, color };
  };

  const handleSubmit = async () => {
    console.log('call confirm_token');
    const token = await AsyncStorage.getItem('token');
    confirmToken(token);
  };

  return (
    <View style={styles.container}>
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => {
          Alert.alert("Modal has been closed.");
          setModalVisible(false);
        }}
      >
        <View style={styles.centeredView}>
          <View style={styles.modalView}>
            <Text style={styles.modalText}>{msg}</Text>
            <Pressable
              style={[styles.button, styles.buttonClose]}
              onPress={() => { 
                setModalVisible(false); 
                router.replace('/' as any); // ✅ Возврат на Auth
              }}
            >
              <Text style={styles.textStyle}>получить еще раз</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Кнопка "Назад" если пользователь пришёл через "Выйти" */}
      {canGoBack && (
        <TouchableOpacity
          style={{
            position: 'absolute',
            top: Platform.OS === 'ios' ? 60 : 20,
            left: 20,
            padding: 10,
            zIndex: 10
          }}
          onPress={async () => {
            console.log('🔙 Going back to auth screen');
            // Восстанавливаем сохранённый токен
            const savedToken = await AsyncStorage.getItem('saved_token_for_return');
            if (savedToken) {
              await AsyncStorage.setItem('token', savedToken);
              await AsyncStorage.removeItem('saved_token_for_return');
              console.log('✅ Token restored, going back');
            }
            router.back();
          }}
        >
          <Image source={require('../../../assets/images/back_2.png')} />
        </TouchableOpacity>
      )}

      <Text style={{ fontSize: 22, fontWeight: "bold", color: '#4C4C4C' }}>Код подтверждения</Text>
      <Text style={{ color: '#4C4C4C' }}>Введите 4-значный код из SMS</Text>
      <TextInput
        keyboardType='numeric'
        textAlign={'center'}
        style={{ height: 60, width: 100, color: '#4C4C4C', fontSize: 34, borderRadius: 5, borderBottomColor: 'black', borderBottomWidth: 1, marginBottom: 10 }}
        maxLength={4}
        placeholder='0000'
        placeholderTextColor='#c0c0c0'
        onChangeText={changeCode}
      />
      <TouchableOpacity
        disabled={disabled}
        style={getButtonStyle()}
        onPress={handleSubmit}
      >
        <Text style={getButtonTextStyle()}>Подтвердить</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={{
          marginTop: 30,
        }}
        onPress={async () => {
          await AsyncStorage.removeItem('token');
          router.replace('/');
        }}
      >
        <Text style={{ fontSize: 14, color: '#666666', textDecorationLine: 'underline' }}>Войти с другим номером</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centeredView: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    marginTop: -350
  },
  modalView: {
    margin: 20,
    backgroundColor: "white",
    borderRadius: 15,
    padding: 35,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5
  },
  button: {
    borderRadius: 5,
    padding: 10,
    elevation: 2
  },
  buttonOpen: {
    backgroundColor: "#F194FF",
  },
  buttonClose: {
    backgroundColor: "#fee600",
  },
  textStyle: {
    color: "black",
    fontWeight: "bold",
    textAlign: "center"
  },
  modalText: {
    marginBottom: 15,
    textAlign: "center"
  }
});
