import React from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, TouchableHighlight, Image, Linking, Modal, ScrollView, Appearance } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { getFCMToken } from './utils/PushNotificationHelper';
import Api from "./utils/Api";

const maxStep = 60;
const intervalTime = 10000;

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
      modalWaitConfirmation: false,
      session_data: {},
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
    let backgroundColor = this.state.disabled || !this.state.checked ? "#c0c0c0" : "#3A3A3A";
    return { height: 50, width: 275, fontSize: 10, borderRadius: 5, alignItems: 'center', justifyContent: 'center', backgroundColor: backgroundColor }
  }

  setButtonTextStyle = () => {
    let color = this.state.disabled || !this.state.checked ? "#FFFFFF" : "#FFFFFF";
    return { fontSize: 20, color: color }
  }

  getSessionData = (value) => {
    console.log('getSessionData. value = ' + value)

    if(!value)
    {
      console.log('empty token')
    }

    else
    {
      Api.post('/get-session-data', { token: value })
      .then(res => {

         const data = res.data;
         console.log(data);

         if(typeof(data.session_data.user_data) != 'undefined')
         {
          console.log('data.session_data.user_data.phone_inn_confirmed = ' + data.session_data.user_data.phone_inn_confirmed )
          console.log('data.session_data.user_data.user_confirmed = ' + data.session_data.user_data.user_confirmed )

          if(data.session_data.user_data.phone_inn_confirmed == 0 ||
              data.session_data.user_data.user_confirmed == 0)
          {
              this.setState({session_data: data.session_data, modalWaitConfirmation: true})

              //
              let t = 0;

              let get_session = setInterval(() => {

                console.log('t = ' + t);

                Api.post('/get-session-data', { token: value })
                .then(res => {

                  const data = res.data;
                  console.log('data')
                  console.log(data);

                  this.setState({session_data: data.session_data})
                })
                .catch(error => {
                  console.log('error.response.status = ' + error.response.status);
                  if(error.response.status == 401) { get_session = clearInterval(get_session); }
                });

                if(t >= maxStep * intervalTime)
                {
                  console.log('clearInterval by maxStep')
                  get_session = clearInterval(get_session);

                  this.props.navigation.navigate('AutoList')
                }

                if(this.state.session_data.user_data.phone_inn_confirmed == 1 &&
                  this.state.session_data.user_data.user_confirmed == 1)
                {
                  console.log('clearInterval by confirmed')
                  get_session = clearInterval(get_session);

                  console.log('-> move to AutoList')
                  this.props.navigation.navigate('AutoList')
                }  


                t += intervalTime;

              }, intervalTime);  

          }
         }
       })
       .catch(error => {
           console.log('error');
           console.log(error);
       });

    }

  }

  contactPhone = (phone) => {
    console.log('contactPhone. phone = ' + phone)

    let phoneStr = '';
    if (Platform.OS === 'android')
    {
      phoneStr = 'tel:' + phone
    }
    else
    {
      phoneStr = 'telprompt:' + phone
    }
    Linking.openURL(phoneStr);
  }

  componentDidMount() {
    console.log('Auth DidMount')

    let colorScheme = Appearance.getColorScheme();

    console.log('colorScheme = ' + colorScheme)

    AsyncStorage.getItem('token').then((value) => this.getSessionData(value));

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

        {/* модальное окно с уведомлением "мы с вами свяжемся" */}
        <Modal
          animationType="slide"
          transparent={false}
          visible={this.state.modalWaitConfirmation}
          onRequestClose={() => {
            this.setState({modalWaitConfirmation: false})
          }}
        >
            <View style={{
              flex: 1,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <View style={{
                //flex: 1,
                backgroundColor: '#EEEEEE',
                borderRadius: 25,
                alignItems: 'stretch',
                justifyContent: 'center',
                padding: 20,
                borderWidth: 1, 
                borderColor: "#B8B8B8" 
              }}>
                <Text style={{ paddingLeft: 16, paddingRight: 16, paddingTop: 24, fontSize: 20, fontWeight: "bold", color: "#313131" }}>Ваша заявка зарегистрирована!</Text>
                <Text style={{ paddingLeft: 16, paddingRight: 16, paddingTop: 24, fontSize: 16, fontWeight: "normal", color: "#313131" }}>Наш менеджер скоро свяжется с Вами по указанному при регистрации номеру для заключения договора оказания услуг и ответит на все сопутствующие вопросы</Text>
                    
                <TouchableHighlight
                  onPress={() => this.contactPhone(this.state.session_data.user_data.manager_data.mobile_phone)}
                  >
                  <View style={{ alignItems: 'center', padding: 5 }}>
                    <Text style={{ paddingLeft: 16, paddingRight: 16, paddingTop: 24, fontSize: 16, fontWeight: "normal", color: "#313131" }}>Вы можете связаться с менеджером</Text>
                    <Image style={{
                        margin: 15,
                      }}
                      source={require('../images/contact_phone_2.png')} />
                  </View>
                </TouchableHighlight>                 

              </View>

            </View>
        </Modal>

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
                backgroundColor: '#EEEEEE',
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
            style={{ position: 'absolute', bottom: 20, left: 20, right: 20, height: 50, fontSize: 10, borderRadius: 5, alignItems: 'center', justifyContent: 'center', backgroundColor: "#3A3A3A" }}
            onPress={() =>  { this.setState({modalUserAgreement: false}) }}>
            <Text style={{ paddingLeft: 20, paddingRight: 20, fontSize: 14, fontWeight: 'bold', color: "#FFFFFF" }}>ОК</Text>
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
                backgroundColor: '#EEEEEE',
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
            style={{ position: 'absolute', bottom: 20, left: 20, right: 20, height: 50, fontSize: 10, borderRadius: 5, alignItems: 'center', justifyContent: 'center', backgroundColor: "#3A3A3A" }}
            onPress={() =>  { this.setState({modalPrivacyPlolicy: false}) }}>
            <Text style={{ paddingLeft: 20, paddingRight: 20, fontSize: 14, fontWeight: 'bold', color: "#FFFFFF" }}>ОК</Text>
          </TouchableOpacity>
        </Modal>

        <Text style={{ fontSize: 22, fontWeight: "bold", color: '#4C4C4C' }}>Введите номер телефона</Text>
        <Text style={{ color: '#4C4C4C' }}>чтобы войти или зарегистрироваться</Text>
        <TextInput
          keyboardType='phone-pad'
          textAlign={'center'}
          style={{ height: 60, width: 275, color: '#4C4C4C', fontSize: 30, borderRadius: 5, borderBottomColor: 'black', borderBottomWidth: 1, marginBottom : 10 }}
          maxLength={12}
          placeholder = '+70000000000'
          placeholderTextColor='#c0c0c0'
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

                      getFCMToken();

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
              activeOpacity={1}
              underlayColor='#FFFFFF'
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
