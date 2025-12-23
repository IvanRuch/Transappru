import React, {useCallback, useEffect, useState} from 'react';
import { View, Text, StyleSheet, TouchableHighlight, Image, ScrollView, ActivityIndicator, Modal, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Api from '../src/utils/Api';

interface ContactData {
  id: string;
  fio: string;
  email: string;
  phone: string;
  position: string;
}

export default function UserScreen() {
  const router = useRouter();
  const [userData, setUserData] = useState<any>(null);
  const [contactList, setContactList] = useState<ContactData[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalDelUserVisible, setModalDelUserVisible] = useState(false);
  const [modalLogoutVisible, setModalLogoutVisible] = useState(false);
  const [modalEditContactVisible, setModalEditContactVisible] = useState(false);
  const [modalEditContactMode, setModalEditContactMode] = useState<'add' | 'edit'>('add');
  const [contactData, setContactData] = useState<ContactData>({ id: '', fio: '', email: '', phone: '', position: '' });

  const loadUserData = useCallback(async () => {
        try {
            const token = await AsyncStorage.getItem('token');
            if (!token) {
                router.replace('/' as any);
                return;
            }

            const res = await Api.post('/get-contact-list', { token });
            const data = res.data;
            console.log('User screen - User data:', data);

            if (data.user_data) {
                setUserData(data.user_data);
            }
            if (data.user_contact_list) {
                setContactList(data.user_contact_list);
            }
            setLoading(false);
        } catch (error: any) {
            console.log('Error loading user data:', error);
            if (error.response?.status === 401) {
                router.replace('/' as any);
            }
            setLoading(false);
        }
    }, [router, setUserData, setContactList, setLoading]);

  useEffect(() => {
      loadUserData();
  }, [loadUserData]);

  const handleLogout = async () => {
    // Не удаляем токен, просто переходим на экран авторизации
    // Это позволяет вернуться назад или войти под другим аккаунтом
    console.log('🚪 Logout: navigating to auth screen (token preserved)');
    
    // Сохраняем текущий токен для возможности возврата
    const currentToken = await AsyncStorage.getItem('token');
    if (currentToken) {
      await AsyncStorage.setItem('saved_token_for_return', currentToken);
    }
    
    // Используем специальный флаг в AsyncStorage чтобы index.tsx знал что нужно показать AuthScreen
    await AsyncStorage.setItem('show_auth_screen', 'true');
    router.push('/' as any);
  };

  const openModalEditContact = (mode: 'add' | 'edit', contact?: ContactData) => {
    setModalEditContactMode(mode);
    if (mode === 'add') {
      setContactData({ id: '', fio: '', email: '', phone: '', position: '' });
    } else if (contact) {
      setContactData(contact);
    }
    setModalEditContactVisible(true);
  };

  const handlePhoneChange = (value: string) => {
    let newValue = value;

    // Если удалили +7, очищаем поле
    if (newValue === '+7') {
      newValue = '';
    }
    // Если ввели только 7, добавляем +
    else if (newValue === '7') {
      newValue = '+7';
    }
    // Если ввели + или 8, заменяем на +7
    else if (newValue === '+' || newValue === '8') {
      newValue = '+7';
    }
    // Если ввели одну цифру, добавляем +7 перед ней
    else if (newValue.match(/^\d$/)) {
      newValue = '+7' + newValue;
    }

    setContactData({ ...contactData, phone: newValue });
  };

  const handleSaveContact = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        router.replace('/' as any);
        return;
      }

      // TODO: Добавление новых контактов не работает - сервер не создает новый контакт
      // При отправке данных с пустым id или id: "0", сервер возвращает те же данные обратно
      // без создания записи в БД. Нужно исправить на сервере endpoint /edit-contact
      // или создать отдельный endpoint /add-contact для добавления новых контактов.
      // Редактирование существующих контактов работает корректно.

      // Подготавливаем данные для отправки
      const dataToSend = {
        ...contactData,
        // Убираем + из номера телефона для отправки на сервер
        phone: contactData.phone.replace('+', ''),
      };

      const res = await Api.post('/edit-contact', {
        token,
        user_contact_data: dataToSend,
      });

      const data = res.data;

      if (data.auth_required === 1) {
        router.replace('/' as any);
        return;
      }

      // Закрываем модальное окно
      setModalEditContactVisible(false);
      setContactData({ id: '', fio: '', email: '', phone: '', position: '' });

      // Перезагружаем весь список контактов с сервера
      // чтобы получить актуальные данные (включая новые id)
      await loadUserData();
    } catch (error: any) {
      console.log('Error saving contact:', error);
      if (error.response?.status === 401) {
        router.replace('/' as any);
      }
    }
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

      // После удаления профиля показываем экран "Спасибо"
      await AsyncStorage.removeItem('token');
      router.replace('/deleted' as any);
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
          onPress={() => openModalEditContact('add')}
        >
          <View style={styles.addButtonContent}>
            <Image source={require('../assets/images/add_button_2.png')} />
            <Text style={styles.addButtonText}>Добавить</Text>
          </View>
        </TouchableHighlight>

        {/* Список контактов */}
        <View>
          {contactList.map((item, index) => (
            <TouchableHighlight
              key={item.id}
              style={[
                styles.contactItem,
                { backgroundColor: modalEditContactVisible || modalDelUserVisible || modalLogoutVisible ? 'rgba(29,29,29, 0)' : '#EEEEEE' }
              ]}
              activeOpacity={1}
              underlayColor='#EEEEEE'
              onPress={() => openModalEditContact('edit', item)}
            >
              <View style={styles.contactItemContent}>
                <View style={styles.contactInfo}>
                  {item.fio !== '' && (
                    <Text style={styles.contactText}>ФИО: {item.fio}</Text>
                  )}
                  {item.email !== '' && (
                    <Text style={styles.contactText}>E-mail: {item.email}</Text>
                  )}
                  {item.phone !== '' && (
                    <Text style={styles.contactText}>Номер телефона: +{item.phone}</Text>
                  )}
                  {item.position !== '' && (
                    <Text style={styles.contactText}>Должность: {item.position}</Text>
                  )}
                </View>
                <View style={styles.contactEditIcon}>
                  <Image source={require('../assets/images/edit_2.png')} />
                </View>
              </View>
            </TouchableHighlight>
          ))}
        </View>

        {/* Кнопка очистки данных (только в dev режиме) */}
        {__DEV__ && (
          <View style={styles.devButtonSection}>
            <TouchableHighlight
              style={styles.devButton}
              activeOpacity={1}
              underlayColor='#F57C00'
              onPress={async () => {
                try {
                  await AsyncStorage.clear();
                  console.log('✅ App data cleared!');
                  alert('Данные приложения очищены. Приложение будет перезапущено.');
                  router.replace('/' as any);
                } catch (e) {
                  console.log('❌ Error clearing app data:', e);
                  alert('Ошибка при очистке данных');
                }
              }}
            >
              <Text style={styles.devButtonText}>🗑️ Очистить данные (DEV)</Text>
            </TouchableHighlight>
          </View>
        )}

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

        {/* Кнопка удалить профиль */}
        <View style={styles.deleteProfileSection}>
          <TouchableHighlight
            style={styles.deleteProfileButton}
            activeOpacity={1}
            underlayColor='#2E2E2E'
            onPress={() => setModalDelUserVisible(true)}
          >
            <View style={styles.deleteProfileButtonContent}>
              <Image source={require('../assets/images/delete_white_2.png')} />
              <Text style={styles.deleteProfileButtonText}>Удалить профиль</Text>
            </View>
          </TouchableHighlight>
        </View>
      </ScrollView>

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
                setContactData({ id: '', fio: '', email: '', phone: '', position: '' });
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
                autoCapitalize="none"
                autoCorrect={false}
                value={contactData.email}
                onChangeText={(value) => setContactData({ ...contactData, email: value })}
              />

              <Text style={styles.contactInputLabel}>Телефон:</Text>
              <TextInput
                style={styles.contactInput}
                placeholder="Номер телефона *"
                placeholderTextColor="#8C8C8C"
                keyboardType="numeric"
                maxLength={12}
                value={contactData.phone}
                onChangeText={handlePhoneChange}
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
                onPress={handleSaveContact}
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
  deleteProfileSection: {
    marginTop: 20,
    marginBottom: 40,
    paddingHorizontal: 20,
  },
  deleteProfileButton: {
    height: 60,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3A3A3A',
  },
  deleteProfileButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteProfileButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 10,
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
  contactItem: {
    flexDirection: 'row',
    margin: 30,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#B8B8B8',
  },
  contactItemContent: {
    flex: 1,
    flexDirection: 'row',
  },
  contactInfo: {
    flex: 3,
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
    flexDirection: 'column',
  },
  contactText: {
    paddingLeft: 20,
    paddingRight: 20,
    fontSize: 20,
    fontWeight: 'normal',
    color: '#313131',
  },
  contactEditIcon: {
    flex: 1,
    paddingRight: 10,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  devButtonSection: {
    padding: 30,
    marginTop: 20,
  },
  devButton: {
    backgroundColor: '#FF9800',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  devButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
});
