import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, TouchableHighlight, Image, Linking, Modal, ScrollView, Platform, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';

import { getFCMToken } from '../../utils/PushNotificationHelper';
import Api from '../../utils/Api';

const maxStep = 60;
const intervalTime = 10000;

export default function AuthScreen() {
  const router = useRouter();
  
  // State
  const [phone, setPhone] = useState('');
  const [disabled, setDisabled] = useState(true);
  const [checked, setChecked] = useState(false);
  const [userAgreement, setUserAgreement] = useState('');
  const [modalUserAgreement, setModalUserAgreement] = useState(false);
  const [privacyPolicy, setPrivacyPolicy] = useState('');
  const [modalPrivacyPolicy, setModalPrivacyPolicy] = useState(false);
  const [modalWaitConfirmation, setModalWaitConfirmation] = useState(false);
  const [sessionData, setSessionData] = useState<any>({});

  // Handlers
  const focusPhone = () => {
    console.log('focusPhone');
    if (phone === '') {
      setPhone('+7');
    }
  };

  const changePhone = (value: string) => {
    console.log('changePhone. value = ' + value);

    if (value === '+7') {
      value = '';
    }
    if (value === '7') {
      value = '+7';
    }
    if (value === '+' || value === '8') {
      value = '+7';
    }
    if (value.match(/^\d$/)) {
      value = '+7' + value;
    }

    setPhone(value);

    if (value.match(/\+7(\d{10})/)) {
      setDisabled(false);
    } else {
      setDisabled(true);
    }
  };

  const getButtonStyle = () => {
    let backgroundColor = disabled || !checked ? "#c0c0c0" : "#3A3A3A";
    return { 
      height: 50, 
      width: 275, 
      borderRadius: 5, 
      alignItems: 'center' as const, 
      justifyContent: 'center' as const, 
      backgroundColor 
    };
  };

  const getButtonTextStyle = () => {
    let color = disabled || !checked ? "#FFFFFF" : "#FFFFFF";
    return { fontSize: 20, color };
  };

  const getSessionData = async (value: string | null) => {
    console.log('getSessionData. value = ' + value);

    if (!value) {
      console.log('empty token');
      return;
    }

    try {
      const res = await Api.post('/get-session-data', { token: value });
      const data = res.data;
      console.log(data);

      if (typeof data.session_data.user_data !== 'undefined') {
        console.log('data.session_data.user_data.phone_inn_confirmed = ' + data.session_data.user_data.phone_inn_confirmed);
        console.log('data.session_data.user_data.user_confirmed = ' + data.session_data.user_data.user_confirmed);

        const phoneInnConfirmed = data.session_data.user_data.phone_inn_confirmed;
        const userConfirmed = data.session_data.user_data.user_confirmed;
        
        if ((phoneInnConfirmed === 0 || phoneInnConfirmed === "0") ||
            (userConfirmed === 0 || userConfirmed === "0")) {
          // Пользователь не подтвержден - показываем модалку ожидания
          setSessionData(data.session_data);
          setModalWaitConfirmation(true);

          let t = 0;
          let get_session = setInterval(async () => {
            console.log('t = ' + t);

            try {
              const res = await Api.post('/get-session-data', { token: value });
              const data = res.data;
              console.log('data');
              console.log(data);
              setSessionData(data.session_data);
            } catch (error: any) {
              console.log('error.response.status = ' + error.response?.status);
              if (error.response?.status === 401) { 
                clearInterval(get_session); 
              }
            }

            if (t >= maxStep * intervalTime) {
              console.log('clearInterval by maxStep');
              clearInterval(get_session);
              router.push('/(authenticated)/auto-list');
            }

            const phoneInnConfirmedInterval = sessionData.user_data?.phone_inn_confirmed;
            const userConfirmedInterval = sessionData.user_data?.user_confirmed;
            
            if ((phoneInnConfirmedInterval === 1 || phoneInnConfirmedInterval === "1") &&
                (userConfirmedInterval === 1 || userConfirmedInterval === "1")) {
              console.log('clearInterval by confirmed');
              clearInterval(get_session);
              console.log('-> move to AutoList');
              router.push('/(authenticated)/auto-list');
            }

            t += intervalTime;
          }, intervalTime);
        }
      }
    } catch (error) {
      console.log('error');
      console.log(error);
    }
  };

  const contactPhone = (phoneNumber: string) => {
    console.log('contactPhone. phone = ' + phoneNumber);
    const phoneStr = Platform.OS === 'android' ? `tel:${phoneNumber}` : `telprompt:${phoneNumber}`;
    Linking.openURL(phoneStr);
  };

  const handleSubmit = async () => {
    console.log('call auth-by-phone');
    let cleanPhone = phone.replace(/\+/, '');
    console.log('phone = ' + cleanPhone);

    try {
      const res = await Api.post('/auth-by-phone', { phone: cleanPhone });
      const data = res.data;
      console.log(data);

      await AsyncStorage.setItem('token', data.token);
      getFCMToken();

      router.push('/pin');
    } catch (error) {
      console.log('error');
      console.log(error);
    }
  };

  // Effects
  useEffect(() => {
    console.log('Auth DidMount');

    const init = async () => {
      // Получаем пользовательское соглашение и политику конфиденциальности
      try {
        const res = await Api.post('/get-user-agreement-and-privacy-policy');
        const data = res.data;
        setUserAgreement(data.content_data.user_agreement);
        setPrivacyPolicy(data.content_data.privacy_policy);
      } catch (error) {
        console.log('error');
        console.log(error);
      }
    };

    init();
    
    // Проверку токена убрали - она теперь в app/index.tsx
  }, []);

  return (
    <View style={styles.container}>
      {/* модальное окно с Пользовательским соглашением */}
      <Modal
        animationType="slide"
        transparent={false}
        visible={modalUserAgreement}
        onRequestClose={() => {
          setModalUserAgreement(false);
        }}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
          <View style={{ 
            flex: 1, 
            paddingHorizontal: 20, 
            paddingTop: 20
          }}>
            <Text style={{ 
              fontSize: 20, 
              fontWeight: 'bold', 
              color: '#000000', 
              marginBottom: 20,
              textAlign: 'center'
            }}>
              Пользовательское соглашение
            </Text>
            <ScrollView 
              style={{ flex: 1 }}
              contentContainerStyle={{ paddingBottom: 100 }}
              showsVerticalScrollIndicator={true}
            >
              <Text style={{ 
                color: '#000000', 
                fontSize: 14,
                lineHeight: 22,
                textAlign: 'left'
              }}>
                {userAgreement}
              </Text>
            </ScrollView>
            <TouchableOpacity
              style={{ 
                position: 'absolute', 
                bottom: 20, 
                left: 20, 
                right: 20, 
                height: 50, 
                borderRadius: 5, 
                alignItems: 'center', 
                justifyContent: 'center', 
                backgroundColor: "#3A3A3A",
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.25,
                shadowRadius: 3.84,
                elevation: 5
              }}
              onPress={() => setModalUserAgreement(false)}
            >
              <Text style={{ fontSize: 16, fontWeight: 'bold', color: "#FFFFFF" }}>Закрыть</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

      {/* модальное окно с Политикой конфиденциальности */}
      <Modal
        animationType="slide"
        transparent={false}
        visible={modalPrivacyPolicy}
        onRequestClose={() => {
          setModalPrivacyPolicy(false);
        }}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
          <View style={{ 
            flex: 1, 
            paddingHorizontal: 20, 
            paddingTop: 20
          }}>
            <Text style={{ 
              fontSize: 20, 
              fontWeight: 'bold', 
              color: '#000000', 
              marginBottom: 20,
              textAlign: 'center'
            }}>
              Политика конфиденциальности
            </Text>
            <ScrollView 
              style={{ flex: 1 }}
              contentContainerStyle={{ paddingBottom: 100 }}
              showsVerticalScrollIndicator={true}
            >
              <Text style={{ 
                color: '#000000', 
                fontSize: 14,
                lineHeight: 22,
                textAlign: 'left'
              }}>
                {privacyPolicy}
              </Text>
            </ScrollView>
            <TouchableOpacity
              style={{ 
                position: 'absolute', 
                bottom: 20, 
                left: 20, 
                right: 20, 
                height: 50, 
                borderRadius: 5, 
                alignItems: 'center', 
                justifyContent: 'center', 
                backgroundColor: "#3A3A3A",
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.25,
                shadowRadius: 3.84,
                elevation: 5
              }}
              onPress={() => setModalPrivacyPolicy(false)}
            >
              <Text style={{ fontSize: 16, fontWeight: 'bold', color: "#FFFFFF" }}>Закрыть</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

      <Text style={{ fontSize: 22, fontWeight: "bold", color: '#4C4C4C' }}>Введите номер телефона</Text>
      <Text style={{ color: '#4C4C4C' }}>чтобы войти или зарегистрироваться</Text>
      <TextInput
        keyboardType='phone-pad'
        textAlign={'center'}
        style={{ height: 60, width: 275, color: '#4C4C4C', fontSize: 30, borderRadius: 5, borderBottomColor: 'black', borderBottomWidth: 1, marginBottom: 10 }}
        maxLength={12}
        placeholder='+70000000000'
        placeholderTextColor='#c0c0c0'
        onChangeText={changePhone}
        value={phone}
      />
      <TouchableOpacity
        disabled={disabled || !checked}
        style={getButtonStyle()}
        onPress={handleSubmit}
      >
        <Text style={getButtonTextStyle()}>Отправить</Text>
      </TouchableOpacity>

      <View style={{ marginTop: 30, width: 300, flexDirection: "row" }}>
        <View style={{ flex: 5 }}>
          <Text style={{ fontSize: 12, fontWeight: "normal" }}>Нажимая на кнопку &quot;Отправить&quot;, я соглашаюсь с данными:</Text>
        </View>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <TouchableHighlight
            style={{ width: 32, height: 32 }}
            activeOpacity={1}
            underlayColor='#FFFFFF'
            onPress={() => setChecked(!checked)}
          >
            {checked ? (
              <Image style={{ width: 24, height: 24 }} source={require('../../../assets/images/checkbox_checked_512x512.png')} />
            ) : (
              <Image style={{ width: 24, height: 24 }} source={require('../../../assets/images/checkbox_unchecked_512x512.png')} />
            )}
          </TouchableHighlight>
        </View>
      </View>

      <Text
        style={{ marginTop: 10, color: 'blue' }}
        onPress={() => setModalUserAgreement(true)}>
        Пользовательское соглашение
      </Text>
      <Text
        style={{ marginTop: 10, color: 'blue' }}
        onPress={() => setModalPrivacyPolicy(true)}>
        Политика конфиденциальности
      </Text>

      {/* модальное окно ожидания подтверждения */}
      <Modal
        animationType="slide"
        transparent={false}
        visible={modalWaitConfirmation}
        onRequestClose={() => {
          setModalWaitConfirmation(false);
        }}
      >
        <View style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          padding: 20,
        }}>
          <View style={{
            backgroundColor: '#EEEEEE',
            borderRadius: 25,
            alignItems: 'stretch',
            justifyContent: 'center',
            padding: 20,
            borderWidth: 1,
            borderColor: "#B8B8B8",
            maxWidth: 350,
          }}>
            <Text style={{ paddingLeft: 16, paddingRight: 16, paddingTop: 24, fontSize: 20, fontWeight: "bold", color: "#313131" }}>Ваша заявка зарегистрирована!</Text>
            <Text style={{ paddingLeft: 16, paddingRight: 16, paddingTop: 24, fontSize: 16, fontWeight: "normal", color: "#313131" }}>Наш менеджер скоро свяжется с Вами по указанному при регистрации номеру для заключения договора оказания услуг и ответит на все сопутствующие вопросы</Text>
            
            {sessionData?.user_data?.manager_data?.mobile_phone && (
              <TouchableHighlight
                onPress={() => contactPhone(sessionData.user_data.manager_data.mobile_phone)}
              >
                <View style={{ alignItems: 'center', padding: 5 }}>
                  <Text style={{ paddingLeft: 16, paddingRight: 16, paddingTop: 24, fontSize: 16, fontWeight: "normal", color: "#313131" }}>Вы можете связаться с менеджером</Text>
                  <Image style={{ margin: 15 }} source={require('../../../assets/images/contact_phone_2.png')} />
                </View>
              </TouchableHighlight>
            )}

            <TouchableOpacity
              style={{
                marginTop: 24,
                marginHorizontal: 16,
                height: 44,
                borderRadius: 5,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#FFFFFF',
                borderWidth: 1,
                borderColor: '#3A3A3A',
              }}
              onPress={async () => {
                // Удаляем токен и закрываем модалку для перелогина
                await AsyncStorage.removeItem('token');
                setSessionData({});
                setPhone('');
                setModalWaitConfirmation(false);
              }}
            >
              <Text style={{ fontSize: 14, color: '#3A3A3A' }}>Войти с другим номером</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
});
