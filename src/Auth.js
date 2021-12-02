import React from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, TouchableHighlight, Image, Linking, Modal, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-community/async-storage';

import Api from "./utils/Api";

class Auth extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      phone: '',
      disabled: true,
      checked: false,
      user_agreement: '',
      modalUserAgreement: false,
      privacy_policy: '',
      modalPrivacyPlolicy: false,
    };
  }

  focusPhone = () => {
    console.log('focusPhone')
    if(this.state.phone == '')
    {
      this.setState({phone: '+7'})
    }
  };

  changePhone = (value) => {
    console.log('changePhone. value = ' + value)

    if(value == '+7')
    {
      value = ''
    }
    if(value == '7')
    {
      value = '+7'
    }
    if(value == '+' || value == '8')
    {
      value = '+7'
    }
    if(value.match(/^\d$/))
    {
      value = '+7' + value
    }

    this.setState({phone: value})

    if(value.match(/\+7(\d{10})/))
    {
      this.setState({disabled: false})
    }
    else
    {
      this.setState({disabled: true})
    }
  };

  setButtonStyle = () => {
    let backgroundColor = this.state.disabled || !this.state.checked ? "#c0c0c0" : "#fee600";
    return { height: 50, width: 275, fontSize: 10, borderRadius: 5, alignItems: 'center', justifyContent: 'center', backgroundColor: backgroundColor }
  }

  setButtonTextStyle = () => {
    let color = this.state.disabled || !this.state.checked ? "#fff" : "#000";
    return { fontSize: 20, color: color }
  }

  componentDidMount() {
    console.log('Auth DidMount')


    Api.post('/get-user-agreement-and-privacy-policy')
       .then(res => {

          const data = res.data;
          //console.log(data);

          this.setState({ user_agreement: data.content_data.user_agreement, privacy_policy: data.content_data.privacy_policy })
        })
        .catch(error => {
            console.log('error');
            console.log(error);
        });
  }

  render() {
    return (

      <View style={styles.container}>

        {/* модальное окно с Пользовательским соглашением */}
        <Modal
          animationType="slide"
          transparent={false}
          visible={this.state.modalUserAgreement}
          onRequestClose={() => {
            this.setState({modalUserAgreement: false})
          }}
        >
          <ScrollView>
            <View style={{
              flex: 1,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <View style={{
                //flex: 1,
                backgroundColor: '#8C8C8C',
                borderRadius: 25,
                alignItems: 'stretch',
                justifyContent: 'center',
                padding: 20,
              }}>
                <Text>{ this.state.user_agreement }{"\n"}{"\n"}{"\n"}{"\n"}</Text>
              </View>
            </View>
          </ScrollView>
          <TouchableOpacity
            style={{ position: 'absolute', bottom: 20, left: 20, right: 20, height: 50, fontSize: 10, borderRadius: 5, alignItems: 'center', justifyContent: 'center', backgroundColor: "#FEE600" }}
            onPress={() =>  { this.setState({modalUserAgreement: false}) }}>
            <Text style={{ paddingLeft: 20, paddingRight: 20, fontSize: 14, color: "#2B2D33" }}>ОК</Text>
          </TouchableOpacity>
        </Modal>

        {/* модальное окно с Политикой конфиденциальности */}
        <Modal
          animationType="slide"
          transparent={false}
          visible={this.state.modalPrivacyPlolicy}
          onRequestClose={() => {
            this.setState({modalPrivacyPlolicy: false})
          }}
        >
          <ScrollView>
            <View style={{
              flex: 1,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <View style={{
                //flex: 1,
                backgroundColor: '#8C8C8C',
                borderRadius: 25,
                alignItems: 'stretch',
                justifyContent: 'center',
                padding: 20,
              }}>
                <Text>{ this.state.privacy_policy }{"\n"}{"\n"}{"\n"}{"\n"}</Text>
              </View>
            </View>
          </ScrollView>
          <TouchableOpacity
            style={{ position: 'absolute', bottom: 20, left: 20, right: 20, height: 50, fontSize: 10, borderRadius: 5, alignItems: 'center', justifyContent: 'center', backgroundColor: "#FEE600" }}
            onPress={() =>  { this.setState({modalPrivacyPlolicy: false}) }}>
            <Text style={{ paddingLeft: 20, paddingRight: 20, fontSize: 14, color: "#2B2D33" }}>ОК</Text>
          </TouchableOpacity>
        </Modal>

        <Text style={{ fontSize: 22, fontWeight: "bold" }}>Введите номер телефона</Text>
        <Text>чтобы войти или зарегистрироваться</Text>
        <TextInput
          keyboardType='phone-pad'
          textAlign={'center'}
          style={{ height: 60, width: 275, fontSize: 30, borderRadius: 5, borderBottomColor: 'black', borderBottomWidth: 1, marginBottom : 10 }}
          maxLength={12}
          placeholder = '+70000000000'
          onChangeText={this.changePhone}
          //onFocus={this.focusPhone}
          value={this.state.phone}
        />
        <TouchableOpacity
            disabled={this.state.disabled || !this.state.checked}
            style={this.setButtonStyle()}
            onPress={() => {
                console.log('call auth-by-phone')
                let phone = this.state.phone
                    phone = phone.replace(/\+/, '')
                console.log('phone = ' + phone)

                Api.post('/auth-by-phone', { phone: phone })
                   .then(res => {

                      const data = res.data;
                      console.log(data);

                      AsyncStorage.setItem( 'token', data.token );

                      this.props.navigation.navigate('Pin')
                    })
                    .catch(error => {
                        console.log('error');
                        console.log(error);
                    });
              }
            }
        >
          <Text style={this.setButtonTextStyle()}>Отправить</Text>
        </TouchableOpacity>

        <View style={{
          marginTop: 30,
          width: 300,
          flexDirection: "row"
        }}>
          <View style={{
            flex: 5
          }}>
            <Text style={{ fontSize: 12, fontWeight: "normal" }}>Нажимая на кнопку “Отправить”,
          я соглашаюсь с данными:</Text>
          </View>
          <View style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <TouchableHighlight
              style={{ width: 32, height: 32 }}
              onPress={() => { this.setState({checked: this.state.checked ? false : true }) }}
            >
              {
                this.state.checked ? (
                  <Image style={{ width: 24, height: 24 }} source={require('../images/checkbox_checked_512x512.png')} />
                ) : (
                  <Image style={{ width: 24, height: 24 }} source={require('../images/checkbox_unchecked_512x512.png')} />
                )
              }

            </TouchableHighlight>
          </View>
        </View>

        <Text
          style={{ marginTop: 10, color: 'blue'}}
          onPress={() => { this.setState({ modalUserAgreement: true}) }}>
          Пользовательское соглашение
        </Text>
        <Text
          style={{ marginTop: 10, color: 'blue'}}
          onPress={() => { this.setState({ modalPrivacyPlolicy: true}) }}>
          Политика конфиденциальности
        </Text>

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
});

export default Auth;
