import React from 'react';
import { Modal, View, Text, TouchableOpacity, Image } from 'react-native';

interface DebtInfoModalProps {
  visible: boolean;
  debtSum: string;
  onClose: () => void;
}

export const DebtInfoModal: React.FC<DebtInfoModalProps> = ({
  visible,
  debtSum,
  onClose,
}) => {
  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        paddingHorizontal: 20,
      }}>
        <View style={{
          width: '100%',
          maxWidth: 340,
          backgroundColor: 'white',
          borderRadius: 20,
          padding: 25,
          alignItems: 'center',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.25,
          shadowRadius: 4,
          elevation: 5,
        }}>
          {/* Иконка предупреждения */}
          <View style={{
            width: 60,
            height: 60,
            borderRadius: 30,
            backgroundColor: '#FFF3E0',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 20,
          }}>
            <Text style={{ fontSize: 32 }}>⚠️</Text>
          </View>

          {/* Заголовок */}
          <Text style={{ 
            fontSize: 18, 
            fontWeight: 'bold', 
            marginBottom: 15,
            color: '#313131',
            textAlign: 'center',
          }}>
            Задолженность
          </Text>

          {/* Сумма задолженности */}
          <Text style={{ 
            fontSize: 24, 
            fontWeight: 'bold', 
            color: '#D74747',
            marginBottom: 15,
            textAlign: 'center',
          }}>
            {debtSum} ₽
          </Text>

          {/* Описание */}
          <Text style={{ 
            fontSize: 14, 
            color: '#666', 
            marginBottom: 25,
            textAlign: 'center',
            lineHeight: 20,
          }}>
            Вы можете уточнить подробности у вашего персонального менеджера
          </Text>

          {/* Кнопка OK */}
          <TouchableOpacity
            style={{
              width: '100%',
              height: 50,
              backgroundColor: '#3A3A3A',
              borderRadius: 10,
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onPress={onClose}
          >
            <Text style={{ fontSize: 16, color: '#FFF', fontWeight: 'bold' }}>
              OK
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};
