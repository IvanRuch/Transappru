import React, { Component } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Alert, Pressable, Modal } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import api from '../../services/api';

// Types
type RootStackParamList = {
  Auth: undefined;
  Pin: undefined;
  Inn: { user_data: any };
  AutoList: undefined;
};

type PinScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Pin'>;

interface PinScreenProps {
  navigation: PinScreenNavigationProp;
}

interface PinScreenState {
  code: string;
  disabled: boolean;
  modalVisible: boolean;
  msg: string;
}

class PinScreen extends Component<PinScreenProps, PinScreenState> {

  constructor(props: PinScreenProps) {
    super(props);
    this.state = {
      code: '',
      disabled: true,
      modalVisible: false,
      msg: '',
    };
  }

  changeCode = (value: string): void => {
    console.log('changeCode. value = ' + value)

    this.setState({code: value})

    if(value.match(/(\d{4})/))
    {
      this.setState({disabled: false})
    }
    else
    {
      this.setState({disabled: true})
    }
  }

  confirmToken = async (value: string | null): Promise<void> => {
    console.log('confirmToken. value = ' + value)

    if (!value) {
      console.log('No token found');
      return;
    }

    try {
      const res = await api.post('/confirm-token', { token: value, code: this.state.code });
      const data = res.data;
      console.log(data);

      if(data.error === 1)
      {
        this.setState({msg: data.msg, modalVisible: true})
      }
      else
      {
        if(data.phone_inn_bind === 1 || data.is_manager === 1)
        {
          this.props.navigation.navigate('AutoList')
        }
        else
        {
          this.props.navigation.navigate('Inn', { user_data: {} })
        }
      }
    } catch (error) {
      console.log('error');
      console.log(error);
    }
  }

  setButtonStyle = () => {
    let backgroundColor = this.state.disabled ? "#c0c0c0" : "#3A3A3A";
    return { height: 50, width: 185, borderRadius: 5, alignItems: 'center' as const, justifyContent: 'center' as const, backgroundColor: backgroundColor }
  }

  setButtonTextStyle = () => {
    let color = this.state.disabled ? "#FFFFFF" : "#FFFFFF";
    return { fontSize: 20, color: color }
  }

  render() {
    return (

      <View style={styles.container}>

        <Modal
          animationType="slide"
          transparent={true}
          visible={this.state.modalVisible}
          onRequestClose={() => {
            Alert.alert("Modal has been closed.");
            this.setState({modalVisible: false})
          }}
        >
          <View style={styles.centeredView}>
            <View style={styles.modalView}>
              <Text style={styles.modalText}>{ this.state.msg }</Text>
              <Pressable
                style={[styles.button, styles.buttonClose]}
                onPress={() => { this.setState({modalVisible: false}); this.props.navigation.navigate('Auth') }}
              >
                <Text style={styles.textStyle}>получить еще раз</Text>
              </Pressable>
            </View>
          </View>
        </Modal>

        <Text style={{ fontSize: 22, fontWeight: "bold", color: '#4C4C4C' }}>Введите подтверждающий код</Text>
        <Text style={{ color: '#4C4C4C' }}>ожидайте sms-сообщение с кодом</Text>
          <TextInput
            keyboardType='numeric'
            textAlign={'center'}
            style={{ height: 60, width: 100, color: '#4C4C4C', fontSize: 34, borderRadius: 5, borderBottomColor: 'black', borderBottomWidth: 1, marginBottom : 10 }}
            maxLength={4}
            placeholder='0000'
            placeholderTextColor='#c0c0c0'
            onChangeText={this.changeCode}
          />
          <TouchableOpacity
              disabled={this.state.disabled}
              style={this.setButtonStyle()}
              onPress={async () => {
                console.log('call confirm_token')
                const token = await AsyncStorage.getItem('token');
                this.confirmToken(token);
              }}
          >
            <Text style={this.setButtonTextStyle()}>Подтвердить</Text>
          </TouchableOpacity>
      </View>
    );
  }
}

// ...

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

export default PinScreen;
