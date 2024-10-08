import React from 'react';
import { Text, View, Image, TouchableOpacity, TouchableHighlight, Modal, TextInput, ImageBackground, ActivityIndicator,  FlatList, Pressable, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import styles from './styles/Styles.js';
import Api from "./utils/Api";

class Pass extends React.Component {

  constructor(props) {
    super(props);

    this.state = {
      location_type: '',
      address: '',
      mos_ru_street: 0,
      mos_ru_street_p7: '',
      street_list: [],
      mos_ru_address: 0,
      mos_ru_address_l_concat: '',
      address_list: [],
      user_address_list: [],
      auto_list: props.route.params.auto_list,
      address_map_data: props.route.params.address_map_data,

      modalAddAddress: false,
    };
  }

  /* выбор зоны */
  checkTab = (tab) => {
    console.log('checkTab. tab = ' + tab)

    if(this.state.location_type == tab)
    {
      this.setState({ location_type: '' })
    }
    else
    {
      this.setState({ location_type: tab })
    }
  }

  setTabStyle = (tab) => {
    let color = this.state.location_type == tab ? "#D7D7D7" : "#EEEEEE";
    return { alignItems: 'center', justifyContent: 'center', height: 50, backgroundColor: color, borderRadius: 8 }
  }

  /* добавление введенного адреса */
  addAddress = (value) => {
    console.log('addAddress. value = ' + value)

    let auto_list_ids = [];
    for (var i=0; i<this.state.auto_list.length; i++)
    {

      console.log('this.state.auto_list['+i+']')
      console.log(this.state.auto_list[i])

      if(this.state.auto_list[i].marked)
      {
        auto_list_ids.push(this.state.auto_list[i].id)
      }
    }

    Api.post('/add-address', { token: value, mos_ru_address: this.state.mos_ru_address, auto_list_ids: auto_list_ids.join(','), location_type: this.state.location_type })
       .then(res => {

          const data = res.data;
          console.log(data);

          if(data.auth_required == 1)
          {
            this.props.navigation.navigate('Auth')
          }
          else
          {
            this.setState({ user_address_list: data.user_address_list,
                            address: '',
                            mos_ru_street: 0,
                            mos_ru_street_p7: '',
                            street_list: [],
                            mos_ru_address: 0,
                            mos_ru_address_l_concat: '',
                            modalAddAddress: true })
          }

        })
        .catch(error => {
          console.log('error.response.status = ' + error.response.status);
          if(error.response.status == 401) { this.props.navigation.navigate('Auth') }
        });
  }

  /* ввод адреса */
  changeAddress = (value) => {
    console.log('changeAddress. value = ' + value)


    let pos = value.indexOf(this.state.mos_ru_street_p7)

    console.log('mos_ru_street = ' + this.state.mos_ru_street + ' | mos_ru_street_p7 = ' + this.state.mos_ru_street_p7 + ' | pos = ' + pos)

    this.setState({address: value})

    //
    let mode = ''
    let string = '';

    // если улица не выбрана
    if(this.state.mos_ru_street == 0)
    {
      if(value.length >= 3)
      {
        mode   = 'street'
        string = value
      }
      else
      {
        this.setState({ mos_ru_street: 0,
                        mos_ru_street_p7: '',
                        street_list: [],
                        mos_ru_address: 0,
                        mos_ru_address_l_concat: '',
                        address_list: [] })
      }
    }

    // если улица выбрана
    else
    {
      // если ранее выбранная улица отсутствует в поле ввода
      if(value.indexOf(this.state.mos_ru_street_p7) != 0)
      {
        mode   = 'street'
        string = value

        this.setState({ mos_ru_street: 0,
                        mos_ru_street_p7: '',
                        mos_ru_address: 0,
                        mos_ru_address_l_concat: '',
                        address_list: [] })
      }
      else
      {
        // если ранее выбранный адрес отсутствует в поле ввода
        if(value.indexOf(this.state.mos_ru_address_l_concat) == -1)
        {
          this.setState({ mos_ru_address: 0,
                          mos_ru_address_l_concat: '',
                          address_list: [] })
        }

        mode   = 'address'
        string = value.substr(this.state.mos_ru_street_p7.length)
      }
    }

    console.log('mode = ' + mode + ' | string = ^' + string + '^')

    if(mode != '')
    {
      AsyncStorage.getItem('token').then((token) => {

        Api.post('/get-address', { token: token, mode: mode, string: string, mos_ru_street: this.state.mos_ru_street, location_type: this.state.location_type })
           .then(res => {

              const data = res.data;
              console.log(data);

              if(data.auth_required == 1)
              {
                this.props.navigation.navigate('Auth')
              }
              else
              {
                if(mode == 'street')
                {
                  this.setState({ street_list: data.address_list,
                                  mos_ru_address: 0,
                                  mos_ru_address_l_concat: '',
                                  address_list: []} )
                }
                if(mode == 'address')
                {
                  this.setState({address_list: data.address_list})
                }
              }
            })
            .catch(error => {
              console.log('error.response.status = ' + error.response.status);
              if(error.response.status == 401) { this.props.navigation.navigate('Auth') }
            });
      });
    }

  }

  markStreet = (item, index) => {
    console.log('markStreet. item = ')
    console.log(item)
    console.log('index = ' + index)

    console.log('item.p7 = ' + item.p7)

    this.setState({address: item.p7,
                   mos_ru_street: item.id,
                   mos_ru_street_p7: item.p7,
                   street_list: []}, () => this.changeAddress(item.p7 + ' '))

    this.refs.addressInput.focus();
  };

  markAddress = (item, index) => {
    console.log('markAddress. item = ')
    console.log(item)
    console.log('index = ' + index)

    this.setState({address: this.state.mos_ru_street_p7 + ' ' + item.l_concat,
                   mos_ru_address: item.id,
                   mos_ru_address_l_concat: item.l_concat,
                   address_list: []})
  };



  /* */
  markUserAddress = (item, index) => {
    console.log('markUserAddress. item = ')
    console.log(item)
    console.log('index = ' + index)

    this.setState({address: item.mos_ru_street_p7 + ' ' + item.mos_ru_address_l_concat,
                   mos_ru_street: item.mos_ru_street,
                   mos_ru_street_p7: item.mos_ru_street_p7,
                   mos_ru_address: item.mos_ru_address,
                   mos_ru_address_l_concat: item.mos_ru_address_l_concat})
  };


  getUserAddressList = (value) => {
    console.log('getUserAddressList. value = ' + value)

    Api.post('/get-user-address-list', { token: value })
       .then(res => {

          const data = res.data;
          console.log(data);

          if(data.auth_required == 1)
          {
            this.props.navigation.navigate('Auth')
          }
          else
          {
            this.setState({user_address_list: data.user_address_list})
          }
        })
        .catch(error => {
          console.log('error.response.status = ' + error.response.status);
          if(error.response.status == 401) { this.props.navigation.navigate('Auth') }
        });
  }

  screenFocus = () => {
    console.log('Pass screenFocus')

    console.log('this.props.route.params.address_map_data')
    console.log(this.props.route.params.address_map_data)

    if(typeof(this.props.route.params.address_map_data) != 'undefined')
    {
      let _address_map_data = this.props.route.params.address_map_data

      this.setState({ address: _address_map_data.address,
                      mos_ru_address: _address_map_data.mos_ru_address,
                      mos_ru_address_l_concat: _address_map_data.mos_ru_address_l_concat,
                      mos_ru_street: _address_map_data.mos_ru_street,
                      mos_ru_street_p7: _address_map_data.mos_ru_street_p7 })
    }
  }

  componentDidMount() {
    console.log('Pass DidMount')

    console.log('this.props.route.params.auto_list')
    console.log(this.props.route.params.auto_list)

    this.props.navigation.addListener('focus', () => this.screenFocus())

    AsyncStorage.getItem('token').then((value) => this.getUserAddressList(value));
  }

  /* */
  renderUserAddressItem = (item, index) => {

    console.log('renderUserAddressItem')
    console.log({item})
    console.log('item.id = ' + item.id + ' | index = ' + index)

    return (

      <Pressable
        key={item.id}
        onPress={() => this.markUserAddress(item, index)}
      >
        <View style={{ 
          flexDirection: "row", 
          margin: 20, 
          padding: 10, 
          backgroundColor: "#EEEEEE", 
          borderRadius: 8,
          borderWidth: 1, 
          borderColor: "#B8B8B8", 
        }}>
          <View style={{
            flex: 1,
            flexDirection: "column",
          }}>
            { item.location_types.mkad == 1 ?
              ( <View style={{ alignItems: 'center', margin: 1, borderRadius: 2, backgroundColor: "#57B6ED" }}><Text style={{ fontSize: 10, fontWeight: "bold" }}>МКАД</Text></View> ) :
              ( <View style={{ alignItems: 'center', margin: 1, borderRadius: 2, backgroundColor: "#8C8C8C" }}><Text style={{ fontSize: 10, fontWeight: "bold" }}>МКАД</Text></View> )
            }
            { item.location_types.ttk == 1 ?
              ( <View style={{ alignItems: 'center', margin: 1, borderRadius: 2, backgroundColor: "#19B28D" }}><Text style={{ fontSize: 10, fontWeight: "bold" }}>ТТК</Text></View> ) :
              ( <View style={{ alignItems: 'center', margin: 1, borderRadius: 2, backgroundColor: "#8C8C8C" }}><Text style={{ fontSize: 10, fontWeight: "bold" }}>ТТК</Text></View> )
            }
            { item.location_types.sk == 1 ?
              ( <View style={{ alignItems: 'center', margin: 1, borderRadius: 2, backgroundColor: "#EE505A" }}><Text style={{ fontSize: 10, fontWeight: "bold" }}>СК</Text></View> ) :
              ( <View style={{ alignItems: 'center', margin: 1, borderRadius: 2, backgroundColor: "#8C8C8C" }}><Text style={{ fontSize: 10, fontWeight: "bold" }}>СК</Text></View> )
            }
          </View>
          <View style={{
            flex: 5,
            flexDirection: "column",
            paddingLeft: 10,
          }}>

            <Text style={{ fontSize: 16, fontWeight: "bold", color: "#313131"}}>{ item.mos_ru_street_p7 } { item.mos_ru_address_l_concat }</Text>

          </View>
        </View>
      </Pressable>
    );

  }

  /* */
  renderStreetItem = (item, index) => {

    return (

      <Pressable
        key={item.id}
        onPress={() => this.markStreet(item, index)}
      >
        <View style={{ 
          flexDirection: "row", 
          margin: 20, 
          padding: 10, 
          backgroundColor: "#EEEEEE", 
          borderRadius: 8,
          borderWidth: 1, 
          borderColor: "#B8B8B8", 
        }}>
          <View style={{
            flex: 1,
            flexDirection: "column",
          }}>
            { item.location_types.mkad == 1 ?
              ( <View style={{ alignItems: 'center', margin: 1, borderRadius: 2, backgroundColor: "#57B6ED" }}><Text style={{ fontSize: 10, fontWeight: "bold" }}>МКАД</Text></View> ) :
              ( <View style={{ alignItems: 'center', margin: 1, borderRadius: 2, backgroundColor: "#8C8C8C" }}><Text style={{ fontSize: 10, fontWeight: "bold" }}>МКАД</Text></View> )
            }
            { item.location_types.ttk == 1 ?
              ( <View style={{ alignItems: 'center', margin: 1, borderRadius: 2, backgroundColor: "#19B28D" }}><Text style={{ fontSize: 10, fontWeight: "bold" }}>ТТК</Text></View> ) :
              ( <View style={{ alignItems: 'center', margin: 1, borderRadius: 2, backgroundColor: "#8C8C8C" }}><Text style={{ fontSize: 10, fontWeight: "bold" }}>ТТК</Text></View> )
            }
            { item.location_types.sk == 1 ?
              ( <View style={{ alignItems: 'center', margin: 1, borderRadius: 2, backgroundColor: "#EE505A" }}><Text style={{ fontSize: 10, fontWeight: "bold" }}>СК</Text></View> ) :
              ( <View style={{ alignItems: 'center', margin: 1, borderRadius: 2, backgroundColor: "#8C8C8C" }}><Text style={{ fontSize: 10, fontWeight: "bold" }}>СК</Text></View> )
            }
          </View>
          <View style={{
            flex: 5,
            flexDirection: "column",
            paddingLeft: 10,
          }}>

            { item.p2 ? ( <Text style={{ fontSize: 11, color: "#313131"}}>{ item.p2 }</Text> ) : null }
            { item.p3 ? ( <Text style={{ fontSize: 11, color: "#313131"}}>{ item.p3 }</Text> ) : null }
            { item.p4 ? ( <Text style={{ fontSize: 11, color: "#313131"}}>{ item.p4 }</Text> ) : null }
            { item.p5 ? ( <Text style={{ fontSize: 11, color: "#313131"}}>{ item.p5 }</Text> ) : null }
            { item.p6 ? ( <Text style={{ fontSize: 11, color: "#313131"}}>{ item.p6 }</Text> ) : null }
            { item.p7 ? ( <Text style={{ fontSize: 16, fontWeight: "bold", color: "#313131"}}>{ item.p7 }</Text> ) : null }

          </View>
        </View>
      </Pressable>
    );

  }

  /* */
  renderAddressItem = (item, index) => {

    return (

      <Pressable
        key={item.id}
        onPress={() => this.markAddress(item, index)}
      >
        <View style={{ 
          flexDirection: "row", 
          margin: 20, 
          padding: 10, 
          backgroundColor: "#EEEEEE", 
          borderRadius: 8,
          borderWidth: 1, 
          borderColor: "#B8B8B8", 
        }}>
          <View style={{
            flex: 1,
            flexDirection: "column",
          }}>
            { item.location_types.mkad == 1 ?
              ( <View style={{ alignItems: 'center', margin: 1, borderRadius: 2, backgroundColor: "#57B6ED" }}><Text style={{ fontSize: 10, fontWeight: "bold" }}>МКАД</Text></View> ) :
              ( <View style={{ alignItems: 'center', margin: 1, borderRadius: 2, backgroundColor: "#8C8C8C" }}><Text style={{ fontSize: 10, fontWeight: "bold" }}>МКАД</Text></View> )
            }
            { item.location_types.ttk == 1 ?
              ( <View style={{ alignItems: 'center', margin: 1, borderRadius: 2, backgroundColor: "#19B28D" }}><Text style={{ fontSize: 10, fontWeight: "bold" }}>ТТК</Text></View> ) :
              ( <View style={{ alignItems: 'center', margin: 1, borderRadius: 2, backgroundColor: "#8C8C8C" }}><Text style={{ fontSize: 10, fontWeight: "bold" }}>ТТК</Text></View> )
            }
            { item.location_types.sk == 1 ?
              ( <View style={{ alignItems: 'center', margin: 1, borderRadius: 2, backgroundColor: "#EE505A" }}><Text style={{ fontSize: 10, fontWeight: "bold" }}>СК</Text></View> ) :
              ( <View style={{ alignItems: 'center', margin: 1, borderRadius: 2, backgroundColor: "#8C8C8C" }}><Text style={{ fontSize: 10, fontWeight: "bold" }}>СК</Text></View> )
            }
          </View>
          <View style={{
            flex: 5,
            flexDirection: "column",
            paddingLeft: 10,
          }}>

            { item.l_concat ? ( <Text style={{ fontSize: 16, fontWeight: "bold", color: "#313131"}}>{ item.l_concat }</Text> ) : null }

          </View>
        </View>
      </Pressable>
    );

  }

  /* */
  renderItem = (item) => {

    return (

      <View
        key={item.id}
        style={{ 
          flexDirection: "row", 
          margin: 20, 
          padding: 10, 
          backgroundColor: "#EEEEEE", 
          borderRadius: 8,
          borderWidth: 1, 
          borderColor: "#B8B8B8",
      }}
      >
        <View style={{
          flex: 3,
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: "column",
        }}>
          <Image source={require('../images/truck.png')} style={{ width: 47, height: 36 }}/>
          <View style={{
            flexDirection: "row",
            justifyContent: 'flex-end',
          }}>
            <Text style={{ paddingTop: 5, fontSize: 14, fontWeight: 'bold', color: "#313131" }}>{item.auto_number_base}{item.auto_number_region_code}</Text>
          </View>
        </View>
        <View style={{
          flex: 5,
          flexDirection: "column",
          paddingLeft: 10,
        }}>
          <View style={{
            flexDirection: "row",
          }}>
            <Text style={{ color: "#313131"}}>Пропуск - {item.check_passes_string}</Text>
          </View>
        </View>
      </View>
    );

  }

  render() {
    return (

      <View style={styles.container}>

        <Text style={styles.header}>Добавить адрес {this.state.name}</Text>

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

        {/* модальное окно уведомления после добавления адреса */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={this.state.modalAddAddress}
          onRequestClose={() => {
            //Alert.alert("Modal has been closed.");
            this.setState({modalAddAddress: false})
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

              <Text style={{ paddingLeft: 16, paddingRight: 16, paddingTop: 24, fontSize: 16, fontWeight: "normal", color: "#4C4C4C" }}>В ближайшее время с Вами свяжется наш менеджер!</Text>

              <View style={{
                //flex: 1,
                //backgroundColor: 'grey',
                alignItems: 'center',
                justifyContent: 'center',
              }}>

                <View style={{
                  flexDirection: "row",
                  width: 400,
                }}>
                  <View style={{
                    flex: 1,
                    height: 100,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <TouchableOpacity
                      style={{ height: 50, fontSize: 10, margin: 25, borderRadius: 5, alignItems: 'center', justifyContent: 'center', backgroundColor: "#FEE600" }}
                      onPress={() =>  { this.setState({modalAddAddress: false}) }}>
                      <Text style={{ paddingLeft: 20, paddingRight: 20, fontSize: 14, color: "#2B2D33" }}>ОК</Text>
                    </TouchableOpacity>
                  </View>
                </View>


              </View>
            </View>
          </View>
        </Modal>

        <ScrollView>

          <Text style={{ paddingTop: 30, paddingLeft: 20, paddingRight: 20, fontSize: 15, fontWeight: "normal", color: "#313131" }}>Вы можете указать зону</Text>

          <View style={{
            flexDirection: "row",
          }}>

            <Pressable style={{ flex: 1, marginTop: 20, marginBottom: 20, marginLeft: 20, marginRight: 10 }} onPress={() => this.checkTab('mkad')}>
              <View style={this.setTabStyle('mkad')}>
                <Text style={{ fontSize: 15, fontWeight: "bold", color: "#313131" }}>МКАД</Text>
              </View>
            </Pressable>

            <Pressable style={{ flex: 1, marginTop: 20, marginBottom: 20, marginLeft: 10, marginRight: 10 }} onPress={() => this.checkTab('ttk')}>
              <View style={this.setTabStyle('ttk')}>
                <Text style={{ fontSize: 15, fontWeight: "bold", color: "#313131" }}>ТТК</Text>
              </View>
            </Pressable>

            <Pressable style={{ flex: 1, marginTop: 20, marginBottom: 20, marginLeft: 10, marginRight: 20 }} onPress={() => this.checkTab('sk')}>
              <View style={this.setTabStyle('sk')}>
                <Text style={{ fontSize: 15, fontWeight: "bold", color: "#313131" }}>СК</Text>
              </View>
            </Pressable>

          </View>

          <Text style={{ paddingLeft: 20, paddingRight: 20, fontSize: 15, fontWeight: "normal", color: "#313131" }}>Куда едем?</Text>

          <TouchableHighlight
            style={{ position: 'absolute', top: 170, right: 30, padding: 10, zIndex: 3, elevation: 3 }}
            activeOpacity={1}
            underlayColor='#FFFFFF'
            onPress={() => {
              console.log('-> move to PassYaMap')
              this.props.navigation.navigate('PassYaMap', { location_type: this.state.location_type })
            }}>
            <Image source={require('../images/pass_yamap_2.png')}/>
          </TouchableHighlight>

          <View style={{
            alignItems: 'stretch',
            paddingLeft: 30,
            paddingRight: 75,
            paddingTop: 20,
          }}>
            <TextInput
              ref="addressInput"
              //onEndEditing={(e: any) => { this.endEditingUserData( e.nativeEvent.text, 'firm' ) } }
              //onChangeText={(value) => this.changeUserData(value, 'firm')}
              style={[
                { height: 45, 
                  fontSize: 14, 
                  paddingLeft: 10,
                  borderWidth: 1, 
                  borderRadius: 8, 
                  color: "#313131" 
                }, 
                { backgroundColor: ( this.state.address != '' ? "#FFFFFF" : "#F9FAF9" ) },
                { borderColor: ( this.state.address != '' ? "#656565" : "#B8B8B8" ) }
              ]}
              onChangeText={this.changeAddress}
              value={this.state.address}
            />
          </View>

          <View>
            {this.state.street_list.map((item, index) => this.renderStreetItem(item, index))}
          </View>

          <View>
            {this.state.address_list.map((item, index) => this.renderAddressItem(item, index))}
          </View>

          {
            this.state.user_address_list.length ? (
              <Text style={{ paddingLeft: 20, paddingRight: 20, paddingTop: 20, fontSize: 15, fontWeight: "normal", color: "#313131" }}>Ранее введен:</Text>
            ) : null
          }

          <View>
            {this.state.user_address_list.map((item, index) => this.renderUserAddressItem(item, index))}
          </View>

          <Text style={{ paddingLeft: 20, paddingRight: 20, paddingTop: 20, fontSize: 15, fontWeight: "normal", color: "#313131" }}>Автомобили на маршрут:</Text>

          <View>
            {this.state.auto_list.map((item) => this.renderItem(item))}
          </View>

        </ScrollView>

        {/* ********  */}
        {
          this.state.mos_ru_address || ( this.state.location_type != '' )  ? (
            <TouchableHighlight
              style={{ position: 'absolute', left: 10, bottom: 10, right: 10, height: 50, fontSize: 10, margin: 25, borderRadius: 5, alignItems: 'center', justifyContent: 'center', backgroundColor: "#3A3A3A" }}
              onPress={() => {
                console.log('call add_address')
                AsyncStorage.getItem('token').then((value) => this.addAddress(value));
              }}>
              <Text style={{ fontSize: 24, color: "#FFFFFF" }}>Заказать пропуск</Text>
            </TouchableHighlight>
          ) : null
        }

      </View>
    );
  }

}

export default Pass;
