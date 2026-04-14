import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Alert, Pressable, Modal, Image, Platform } from 'react-native';

import { usePinConfirm } from '../../hooks/usePinConfirm';

export default function PinScreen() {
  const {
    modalVisible,
    msg,
    canGoBack,
    submitPin,
    handleGoBack,
    handleChangeNumber,
    closeErrorModal,
  } = usePinConfirm();

  // Local input state
  const [code, setCode] = useState('');
  const [disabled, setDisabled] = useState(true);

  const changeCode = (value: string) => {
    setCode(value);
    setDisabled(!value.match(/(\d{4})/));
  };

  const handleSubmit = () => {
    submitPin(code);
  };

  const getButtonStyle = () => {
    const backgroundColor = disabled ? '#c0c0c0' : '#3A3A3A';
    return {
      height: 50,
      width: 185,
      borderRadius: 5,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      backgroundColor,
    };
  };

  const getButtonTextStyle = () => {
    return { fontSize: 20, color: '#FFFFFF' };
  };

  return (
    <View style={styles.container}>
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => {
          Alert.alert("Modal has been closed.");
          closeErrorModal();
        }}
      >
        <View style={styles.centeredView}>
          <View style={styles.modalView}>
            <Text style={styles.modalText}>{msg}</Text>
            <Pressable
              style={[styles.button, styles.buttonClose]}
              onPress={closeErrorModal}
            >
              <Text style={styles.textStyle}>получить еще раз</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {canGoBack && (
        <TouchableOpacity
          style={{
            position: 'absolute',
            top: Platform.OS === 'ios' ? 60 : 20,
            left: 20,
            padding: 10,
            zIndex: 10,
          }}
          onPress={handleGoBack}
        >
          <Image source={require('../../../assets/images/back_2.png')} />
        </TouchableOpacity>
      )}

      <Text style={{ fontSize: 22, fontWeight: 'bold', color: '#4C4C4C' }}>Код подтверждения</Text>
      <Text style={{ color: '#4C4C4C' }}>Введите 4-значный код из SMS</Text>
      <TextInput
        keyboardType="numeric"
        textAlign="center"
        style={{
          height: 60, width: 100, color: '#4C4C4C', fontSize: 34,
          borderRadius: 5, borderBottomColor: 'black', borderBottomWidth: 1, marginBottom: 10,
        }}
        maxLength={4}
        placeholder="0000"
        placeholderTextColor="#c0c0c0"
        onChangeText={changeCode}
      />
      <TouchableOpacity
        disabled={disabled}
        style={getButtonStyle()}
        onPress={handleSubmit}
      >
        <Text style={getButtonTextStyle()}>Подтвердить</Text>
      </TouchableOpacity>

      <TouchableOpacity style={{ marginTop: 30 }} onPress={handleChangeNumber}>
        <Text style={{ fontSize: 14, color: '#666666', textDecorationLine: 'underline' }}>
          Войти с другим номером
        </Text>
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
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: -350,
  },
  modalView: {
    margin: 20,
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 35,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  button: {
    borderRadius: 5,
    padding: 10,
    elevation: 2,
  },
  buttonClose: {
    backgroundColor: '#fee600',
  },
  textStyle: {
    color: 'black',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  modalText: {
    marginBottom: 15,
    textAlign: 'center',
  },
});
