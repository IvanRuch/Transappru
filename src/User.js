import React from 'react';
import { Text, View, Image, TouchableOpacity, TouchableHighlight, Modal, TextInput, ImageBackground, ActivityIndicator,  FlatList, Pressable, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-community/async-storage';

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
    let backgroundColor = this.state.modalEditContactButtonDisabled ? "#c0c0c0" : "#FEE600";
    return { height: 50, fontSize: 10, margin: 25, borderRadius: 5, alignItems: 'center', justifyContent: 'center', backgroundColor: backgroundColor }
  }

  setEditContactButtonTextStyle = () => {
    let color = this.state.modalEditContactButtonDisabled ? "#E8E8E8" : "#2B2D33";
    return { paddingLeft: 20, paddingRight: 20, fontSize: 14, color: color }
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
        <View style={{ flexDirection: "row", margin: 20, padding: 10, backgroundColor: "#353535", borderRadius: 8 }}>
          <View style={{
            flex: 3,
            alignItems: 'flex-start',
            justifyContent: 'flex-start',
            flexDirection: "column",
          }}>
            { item.fio != '' ? ( <Text style={{ paddingLeft: 20, paddingRight: 20, fontSize: 20, fontWeight: "normal", color: "#E8E8E8" }}>ФИО: { item.fio }</Text> ) : null }
            { item.email != '' ? ( <Text style={{ paddingLeft: 20, paddingRight: 20, fontSize: 20, fontWeight: "normal", color: "#E8E8E8" }}>E-mail: { item.email }</Text> ) : null }
            { item.phone != '' ? ( <Text style={{ paddingLeft: 20, paddingRight: 20, fontSize: 20, fontWeight: "normal", color: "#E8E8E8" }}>Номер телефона: +{ item.phone }</Text> ) : null }
            { item.position != '' ? ( <Text style={{ paddingLeft: 20, paddingRight: 20, fontSize: 20, fontWeight: "normal", color: "#E8E8E8" }}>Должность: { item.position }</Text> ) : null }
          </View>
          <View style={{
            flex: 1,
            alignItems: 'flex-end',
            justifyContent: 'center',
          }}>
            <Image source={require('../images/edit.png')}/>
          </View>
        </View>
      </Pressable>
    );
  }

  render() {
    return (

      <View style={styles.container}>

        <Text style={styles.header}>Профиль</Text>

        <TouchableHighlight
          style={styles.header_back}
          onPress={() => {
            console.log('-> move to AutoList')
            this.props.navigation.navigate('AutoList')
          }}>
          <Image source={require('../images/back.png')} />
        </TouchableHighlight>

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
              backgroundColor: '#8C8C8C',
              borderRadius: 25,
              alignItems: 'stretch',
              justifyContent: 'center',
              //marginTop: 70
            }}>

              <Text style={{ paddingLeft: 16, paddingRight: 16, paddingTop: 24, fontSize: 16, fontWeight: "normal", color: "#4C4C4C" }}>Удалить контакт?</Text>

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
                      style={{ height: 50, fontSize: 10, margin: 25, borderRadius: 5, alignItems: 'center', justifyContent: 'center', backgroundColor: "#FEE600" }}
                      onPress={() =>  {
                        console.log('call del_contact')
                        AsyncStorage.getItem('token').then((value) => this.delContact(value));
                      }}>
                      <Text style={{ paddingLeft: 20, paddingRight: 20, fontSize: 14, color: "#2B2D33" }}>Удалить</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={{
                    flex: 1,
                    height: 100,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <TouchableOpacity
                      style={{ height: 50, fontSize: 10, margin: 25, borderRadius: 5, alignItems: 'center', justifyContent: 'center' }}
                      onPress={() =>  { this.setState({modalDelContactVisible: false}) }}>
                      <Text style={{ paddingLeft: 20, paddingRight: 20, fontSize: 14, color: "#E8E8E8" }}>Отменить</Text>
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
                backgroundColor: '#8C8C8C',
                borderRadius: 25,
                alignItems: 'stretch',
                justifyContent: 'center',
                //marginTop: 70
              }}>

                <View style={{
                  flexDirection: "row",
                }}>
                  <View style={{
                    flex: 5,
                    alignItems: 'flex-start',
                  }}>
                    <Text style={{ paddingLeft: 16, paddingTop: 16, fontSize: 24, fontWeight: "normal", color: "#E8E8E8" }}>Контактные данные</Text>
                  </View>
                  <View style={{
                    flex: 1,
                    alignItems: 'flex-end',
                  }}>
                    <TouchableHighlight
                      style={{ padding: 30 }}
                      onPress={() => this.closeModalEditContact()}>
                      <Image source={require('../images/xclose.png')} />
                    </TouchableHighlight>
                  </View>
                </View>

                <Text style={{ paddingLeft: 16, paddingRight: 16, paddingTop: 24, fontSize: 16, fontWeight: "normal", color: "#4C4C4C" }}>Добавьте контакты:</Text>

                <View style={{
                  //flex: 1,
                  backgroundColor: '#4C4C4C',
                  borderRadius: 25,
                  alignItems: 'stretch',
                  justifyContent: 'center',
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
                      style={{ height: 55, fontSize: 20, borderBottomColor: '#960000', borderBottomWidth: 2, color: "#E8E8E8" }}
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
                      style={{ height: 55, fontSize: 20, borderBottomColor: '#960000', borderBottomWidth: 2, color: "#E8E8E8" }}
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
                      style={{ height: 55, fontSize: 20, borderBottomColor: '#960000', borderBottomWidth: 2, color: "#E8E8E8" }}
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
                      style={{ height: 55, fontSize: 20, borderBottomColor: '#960000', borderBottomWidth: 2, color: "#E8E8E8" }}
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
                          style={{ height: 50, fontSize: 10, margin: 25, borderRadius: 5, alignItems: 'center', justifyContent: 'center' }}
                          onPress={() => this.setState({modalDelContactVisible: true})}>
                          <Text style={{ paddingLeft: 20, paddingRight: 20, fontSize: 14, color: "#960000" }}>Удалить</Text>
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

        <ActivityIndicator size="large" color="#C9A86B" animating={this.state.indicator}/>

        <ScrollView>

          <Text style={{ paddingLeft: 20, paddingRight: 20, paddingTop: 20, fontSize: 15, fontWeight: "normal", color: "#E8E8E8" }}>Название организации:</Text>

          <View style={{
            alignItems: 'stretch',
            paddingTop: 20,
            paddingLeft: 30,
            paddingRight: 30,
          }}>
            <TextInput
              onEndEditing={(e: any) => { this.endEditingUserData( e.nativeEvent.text, 'firm' ) } }
              onChangeText={(value) => this.changeUserData(value, 'firm')}
              style={{ height: 55, fontSize: 20, borderBottomColor: '#960000', borderBottomWidth: 2, color: "#E8E8E8" }}
              value={this.state.user_data.firm}
            />
          </View>

          <Text style={{ paddingLeft: 20, paddingRight: 20, paddingTop: 30, fontSize: 15, fontWeight: "normal", color: "#E8E8E8" }}>ИНН:</Text>

          <View style={{
            alignItems: 'stretch',
            paddingTop: 20,
            paddingLeft: 30,
            paddingRight: 30,
          }}>
            <TextInput
              editable={false}
              showSoftInputOnFocus={false}
              style={{ height: 55, fontSize: 20, borderBottomColor: '#960000', borderBottomWidth: 2, color: "#E8E8E8" }}
              value={this.state.user_data.inn}
            />
          </View>

          <Text style={{ paddingLeft: 20, paddingRight: 20, paddingTop: 30, fontSize: 15, fontWeight: "normal", color: "#E8E8E8" }}>Контакты:</Text>

          {/*
          <FlatList
            data={this.state.user_contact_list}
            initialNumToRender={10}
            renderItem={({item, index}) => this.renderItem({item, index})}
            keyExtractor={item => item.id}
          />
          */}

          <View>
            {this.state.user_contact_list.map((item, index) => this.renderItem(item, index))}
          </View>

        </ScrollView>

        <TouchableHighlight
          style={{ position: 'absolute', bottom: 20, right: 20, padding: 10 }}
          onPress={() => this.openModalEditContact( 'add' )}>
          <Image source={require('../images/add_button.png')} />
        </TouchableHighlight>

      </View>
    );
  }
}

export default User;
