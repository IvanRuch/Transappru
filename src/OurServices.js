import React from 'react';
import { Text, View, Image, TouchableOpacity, TouchableHighlight, Modal, TextInput, ImageBackground, ActivityIndicator,  FlatList, Pressable, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import styles from './styles/Styles.js';
import Api from "./utils/Api";

class OurServices extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      service_data: props.route.params.service_data,
      our_services_data: { 
        fio: '', 
        phone: '', 
        leasing_subject: '', 
        auto_quantity: '', 
        waybill_quantity: '',
        permission_quantity: '',
        spb_pass_quantity: '',
        tow_truck_quantity: '',
        map_quantity: '',
        leasing_selection: '', 
        leasing_time: '', 
        leasing_advance: '', 
        insurance_type: '',
        permission_international: '',
        ais_ossig_region: '',
        fine_reason: '',
        comment: '' },
      modalServiceOrderButtonDisabled: true,
      modalWaitForConnection: false,
    };
  }


  ourServicesOrder = (value) => {
    console.log('ourServicesOrder. value = ' + value)

    this.setState({modalServiceOrderButtonDisabled: true})

    Api.post('/our-services-order', {  token: value,
                                      service_name: this.state.service_data.name,
                                      fio: this.state.our_services_data.fio,
                                      phone: this.state.our_services_data.phone,
                                      leasing_subject: this.state.our_services_data.leasing_subject,
                                      auto_quantity: this.state.our_services_data.auto_quantity,
                                      waybill_quantity: this.state.our_services_data.waybill_quantity,
                                      spb_pass_quantity: this.state.our_services_data.spb_pass_quantity,
                                      tow_truck_quantity: this.state.our_services_data.tow_truck_quantity,
                                      permission_quantity: this.state.our_services_data.permission_quantity,
                                      map_quantity: this.state.our_services_data.map_quantity,
                                      leasing_selection: this.state.our_services_data.leasing_selection,
                                      leasing_time: this.state.our_services_data.leasing_time,
                                      leasing_advance: this.state.our_services_data.leasing_advance,
                                      insurance_type: this.state.our_services_data.insurance_type,
                                      permission_international: this.state.our_services_data.permission_international,
                                      ais_ossig_region: this.state.our_services_data.ais_ossig_region,
                                      fine_reason: this.state.our_services_data.fine_reason,
                                      comment: this.state.our_services_data.comment })
       .then(res => {

          const data = res.data;
          console.log(data);

          if(data.auth_required == 1)
          {
            this.props.navigation.navigate('Auth')
          }
          else
          {
            //this.setState({modalWaitForConnection: true})
          }
        })
        .catch(error => {
          console.log('error.response.status = ' + error.response.status);
          if(error.response.status == 401) { this.props.navigation.navigate('Auth') }
        });

  }

  changeValue = (value, field) => {
    console.log('changeValue. field = ' + field + ' | value = ' + value)

    let our_services_data_new = this.state.our_services_data

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
      our_services_data_new[field] = value
    }
    else
    {
      our_services_data_new[field] = value
    }

    console.log('value(res) = ' + value)

    //
    this.setState({our_services_data: our_services_data_new})

    if(this.state.our_services_data.fio != '' && 
       this.state.our_services_data.phone.match(/\+7(\d{10})/) &&
       (
        ( this.state.service_data.name == 'leasing' && this.state.our_services_data.leasing_subject != '' ) ||
        ( this.state.service_data.name == 'gis_epd' ) ||  
        ( this.state.service_data.name == 'oversized_cargo_transportation' ) || 
        ( this.state.service_data.name == 'insurance' && this.state.our_services_data.insurance_type != '' ) ||
        ( this.state.service_data.name == 'permission' && this.state.our_services_data.permission_international != '' ) || 
        ( this.state.service_data.name == 'ais_ossig' && this.state.our_services_data.ais_ossig_region != '' ) ||
        ( this.state.service_data.name == 'spb_pass' ) ||
        ( this.state.service_data.name == 'tow_truck_pass' ) || 
        ( this.state.service_data.name == 'map' ) ||  
        ( this.state.service_data.name == 'glonass' ) ||
        ( this.state.service_data.name == 'tachograph' ) || 
        ( this.state.service_data.name == 'property_valuation' ) ||
        ( this.state.service_data.name == 'fines' )
       )
      )
    {
      this.setState({modalServiceOrderButtonDisabled: false})
    }
    else
    {
      this.setState({modalServiceOrderButtonDisabled: true})
    }
  };

  setOurServicesOrderButtonStyle = () => {
    let backgroundColor = this.state.modalServiceOrderButtonDisabled ? "#c0c0c0" : "#3A3A3A";
    return { position: 'absolute', left: 10, bottom: 10, right: 10, height: 50, fontSize: 10, margin: 25, borderRadius: 5, alignItems: 'center', justifyContent: 'center', backgroundColor: backgroundColor }
  }

  setOurServicesOrderTextStyle = () => {
    let color = this.state.modalServiceOrderButtonDisabled ? "#FFFFFF" : "#FFFFFF";
    return { fontSize: 24, fontWeight: 500, color: color }
  }

  setTextInputStyle = (field) => {

    let color, bgcolor;

    if(field == 'fio')
    {
      color   = this.state.our_services_data.fio != '' ? "#656565" : "#B8B8B8"
      bgcolor = this.state.our_services_data.fio != '' ? "#FFFFFF" : "#F9FAF9"
    }

    if(field == 'phone')
    {
      color   = this.state.our_services_data.phone.match(/\+7(\d{10})/) ? "#656565" : "#B8B8B8"
      bgcolor = this.state.our_services_data.phone.match(/\+7(\d{10})/) ? "#FFFFFF" : "#F9FAF9"
    }

    if(field == 'leasing_subject' )
    {
      color   = this.state.our_services_data.leasing_subject != '' ? "#656565" : "#B8B8B8"
      bgcolor = this.state.our_services_data.leasing_subject != '' ? "#FFFFFF" : "#F9FAF9"
    }    

    if(field == 'auto_quantity')
    {
      color   = this.state.our_services_data.auto_quantity != '' ? "#656565" : "#B8B8B8"
      bgcolor = this.state.our_services_data.auto_quantity != '' ? "#FFFFFF" : "#F9FAF9"
    }

    if(field == 'waybill_quantity')
    {
      color   = this.state.our_services_data.waybill_quantity != '' ? "#656565" : "#B8B8B8"
      bgcolor = this.state.our_services_data.waybill_quantity != '' ? "#FFFFFF" : "#F9FAF9"
    }
    
    if(field == 'spb_pass_quantity')
    {
      color   = this.state.our_services_data.spb_pass_quantity != '' ? "#656565" : "#B8B8B8"
      bgcolor = this.state.our_services_data.spb_pass_quantity != '' ? "#FFFFFF" : "#F9FAF9"
    }

    if(field == 'tow_truck_quantity')
    {
      color   = this.state.our_services_data.tow_truck_quantity != '' ? "#656565" : "#B8B8B8"
      bgcolor = this.state.our_services_data.tow_truck_quantity != '' ? "#FFFFFF" : "#F9FAF9"
    }
    
    if(field == 'permission_quantity')
    {
      color   = this.state.our_services_data.permission_quantity != '' ? "#656565" : "#B8B8B8"
      bgcolor = this.state.our_services_data.permission_quantity != '' ? "#FFFFFF" : "#F9FAF9"
    }
        
    if(field == 'map_quantity')
    {
      color   = this.state.our_services_data.map_quantity != '' ? "#656565" : "#B8B8B8"
      bgcolor = this.state.our_services_data.map_quantity != '' ? "#FFFFFF" : "#F9FAF9"
    }
    
    if(field == 'leasing_selection' )
    {
      color   = this.state.our_services_data.leasing_selection != '' ? "#656565" : "#B8B8B8"
      bgcolor = this.state.our_services_data.leasing_selection != '' ? "#FFFFFF" : "#F9FAF9"
    }        

    if(field == 'leasing_time' )
    {
      color   = this.state.our_services_data.leasing_time != '' ? "#656565" : "#B8B8B8"
      bgcolor = this.state.our_services_data.leasing_time != '' ? "#FFFFFF" : "#F9FAF9"
    }    
    
    if(field == 'leasing_advance' )
    {
      color   = this.state.our_services_data.leasing_advance != '' ? "#656565" : "#B8B8B8"
      bgcolor = this.state.our_services_data.leasing_advance != '' ? "#FFFFFF" : "#F9FAF9"
    }        

    if(field == 'fine_reason' )
    {
      color   = this.state.our_services_data.fine_reason != '' ? "#656565" : "#B8B8B8"
      bgcolor = this.state.our_services_data.fine_reason != '' ? "#FFFFFF" : "#F9FAF9"
    }     
    
    if(field == 'comment' )
    {
      color   = this.state.our_services_data.comment != '' ? "#656565" : "#B8B8B8"
      bgcolor = this.state.our_services_data.comment != '' ? "#FFFFFF" : "#F9FAF9"
    }        

    return { height: 55, fontSize: 20, marginTop: 20, paddingLeft: 20, backgroundColor: bgcolor, borderColor: color, borderWidth: 1, borderRadius: 8, color: "#313131" }
  }  

  componentDidMount() {
    console.log('OurServices DidMount')

  }

  /* */

  render() {
    return (

      <View style={styles.container}>

        {/* модальное окно с уведомлением "ожидайте связи с менеджером" */}
        <Modal
          animationType="slide"
          transparent={false}
          visible={this.state.modalWaitForConnection}
          onRequestClose={() => {
            this.setState({modalWaitForConnection: false})
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
                <Text style={{ paddingLeft: 16, paddingRight: 16, paddingTop: 24, fontSize: 16, fontWeight: "normal", color: "#313131" }}>Мы свяжемся с Вами в ближайшее время!</Text>          

                <View style={{
                  flexDirection: "row",
                  //width: 370,
                }}>
                  <View style={{
                    flex: 1,
                    height: 100,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <TouchableOpacity
                      style={{
                        height: 50,
                        fontSize: 10,
                        margin: 25,
                        borderRadius: 5,
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: '#3A3A3A' }}
                      onPress={() => {
                          console.log('close modalWaitForConnection')
                          this.setState({ modalWaitForConnection: false})
                          this.props.navigation.navigate('AutoList')
                        }
                      }
                    >
                      <Text style={{ paddingLeft: 20, paddingRight: 20, fontSize: 14, fontWeight: 'bold', color: '#FFFFFF' }}>Закрыть</Text>
                    </TouchableOpacity>
                  </View>
                </View>                     

              </View>

            </View>
        </Modal>


        <Text style={[styles.header, { marginLeft: 35, marginRight: 20 }]}>{ this.state.service_data.header }</Text>


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

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
          style={{ flex: 1 }}
        >
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 160 }}>

          <View style={{
              flexDirection: "row",
              paddingLeft: 20,
              paddingRight: 20,
              marginTop: 30
            }}>
              <Text style={{ fontSize: 14, fontWeight: "normal", color: "#656565" }}>{ this.state.service_data.description }</Text>
          </View>            
          <Text style={{ marginTop: 10, paddingLeft: 20, paddingRight: 20, paddingTop: 20, fontSize: 14, fontWeight: "normal", color: "#656565" }}>Контактное лицо *:</Text>

          <View style={{
            alignItems: 'stretch',
            paddingLeft: 30,
            paddingRight: 30,
          }}>
            <TextInput
              placeholder = 'Контактное лицо'
              style={this.setTextInputStyle('fio')}
              onChangeText={(value) => this.changeValue(value, 'fio')}
              value={this.state.our_services_data.fio}
            />
          </View>

          <Text style={{ paddingLeft: 20, paddingRight: 20, paddingTop: 30, fontSize: 14, fontWeight: "normal", color: "#656565" }}>Номер телефона *:</Text>

          <View style={{
            alignItems: 'stretch',
            paddingLeft: 30,
            paddingRight: 30,
          }}>
            <TextInput
              placeholder = 'Номер телефона'
              style={this.setTextInputStyle('phone')}
              maxLength={12}
              onChangeText={(value) => this.changeValue(value, 'phone')}
              value={this.state.our_services_data.phone}
            />
          </View>

          { this.state.service_data.name == 'leasing' ? (
          <>
            <Text style={{ paddingLeft: 20, paddingRight: 20, paddingTop: 30, fontSize: 14, fontWeight: "normal", color: "#656565" }}>Предмет лизинга (наименование, марка, модель)*:</Text>

            <View style={{
              alignItems: 'stretch',
              paddingLeft: 30,
              paddingRight: 30,
            }}>
              <TextInput
                placeholder = 'Предмет лизинга'
                style={this.setTextInputStyle('leasing_subject')}
                onChangeText={(value) => this.changeValue(value, 'leasing_subject')}
                value={this.state.our_services_data.leasing_subject}
              />
            </View>
          </>
          ) : null}

          { this.state.service_data.name == 'leasing' || this.state.service_data.name == 'gis_epd' ? (
          <>
            <Text style={{ paddingLeft: 20, paddingRight: 20, paddingTop: 30, fontSize: 14, fontWeight: "normal", color: "#656565" }}>Количество машин</Text>

            <View style={{
              alignItems: 'stretch',
              paddingLeft: 30,
              paddingRight: 30,
            }}>
              <TextInput
                placeholder = ''
                style={this.setTextInputStyle('auto_quantity')}
                onChangeText={(value) => this.changeValue(value, 'auto_quantity')}
                value={this.state.our_services_data.auto_quantity}
              />
            </View>
          </>
          ) : null}

          { this.state.service_data.name == 'gis_epd' ? (
          <>
            <Text style={{ paddingLeft: 20, paddingRight: 20, paddingTop: 30, fontSize: 14, fontWeight: "normal", color: "#656565" }}>Количество путевых листов в месяц</Text>

            <View style={{
              alignItems: 'stretch',
              paddingLeft: 30,
              paddingRight: 30,
            }}>
              <TextInput
                placeholder = ''
                style={this.setTextInputStyle('waybill_quantity')}
                onChangeText={(value) => this.changeValue(value, 'waybill_quantity')}
                value={this.state.our_services_data.waybill_quantity}
              />
            </View>
          </>
          ) : null}

          { this.state.service_data.name == 'spb_pass' ? (
          <>
            <Text style={{ paddingLeft: 20, paddingRight: 20, paddingTop: 30, fontSize: 14, fontWeight: "normal", color: "#656565" }}>Количество пропусков</Text>

            <View style={{
              alignItems: 'stretch',
              paddingLeft: 30,
              paddingRight: 30,
            }}>
              <TextInput
                placeholder = ''
                style={this.setTextInputStyle('spb_pass_quantity')}
                onChangeText={(value) => this.changeValue(value, 'spb_pass_quantity')}
                value={this.state.our_services_data.spb_pass_quantity}
              />
            </View>
          </>
          ) : null}

          { this.state.service_data.name == 'tow_truck_pass' ? (
          <>
            <Text style={{ paddingLeft: 20, paddingRight: 20, paddingTop: 30, fontSize: 14, fontWeight: "normal", color: "#656565" }}>Количество пропусков</Text>

            <View style={{
              alignItems: 'stretch',
              paddingLeft: 30,
              paddingRight: 30,
            }}>
              <TextInput
                placeholder = ''
                style={this.setTextInputStyle('tow_truck_quantity')}
                onChangeText={(value) => this.changeValue(value, 'tow_truck_quantity')}
                value={this.state.our_services_data.tow_truck_quantity}
              />
            </View>
          </>
          ) : null}

          { this.state.service_data.name == 'map' ? (
          <>
            <Text style={{ paddingLeft: 20, paddingRight: 20, paddingTop: 30, fontSize: 14, fontWeight: "normal", color: "#656565" }}>Количество карт МАП</Text>

            <View style={{
              alignItems: 'stretch',
              paddingLeft: 30,
              paddingRight: 30,
            }}>
              <TextInput
                placeholder = ''
                style={this.setTextInputStyle('map_quantity')}
                onChangeText={(value) => this.changeValue(value, 'map_quantity')}
                value={this.state.our_services_data.map_quantity}
              />
            </View>
          </>
          ) : null}

          { this.state.service_data.name == 'oversized_cargo_transportation' ? (
          <>
            <Text style={{ paddingLeft: 20, paddingRight: 20, paddingTop: 30, fontSize: 14, fontWeight: "normal", color: "#656565" }}>Количество разрешений</Text>

            <View style={{
              alignItems: 'stretch',
              paddingLeft: 30,
              paddingRight: 30,
            }}>
              <TextInput
                placeholder = ''
                style={this.setTextInputStyle('permission_quantity')}
                onChangeText={(value) => this.changeValue(value, 'permission_quantity')}
                value={this.state.our_services_data.permission_quantity}
              />
            </View>
          </>
          ) : null}

          { this.state.service_data.name == 'insurance' ? (
          <>
            <Text style={{ paddingLeft: 20, paddingRight: 20, paddingTop: 30, fontSize: 14, fontWeight: "normal", color: "#656565" }}>Вид страхования *</Text>

            <View style={{
              alignItems: 'stretch',
              paddingLeft: 30,
              paddingRight: 30,
            }}>
              {(() => {
                const options = ['Страхование имущества', 
                                 'Страхование профессиональных услуг', 
                                 'Страхование в сфере строительства',
                                 'Страхование грузов',
                                 'Страхование автотранспорта ( ОСАГО и КАСКО )',
                                 'Страхование финансовых рисков',
                                 'Страхование сотрудников'];
                const current = this.state.our_services_data.insurance_type;
                return (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 20 }}>
                    {options.map((option) => {
                      const isSelected = current === option;
                      return (
                        <Pressable
                          key={option}
                          onPress={() => this.changeValue(option, 'insurance_type')}
                          style={{
                            paddingVertical: 10,
                            paddingHorizontal: 14,
                            marginRight: 10,
                            marginBottom: 10,
                            borderRadius: 8,
                            borderWidth: 1,
                            borderColor: isSelected ? '#313131' : '#B8B8B8',
                            backgroundColor: isSelected ? '#FFFFFF' : '#F9FAF9'
                          }}
                        >
                          <Text style={{ fontSize: 16, color: '#313131' }}>{option}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                );
              })()}
            </View>
          </>
          ) : null}

          { this.state.service_data.name == 'leasing' ? (
          <>
            <Text style={{ paddingLeft: 20, paddingRight: 20, paddingTop: 30, fontSize: 14, fontWeight: "normal", color: "#656565" }}>Нужен ли подбор техника (да/нет)</Text>

            <View style={{
              alignItems: 'stretch',
              paddingLeft: 30,
              paddingRight: 30,
            }}>
              {(() => {
                const options = ['да', 
                                 'нет'];
                const current = this.state.our_services_data.leasing_selection;
                return (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 20 }}>
                    {options.map((option) => {
                      const isSelected = current === option;
                      return (
                        <Pressable
                          key={option}
                          onPress={() => this.changeValue(option, 'leasing_selection')}
                          style={{
                            paddingVertical: 10,
                            paddingHorizontal: 14,
                            marginRight: 10,
                            marginBottom: 10,
                            borderRadius: 8,
                            borderWidth: 1,
                            borderColor: isSelected ? '#313131' : '#B8B8B8',
                            backgroundColor: isSelected ? '#FFFFFF' : '#F9FAF9'
                          }}
                        >
                          <Text style={{ fontSize: 16, color: '#313131' }}>{option}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                );
              })()}
            </View>
          </>
          ) : null}

          { this.state.service_data.name == 'permission' ? (
          <>
            <Text style={{ paddingLeft: 20, paddingRight: 20, paddingTop: 30, fontSize: 14, fontWeight: "normal", color: "#656565" }}>Наличие удостоверения допуска к международным перевозкам * (да/нет)</Text>

            <View style={{
              alignItems: 'stretch',
              paddingLeft: 30,
              paddingRight: 30,
            }}>
              {(() => {
                const options = ['да', 
                                 'нет'];
                const current = this.state.our_services_data.permission_international;
                return (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 20 }}>
                    {options.map((option) => {
                      const isSelected = current === option;
                      return (
                        <Pressable
                          key={option}
                          onPress={() => this.changeValue(option, 'permission_international')}
                          style={{
                            paddingVertical: 10,
                            paddingHorizontal: 14,
                            marginRight: 10,
                            marginBottom: 10,
                            borderRadius: 8,
                            borderWidth: 1,
                            borderColor: isSelected ? '#313131' : '#B8B8B8',
                            backgroundColor: isSelected ? '#FFFFFF' : '#F9FAF9'
                          }}
                        >
                          <Text style={{ fontSize: 16, color: '#313131' }}>{option}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                );
              })()}
            </View>
          </>
          ) : null}

         { this.state.service_data.name == 'ais_ossig' ? (
          <>
            <Text style={{ paddingLeft: 20, paddingRight: 20, paddingTop: 30, fontSize: 14, fontWeight: "normal", color: "#656565" }}>Регион работы *</Text>

            <View style={{
              alignItems: 'stretch',
              paddingLeft: 30,
              paddingRight: 30,
            }}>
              {(() => {
                const options = [ 'Адыгея Респ',
                                  'Алтай Респ',
                                  'Алтайский край',
                                  'Амурская обл',
                                  'Архангельская обл',
                                  'Астраханская обл',
                                  'Байконур г',
                                  'Башкортостан Респ',
                                  'Белгородская обл',
                                  'Брянская обл',
                                  'Бурятия Респ',
                                  'Владимирская обл',
                                  'Волгоградская обл',
                                  'Вологодская обл',
                                  'Воронежская обл',
                                  'Дагестан Респ',
                                  'Донецкая Народная респ.',
                                  'Еврейская Аобл',
                                  'Забайкальский край',
                                  'Запорожская обл.',
                                  'Ивановская обл',
                                  'Ингушетия Респ',
                                  'Иркутская обл',
                                  'Кабардино-Балкарская Респ',
                                  'Калининградская обл',
                                  'Калмыкия Респ',
                                  'Калужская обл',
                                  'Камчатский край',
                                  'Карачаево-Черкесская Респ',
                                  'Карелия Респ',
                                  'Кемеровская область - Кузбасс обл',
                                  'Кировская обл',
                                  'Коми Респ',
                                  'Костромская обл',
                                  'Краснодарский край',
                                  'Красноярский край',
                                  'Крым Респ',
                                  'Курганская обл',
                                  'Курская обл',
                                  'Ленинградская обл',
                                  'Липецкая обл',
                                  'Луганская Народная респ.',
                                  'Магаданская обл',
                                  'Марий Эл Респ',
                                  'Мордовия Респ',
                                  'Москва г',
                                  'Московская обл',
                                  'Мурманская обл',
                                  'Ненецкий АО',
                                  'Нижегородская обл',
                                  'Новгородская обл',
                                  'Новосибирская обл',
                                  'Омская обл',
                                  'Оренбургская обл',
                                  'Орловская обл',
                                  'Пензенская обл',
                                  'Пермский край',
                                  'Приморский край',
                                  'Псковская обл',
                                  'Россия',
                                  'Ростовская обл',
                                  'Рязанская обл',
                                  'Самарская обл',
                                  'Санкт-Петербург г',
                                  'Саратовская обл',
                                  'Саха /Якутия/ Респ',
                                  'Сахалинская обл',
                                  'Свердловская обл',
                                  'Северная Осетия - Алания Респ',
                                  'Смоленская обл',
                                  'Ставропольский край',
                                  'Тамбовская обл',
                                  'Татарстан Респ',
                                  'Тверская обл',
                                  'Томская обл',
                                  'Тульская обл',
                                  'Тыва Респ',
                                  'Тюменская обл',
                                  'Удмуртская Респ',
                                  'Ульяновская обл',
                                  'Хабаровский край',
                                  'Хакасия Респ',
                                  'Ханты-Мансийский Автономный округ - Югра АО',
                                  'Херсонская обл.',
                                  'Челябинская обл',
                                  'Чеченская Респ',
                                  'Чувашская Республика - Чувашия',
                                  'Чукотский АО',
                                  'Ямало-Ненецкий АО',
                                  'Ярославская обл' ];
                const current = this.state.our_services_data.ais_ossig_region;
                return (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 20 }}>
                    {options.map((option) => {
                      const isSelected = current === option;
                      return (
                        <Pressable
                          key={option}
                          onPress={() => this.changeValue(option, 'ais_ossig_region')}
                          style={{
                            paddingVertical: 10,
                            paddingHorizontal: 14,
                            marginRight: 10,
                            marginBottom: 10,
                            borderRadius: 8,
                            borderWidth: 1,
                            borderColor: isSelected ? '#313131' : '#B8B8B8',
                            backgroundColor: isSelected ? '#FFFFFF' : '#F9FAF9'
                          }}
                        >
                          <Text style={{ fontSize: 16, color: '#313131' }}>{option}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                );
              })()}
            </View>
          </>
          ) : null}

          { this.state.service_data.name == 'leasing' ? (
          <>
            <Text style={{ paddingLeft: 20, paddingRight: 20, paddingTop: 30, fontSize: 14, fontWeight: "normal", color: "#656565" }}>Желаемый срок лизинга ( от 6 мес. до 60 мес.)</Text>

            <View style={{
              alignItems: 'stretch',
              paddingLeft: 30,
              paddingRight: 30,
            }}>
              <TextInput
                placeholder = ''
                style={this.setTextInputStyle('leasing_time')}
                onChangeText={(value) => this.changeValue(value, 'leasing_time')}
                value={this.state.our_services_data.leasing_time}
              />
            </View>
          </>
          ) : null}

          { this.state.service_data.name == 'leasing' ? (
          <>
            <Text style={{ paddingLeft: 20, paddingRight: 20, paddingTop: 30, fontSize: 14, fontWeight: "normal", color: "#656565" }}>Желаемый аванс в %</Text>

            <View style={{
              alignItems: 'stretch',
              paddingLeft: 30,
              paddingRight: 30,
            }}>
              <TextInput
                placeholder = ''
                style={this.setTextInputStyle('leasing_advance')}
                onChangeText={(value) => this.changeValue(value, 'leasing_advance')}
                value={this.state.our_services_data.leasing_advance}
              />
            </View>
          </>
          ) : null}

          { this.state.service_data.name == 'fines' ? (
          <>
            <Text style={{ paddingLeft: 20, paddingRight: 20, paddingTop: 30, fontSize: 14, fontWeight: "normal", color: "#656565" }}>Причина штрафа</Text>

            <View style={{
              alignItems: 'stretch',
              paddingLeft: 30,
              paddingRight: 30,
            }}>
              <TextInput
                placeholder = ''
                style={this.setTextInputStyle('fine_reason')}
                onChangeText={(value) => this.changeValue(value, 'fine_reason')}
                value={this.state.our_services_data.fine_reason}
              />
            </View>
          </>
          ) : null}

          <Text style={{ paddingLeft: 20, paddingRight: 20, paddingTop: 30, fontSize: 14, fontWeight: "normal", color: "#656565" }}>Комментарий</Text>

          <View style={{
            alignItems: 'stretch',
            paddingLeft: 30,
            paddingRight: 30,
          }}>
          <TextInput
            placeholder = ''
            style={[this.setTextInputStyle('comment'), { marginBottom: 110 }]}
            onChangeText={(value) => this.changeValue(value, 'comment')}
            value={this.state.our_services_data.comment}
          />
          </View>

        </ScrollView>
        </KeyboardAvoidingView>


        {
          this.state.modalServiceOrderButtonDisabled ? null : (

            <TouchableHighlight
              disabled={this.state.modalServiceOrderButtonDisabled}
              style={this.setOurServicesOrderButtonStyle()}
              onPress={() =>  {
                console.log('call set_ourServicesOrder')
                AsyncStorage.getItem('token').then((value) => this.ourServicesOrder(value));
              }}>
              <Text style={this.setOurServicesOrderTextStyle()}>Заказать услугу</Text>
            </TouchableHighlight>

          )
        }

      </View>
    );
  }
}

export default OurServices;
