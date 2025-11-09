import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableHighlight, Image, ScrollView, ActivityIndicator, Modal, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Api from '../src/utils/Api';

export default function UserScreen() {
  const router = useRouter();
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [modalDelUserVisible, setModalDelUserVisible] = useState(false);
  const [modalLogoutVisible, setModalLogoutVisible] = useState(false);
  const [modalEditContactVisible, setModalEditContactVisible] = useState(false);
  const [contactData, setContactData] = useState({ fio: '', email: '', phone: '', position: '' });

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        router.replace('/' as any);
        return;
      }

      // Используем тот же endpoint что и в AutoList
      const res = await Api.post('/get-contact-list', { token });
      const data = res.data;
      console.log('User screen - User data:', data);
      
      if (data.user_data) {
        setUserData(data.user_data);
      }
      setLoading(false);
    } catch (error: any) {
      console.log('Error loading user data:', error);
      if (error.response?.status === 401) {
        router.replace('/' as any);
      }
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await AsyncStorage.removeItem('token');
    router.replace('/' as any);
  };

  const handleDeleteProfile = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        router.replace('/' as any);
        return;
      }

      const res = await Api.post('/del-user', { token });
      const data = res.data;
      console.log('Delete user response:', data);

      // После удаления профиля выходим
      await AsyncStorage.removeItem('token');
      router.replace('/' as any);
    } catch (error: any) {
      console.log('Error deleting user:', error);
      if (error.response?.status === 401) {
        router.replace('/' as any);
      }
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3A8FD9" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Заголовок */}
      <View style={styles.header}>
        <TouchableHighlight
          style={styles.backButton}
          activeOpacity={1}
          underlayColor="#ffffff"
          onPress={() => router.back()}
        >
          <Image source={require('../assets/images/back_2.png')} />
        </TouchableHighlight>
        <Text style={styles.headerTitle}>Профиль</Text>
      </View>

      <ScrollView style={styles.content}>
        {/* Название организации */}
        <Text style={styles.fieldLabel}>Название организации:</Text>
        <View style={styles.inputContainer}>
          <Text style={styles.inputText}>{userData?.firm || ''}</Text>
        </View>

        {/* ИНН */}
        <Text style={styles.fieldLabel}>ИНН:</Text>
        <View style={styles.inputContainer}>
          <Text style={styles.inputText}>{userData?.inn || ''}</Text>
        </View>

        {/* Контакты */}
        <Text style={styles.fieldLabel}>Контакты:</Text>
        <TouchableHighlight
          style={styles.addButton}
          activeOpacity={1}
          underlayColor='#FFFFFF'
          onPress={() => setModalEditContactVisible(true)}
        >
          <View style={styles.addButtonContent}>
            <Image source={require('../assets/images/add_button_2.png')} />
            <Text style={styles.addButtonText}>Добавить</Text>
          </View>
        </TouchableHighlight>

        {/* Список контактов (пока пустой) */}
        {/* TODO: Добавить список контактов */}

        {/* Кнопка выйти */}
        <View style={styles.logoutSection}>
          <TouchableHighlight
            style={styles.logoutButton}
            activeOpacity={1}
            underlayColor='#F0F0F0'
            onPress={() => setModalLogoutVisible(true)}
          >
            <Text style={styles.logoutButtonText}>Выйти из аккаунта</Text>
          </TouchableHighlight>
        </View>
      </ScrollView>

      {/* Кнопка удалить профиль - плавающая внизу справа */}
      {!modalDelUserVisible && !modalLogoutVisible && (
        <TouchableHighlight
          style={styles.deleteButton}
          activeOpacity={1}
          underlayColor='#2E2E2E'
          onPress={() => setModalDelUserVisible(true)}
        >
          <View style={styles.deleteButtonContent}>
            <Image style={styles.deleteIcon} source={require('../assets/images/delete_white_2.png')} />
            <Text style={styles.deleteButtonText}>Удалить профиль</Text>
          </View>
        </TouchableHighlight>
      )}

      {/* Модалка подтверждения выхода */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalLogoutVisible}
        onRequestClose={() => setModalLogoutVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalText}>Вы действительно хотите выйти из аккаунта?</Text>
            
            <View style={styles.modalButtons}>
              <TouchableHighlight
                style={styles.modalDeleteButton}
                activeOpacity={1}
                underlayColor='#2E2E2E'
                onPress={() => {
                  setModalLogoutVisible(false);
                  handleLogout();
                }}
              >
                <Text style={styles.modalDeleteButtonText}>Выйти</Text>
              </TouchableHighlight>
              
              <TouchableHighlight
                style={styles.modalCancelButton}
                activeOpacity={1}
                underlayColor='#F0F0F0'
                onPress={() => setModalLogoutVisible(false)}
              >
                <Text style={styles.modalCancelButtonText}>Отменить</Text>
              </TouchableHighlight>
            </View>
          </View>
        </View>
      </Modal>

      {/* Модалка подтверждения удаления профиля */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalDelUserVisible}
        onRequestClose={() => setModalDelUserVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalText}>Вы действительно хотите удалить профиль?</Text>
            <Text style={styles.modalSubText}>Все ваши данные будут удалены вместе с ним</Text>
            
            <View style={styles.modalButtons}>
              <TouchableHighlight
                style={styles.modalDeleteButton}
                activeOpacity={1}
                underlayColor='#2E2E2E'
                onPress={() => {
                  setModalDelUserVisible(false);
                  handleDeleteProfile();
                }}
              >
                <Text style={styles.modalDeleteButtonText}>Удалить</Text>
              </TouchableHighlight>
              
              <TouchableHighlight
                style={styles.modalCancelButton}
                activeOpacity={1}
                underlayColor='#F0F0F0'
                onPress={() => setModalDelUserVisible(false)}
              >
                <Text style={styles.modalCancelButtonText}>Отменить</Text>
              </TouchableHighlight>
            </View>
          </View>
        </View>
      </Modal>

      {/* Модалка добавления контакта */}
      <Modal
        animationType="slide"
        transparent={false}
        visible={modalEditContactVisible}
        onRequestClose={() => setModalEditContactVisible(false)}
      >
        <View style={styles.container}>
          {/* Заголовок */}
          <View style={styles.header}>
            <View style={{ flex: 5, alignItems: 'flex-start' }}>
              <Text style={styles.headerTitle}>Контактные данные</Text>
            </View>
            <TouchableHighlight
              style={{ padding: 10 }}
              activeOpacity={1}
              underlayColor='#FFFFFF'
              onPress={() => {
                setModalEditContactVisible(false);
                setContactData({ fio: '', email: '', phone: '', position: '' });
              }}
            >
              <Image source={require('../assets/images/xclose_2.png')} />
            </TouchableHighlight>
          </View>

          <ScrollView style={styles.content}>
            <Text style={styles.contactModalDescription}>Добавьте контакты:</Text>

            <View style={styles.contactForm}>
              <Text style={styles.contactInputLabel}>ФИО:</Text>
              <TextInput
                style={styles.contactInput}
                placeholder="ФИО"
                placeholderTextColor="#8C8C8C"
                value={contactData.fio}
                onChangeText={(value) => setContactData({ ...contactData, fio: value })}
              />

              <Text style={styles.contactInputLabel}>E-mail:</Text>
              <TextInput
                style={styles.contactInput}
                placeholder="E-mail"
                placeholderTextColor="#8C8C8C"
                keyboardType="email-address"
                value={contactData.email}
                onChangeText={(value) => setContactData({ ...contactData, email: value })}
              />

              <Text style={styles.contactInputLabel}>Телефон:</Text>
              <TextInput
                style={styles.contactInput}
                placeholder="+7"
                placeholderTextColor="#8C8C8C"
                keyboardType="phone-pad"
                value={contactData.phone}
                onChangeText={(value) => setContactData({ ...contactData, phone: value })}
              />

              <Text style={styles.contactInputLabel}>Должность:</Text>
              <TextInput
                style={styles.contactInput}
                placeholder="Должность"
                placeholderTextColor="#8C8C8C"
                value={contactData.position}
                onChangeText={(value) => setContactData({ ...contactData, position: value })}
              />

              <TouchableHighlight
                style={styles.saveContactButton}
                activeOpacity={1}
                underlayColor='#2E2E2E'
                onPress={() => {
                  console.log('Save contact:', contactData);
                  setModalEditContactVisible(false);
                  setContactData({ fio: '', email: '', phone: '', position: '' });
                }}
              >
                <Text style={styles.saveContactButtonText}>Сохранить</Text>
              </TouchableHighlight>
            </View>
          </ScrollView>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
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
    paddingBottom: 100,
  },
  fieldLabel: {
    paddingLeft: 20,
    paddingRight: 20,
    paddingTop: 20,
    fontSize: 14,
    fontWeight: 'normal',
    color: '#656565',
  },
  inputContainer: {
    alignItems: 'stretch',
    paddingTop: 20,
    paddingLeft: 30,
    paddingRight: 30,
  },
  inputText: {
    height: 55,
    fontSize: 20,
    paddingLeft: 20,
    borderColor: '#656565',
    borderWidth: 1,
    borderRadius: 8,
    color: '#313131',
    lineHeight: 55,
  },
  addButton: {
    paddingLeft: 30,
    paddingTop: 20,
  },
  addButtonContent: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  addButtonText: {
    fontSize: 22,
    color: '#3A3A3A',
  },
  logoutSection: {
    padding: 30,
    marginTop: 40,
    marginBottom: 100,
  },
  logoutButton: {
    backgroundColor: '#FFFFFF',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#B8B8B8',
  },
  logoutButtonText: {
    fontSize: 16,
    color: '#313131',
    fontWeight: '500',
  },
  deleteButton: {
    position: 'absolute',
    right: 10,
    bottom: 10,
    height: 50,
    margin: 25,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3A3A3A',
  },
  deleteButtonContent: {
    alignItems: 'center',
    flexDirection: 'row',
    paddingLeft: 25,
    paddingRight: 25,
  },
  deleteIcon: {
    marginLeft: 0,
  },
  deleteButtonText: {
    fontSize: 24,
    fontWeight: '500',
    color: '#FFFFFF',
    paddingLeft: 15,
  },
  modalOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(29, 29, 29, 0.6)',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 25,
    alignItems: 'stretch',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#B8B8B8',
    padding: 24,
    maxWidth: 350,
  },
  modalText: {
    fontSize: 16,
    fontWeight: 'normal',
    color: '#4C4C4C',
    marginBottom: 16,
  },
  modalSubText: {
    fontSize: 16,
    fontWeight: 'normal',
    color: '#4C4C4C',
    marginBottom: 24,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalDeleteButton: {
    height: 50,
    flex: 1,
    marginRight: 10,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3A3A3A',
  },
  modalDeleteButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  modalCancelButton: {
    height: 50,
    flex: 1,
    marginLeft: 10,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelButtonText: {
    fontSize: 14,
    color: '#313131',
  },
  contactModalDescription: {
    paddingLeft: 20,
    paddingRight: 20,
    paddingTop: 20,
    fontSize: 16,
    fontWeight: 'normal',
    color: '#313131',
  },
  contactForm: {
    backgroundColor: '#EEEEEE',
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#B8B8B8',
    margin: 20,
    padding: 20,
  },
  contactInputLabel: {
    fontSize: 14,
    color: '#656565',
    marginTop: 15,
    marginBottom: 5,
  },
  contactInput: {
    height: 55,
    fontSize: 20,
    paddingLeft: 20,
    backgroundColor: '#FFFFFF',
    borderColor: '#656565',
    borderWidth: 1,
    borderRadius: 8,
    color: '#313131',
  },
  saveContactButton: {
    height: 60,
    marginTop: 30,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3A3A3A',
  },
  saveContactButtonText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
});
