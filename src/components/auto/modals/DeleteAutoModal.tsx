import React from 'react';
import { Modal, View, Text, TouchableOpacity } from 'react-native';

interface DeleteAutoModalProps {
  visible: boolean;
  markedCount: number;
  onConfirm: () => void;
  onCancel: () => void;
}

export const DeleteAutoModal: React.FC<DeleteAutoModalProps> = ({
  visible,
  markedCount,
  onConfirm,
  onCancel,
}) => {
  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onCancel}
    >
      <View style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)'
      }}>
        <View style={{
          width: '80%',
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
            backgroundColor: '#FFE7E7',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 20,
          }}>
            <Text style={{ fontSize: 32 }}>⚠️</Text>
          </View>

          {/* Заголовок */}
          <Text style={{ 
            fontSize: 20, 
            fontWeight: 'bold', 
            marginBottom: 10,
            color: '#313131',
            textAlign: 'center',
          }}>
            Удалить автомобил{markedCount > 1 ? 'и' : 'ь'}?
          </Text>

          {/* Описание */}
          <Text style={{ 
            fontSize: 14, 
            color: '#666', 
            marginBottom: 25,
            textAlign: 'center',
            lineHeight: 20,
          }}>
            Вы действительно хотите удалить {markedCount} {
              markedCount === 1 ? 'автомобиль' : 
              markedCount > 1 && markedCount < 5 ? 'автомобиля' : 
              'автомобилей'
            }?{'\n'}
            Это действие нельзя отменить.
          </Text>

          {/* Кнопки */}
          <View style={{ flexDirection: 'row', width: '100%' }}>
            <TouchableOpacity
              style={{
                flex: 1,
                height: 50,
                backgroundColor: '#F0F0F0',
                borderRadius: 10,
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 10,
              }}
              onPress={onCancel}
            >
              <Text style={{ fontSize: 16, color: '#666', fontWeight: 'bold' }}>
                Отмена
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{
                flex: 1,
                height: 50,
                backgroundColor: '#D74747',
                borderRadius: 10,
                alignItems: 'center',
                justifyContent: 'center',
              }}
              onPress={onConfirm}
            >
              <Text style={{ fontSize: 16, color: '#FFF', fontWeight: 'bold' }}>
                Удалить
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};
