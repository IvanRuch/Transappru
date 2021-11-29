import React from 'react';
import { StyleSheet, Text, View, Image, TouchableOpacity, TouchableHighlight, Modal, TextInput, ImageBackground, ActivityIndicator,  FlatList, Pressable, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-community/async-storage';

import Api from "./utils/Api";

class DriverList extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      indicator: false,

      user_driver_list: [],
      user_driver_data: { id: '', vu: '', vu_reg: '', name_f: '', name_i: '', name_o: '' },

      modalDelDriverVisible: false,
      modalEditDriverVisible: false,
      modalEditDriverButtonDisabled: true,
      modalEditDriverMode: '',


    };
  }

  /* удаление контакта */
  delDriver = (value) => {
    console.log('delDriver. value = ' + value)

    Api.post('/del-driver', { token: value, id: this.state.user_driver_data.id })
       .then(res => {

          const data = res.data;
          console.log(data);

          if(data.auth_required == 1)
          {
            this.props.navigation.navigate('Auth')
          }
          else
          {
            let user_driver_list_new = []

            for (var i=0; i<this.state.user_driver_list.length; i++)
            {
              if(this.state.user_driver_list[i].id != this.state.user_driver_data.id)
              {
                user_driver_list_new.push(this.state.user_driver_list[i])
              }
            }

            this.setState({ modalDelDriverVisible: false,
                            modalEditDriverButtonDisabled: true,
                            modalEditDriverMode: '',
                            modalEditDriverVisible: false,
                            user_driver_data: { id: '', vu: '', vu_reg: '', name_f: '', name_i: '', name_o: '' },
                            user_driver_list: user_driver_list_new })
          }
        })
        .catch(error => {
          console.log('error.response.status = ' + error.response.status);
          if(error.response.status == 401) { this.props.navigation.navigate('Auth') }
        });
  }

  /* добавление/редактирование водителя */
  checkEditDriverButtonEnabled = () => {
    console.log('checkEditDriverButtonEnabled')

    let _modalEditDriverButtonDisabled = this.state.user_driver_data.vu.match(/^[0-9]{10}$/i) &&
                                         this.state.user_driver_data.vu_reg.match(/^[0-9]{2}\.[0-9]{2}\.[0-9]{4}$/i) &&
                                         this.state.user_driver_data.name_f != '' &&
                                         this.state.user_driver_data.name_i != '' ? false : true

    let _vu = this.state.user_driver_data.vu.match(/^[0-9]{10}$/i) ? true : false
    let _vu_reg = this.state.user_driver_data.vu_reg.match(/^[0-9]{2}\.[0-9]{2}\.[0-9]{4}$/i) ? true : false
    let _name_f = this.state.user_driver_data.name_f != '' ? true : false
    let _name_i = this.state.user_driver_data.name_i != '' ? true : false

    console.log('_vu = ' + _vu)
    console.log('_vu_reg = ' + _vu_reg)
    console.log('_name_f = ' + _name_f)
    console.log('_name_i = ' + _name_i)

    console.log('_modalEditDriverButtonDisabled = ' + _modalEditDriverButtonDisabled)

    this.setState({modalEditDriverButtonDisabled: _modalEditDriverButtonDisabled })
  }

  changeValue = (value, field) => {
    console.log('changeValue. field = ' + field + ' | value = ' + value)

    let user_driver_data_new = this.state.user_driver_data

    if(field == 'vu')
    {
      if(value.match(/^[0-9]*$/i))
      {
        user_driver_data_new[field] = value
      }
    }
    else if(field == 'vu_reg')
    {
      if(value.match(/^[0-9]{2}$/i))
      {
        user_driver_data_new[field] = value + '.'
      }
      else if(value.match(/^[0-9]{2}\.[0-9]{2}$/i))
      {
        user_driver_data_new[field] = value + '.'
      }
      else if(value.match(/^[\.0-9]*$/i))
      {
        user_driver_data_new[field] = value
      }
    }
    else
    {
      user_driver_data_new[field] = value
    }

    this.setState({user_contact_data: user_driver_data_new}, () => this.checkEditDriverButtonEnabled())
  };

  setEditDriverButtonStyle = () => {
    let backgroundColor = this.state.modalEditDriverButtonDisabled ? "#c0c0c0" : "#FEE600";
    return { height: 50, fontSize: 10, margin: 25, borderRadius: 5, alignItems: 'center', justifyContent: 'center', backgroundColor: backgroundColor }
  }

  setEditDriverButtonTextStyle = () => {
    let color = this.state.modalEditDriverButtonDisabled ? "#E8E8E8" : "#2B2D33";
    return { paddingLeft: 20, paddingRight: 20, fontSize: 14, color: color }
  }

  editDriver = (value) => {
    console.log('editDriver. value = ' + value)

    console.log('this.state.modalEditDriverMode = ' + this.state.modalEditDriverMode)
    console.log('this.state.user_driver_data = ')
    console.log(this.state.user_driver_data)

    Api.post('/edit-driver', { token: value,
                              user_driver_data: this.state.user_driver_data })
       .then(res => {

          const data = res.data;
          console.log(data);

          if(data.auth_required == 1)
          {
            this.props.navigation.navigate('Auth')
          }
          else
          {
            let user_driver_list_new = []

            if(this.state.modalEditDriverMode == 'add')
            {
              user_driver_list_new = this.state.user_driver_list
              user_driver_list_new.push(data.user_driver_data)
            }
            else
            {
              for (var i=0; i<this.state.user_driver_list.length; i++)
              {
                if(this.state.user_driver_list[i].id != this.state.user_driver_data.id)
                {
                  user_driver_list_new.push(this.state.user_driver_list[i])
                }
                else
                {
                  user_driver_list_new.push(data.user_driver_data)
                }
              }
            }

            this.setState({ modalEditDriverButtonDisabled: true,
                            modalEditDriverMode: '',
                            modalEditDriverVisible: false,
                            user_driver_data: { id: '', vu: '', vu_reg: '', name_f: '', name_i: '', name_o: '' },
                            user_driver_list: user_driver_list_new })
          }
        })
        .catch(error => {
          console.log('error.response.status = ' + error.response.status);
          if(error.response.status == 401) { this.props.navigation.navigate('Auth') }
        });
  }

  openModalEditDriver = (mode, item) => {
    console.log('openModalEditDriver. mode = ' + mode )

    if(mode == 'add')
    {
      this.setState({modalEditDriverVisible: true, modalEditDriverMode: mode})
    }
    else
    {
      this.setState({modalEditDriverVisible: true,
                     modalEditDriverMode: mode,
                     user_driver_data: { id: item.id, vu: item.vu, vu_reg: item.vu_reg, name_f: item.name_f, name_i: item.name_i, name_o: item.name_o },
                     modalEditDriverButtonDisabled: false })
    }
  }

  closeModalEditDriver = () => {
    console.log('closeModalEditDriver')
    this.setState({modalEditDriverVisible: false, user_driver_data: { id: '', vu: '', vu_reg: '', name_f: '', name_i: '', name_o: '' }})
  }

  /* */
  getDriverList = (value) => {
    console.log('getDriverList. value = ' + value)

    if(!value)
    {
      console.log('null')

      this.props.navigation.navigate('Auth')
    }

    else
    {
      this.setState({indicator: true})

      Api.post('/get-driver-list', { token: value })
         .then(res => {

            const data = res.data;
            console.log(data);

            if(data.auth_required == 1)
            {
              this.props.navigation.navigate('Auth')
            }
            else
            {
              this.setState({indicator: false, user_driver_list: data.user_driver_list})
            }
          })
          .catch(error => {
            console.log('error.response.status = ' + error.response.status);
            if(error.response.status == 401) { this.props.navigation.navigate('Auth') }
          });
    }
  }

  componentDidMount() {
    console.log('DriverList DidMount')

    AsyncStorage.getItem('token').then((value) => this.getDriverList(value));
  }

  /* */

  renderItem = ({item, index}) => {

    //console.log('renderItem')
    //console.log({item})
    //console.log('item.id = ' + item.id + ' | index = ' + index)

    return (

      <Pressable
        onPress={() => this.openModalEditDriver( 'edit', item )}
      >
        <View style={{ flexDirection: "row", margin: 20, padding: 10, backgroundColor: "#2C2C2C", borderRadius: 8 }}>
          <View style={{
            flex: 3,
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: "column",
          }}>
            <Image source={require('../images/driver.png')} style={styles.auto}/>
          </View>
          <View style={{
            flex: 5,
            flexDirection: "column",
            paddingLeft: 10,
          }}>
            <Text style={{ color: "#E8E8E8"}}>{item.name_f} {item.name_i} {item.name_o}</Text>
          </View>
          <View style={{
            flex: 1,
            alignItems: 'flex-end',
            justifyContent: 'flex-end',
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

        <Text style={{ paddingLeft: 20, paddingTop: 11, fontSize: 28, fontWeight: "bold", color: "#E8E8E8" }}>Водители</Text>

        <TouchableHighlight
          style={{ position: 'absolute', top: 20, right: 20, padding: 10, }}
          onPress={() => {
            console.log('-> move to AutoList')
            this.props.navigation.navigate('AutoList')
          }}>
          <Image source={require('../images/back.png')} />
        </TouchableHighlight>

        {/* модальное окно подтверждения удаления водителя */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={this.state.modalDelDriverVisible}
          onRequestClose={() => {
            this.setState({modalDelDriverVisible: false})
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

              <Text style={{ paddingLeft: 16, paddingRight: 16, paddingTop: 24, fontSize: 16, fontWeight: "normal", color: "#4C4C4C" }}>Удалить водителя?</Text>

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
                        console.log('call del_driver')
                        AsyncStorage.getItem('token').then((value) => this.delDriver(value));
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
                      onPress={() =>  { this.setState({modalDelDriverVisible: false}) }}>
                      <Text style={{ paddingLeft: 20, paddingRight: 20, fontSize: 14, color: "#E8E8E8" }}>Отменить</Text>
                    </TouchableOpacity>
                  </View>
                </View>


              </View>
            </View>
          </View>
        </Modal>

        {/* модальное окно добавления водителя */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={this.state.modalEditDriverVisible}
          onRequestClose={() => {
            this.setState({modalEditDriverVisible: false})
          }}
        >
          <ScrollView>
            <View style={{
              flex: 1,
              alignItems: 'stretch',
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

                <View style={{
                  flexDirection: "row",
                }}>
                  <View style={{
                    flex: 5,
                    alignItems: 'flex-start',
                  }}>
                    <Text style={{ paddingLeft: 16, paddingTop: 16, fontSize: 24, fontWeight: "normal", color: "#E8E8E8" }}>Данные водителя</Text>
                  </View>
                  <View style={{
                    flex: 1,
                    alignItems: 'flex-end',
                  }}>
                    <TouchableHighlight
                      style={{ padding: 30 }}
                      onPress={() => this.closeModalEditDriver()}>
                      <Image source={require('../images/xclose.png')} />
                    </TouchableHighlight>
                  </View>
                </View>

                <View style={{
                  //flex: 1,
                  backgroundColor: '#4C4C4C',
                  borderRadius: 25,
                  alignItems: 'stretch',
                  justifyContent: 'center',
                  margin: 16,
                  //marginTop: 70
                }}>

                  <Text style={{ paddingLeft: 16, paddingRight: 16, paddingTop: 24, fontSize: 16, fontWeight: "normal", color: "#E8E8E8" }}>Номер водительского удостоверения *:</Text>

                  <View style={{
                    alignItems: 'stretch',
                    paddingTop: 20,
                    paddingLeft: 20,
                    paddingRight: 20,
                  }}>
                    <TextInput
                      keyboardType='numeric'
                      style={{ height: 55, fontSize: 20, borderBottomColor: '#960000', borderBottomWidth: 2, color: "#E8E8E8" }}
                      maxLength={10}
                      placeholder = '0000000000'
                      placeholderTextColor={'#8C8C8C'}
                      onChangeText={(value) => this.changeValue(value, 'vu')}
                      value={this.state.user_driver_data.vu}
                    />
                  </View>

                  <Text style={{ paddingLeft: 16, paddingRight: 16, paddingTop: 24, fontSize: 16, fontWeight: "normal", color: "#E8E8E8" }}>Дата выдачи водительского удостоверения *:</Text>

                  <View style={{
                    alignItems: 'stretch',
                    paddingTop: 20,
                    paddingLeft: 20,
                    paddingRight: 20,
                    paddingBottom: 20,
                  }}>
                    <TextInput
                      keyboardType='numeric'
                      style={{ height: 55, fontSize: 20, borderBottomColor: '#960000', borderBottomWidth: 2, color: "#E8E8E8" }}
                      maxLength={10}
                      placeholder = '00.00.0000'
                      placeholderTextColor={'#8C8C8C'}
                      onChangeText={(value) => this.changeValue(value, 'vu_reg')}
                      value={this.state.user_driver_data.vu_reg}
                    />
                  </View>

                </View>

                <View style={{
                  //flex: 1,
                  backgroundColor: '#4C4C4C',
                  borderRadius: 25,
                  alignItems: 'stretch',
                  justifyContent: 'center',
                  margin: 16,
                  //marginTop: 70
                }}>

                  <Text style={{ paddingLeft: 16, paddingRight: 16, paddingTop: 24, fontSize: 16, fontWeight: "normal", color: "#E8E8E8" }}>Владелец:</Text>

                  <View style={{
                    alignItems: 'stretch',
                    paddingTop: 20,
                    paddingLeft: 20,
                    paddingRight: 20,
                  }}>
                    <TextInput
                      style={{ height: 55, fontSize: 20, borderBottomColor: '#960000', borderBottomWidth: 2, color: "#E8E8E8" }}
                      placeholder = 'Фамилия *'
                      placeholderTextColor={'#8C8C8C'}
                      onChangeText={(value) => this.changeValue(value, 'name_f')}
                      value={this.state.user_driver_data.name_f}
                    />
                  </View>

                  <View style={{
                    alignItems: 'stretch',
                    paddingTop: 20,
                    paddingLeft: 20,
                    paddingRight: 20,
                  }}>
                    <TextInput
                      style={{ height: 55, fontSize: 20, borderBottomColor: '#960000', borderBottomWidth: 2, color: "#E8E8E8" }}
                      placeholder = 'Имя *'
                      placeholderTextColor={'#8C8C8C'}
                      onChangeText={(value) => this.changeValue(value, 'name_i')}
                      value={this.state.user_driver_data.name_i}
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
                      placeholder = 'Отчество'
                      placeholderTextColor={'#8C8C8C'}
                      onChangeText={(value) => this.changeValue(value, 'name_o')}
                      value={this.state.user_driver_data.name_o}
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
                      disabled={this.state.modalEditDriverButtonDisabled}
                      style={this.setEditDriverButtonStyle()}
                      onPress={() =>  {
                        console.log('call edit_driver')
                        AsyncStorage.getItem('token').then((value) => this.editDriver(value));
                      }}>
                      <Text style={this.setEditDriverButtonTextStyle()}>{ this.state.modalEditDriverMode == 'add' ? 'Добавить' : 'Сохранить'  }</Text>
                    </TouchableOpacity>
                  </View>

                  {
                    this.state.modalEditDriverMode != 'add' ? (

                      <View style={{
                        flex: 1,
                        height: 100,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                        <TouchableOpacity
                          style={{ height: 50, fontSize: 10, margin: 25, borderRadius: 5, alignItems: 'center', justifyContent: 'center' }}
                          onPress={() => this.setState({modalDelDriverVisible: true})}>
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

        <FlatList
          data={this.state.user_driver_list}
          initialNumToRender={10}
          renderItem={({item, index}) => this.renderItem({item, index})}
          keyExtractor={item => item.id}
        />

        <TouchableHighlight
          style={{ position: 'absolute', bottom: 20, right: 20, padding: 10 }}
          onPress={() => this.openModalEditDriver( 'add' )}>
          <Image source={require('../images/add_button.png')} />
        </TouchableHighlight>

      </View>
    );
  }
}

// ...

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#2c2c2c',
    alignItems: 'stretch',
    justifyContent: 'flex-start',
  },

});

export default DriverList;
