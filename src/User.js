import React from 'react';
import { Text, View, Image, TouchableOpacity, TouchableHighlight, Modal, TextInput, ImageBackground, ActivityIndicator,  FlatList, Pressable, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import styles from './styles/Styles.js';
import Api from "./utils/Api";

class User extends React.Component {

  constructor(props) {
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
  endEditingUserData = (value, field) => {
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

  changeUserData = (value, field) => {
    console.log('changeUserData. field = ' + field + ' | value = ' + value)
    let user_data_new = this.state.user_data
        user_data_new[field] = value

    this.setState({user_data: user_data_new})
  }

  /* удаление контакта */
  delUser = (value) => {
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
  delContact = (value) => {
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

            for (var i=0; i<this.state.user_contact_list.length; i++)
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
  changeValue = (value, field) => {
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
    return { height: 50, fontSize: 10, margin: 25, borderRadius: 5, alignItems: 'center', justifyContent: 'center', backgroundColor: backgroundColor }
  }

  setEditContactButtonTextStyle = () => {
    let color = this.state.modalEditContactButtonDisabled ? "#E8E8E8" : "#FFFFFF";
    return { paddingLeft: 20, paddingRight: 20, fontSize: 14, fontWeight: 500, color: color }
  }

  editContact = (value) => {
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
              for (var i=0; i<this.state.user_contact_list.length; i++)
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

  openModalEditContact = (mode, item) => {
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
  getContactList = (value) => {
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

  setContainerStyle = () => {

    let container_style     = styles.container
    let container_style_new = {}

    for (let key in container_style)
    {
      container_style_new[key] = key != 'backgroundColor' ? container_style[key] : ( 
        this.state.modalEditContactVisible ||
        this.state.modalDelContactVisible ||
        this.state.modalDelUserVisible ? 'rgba(29,29,29,0.6)' : '#FFFFFF' )
    }

    return container_style_new
  }

  componentDidMount() {
    console.log('User DidMount')

    AsyncStorage.getItem('token').then((value) => this.getContactList(value));
  }

  /* */

  renderItem = (item, index) => {

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
            <Image source={require('../images/edit_2.png')}/>
          </View>
        </View>
      </Pressable>
    );
  }

  render() {
    return (

      <View style={this.setContainerStyle()}>

        <Text style={styles.header}>Профиль</Text>

        <TouchableHighlight
          style={styles.header_back}
          activeOpacity={1}
          underlayColor='#FFFFFF'
          onPress={() => {
            console.log('-> move to AutoList')
            this.props.navigation.navigate('AutoList')
          }}>
          <Image source={require('../images/back_2.png')} />
        </TouchableHighlight>

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
                      style={{ height: 50, fontSize: 10, margin: 20, borderRadius: 5, alignItems: 'center', justifyContent: 'center', backgroundColor: "#3A3A3A" }}
                      onPress={() =>  {
                        console.log('call del_user')
                        AsyncStorage.getItem('token').then((value) => this.delUser(value));
                      }}>
                      <Text style={{ paddingLeft: 20, paddingRight: 20, fontSize: 14, fontWeight: 500, color: "#FFFFFF" }}>Удалить</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={{
                    flex: 1,
                    height: 100,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <TouchableOpacity
                      style={{ height: 50, fontSize: 10, margin: 20, borderRadius: 5, alignItems: 'center', justifyContent: 'center' }}
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
                      style={{ height: 50, fontSize: 10, margin: 20, borderRadius: 5, alignItems: 'center', justifyContent: 'center', backgroundColor: "#3A3A3A" }}
                      onPress={() =>  {
                        console.log('call del_contact')
                        AsyncStorage.getItem('token').then((value) => this.delContact(value));
                      }}>
                      <Text style={{ paddingLeft: 20, paddingRight: 20, fontSize: 14, fontWeight: 500, color: "#FFFFFF" }}>Удалить</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={{
                    flex: 1,
                    height: 100,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <TouchableOpacity
                      style={{ height: 50, fontSize: 10, margin: 20, borderRadius: 5, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: "#B8B8B8" }}
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
          <ScrollView>
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
                      <Image source={require('../images/xclose_2.png')} />
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
                        AsyncStorage.getItem('token').then((value) => this.editContact(value));
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
                          style={{ height: 50, fontSize: 10, margin: 25, borderRadius: 5, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: "#B8B8B8" }}
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

              </View>
            </View>
          </ScrollView>
        </Modal>
        {/* */}

        <ActivityIndicator size="large" color="#313131" animating={this.state.indicator}/>

        <ScrollView>

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
              <Image source={require('../images/add_button_2.png')} />
              <Text style = {{ fontSize: 22, color: '#3A3A3A' }}>Добавить</Text>
            </View>  
          </TouchableHighlight>

          <View>
            {this.state.user_contact_list.map((item, index) => this.renderItem(item, index))}
          </View>
          

        </ScrollView>

        { !this.state.modalEditContactVisible || this.state.modalDelContactVisible || this.state.modalDelUserVisible ? (        
          <TouchableHighlight
            style={{ position: 'absolute', right: 10, bottom: 10, height: 50, fontSize: 10, margin: 25, borderRadius: 5, alignItems: 'center', justifyContent: 'center', backgroundColor: '#3A3A3A' }}
            onPress={() => this.setState({modalDelUserVisible: true})}>
            <View style={{ 
                alignItems: 'center',
                flexDirection: "row"
              }}>     
              <Image style={{ marginLeft: 25 }} source={require('../images/delete_white_2.png')} />
              <Text style={{ fontSize: 24, fontWeight: 500, color: '#FFFFFF', paddingLeft: 15, paddingRight: 25 }}>Удалить профиль</Text>
            </View>  
          </TouchableHighlight> ) : null }

      </View>
    );
  }
}

export default User;
