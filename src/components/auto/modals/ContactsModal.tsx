import React from 'react';
import { Modal, View, Text, TouchableOpacity, ScrollView, Linking } from 'react-native';
import type { ManagerData } from '../../../types/auto';

interface ContactsModalProps {
  visible: boolean;
  managerData: ManagerData;
  techSupportName?: string;
  onClose: () => void;
  onContactPhone: (phone: string) => void;
  onContactEmail: (email: string, subject: string, body: string) => void;
}

export const ContactsModal: React.FC<ContactsModalProps> = ({
  visible,
  managerData,
  techSupportName,
  onClose,
  onContactPhone,
  onContactEmail,
}) => {
  return (
    <Modal
      animationType="slide"
      transparent={false}
      visible={visible}
      onRequestClose={onClose}
    >
      <ScrollView style={{ flex: 1, backgroundColor: '#F5F5F5' }}>
        <View style={{ padding: 20 }}>
          {/* Заголовок */}
          <Text style={{ 
            fontSize: 24, 
            fontWeight: 'bold', 
            marginBottom: 20,
            marginTop: 40,
            color: '#313131',
          }}>
            Контакты
          </Text>

          {/* Менеджер */}
          {managerData.name && (
            <View style={{
              backgroundColor: 'white',
              borderRadius: 15,
              padding: 20,
              marginBottom: 15,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.1,
              shadowRadius: 2,
              elevation: 2,
            }}>
              <Text style={{ fontSize: 12, color: '#999', marginBottom: 5 }}>
                Ваш менеджер
              </Text>
              <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#313131', marginBottom: 15 }}>
                {managerData.name}
              </Text>

              {/* Телефон менеджера */}
              {managerData.mobile_phone && (
                <TouchableOpacity
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    padding: 15,
                    backgroundColor: '#E8F4FE',
                    borderRadius: 10,
                    marginBottom: 10,
                  }}
                  onPress={() => onContactPhone(managerData.mobile_phone!)}
                >
                  <Text style={{ fontSize: 20, marginRight: 10 }}>📞</Text>
                  <View>
                    <Text style={{ fontSize: 12, color: '#666' }}>Телефон</Text>
                    <Text style={{ fontSize: 16, color: '#3A8FD9', fontWeight: 'bold' }}>
                      {managerData.mobile_phone}
                    </Text>
                  </View>
                </TouchableOpacity>
              )}

              {/* Email менеджера */}
              {managerData.email && (
                <TouchableOpacity
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    padding: 15,
                    backgroundColor: '#E8F4FE',
                    borderRadius: 10,
                  }}
                  onPress={() => onContactEmail(
                    managerData.email!,
                    'Вопрос по TransApp',
                    'Здравствуйте!'
                  )}
                >
                  <Text style={{ fontSize: 20, marginRight: 10 }}>📧</Text>
                  <View>
                    <Text style={{ fontSize: 12, color: '#666' }}>Email</Text>
                    <Text style={{ fontSize: 16, color: '#3A8FD9', fontWeight: 'bold' }}>
                      {managerData.email}
                    </Text>
                  </View>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Техподдержка */}
          {techSupportName && (
            <View style={{
              backgroundColor: 'white',
              borderRadius: 15,
              padding: 20,
              marginBottom: 15,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.1,
              shadowRadius: 2,
              elevation: 2,
            }}>
              <Text style={{ fontSize: 12, color: '#999', marginBottom: 5 }}>
                Техническая поддержка
              </Text>
              <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#313131', marginBottom: 15 }}>
                {techSupportName}
              </Text>

              {/* Телефон техподдержки */}
              <TouchableOpacity
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  padding: 15,
                  backgroundColor: '#FFF3CD',
                  borderRadius: 10,
                }}
                onPress={() => onContactPhone('+74951281212')}
              >
                <Text style={{ fontSize: 20, marginRight: 10 }}>☎️</Text>
                <View>
                  <Text style={{ fontSize: 12, color: '#666' }}>Телефон поддержки</Text>
                  <Text style={{ fontSize: 16, color: '#856404', fontWeight: 'bold' }}>
                    +7 (495) 128-12-12
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          )}

          {/* Информация */}
          <View style={{
            backgroundColor: 'white',
            borderRadius: 15,
            padding: 20,
            marginBottom: 20,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.1,
            shadowRadius: 2,
            elevation: 2,
          }}>
            <Text style={{ fontSize: 14, color: '#666', lineHeight: 22 }}>
              💡 По всем вопросам вы можете обращаться к вашему менеджеру или в техническую поддержку.
            </Text>
          </View>

          {/* Кнопка закрыть */}
          <TouchableOpacity
            style={{
              height: 50,
              backgroundColor: '#3A8FD9',
              borderRadius: 10,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 40,
            }}
            onPress={onClose}
          >
            <Text style={{ fontSize: 16, color: '#FFF', fontWeight: 'bold' }}>
              Закрыть
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </Modal>
  );
};
