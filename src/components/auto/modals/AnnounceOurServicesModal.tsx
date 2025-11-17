import React from 'react';
import { Modal, View, Text, Image, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';

interface AnnounceOurServicesModalProps {
  visible: boolean;
  onClose: () => void;
}

export const AnnounceOurServicesModal: React.FC<AnnounceOurServicesModalProps> = ({ visible, onClose }) => {
  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.overlay}>
          <View style={styles.modalContainer}>
            {/* Заголовок и кнопка закрытия */}
            <View style={styles.header}>
              <View style={styles.titleContainer}>
                <Text style={styles.title}>Наши услуги</Text>
              </View>
              <View style={styles.closeButtonContainer}>
                <TouchableOpacity
                  style={styles.closeButton}
                  activeOpacity={1}
                  onPress={onClose}
                >
                  <Image source={require('../../../../assets/images/xclose_2.png')} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Изображение */}
            <Image
              style={styles.image}
              source={require('../../../../assets/images/announce_our_services.png')}
            />

            {/* Текст */}
            <Text style={styles.text}>
              Мы добавили новые услуги для Вас. {'\n'}
              Ознакомиться с ними Вы можете, перейдя в меню
            </Text>

            {/* Кнопка "ОК" */}
            <TouchableOpacity
              style={styles.button}
              onPress={onClose}
            >
              <Text style={styles.buttonText}>ОК</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(29, 29, 29, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#B8B8B8',
    width: '90%',
    maxWidth: 400,
  },
  header: {
    flexDirection: 'row',
  },
  titleContainer: {
    flex: 5,
    alignItems: 'flex-start',
  },
  title: {
    paddingLeft: 16,
    paddingTop: 26,
    fontSize: 24,
    fontWeight: 'bold',
    color: '#313131',
  },
  closeButtonContainer: {
    flex: 1,
    alignItems: 'flex-end',
  },
  closeButton: {
    padding: 30,
  },
  image: {
    margin: 5,
    width: 300,
    height: 300,
    alignSelf: 'center',
  },
  text: {
    paddingLeft: 16,
    paddingRight: 16,
    paddingTop: 14,
    fontSize: 16,
    fontWeight: 'normal',
    color: '#4C4C4C',
    textAlign: 'justify',
  },
  button: {
    height: 50,
    margin: 25,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3A3A3A',
  },
  buttonText: {
    paddingLeft: 20,
    paddingRight: 20,
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
});
