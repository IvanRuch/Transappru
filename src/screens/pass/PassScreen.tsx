import React from 'react';
import { View, Text, TouchableHighlight, TouchableOpacity, TextInput, Image, Modal, ActivityIndicator, Pressable, StatusBar, FlatList, ImageBackground, Platform } from 'react-native';
import { KeyboardAwareScrollView } from '../../components/common/KeyboardAwareScrollView';
import { SafeAreaView, SafeAreaInsetsContext } from 'react-native-safe-area-context';
import { ScreenHeader } from '../../components/common';
import AsyncStorage from '@react-native-async-storage/async-storage';

import styles from '../../styles/Styles.js';
import Api from "../../utils/Api";

interface PassProps {
  route: {
    params: {
      auto_list: any[];
      address_map_data?: any;
    };
  };
  navigation: any;
}

interface PassState {
  location_type: string;
  address: string;
  mos_ru_street: number;
  mos_ru_street_p7: string;
  street_list: any[];
  mos_ru_address: number;
  mos_ru_address_l_concat: string;
  address_list: any[];
  user_address_list: any[];
  auto_list: any[];
  address_map_data?: any;
  modalAddAddress: boolean;
  lon: number | string;
  lat: number | string;
  isLocationTypeManual: boolean; // Флаг: зона выбрана вручную или автоматически
  originalLocationTypeFromMap: string; // Исходная зона, определенная картой
}

class Pass extends React.Component<PassProps, PassState> {
  addressInputRef: React.RefObject<TextInput | null>;

  constructor(props: PassProps) {
    super(props);
    this.addressInputRef = React.createRef<TextInput>();

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
      lon: '',
      lat: '',
      isLocationTypeManual: false, // Изначально зона не выбрана
      originalLocationTypeFromMap: '', // Исходная зона с карты
    };
  }

  /* выбор зоны */
  checkTab = (tab: string) => {
    console.log('checkTab. tab = ' + tab)

    // Разрешаем изменение зоны даже при выбранном адресе
    const hasMapAddress = this.state.lon !== '' && this.state.lat !== '';

    if(this.state.location_type === tab)
    {
      // Снимаем выбор зоны
      this.setState({ location_type: '', isLocationTypeManual: false })
    }
    else
    {
      // Выбираем зону
      // Если пользователь выбрал ту же зону, что была с карты - это НЕ ручное изменение
      const isManual = hasMapAddress && tab !== this.state.originalLocationTypeFromMap;
      
      this.setState({ 
        location_type: tab, 
        isLocationTypeManual: isManual
      })
    }
  }

  setTabStyle = (tab: string) => {
    let color = this.state.location_type === tab ? "#D7D7D7" : "#EEEEEE";
    return { alignItems: 'center' as const, justifyContent: 'center' as const, height: 50, backgroundColor: color, borderRadius: 8 }
  }

  /* добавление введенного адреса */
  addAddress = (value: string | null) => {
    console.log('addAddress. value = ' + value)

    let auto_list_ids = [];
    for (let i=0; i<this.state.auto_list.length; i++)
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

          if(data.auth_required === 1)
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
                            modalAddAddress: true,
                            lon: '',
                            lat: '',
                            location_type: '' })
          }

        })
        .catch(error => {
          console.log('error.response.status = ' + error.response.status);
          if(error.response.status === 401) { this.props.navigation.navigate('Auth') }
        });
  }

  /* ввод адреса */
  changeAddress = (value: string) => {
    console.log('changeAddress. value = ' + value)


    let pos = value.indexOf(this.state.mos_ru_street_p7)

    console.log('mos_ru_street = ' + this.state.mos_ru_street + ' | mos_ru_street_p7 = ' + this.state.mos_ru_street_p7 + ' | pos = ' + pos)

    // Очищаем координаты при ручном редактировании адреса, чтобы разблокировать выбор зоны
    // Если адрес удаляется полностью, также очищаем location_type
    if(value.trim() === '') {
      this.setState({address: value, lon: '', lat: '', location_type: ''})
    } else {
      this.setState({address: value, lon: '', lat: ''})
    }

    //
    let mode = ''
    let string = '';

    // если улица не выбрана
    if(this.state.mos_ru_street === 0)
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
      if(value.indexOf(this.state.mos_ru_street_p7) !== 0)
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
        if(value.indexOf(this.state.mos_ru_address_l_concat) === -1)
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

    if(mode !== '')
    {
      AsyncStorage.getItem('token').then((token) => {

        Api.post('/get-address', { token: token, mode: mode, string: string, mos_ru_street: this.state.mos_ru_street, location_type: this.state.location_type })
           .then(res => {

              const data = res.data;
              console.log(data);

              if(data.auth_required === 1)
              {
                this.props.navigation.navigate('Auth')
              }
              else
              {
                if(mode === 'street')
                {
                  this.setState({ street_list: data.address_list,
                                  mos_ru_address: 0,
                                  mos_ru_address_l_concat: '',
                                  address_list: []} )
                }
                if(mode === 'address')
                {
                  this.setState({address_list: data.address_list})
                }
              }
            })
            .catch(error => {
              console.log('error.response.status = ' + error.response.status);
              if(error.response.status === 401) { this.props.navigation.navigate('Auth') }
            });
      });
    }

  }

  markStreet = (item: any, index: number) => {
    console.log('markStreet. item = ')
    console.log(item)
    console.log('index = ' + index)

    console.log('item.p7 = ' + item.p7)

    this.setState({address: item.p7,
                   mos_ru_street: item.id,
                   mos_ru_street_p7: item.p7,
                   street_list: []}, () => this.changeAddress(item.p7 + ' '))

    this.addressInputRef.current?.focus();
  };

  markAddress = (item: any, index: number) => {
    console.log('markAddress. item = ')
    console.log(item)
    console.log('index = ' + index)

    this.setState({address: this.state.mos_ru_street_p7 + ' ' + item.l_concat,
                   mos_ru_address: item.id,
                   mos_ru_address_l_concat: item.l_concat,
                   address_list: [],
                   lon: '',
                   lat: ''})
  };



  /* */
  markUserAddress = (item: any, index: number) => {
    console.log('markUserAddress. item = ')
    console.log(item)
    console.log('index = ' + index)

    // Определяем зону на основе location_types из сохранённого адреса
    let detectedLocationType = '';
    const types = item.location_types || {};
    
    if (types.sk === 1) {
      detectedLocationType = 'sk';
    } else if (types.ttk === 1) {
      detectedLocationType = 'ttk';
    } else if (types.mkad === 1) {
      detectedLocationType = 'mkad';
    }
    // Если зоны не определены в базе - оставляем пустым, пользователь выберет вручную

    // При выборе из "Ранее введенных" адрес вводится вручную (без карты)
    // Координаты отсутствуют, поэтому зона считается выбранной вручную
    // но предупреждение не показывается (нет lon/lat)
    this.setState({address: item.mos_ru_street_p7 + ' ' + item.mos_ru_address_l_concat,
                   mos_ru_street: item.mos_ru_street,
                   mos_ru_street_p7: item.mos_ru_street_p7,
                   mos_ru_address: item.mos_ru_address,
                   mos_ru_address_l_concat: item.mos_ru_address_l_concat,
                   location_type: detectedLocationType,
                   lon: '',
                   lat: '',
                   isLocationTypeManual: false,
                   originalLocationTypeFromMap: ''})
  };


  getUserAddressList = (value: string | null) => {
    console.log('getUserAddressList. value = ' + value)

    Api.post('/get-user-address-list', { token: value })
       .then(res => {

          const data = res.data;
          console.log(data);

          if(data.auth_required === 1)
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
          if(error.response.status === 401) { this.props.navigation.navigate('Auth') }
        });
  }

  screenFocus = () => {
    if(typeof(this.props.route.params.address_map_data) !== 'undefined' && this.props.route.params.address_map_data.address)
    {
      let _address_map_data = this.props.route.params.address_map_data

      // Определяем location_type:
      // 1. Если зона была выбрана ВРУЧНУЮ - сохраняем её (isLocationTypeManual = true)
      // 2. Если зоны не было или она была автоматической - используем зону с карты
      const mapLocationType = _address_map_data.location_type || '';
      const newLocationType = this.state.isLocationTypeManual
        ? this.state.location_type 
        : mapLocationType;

      // Флаг остаётся true только если зона была выбрана вручную
      // Если зона пришла с карты - флаг = false (автоматическая)
      const newIsManual = this.state.isLocationTypeManual;

      this.setState({ address: _address_map_data.address,
                      mos_ru_address: _address_map_data.mos_ru_address,
                      mos_ru_address_l_concat: _address_map_data.mos_ru_address_l_concat,
                      mos_ru_street: _address_map_data.mos_ru_street,
                      mos_ru_street_p7: _address_map_data.mos_ru_street_p7,
                      lon: _address_map_data.lon || '',
                      lat: _address_map_data.lat || '',
                      location_type: newLocationType,
                      isLocationTypeManual: newIsManual,
                      originalLocationTypeFromMap: mapLocationType })
      
      // Очистить параметр после использования
      this.props.route.params.address_map_data = undefined;
    }
  }

  componentDidMount() {
    console.log('Pass DidMount')

    console.log('this.props.route.params.auto_list')
    console.log(this.props.route.params.auto_list)

    this.props.navigation.addListener('focus', () => this.screenFocus())

    AsyncStorage.getItem('token').then((value) => this.getUserAddressList(value));
  }

  /* Рендер иконок зон */
  renderLocationTypes = (locationTypes: any) => {
    // Защита от пустого объекта или undefined
    const types = locationTypes || {};
    
    return (
      <View style={{
        flex: 1,
        flexDirection: "column",
      }}>
        { types.mkad === 1 ?
          ( <View style={{ alignItems: 'center', margin: 1, borderRadius: 2, backgroundColor: "#57B6ED" }}><Text style={{ fontSize: 10, fontWeight: "bold" }}>МКАД</Text></View> ) :
          ( <View style={{ alignItems: 'center', margin: 1, borderRadius: 2, backgroundColor: "#8C8C8C" }}><Text style={{ fontSize: 10, fontWeight: "bold" }}>МКАД</Text></View> )
        }
        { types.ttk === 1 ?
          ( <View style={{ alignItems: 'center', margin: 1, borderRadius: 2, backgroundColor: "#19B28D" }}><Text style={{ fontSize: 10, fontWeight: "bold" }}>ТТК</Text></View> ) :
          ( <View style={{ alignItems: 'center', margin: 1, borderRadius: 2, backgroundColor: "#8C8C8C" }}><Text style={{ fontSize: 10, fontWeight: "bold" }}>ТТК</Text></View> )
        }
        { types.sk === 1 ?
          ( <View style={{ alignItems: 'center', margin: 1, borderRadius: 2, backgroundColor: "#EE505A" }}><Text style={{ fontSize: 10, fontWeight: "bold" }}>СК</Text></View> ) :
          ( <View style={{ alignItems: 'center', margin: 1, borderRadius: 2, backgroundColor: "#8C8C8C" }}><Text style={{ fontSize: 10, fontWeight: "bold" }}>СК</Text></View> )
        }
      </View>
    );
  }

  /* */
  renderUserAddressItem = (item: any, index: number) => {

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
          {this.renderLocationTypes(item.location_types)}
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
  renderStreetItem = (item: any, index: number) => {

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
          {this.renderLocationTypes(item.location_types)}
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
  renderAddressItem = (item: any, index: number) => {

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
          {this.renderLocationTypes(item.location_types)}
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
  renderItem = (item: any) => {

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
          <Image source={require('../../../assets/images/truck.png')} style={{ width: 47, height: 36 }}/>
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
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar 
          barStyle="dark-content"
          backgroundColor="#ffffff"
          translucent={false}
        />
        
        {/* Заголовок с кнопкой назад */}
        <ScreenHeader 
          title="Добавить адрес"
          onBack={() => {
            console.log('-> go back')
            this.props.navigation.goBack()
          }}
        />

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
                      style={{ height: 50, margin: 25, borderRadius: 5, alignItems: 'center', justifyContent: 'center', backgroundColor: "#FEE600" }}
                      onPress={() =>  { this.setState({modalAddAddress: false}) }}>
                      <Text style={{ paddingLeft: 20, paddingRight: 20, fontSize: 14, color: "#2B2D33" }}>ОК</Text>
                    </TouchableOpacity>
                  </View>
                </View>


              </View>
            </View>
          </View>
        </Modal>

        <SafeAreaInsetsContext.Consumer>
          {(insets) => (
            <KeyboardAwareScrollView
              enableOnAndroid={true}
              extraScrollHeight={Platform.OS === 'ios' ? 20 : 80}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingBottom: 120 + Math.max(insets?.bottom || 0, 20) }}
            >

              <Text style={{ paddingTop: 15, paddingLeft: 20, paddingRight: 20, fontSize: 15, fontWeight: "normal", color: "#313131" }}>Вы можете указать зону</Text>

          <View style={{
            flexDirection: "row",
          }}>

            <Pressable 
              style={{ flex: 1, marginTop: 20, marginBottom: 5, marginLeft: 20, marginRight: 10 }} 
              onPress={() => this.checkTab('mkad')}>
              <View style={this.setTabStyle('mkad')}>
                <Text style={{ fontSize: 15, fontWeight: "bold", color: "#313131" }}>МКАД</Text>
              </View>
            </Pressable>

            <Pressable 
              style={{ flex: 1, marginTop: 20, marginBottom: 5, marginLeft: 10, marginRight: 10 }} 
              onPress={() => this.checkTab('ttk')}>
              <View style={this.setTabStyle('ttk')}>
                <Text style={{ fontSize: 15, fontWeight: "bold", color: "#313131" }}>ТТК</Text>
              </View>
            </Pressable>

            <Pressable 
              style={{ flex: 1, marginTop: 20, marginBottom: 5, marginLeft: 10, marginRight: 20 }} 
              onPress={() => this.checkTab('sk')}>
              <View style={this.setTabStyle('sk')}>
                <Text style={{ fontSize: 15, fontWeight: "bold", color: "#313131" }}>СК</Text>
              </View>
            </Pressable>

          </View>

          {/* Предупреждение при ручном изменении зоны */}
          {this.state.lon !== '' && this.state.lat !== '' && this.state.isLocationTypeManual && (
            <View style={{ 
              marginLeft: 20, 
              marginRight: 20, 
              marginBottom: 15,
              padding: 10,
              backgroundColor: '#FFF3CD',
              borderRadius: 5,
              borderWidth: 1,
              borderColor: '#FFE69C'
            }}>
              <Text style={{ fontSize: 12, color: '#856404', textAlign: 'center' }}>
                ⚠️ Зона изменена вручную. Убедитесь, что выбранная зона соответствует адресу.
              </Text>
            </View>
          )}

          <View style={{ height: 10 }} />

          <View style={{ 
            flexDirection: 'row', 
            alignItems: 'center',
            paddingLeft: 20, 
            paddingRight: 20 
          }}>
            <Text style={{ fontSize: 15, fontWeight: "normal", color: "#313131" }}>Куда едем?</Text>
            {
              this.state.address !== '' ? (
                <TouchableOpacity
                  style={{
                    marginLeft: 12,
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 6,
                    borderWidth: 1,
                    borderColor: '#B8B8B8',
                    backgroundColor: '#F9FAF9'
                  }}
                  onPress={() => {
                    this.setState({ 
                      address: '', 
                      lon: '' as string | number, 
                      lat: '' as string | number, 
                      location_type: '',
                      mos_ru_address: 0,
                      street_list: [],
                      address_list: []
                    });
                  }}
                >
                  <Text style={{ fontSize: 13, color: '#656565' }}>Очистить</Text>
                </TouchableOpacity>
              ) : null
            }
          </View>

          {/* Поле адреса с иконкой карты */}
          <View style={{
            flexDirection: 'row',
            alignItems: 'flex-start',
            paddingLeft: 30,
            paddingRight: 30,
            paddingTop: 20,
          }}>
            <TextInput
              ref={this.addressInputRef}
              multiline={true}
              numberOfLines={3}
              textAlignVertical="top"
              style={[
                { 
                  flex: 1,
                  minHeight: 45,
                  maxHeight: 90,
                  fontSize: 14, 
                  paddingLeft: 10,
                  paddingRight: 10,
                  paddingTop: 12,
                  paddingBottom: 12,
                  borderWidth: 1, 
                  borderRadius: 8, 
                  color: "#313131" 
                }, 
                { backgroundColor: ( this.state.address !== '' ? "#FFFFFF" : "#F9FAF9" ) },
                { borderColor: ( this.state.address !== '' ? "#656565" : "#B8B8B8" ) }
              ]}
              onChangeText={this.changeAddress}
              value={this.state.address}
            />
            <TouchableHighlight
              style={{ padding: 10, marginLeft: 10 }}
              activeOpacity={1}
              underlayColor='#FFFFFF'
              onPress={() => {
                // Передаём выбранную зону на карту для отображения и масштабирования
                this.props.navigation.navigate('PassYaMap', { 
                  location_type: this.state.location_type,
                  auto_list: this.state.auto_list,
                  lon: this.state.lon,
                  lat: this.state.lat,
                  address: this.state.address
                })
              }}>
              <Image source={require('../../../assets/images/pass_yamap_2.png')}/>
            </TouchableHighlight>
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

            </KeyboardAwareScrollView>
          )}
        </SafeAreaInsetsContext.Consumer>

        {/* ********  */}
        <SafeAreaInsetsContext.Consumer>
          {(insets) => (
            this.state.mos_ru_address || ( this.state.location_type !== '' )  ? (
              <TouchableHighlight
                style={{ 
                  position: 'absolute', 
                  left: 10, 
                  bottom: Math.max(insets?.bottom || 0, 10), 
                  right: 10, 
                  height: 50, 
                  margin: 25, 
                  borderRadius: 5, 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  backgroundColor: "#3A3A3A" 
                }}
                onPress={() => {
                  console.log('call add_address')
                  AsyncStorage.getItem('token').then((value) => this.addAddress(value));
                }}>
                <Text style={{ fontSize: 24, color: "#FFFFFF" }}>Заказать пропуск</Text>
              </TouchableHighlight>
            ) : null
          )}
        </SafeAreaInsetsContext.Consumer>

      </SafeAreaView>
    );
  }

}

export default Pass;

