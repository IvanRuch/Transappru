import React, { useState } from 'react';
import { View, Text, TextInput, TouchableHighlight, Image, ScrollView, StyleSheet, Share } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Api from '../../utils/Api';

interface InviteUserData {
  firm: string;
  inn: string;
  fio: string;
  phone: string;
}

export default function InviteUserScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  
  // Получаем данные менеджера из параметров (если переданы)
  const managerData = params.manager_data ? JSON.parse(params.manager_data as string) : null;
  const managerPhone = managerData?.mobile_phone || '+7';
  
  const [inviteUserData, setInviteUserData] = useState<InviteUserData>({
    firm: '',
    inn: '',
    fio: '',
    phone: '',
  });

  const handlePhoneChange = (value: string) => {
    let newValue = value;

    if (newValue === '+7') {
      newValue = '';
    } else if (newValue === '7') {
      newValue = '+7';
    } else if (newValue === '+' || newValue === '8') {
      newValue = '+7';
    } else if (newValue.match(/^\d$/)) {
      newValue = '+7' + newValue;
    }

    setInviteUserData({ ...inviteUserData, phone: newValue });
  };

  const handleFieldChange = (value: string, field: keyof InviteUserData) => {
    if (field === 'phone') {
      handlePhoneChange(value);
    } else {
      setInviteUserData({ ...inviteUserData, [field]: value });
    }
  };

  const isButtonDisabled = () => {
    return !(
      inviteUserData.firm !== '' &&
      inviteUserData.fio !== '' &&
      inviteUserData.inn.match(/^(\d{10})$|^(\d{12})$/) &&
      inviteUserData.phone.match(/\+7(\d{10})/)
    );
  };

  const handleInviteUser = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        router.replace('/' as any);
        return;
      }

      const res = await Api.post('/invite-user', {
        token,
        firm: inviteUserData.firm,
        inn: inviteUserData.inn,
        fio: inviteUserData.fio,
        phone: inviteUserData.phone,
      });

      const data = res.data;
      console.log('Invite user response:', data);

      if (data.auth_required === 1) {
        router.replace('/' as any);
        return;
      }

      // Открываем Share с сообщением
      if (data.msg) {
        try {
          const result = await Share.share({
            message: data.msg,
          });
          
          console.log('Share result:', result);
          
          if (result.action === Share.sharedAction) {
            console.log('Shared successfully');
            // Возвращаемся назад после успешной отправки
            router.back();
          } else if (result.action === Share.dismissedAction) {
            console.log('Share dismissed');
            // Пользователь отменил - остаемся на экране
          }
        } catch (error) {
          console.log('Error sharing:', error);
        }
      } else {
        // Если нет сообщения, просто возвращаемся
        router.back();
      }
    } catch (error: any) {
      console.log('Error inviting user:', error);
      if (error.response?.status === 401) {
        router.replace('/' as any);
      }
    }
  };

  const getTextInputStyle = (field: keyof InviteUserData) => {
    let color = '#B8B8B8';
    let bgcolor = '#F9FAF9';

    if (field === 'phone') {
      const isValid = inviteUserData.phone.match(/\+7(\d{10})/);
      color = isValid ? '#656565' : '#B8B8B8';
      bgcolor = isValid ? '#FFFFFF' : '#F9FAF9';
    } else if (field === 'firm') {
      const isValid = inviteUserData.firm !== '';
      color = isValid ? '#656565' : '#B8B8B8';
      bgcolor = isValid ? '#FFFFFF' : '#F9FAF9';
    } else if (field === 'fio') {
      const isValid = inviteUserData.fio !== '';
      color = isValid ? '#656565' : '#B8B8B8';
      bgcolor = isValid ? '#FFFFFF' : '#F9FAF9';
    } else if (field === 'inn') {
      const isValid = inviteUserData.inn.match(/^(\d{10})$|^(\d{12})$/);
      color = isValid ? '#656565' : '#B8B8B8';
      bgcolor = isValid ? '#FFFFFF' : '#F9FAF9';
    }

    return {
      ...styles.textInput,
      borderColor: color,
      backgroundColor: bgcolor,
    };
  };

  const buttonDisabled = isButtonDisabled();

  return (
    <View style={styles.container}>
      {/* Заголовок */}
      <View style={styles.header}>
        <TouchableHighlight
          style={styles.backButton}
          activeOpacity={1}
          underlayColor='#FFFFFF'
          onPress={() => router.back()}
        >
          <Image source={require('../../../assets/images/back_2.png')} />
        </TouchableHighlight>
        <Text style={styles.headerTitle}>Пригласи друга</Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.discountInfo}>
          <Text style={styles.discountText}>Подробности скидки по телефону </Text>
          <Text style={styles.phoneLink}>{managerPhone}</Text>
        </View>

        {/* Название организации */}
        <Text style={styles.firstFieldLabel}>Название организации *:</Text>
        <View style={styles.inputContainer}>
          <TextInput
            style={getTextInputStyle('firm')}
            placeholder="Название организации"
            placeholderTextColor="#8C8C8C"
            value={inviteUserData.firm}
            onChangeText={(value) => handleFieldChange(value, 'firm')}
          />
        </View>

        {/* ИНН */}
        <Text style={styles.fieldLabel}>ИНН *:</Text>
        <View style={styles.inputContainer}>
          <TextInput
            style={getTextInputStyle('inn')}
            placeholder="ИНН"
            placeholderTextColor="#8C8C8C"
            keyboardType="numeric"
            maxLength={12}
            value={inviteUserData.inn}
            onChangeText={(value) => handleFieldChange(value, 'inn')}
          />
        </View>

        {/* ФИО */}
        <Text style={styles.fieldLabel}>ФИО *:</Text>
        <View style={styles.inputContainer}>
          <TextInput
            style={getTextInputStyle('fio')}
            placeholder="ФИО"
            placeholderTextColor="#8C8C8C"
            value={inviteUserData.fio}
            onChangeText={(value) => handleFieldChange(value, 'fio')}
          />
        </View>

        {/* Телефон */}
        <Text style={styles.fieldLabel}>Номер телефона *:</Text>
        <View style={styles.inputContainer}>
          <TextInput
            style={getTextInputStyle('phone')}
            placeholder="Номер телефона *"
            placeholderTextColor="#8C8C8C"
            keyboardType="numeric"
            maxLength={12}
            value={inviteUserData.phone}
            onChangeText={(value) => handleFieldChange(value, 'phone')}
          />
        </View>

      </ScrollView>

      {/* Кнопка отправить - показывается только когда все поля заполнены */}
      {!buttonDisabled && (
        <TouchableHighlight
          disabled={buttonDisabled}
          style={[
            styles.inviteButton,
            { backgroundColor: buttonDisabled ? '#c0c0c0' : '#3A3A3A' }
          ]}
          activeOpacity={1}
          underlayColor='#2E2E2E'
          onPress={handleInviteUser}
        >
          <Text style={styles.inviteButtonText}>Отправить приглашение</Text>
        </TouchableHighlight>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  backButton: {
    padding: 10,
    marginRight: 10,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#313131',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  discountInfo: {
    flexDirection: 'row',
    marginTop: 30,
    flexWrap: 'wrap',
  },
  discountText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#656565',
  },
  phoneLink: {
    fontSize: 14,
    fontWeight: 'bold',
    color: 'blue',
  },
  firstFieldLabel: {
    marginTop: 10,
    paddingLeft: 20,
    paddingRight: 20,
    paddingTop: 20,
    fontSize: 14,
    fontWeight: 'normal',
    color: '#656565',
  },
  fieldLabel: {
    paddingLeft: 20,
    paddingRight: 20,
    paddingTop: 30,
    fontSize: 14,
    fontWeight: 'normal',
    color: '#656565',
  },
  inputContainer: {
    alignItems: 'stretch',
    paddingLeft: 30,
    paddingRight: 30,
  },
  textInput: {
    height: 55,
    fontSize: 20,
    paddingLeft: 20,
    borderWidth: 1,
    borderRadius: 8,
    color: '#313131',
  },
  inviteButton: {
    position: 'absolute',
    left: 10,
    bottom: 10,
    right: 10,
    height: 50,
    margin: 25,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inviteButtonText: {
    fontSize: 24,
    fontWeight: '500',
    color: '#FFFFFF',
  },
});
