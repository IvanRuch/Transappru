import React from 'react';
import { Text, View, Image, TouchableOpacity, TouchableHighlight, Modal, TextInput, ImageBackground, ActivityIndicator,  FlatList, Pressable, ScrollView, StatusBar, Platform } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { SafeAreaView, SafeAreaInsetsContext } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

import styles from '../../styles/Styles.js';
import Api from "../../utils/Api";
import { ScreenHeader } from '../../components/common';

interface UserProps {
  navigation: any;
}

interface UserContactData {
  id: string;
  fio: string;
  email: string;
  phone: string;
  position: string;
  [key: string]: string; // Индексная сигнатура для динамического доступа
}

interface UserState {
  indicator: boolean;
  user_data: any;
  user_contact_list: any[];
  user_contact_data: UserContactData;
  modalDelUserVisible: boolean;
  modalDelContactVisible: boolean;
  modalEditContactButtonDisabled: boolean;
  modalEditContactMode: string;
  modalEditContactVisible: boolean;
}

class User extends React.Component<UserProps, UserState> {

  constructor(props: UserProps) {
    super(props);
    this.state = {
      indicator: false,
      user_data: {},
      user_contact_list: [],
      user_contact_data: { id: '', fio: '', email: '', phone: '', position: '' },

      modalDelUserVisible: false,
      modalDelContactVisible: false,
      modalEditContactButtonDisabled: true,
      modalEditContactMode: '',
      modalEditContactVisible: false,
    };
  }

  /* */
  endEditingUserData = (value: string, field: string) => {
    console.log('endEditingUserData. field = ' + field + ' | value = ' + value)

    AsyncStorage.getItem('token').then((token) => {

      Api.post('/edit-user', { token: token, field: field, value: value })
         .then(res => {

            const data = res.data;
            console.log(data);

            if(data.auth_required == 1)
            {
              this.props.navigation.navigate('Auth')
            }
            else
            {
            }
          })
          .catch(error => {
            console.log('error.response.status = ' + error.response.status);
            if(error.response.status == 401) { this.props.navigation.navigate('Auth') }
          });
    });
  }

  changeUserData = (value: string, field: string) => {
    console.log('changeUserData. field = ' + field + ' | value = ' + value)
    let user_data_new = this.state.user_data
        user_data_new[field] = value

    this.setState({user_data: user_data_new})
  }

  /* удаление контакта */
  delUser = (value: string) => {
    console.log('delUser. value = ' + value)

    Api.post('/del-user', { token: value })
       .then(res => {

          const data = res.data;
          console.log(data);

          if(data.auth_required == 1)
          {
            this.props.navigation.navigate('Auth')
          }
          else
          {
            console.log('Ваш профиль был удален');
            this.props.navigation.navigate('DelUser')
          }
        })
        .catch(error => {
          console.log('error.response.status = ' + error.response.status);
          if(error.response.status == 401) { this.props.navigation.navigate('Auth') }
        });
  }

  /* удаление контакта */
  delContact = (value: string) => {
    console.log('delContact. value = ' + value)

    Api.post('/del-contact', { token: value, id: this.state.user_contact_data.id })
       .then(res => {

          const data = res.data;
          console.log(data);

          if(data.auth_required == 1)
          {
            this.props.navigation.navigate('Auth')
          }
          else
          {
            let user_contact_list_new = []

            for (let i=0; i<this.state.user_contact_list.length; i++)
            {
              if(this.state.user_contact_list[i].id != this.state.user_contact_data.id)
              {
                user_contact_list_new.push(this.state.user_contact_list[i])
              }
            }

            this.setState({ modalDelContactVisible: false,
                            modalEditContactButtonDisabled: true,
                            modalEditContactMode: '',
                            modalEditContactVisible: false,
                            user_contact_data: { id: '', fio: '', email: '', phone: '', position: '' },
                            user_contact_list: user_contact_list_new })
          }
        })
        .catch(error => {
          console.log('error.response.status = ' + error.response.status);
          if(error.response.status == 401) { this.props.navigation.navigate('Auth') }
        });
  }

  /* добавление/редактирование контакта */
  changeValue = (value: string, field: string) => {
    console.log('changeValue. field = ' + field + ' | value = ' + value)

    let user_contact_data_new = this.state.user_contact_data

    if(field == 'phone')
    {
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
      user_contact_data_new[field] = value

      //
      if(value.match(/\+7(\d{10})/))
      {
        this.setState({modalEditContactButtonDisabled: false})
      }
      else
      {
        this.setState({modalEditContactButtonDisabled: true})
      }
    }
    else
    {
      user_contact_data_new[field] = value
    }

    this.setState({user_contact_data: user_contact_data_new})
  };

  setEditContactButtonStyle = () => {
    let backgroundColor = this.state.modalEditContactButtonDisabled ? "#c0c0c0" : "#3A3A3A";
    return { height: 50, margin: 25, borderRadius: 5, alignItems: 'center' as const, justifyContent: 'center' as const, backgroundColor: backgroundColor }
  }

  setEditContactButtonTextStyle = () => {
    let color = this.state.modalEditContactButtonDisabled ? "#E8E8E8" : "#FFFFFF";
    return { paddingLeft: 20, paddingRight: 20, fontSize: 14, fontWeight: '500' as const, color: color }
  }

  editContact = (value: string) => {
    console.log('editContact. value = ' + value)

    console.log('this.state.modalEditContactMode = ' + this.state.modalEditContactMode)
    console.log('this.state.user_contact_data = ')
    console.log(this.state.user_contact_data)

    //this.setState({modalEditContactVisible: false, user_contact_data: { id: '', fio: '', email: '', phone: '+7', position: '' }})

    Api.post('/edit-contact', { token: value,
                                user_contact_data: this.state.user_contact_data })
       .then(res => {

          const data = res.data;
          console.log(data);

          if(data.auth_required == 1)
          {
            this.props.navigation.navigate('Auth')
          }
          else
          {
            let user_contact_list_new = []

            if(this.state.modalEditContactMode == 'add')
            {
              user_contact_list_new = this.state.user_contact_list
              user_contact_list_new.push(data.user_contact_data)
            }
            else
            {
              for (let i=0; i<this.state.user_contact_list.length; i++)
              {
                if(this.state.user_contact_list[i].id != this.state.user_contact_data.id)
                {
                  user_contact_list_new.push(this.state.user_contact_list[i])
                }
                else
                {
                  user_contact_list_new.push(data.user_contact_data)
                }
              }
            }

            this.setState({ modalEditContactButtonDisabled: true,
                            modalEditContactMode: '',
                            modalEditContactVisible: false,
                            user_contact_data: { id: '', fio: '', email: '', phone: '', position: '' },
                            user_contact_list: user_contact_list_new })
          }
        })
        .catch(error => {
          console.log('error.response.status = ' + error.response.status);
          if(error.response.status == 401) { this.props.navigation.navigate('Auth') }
        });
  }

  openModalEditContact = (mode: string, item?: any) => {
    console.log('openModalEditContact. mode = ' + mode )

    if(mode == 'add')
    {
      this.setState({modalEditContactVisible: true, modalEditContactMode: mode})
    }
    else
    {
      //let _item = item
      //_item.phone = '+' + _item.phone
      this.setState({modalEditContactVisible: true,
                     modalEditContactMode: mode,
                     user_contact_data: { id: item.id, fio: item.fio, email: item.email, phone: '+' + item.phone, position: item.position },
                     modalEditContactButtonDisabled: false })
    }
  }

  closeModalEditContact = () => {
    console.log('closeModalEditContact')
    this.setState({modalEditContactVisible: false, user_contact_data: { id: '', fio: '', email: '', phone: '', position: '' }})
  }

  /* */
  getContactList = (value: string) => {
    console.log('getContactList. value = ' + value)

    if(!value)
    {
      console.log('null')

      this.props.navigation.navigate('Auth')
    }

    else
    {
      this.setState({indicator: true})

      Api.post('/get-contact-list', { token: value })
              .then(res => {

                  const data = res.data;
                  console.log(data);

                  if(data.auth_required == 1)
                  {
                    this.props.navigation.navigate('Auth')
                  }
                  else
                  {
                    this.setState({indicator: false, user_data: data.user_data, user_contact_list: data.user_contact_list})
                  }
                })
                .catch(error => {
                    console.log('error.response.status = ' + error.response.status);
                    if(error.response.status == 401) { this.props.navigation.navigate('Auth') }
                });
    }
  }


  componentDidMount() {
    console.log('User DidMount')

    AsyncStorage.getItem('token').then((value) => this.getContactList(value || ''));
  }

  /* */

  renderItem = (item: any, index: number) => {

    return (

      <Pressable
        key={item.id}
        onPress={() => this.openModalEditContact( 'edit', item )}
      >
        <View style={[{ 
          flexDirection: "row", 
          margin: 30, 
          padding: 10, 
          borderRadius: 8,
          borderWidth: 1, 
          borderColor: "#B8B8B8" 
          },
          { backgroundColor: this.state.modalEditContactVisible || this.state.modalDelContactVisible || this.state.modalDelUserVisible ? 'rgba(29,29,29, 0)' : '#EEEEEE' }]}>
          <View style={{
            flex: 3,
            alignItems: 'flex-start',
            justifyContent: 'flex-start',
            flexDirection: "column",
          }}>
            { item.fio != '' ? ( <Text style={{ paddingLeft: 20, paddingRight: 20, fontSize: 20, fontWeight: "normal", color: "#313131" }}>ФИО: { item.fio }</Text> ) : null }
            { item.email != '' ? ( <Text style={{ paddingLeft: 20, paddingRight: 20, fontSize: 20, fontWeight: "normal", color: "#313131" }}>E-mail: { item.email }</Text> ) : null }
            { item.phone != '' ? ( <Text style={{ paddingLeft: 20, paddingRight: 20, fontSize: 20, fontWeight: "normal", color: "#313131" }}>Номер телефона: +{ item.phone }</Text> ) : null }
            { item.position != '' ? ( <Text style={{ paddingLeft: 20, paddingRight: 20, fontSize: 20, fontWeight: "normal", color: "#313113" }}>Должность: { item.position }</Text> ) : null }
          </View>
          <View style={{
            flex: 1,
            paddingRight: 10,
            alignItems: 'flex-end',
            justifyContent: 'center',
          }}>
            <Image source={require('../../../assets/images/edit_2.png')}/>
          </View>
        </View>
      </Pressable>
    );
  }

  render() {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar 
          barStyle="dark-content"
          backgroundColor="#ffffff"
          translucent={false}
        />
        
        {/* Overlay для затемнения фона при открытии модалок */}
        {(this.state.modalEditContactVisible || 
          this.state.modalDelContactVisible || 
          this.state.modalDelUserVisible) && (
          <View style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(29,29,29,0.6)',
            zIndex: 1
          }} />
        )}
        
        <ScreenHeader 
          title="Профиль"
          onBack={() => {
            console.log('-> move to AutoList')
            this.props.navigation.navigate('AutoList')
          }}
        />

        {/* модальное окно подтверждения удаления профиля */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={this.state.modalDelUserVisible}
          onRequestClose={() => {
            //Alert.alert("Modal has been closed.");
            this.setState({modalDelUserVisible: false})
          }}
        >
          <View style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
          }}>

            <View style={{
              //flex: 1,
              backgroundColor: '#FFFFFF',
              borderRadius: 25,
              alignItems: 'stretch',
              justifyContent: 'center',
              borderWidth: 1, 
              borderColor: "#B8B8B8",
              //marginTop: 70
            }}>

              <Text style={{ paddingLeft: 16, paddingRight: 16, paddingTop: 24, fontSize: 16, fontWeight: "normal", color: "#4C4C4C" }}>Вы действительно хотите удалить профиль?</Text>

              <Text style={{ paddingLeft: 14, paddingRight: 16, paddingTop: 24, fontSize: 16, fontWeight: "normal", color: "#4C4C4C" }}>Все ваши данные будут удалены вместе с ним</Text>

              <View style={{
                //flex: 1,
                //backgroundColor: 'grey',
                alignItems: 'center',
                justifyContent: 'center',
              }}>

                <View style={{
                  flexDirection: "row",
                  width: 300,
                }}>

                  <View style={{
                    //flex: 1,
                    height: 100,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <TouchableOpacity
                      style={{ height: 50, margin: 20, borderRadius: 5, alignItems: 'center', justifyContent: 'center', backgroundColor: "#3A3A3A" }}
                      onPress={() =>  {
                        console.log('call del_user')
                        AsyncStorage.getItem('token').then((value) => this.delUser(value || ''));
                      }}>
                      <Text style={{ paddingLeft: 20, paddingRight: 20, fontSize: 14, fontWeight: '500' as const, color: "#FFFFFF" }}>Удалить</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={{
                    flex: 1,
                    height: 100,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <TouchableOpacity
                      style={{ height: 50, margin: 20, borderRadius: 5, alignItems: 'center', justifyContent: 'center' }}
                      onPress={() =>  { this.setState({modalDelUserVisible: false}) }}>
                      <Text style={{ paddingLeft: 20, paddingRight: 20, fontSize: 14, color: "#313131" }}>Отменить</Text>
                    </TouchableOpacity>
                  </View>
                </View>


              </View>
            </View>
          </View>
        </Modal>

        {/* модальное окно подтверждения удаления контакта */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={this.state.modalDelContactVisible}
          onRequestClose={() => {
            //Alert.alert("Modal has been closed.");
            this.setState({modalDelContactVisible: false})
          }}
        >
          <View style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
          }}>

            <View style={{
              //flex: 1,
              backgroundColor: '#FFFFFF',
              borderRadius: 25,
              alignItems: 'stretch',
              justifyContent: 'center',
              borderWidth: 1, 
              borderColor: "#B8B8B8",
              //marginTop: 70
            }}>

              <Text style={{ paddingLeft: 16, paddingRight: 16, paddingTop: 24, fontSize: 16, textAlign: 'center', fontWeight: "normal", color: "#313131" }}>Удалить контакт?</Text>

              <View style={{
                //flex: 1,
                //backgroundColor: 'grey',
                alignItems: 'center',
                justifyContent: 'center',
              }}>

                <View style={{
                  flexDirection: "row",
                  width: 300,
                }}>
                  <View style={{
                    //flex: 1,
                    height: 100,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <TouchableOpacity
                      style={{ height: 50, margin: 20, borderRadius: 5, alignItems: 'center', justifyContent: 'center', backgroundColor: "#3A3A3A" }}
                      onPress={() =>  {
                        console.log('call del_contact')
                        AsyncStorage.getItem('token').then((value) => this.delContact(value || ''));
                      }}>
                      <Text style={{ paddingLeft: 20, paddingRight: 20, fontSize: 14, fontWeight: '500' as const, color: "#FFFFFF" }}>Удалить</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={{
                    flex: 1,
                    height: 100,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <TouchableOpacity
                      style={{ height: 50, margin: 20, borderRadius: 5, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: "#B8B8B8" }}
                      onPress={() =>  { this.setState({modalDelContactVisible: false}) }}>
                      <Text style={{ paddingLeft: 20, paddingRight: 20, fontSize: 14, color: "#313131" }}>Отменить</Text>
                    </TouchableOpacity>
                  </View>
                </View>


              </View>
            </View>
          </View>
        </Modal>

        {/* модальное окно добавления контакта */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={this.state.modalEditContactVisible}
          onRequestClose={() => {
            //Alert.alert("Modal has been closed.");
            this.setState({modalEditContactVisible: false})
          }}
        >
          <KeyboardAwareScrollView
            enableOnAndroid={true}
            extraScrollHeight={Platform.OS === 'ios' ? 20 : 80}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: 150 }}
          >
            <View style={{
              flex: 1,
              alignItems: 'stretch',
              justifyContent: 'center',
              marginTop: 50,
              marginBottom: 20,
            }}>

              <View style={{
                //flex: 1,
                backgroundColor: '#FFFFFF',
                borderRadius: 25,
                alignItems: 'stretch',
                justifyContent: 'center',
                borderWidth: 1, 
                borderColor: "#B8B8B8",
                //marginTop: 70
              }}>

                <View style={{
                  flexDirection: "row",
                }}>
                  <View style={{
                    flex: 5,
                    alignItems: 'flex-start',
                  }}>
                    <Text style={{ paddingLeft: 16, paddingTop: 26, fontSize: 24, fontWeight: "bold", color: "#313131" }}>Контактные данные</Text>
                  </View>
                  <View style={{
                    flex: 1,
                    alignItems: 'flex-end',
                  }}>
                    <TouchableHighlight
                      style={{ padding: 30 }}
                      activeOpacity={1}
                      underlayColor='#FFFFFF'
                      onPress={() => this.closeModalEditContact()}>
                      <Image source={require('../../../assets/images/xclose_2.png')} />
                    </TouchableHighlight>
                  </View>
                </View>

                <Text style={{ paddingLeft: 16, paddingRight: 16, paddingTop: 24, fontSize: 16, fontWeight: "normal", color: "#313131" }}>Добавьте контакты:</Text>

                <View style={{
                  //flex: 1,
                  backgroundColor: '#EEEEEE',
                  borderRadius: 25,
                  alignItems: 'stretch',
                  justifyContent: 'center',
                  borderWidth: 1, 
                  borderColor: "#B8B8B8",
                  margin: 16,
                  //marginTop: 70
                }}>

                  <View style={{
                    alignItems: 'stretch',
                    paddingTop: 20,
                    paddingLeft: 20,
                    paddingRight: 20,
                  }}>
                    <TextInput
                      style={{ height: 55, fontSize: 20, paddingLeft: 20, backgroundColor: '#FFFFFF', borderColor: '#656565', borderWidth: 1, borderRadius: 8, color: "#313131" }}
                      placeholder = 'ФИО'
                      placeholderTextColor={'#8C8C8C'}
                      onChangeText={(value) => this.changeValue(value, 'fio')}
                      value={this.state.user_contact_data.fio}
                    />
                  </View>

                  <View style={{
                    alignItems: 'stretch',
                    paddingTop: 20,
                    paddingLeft: 20,
                    paddingRight: 20,
                  }}>
                    <TextInput
                      keyboardType='email-address'
                      style={{ height: 55, fontSize: 20, paddingLeft: 20, backgroundColor: '#FFFFFF', borderColor: '#656565', borderWidth: 1, borderRadius: 8, color: "#313131" }}
                      placeholder = 'E-mail'
                      placeholderTextColor={'#8C8C8C'}
                      onChangeText={(value) => this.changeValue(value, 'email')}
                      value={this.state.user_contact_data.email}
                    />
                  </View>

                  <View style={{
                    alignItems: 'stretch',
                    paddingTop: 20,
                    paddingLeft: 20,
                    paddingRight: 20,
                  }}>
                    <TextInput
                      keyboardType='numeric'
                      style={{ height: 55, fontSize: 20, paddingLeft: 20, backgroundColor: '#FFFFFF', borderColor: '#656565', borderWidth: 1, borderRadius: 8, color: "#313131" }}
                      maxLength={12}
                      placeholder = 'Номер телефона *'
                      placeholderTextColor={'#8C8C8C'}
                      onChangeText={(value) => this.changeValue(value, 'phone')}
                      value={this.state.user_contact_data.phone}
                    />
                  </View>

                  <View style={{
                    alignItems: 'stretch',
                    paddingTop: 20,
                    paddingLeft: 20,
                    paddingRight: 20,
                    paddingBottom: 20,
                  }}>
                    <TextInput
                      style={{ height: 55, fontSize: 20, paddingLeft: 20, backgroundColor: '#FFFFFF', borderColor: '#656565', borderWidth: 1, borderRadius: 8, color: "#313131" }}
                      placeholder = 'Должность'
                      placeholderTextColor={'#8C8C8C'}
                      onChangeText={(value) => this.changeValue(value, 'position')}
                      value={this.state.user_contact_data.position}
                    />
                  </View>

                </View>

                <View style={{
                  flexDirection: "row",
                }}>

                  <View style={{
                    flex: 1,
                    height: 100,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <TouchableOpacity
                      disabled={this.state.modalEditContactButtonDisabled}
                      style={this.setEditContactButtonStyle()}
                      onPress={() =>  {
                        console.log('call edit_contact')
                        AsyncStorage.getItem('token').then((value) => this.editContact(value || ''));
                      }}>
                      <Text style={this.setEditContactButtonTextStyle()}>{ this.state.modalEditContactMode == 'add' ? 'Добавить' : 'Сохранить'  }</Text>
                    </TouchableOpacity>
                  </View>

                  {
                    this.state.modalEditContactMode != 'add' ? (

                      <View style={{
                        flex: 1,
                        height: 100,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                        <TouchableOpacity
                          style={{ height: 50, margin: 25, borderRadius: 5, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: "#B8B8B8" }}
                          onPress={() => { 
                            console.log('setState modalDelContactVisible true')
                            this.setState({modalEditContactVisible: false})
                            this.setState({modalDelContactVisible: true})}}>
                          <Text style={{ paddingLeft: 20, paddingRight: 20, fontSize: 14, color: "#313131" }}>Удалить</Text>
                        </TouchableOpacity>
                      </View>

                    ) : null
                  }


              </View>

              {
                this.state.modalEditContactMode != 'add' ? (

                  <View style={{
                    flex: 1,
                    height: 100,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <TouchableOpacity
                      style={{ height: 50, margin: 25, borderRadius: 5, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: "#B8B8B8" }}
                      onPress={() => {
                        console.log('setState modalDelContactVisible true')
                        this.setState({ modalEditContactVisible: false })
                        this.setState({ modalDelContactVisible: true })
                      }}>
                      <Text style={{ paddingLeft: 20, paddingRight: 20, fontSize: 14, color: "#313131" }}>Удалить</Text>
                    </TouchableOpacity>
                  </View>

                ) : null
              }
            </View>
          </View>
          </KeyboardAwareScrollView>
      </Modal>

      <SafeAreaInsetsContext.Consumer>
        {(insets) => (
          <KeyboardAwareScrollView
            enableOnAndroid={true}
            extraScrollHeight={Platform.OS === 'ios' ? 20 : 80}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: 120 + Math.max(insets?.bottom || 0, 20) }}
          >
        <Text style={{ paddingLeft: 20, paddingRight: 20, paddingTop: 20, fontSize: 14, fontWeight: "normal", color: "#656565" }}>Название организации:</Text>

          <View style={{
            alignItems: 'stretch',
            paddingTop: 20,
            paddingLeft: 30,
            paddingRight: 30,
          }}>
            <TextInput
              onEndEditing={(e: any) => { this.endEditingUserData( e.nativeEvent.text, 'firm' ) } }
              onChangeText={(value) => this.changeUserData(value, 'firm')}
              style={{ height: 55, fontSize: 20, paddingLeft: 20, borderColor: '#656565', borderWidth: 1, borderRadius: 8, color: "#313131" }}
              value={this.state.user_data.firm}
            />
          </View>

          <Text style={{ paddingLeft: 20, paddingRight: 20, paddingTop: 30, fontSize: 14, fontWeight: "normal", color: "#656565" }}>ИНН:</Text>

          <View style={{
            alignItems: 'stretch',
            paddingTop: 20,
            paddingLeft: 30,
            paddingRight: 30,
          }}>
            <TextInput
              editable={false}
              showSoftInputOnFocus={false}
              style={{ height: 55, fontSize: 20, paddingLeft: 20, borderColor: '#656565', borderWidth: 1, borderRadius: 8, color: "#313131" }}
              value={this.state.user_data.inn}
            />
          </View>

          <Text style={{ paddingLeft: 20, paddingRight: 20, paddingTop: 30, fontSize: 14, fontWeight: "normal", color: "#656565" }}>Контакты:</Text>

          {/*
          <FlatList
            data={this.state.user_contact_list}
            initialNumToRender={10}
            renderItem={({item, index}) => this.renderItem({item, index})}
            keyExtractor={item => item.id}
          />
          */}

          <TouchableHighlight 
            style={{ paddingLeft: 30, paddingTop: 20 }}
            activeOpacity={1}
            underlayColor='#FFFFFF'
            onPress={() => this.openModalEditContact( 'add' )}>
            <View style={{ 
                alignItems: 'center',
                flexDirection: "row"
              }}>     
              <Image source={require('../../../assets/images/add_button_2.png')} />
              <Text style = {{ fontSize: 22, color: '#3A3A3A' }}>Добавить</Text>
            </View>  
          </TouchableHighlight>

          <View>
            {this.state.user_contact_list.map((item, index) => this.renderItem(item, index))}
          </View>
          

          </KeyboardAwareScrollView>
        )}
      </SafeAreaInsetsContext.Consumer>

        { !this.state.modalEditContactVisible || this.state.modalDelContactVisible || this.state.modalDelUserVisible ? (        
          <TouchableHighlight
            style={{ position: 'absolute', right: 10, bottom: 10, height: 50, margin: 25, borderRadius: 5, alignItems: 'center', justifyContent: 'center', backgroundColor: '#3A3A3A' }}
            onPress={() => this.setState({modalDelUserVisible: true})}>
            <View style={{ 
                alignItems: 'center',
                flexDirection: "row"
              }}>     
              <Image style={{ marginLeft: 25 }} source={require('../../../assets/images/delete_white_2.png')} />
              <Text style={{ fontSize: 24, fontWeight: '500' as const, color: '#FFFFFF', paddingLeft: 15, paddingRight: 25 }}>Удалить профиль</Text>
            </View>  
          </TouchableHighlight> ) : null }

      </SafeAreaView>
    );
  }
}

export default User;
