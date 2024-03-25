import React from 'react';
import { StyleSheet, Text, View, Button, TextInput, TouchableOpacity, Alert, Pressable, Modal, TouchableHighlight, Image } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import Api from "./utils/Api";

class Inn extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      inn: '',
      disabled: true,
      modalVisible: false,
      modalErrorVisible: false,
      msg: '',
    };
  }

  changeInn = (value) => {
    console.log('changeInn. value = ' + value)

    this.setState({inn: value})

    if(value.match(/^(\d{10})$|^(\d{12})$/))
    {
      this.setState({disabled: false})
    }
    else
    {
      this.setState({disabled: true})
    }
  }

  bindInn = (value) => {
    console.log('bindInn. value = ' + value)

    Api.post('/bind-inn', { token: value, inn: this.state.inn })
       .then(res => {

          const data = res.data;
          console.log(data);

          if(data.error == 1)
          {
            this.setState({msg: data.msg})
            this.setState({modalErrorVisible: true})
          }
          else
          {
            this.props.navigation.navigate('AutoList')
          }

        })
        .catch(error => {
            console.log('error');
        });
  }

  setButtonStyle = () => {
    let backgroundColor = this.state.disabled ? "#c0c0c0" : "#fee600";
    return { height: 50, width: 275, fontSize: 10, borderRadius: 5, alignItems: 'center', justifyContent: 'center', backgroundColor: backgroundColor }
  }

  setButtonTextStyle = () => {
    let color = this.state.disabled ? "#fff" : "#000";
    return { fontSize: 20, color: color }
  }

  render() {
    return (

      <View style={styles.container}>

        <Modal
          animationType="slide"
          transparent={true}
          visible={this.state.modalErrorVisible}
          onRequestClose={() => {
            Alert.alert("Modal has been closed.");
            this.setState({modalErrorVisible: false})
          }}
        >
          <View style={styles.centeredView}>
            <View style={styles.modalView}>
              <Text style={styles.modalText}>{ this.state.msg }</Text>
              <Pressable
                style={[styles.button, styles.buttonClose]}
                onPress={() => this.setState({modalErrorVisible: false})}
              >
                <Text style={styles.textStyle}>ok</Text>
              </Pressable>
            </View>
          </View>
        </Modal>

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
              <Text style={styles.modalText}>введите ИНН для более точной идентификации Вас как клиента</Text>
              <Pressable
                style={[styles.button, styles.buttonClose]}
                onPress={() => this.setState({modalVisible: false})}
              >
                <Text style={styles.textStyle}>ok</Text>
              </Pressable>
            </View>
          </View>
        </Modal>

        <Text style={{ fontSize: 22, fontWeight: "bold", color: '#4C4C4C' }}>Введите ИНН</Text>
        <View
          style={{
            flexDirection: "row",
            //height: 100,
            paddingLeft: 30
          }}
        >
          <TextInput
            keyboardType='numeric'
            style={{ height: 60, width: 275, color: '#4C4C4C', fontSize: 30, borderRadius: 5, borderBottomColor: 'black', borderBottomWidth: 1, marginBottom : 10 }}
            maxLength={12}
            //placeholder = '000000000000'
            onChangeText={this.changeInn}
          />
          <TouchableHighlight
            style={{ width: 24, height: 24 }}
            onPress={() => this.setState({modalVisible: true}) }>
            <Image
              style={{ width: 24, height: 24 }}
              source={{
                uri: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAMwSURBVFhHrZc3yFRdEIbXLMbOACpmMGFoxN4cwFK09VexsLEwlmYbS3OjCIpgKEQwBywM6F+YBRPmAGpjRJ9n2Vnu3u/e3bsf3wsP7J2dM+fsPXPmzJaaUE+YDpvgHLyCnxVew3nwO330bTONgp3wEf4W5BPsgtHQanWGzfAd0hO8gKtwsoKftaX9fsAWMFZTGgbXIRnsPqyDidAV0tI2AfTRNzn2BgyHQhoPbyAGv4fl0AmKSt9l4NiI8xZcfF0NAR1jkIk1CPLUrUKeBoIJG/HewVDIlKu+DeF8FDpAlpbCJTD7xc/+4iy1hyMQce9AZk6YcOFkQAem1RvOQvil8Y3pk1Y7uAjhtxVqZIL8Ar/0CPWHLJ2CCGKG+3oleVJOQ5b6QRxl5xoBVe2BCJD3KmdD+DyAsRAaA8nMnwtZ+g/CZ58G1R2+gMYnkPXq1QHQ5zdM0ZDSZPA7fQ5qyJCxH4E+X6EHlKZWDLJWQ45ugj4fwD3N0lPQ51r5KVurIeazbJfrdxjGacjRRnDv9pefWspCFOfeZMyTW/cH9LNKVrPzJTQqNrlnGK2E+CHlwDnqCM9BP09btfBc8aFJuYdWzg0Qk5sHNRmeISfW17mriXPChybk0X0GMXGwAhrpGOjr3K1ewCJITuz+L4EiqllAbMFlH5rQAojJd0AfKKqaLWgmCZNaCLGA+RoKqkUSxh3g0ah3DNOaA7GAeRoKyqoZx7B8J0yrPMgaDQXl21pfoZmOZxXEfDM0WIotixoeQ14pbgtZQaMUf4NyKVZ7IVZVNJNngcdQ3I4iWgwxT01FtXDEdeyV6dXZSN6IEeyhhgbqC3Ede/xGQo1MiAjoyci7cELW+6R/PRkr6b8dWshEsl0KJ9uoevkwGA5VsJfMk5Mfhoj7P+QmrZeNjWM4237ZWLZWA+AMRDyrpS1/XdnbJztjF2SXZAEpKn1tXJM/xs+ToJBMymhAgntgnfD26wJpafM7fe5CcuwtaJF0jeQ+mZg2n8lg4tHz+vYCOw7eI1k3o2O3QdaCC8vSuRs+Q3qCPPS10XVsm6kXzATvDo+Uf0iSf88vgJ2QPln/DTJUKv0DH6REIO5C4q0AAAAASUVORK5CYII=',
              }}
            />
          </TouchableHighlight>
        </View>


          <TouchableOpacity
              disabled={this.state.disabled}
              style={this.setButtonStyle()}
              onPress={() => {
                  console.log('call bind_inn')
                  AsyncStorage.getItem('token').then((value) => this.bindInn(value));
                  //this.props.navigation.navigate('AutoList')
                }
              }
          >
            <Text style={this.setButtonTextStyle()}>Зарегистрироваться</Text>
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
    borderRadius: 5,
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
    color: "black",
    textAlign: "center"
  }
});

export default Inn;
