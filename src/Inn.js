import React from 'react';
import { StyleSheet, Text, View, Button, TextInput, TouchableOpacity, Alert, Pressable, Linking, Modal, TouchableHighlight, Image, ScrollView, Keyboard, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import Api from "./utils/Api";

class Inn extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      user_data: props.route.params.user_data,
      inn: '',
      disabled: true,
      modalWaitInnConfirmation: false,
      modalVisible: false,
      modalErrorVisible: false,
      msg: '',
      modalCheckRnisButtonDisabled: true,
      auto_number_base: '',
      auto_number_base_ok: false,
      auto_number_region_code: '',
      auto_number_region_code_ok: false,
      checkRnisVisible: false,
      rnis_indicator: false,
      auto_rnis_data: {},
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
            if(Object.keys(this.state.user_data).length != 0)
            {
              this.setState({modalWaitInnConfirmation: true})
            }
            else
            {
              this.props.navigation.navigate('AutoList')
            }
          }

        })
        .catch(error => {
            console.log('error');
        });
  }

  setButtonStyle = () => {
    let backgroundColor = this.state.disabled ? "#c0c0c0" : "#3A3A3A";
    return { height: 50, width: 275, fontSize: 10, borderRadius: 5, alignItems: 'center', justifyContent: 'center', backgroundColor: backgroundColor }
  }

  setButtonTextStyle = () => {
    let color = this.state.disabled ? "#FFFFFF" : "#FFFFFF";
    return { fontSize: 20, color: color }
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

  /* Проверка в РНИС */
  checkRnis = (value) => {
    console.log('checkRnis. value = ' + value)

    if(!value)
    {
      console.log('null')
      this.props.navigation.navigate('Auth')
    }

    else
    {
      this.setState({rnis_indicator: true, checkRnisVisible: true})

      Api.post('/check-rnis', { token: value, 
                                auto_number_base: this.state.auto_number_base,
                                auto_number_region_code: this.state.auto_number_region_code })
          .then(res => {

            const data = res.data;
            console.log('data')
            console.log(data);

            this.setState({auto_rnis_data: data.auto_rnis_data, rnis_indicator: false})
          })
          .catch(error => {
            console.log('error.response.status = ' + error.response.status);
            if(error.response.status == 401) { this.props.navigation.navigate('Auth') }
          });
    }
  }

  setCheckRnisButtonStyle = () => {
    let backgroundColor = this.state.modalCheckRnisButtonDisabled ? "#c0c0c0" : "#3A3A3A";
    return { height: 50, fontSize: 10, margin: 25, borderRadius: 5, alignItems: 'center', justifyContent: 'center', backgroundColor: backgroundColor }
  }

  setCheckRnisButtonTextStyle = () => {
    let color = this.state.modalCheckRnisButtonDisabled ? "#E8E8E8" : "#FFFFFF";
    return { paddingLeft: 20, paddingRight: 20, fontSize: 14, fontWeight: 500, color: color }
  }

  checkAddAutoEnabled = () => {
    console.log('checkEnabled')

    this.setState({modalCheckRnisButtonDisabled: this.state.auto_number_base_ok &&
                                                 this.state.auto_number_region_code_ok ? false : true})
  }

  changeAutoNumberBase = (value) => {
    console.log('changeAutoNumberBase. value = ' + value)

    if(value.match(/^[АВЕКМНОРСТУХABEKMHOPCTYX0-9]*$/i))
    {
      this.setState({auto_number_base: value})
    }

    console.log('value.length = ' + value.length)

    this.setState({auto_number_base_ok: value.length == 6 ? true : false}, () => this.checkAddAutoEnabled())
  };

  changeAutoNumberRegionCode = (value) => {
    console.log('changeAutoNumberRegionCode. value = ' + value)

    if(value.match(/^[0-9]*$/i))
    {
      this.setState({auto_number_region_code: value})
    }

    this.setState({auto_number_region_code_ok: value.length == 2 || value.length == 3 ? true : false}, () => this.checkAddAutoEnabled())
  };

  render() {
    return (

      <View style={styles.container}>

        {/* модальное окно с уведомлением "ожидайте подтверждения инн" */}
        <Modal
          animationType="slide"
          transparent={false}
          visible={this.state.modalWaitInnConfirmation}
          onRequestClose={() => {
            this.setState({modalWaitInnConfirmation: false})
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
                <Text style={{ paddingLeft: 16, paddingRight: 16, paddingTop: 24, fontSize: 16, fontWeight: "normal", color: "#313131" }}>Дождитесь подтверждения указанного Вами ИНН</Text>
                    
                <TouchableHighlight
                  activeOpacity={1}
                  underlayColor='#EEEEEE'
                  onPress={() => this.contactPhone(this.state.user_data.manager_data.mobile_phone)}
                  >
                  <View style={{ alignItems: 'center', padding: 5 }}>
                    <Text style={{ paddingLeft: 16, paddingRight: 16, paddingTop: 24, fontSize: 16, fontWeight: "normal", color: "#313131" }}>Вы можете связаться с менеджером</Text>
                    <Image style={{
                        margin: 15,
                      }}
                      source={require('../images/contact_phone_2.png')} />
                  </View>
                </TouchableHighlight>            

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
                          console.log('close modalWaitInnConfirmation')
                          this.setState({modalWaitInnConfirmation: false})
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

        <View style={{ flex: 1 }}>
        <ScrollView>        
        <View style={{ flex: 1 ,
              alignItems: 'center',
              justifyContent: 'center',
        }}>

        { Object.keys(this.state.user_data).length != 0 ? (
        <TouchableHighlight
          style={styles.header_back}
          activeOpacity={1}
          underlayColor='#FFFFFF'
          onPress={() => {
            console.log('-> move to AutoList')
            this.props.navigation.navigate('AutoList')
          }}>
          <Image source={require('../images/back_2.png')} />
        </TouchableHighlight> ) : null }         

        <Text style={{ paddingTop: 30, fontSize: 22, fontWeight: "bold", color: '#4C4C4C' }}>Введите ИНН</Text>
        <View
          style={{
            flexDirection: "row",
            //height: 100,
            paddingLeft: 30
          }}
        >
          <TextInput
            keyboardType='numeric'
            style={{ height: 60, width: 275, color: '#4C4C4C', textAlign: 'center', fontSize: 30, borderRadius: 5, borderBottomColor: 'black', borderBottomWidth: 1, marginBottom : 10 }}
            maxLength={12}
            //placeholder = '000000000000'
            onChangeText={this.changeInn}
          />
          <TouchableHighlight
            style={{ width: 24, height: 24 }}
            activeOpacity={1}
            underlayColor='#FFFFFF'
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
                }
              }
          >
            { Object.keys(this.state.user_data).length != 0 ? (
              <Text style={this.setButtonTextStyle()}>Добавить</Text>
            ) : (
              <Text style={this.setButtonTextStyle()}>Зарегистрироваться</Text>  
            ) }
          </TouchableOpacity>

          { Object.keys(this.state.user_data).length == 0 ? (

          <>

            <Text style={{ paddingLeft: 50, paddingRight: 50, paddingTop: 20, paddingBottom: 20, fontSize: 14, fontWeight: "bold", color: "#656565", textAlign: "justify" }}>Вы также можете проверить автомобиль на наличие регистрации в РНИС и передачу телематики</Text>

            <Image source={require('../images/down_accordion.png')} />

            <View style={{
              backgroundColor: '#F7F7F7',
              borderRadius: 25,
              alignItems: 'center',
              justifyContent: 'center',
              marginTop: 24,
              paddingTop: 14,
              paddingBottom: 14,
              paddingLeft: 10,
              paddingRight: 10,
              alignItems: 'flex-start',
              borderWidth: 1, 
              borderColor: "#B8B8B8",
            }}>
              <Text style={{ fontSize: 13, fontWeight: "normal", color: "#313131", textAlign: "center" }}>Государственный регистрационный знак:</Text>
              <View style={{
                alignItems: 'center',
                paddingTop: 20,
              }}>
                <View style={{
                  flexDirection: "row",
                  width: 255,
                  height: 75,
                }}>
                  <View style={{
                    flex: 188,
                    backgroundColor: '#FFFFFF',
                    height: 75,
                    borderBottomLeftRadius: 8,
                    borderTopLeftRadius: 8,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderWidth: 1, 
                    borderColor: "#B8B8B8",
                  }}>
                    <TextInput
                      style={{ paddingTop: 5, fontSize: 29 }}
                      maxLength={6}
                      placeholder = 'А000АА'
                      onChangeText={this.changeAutoNumberBase}
                      value={this.state.auto_number_base}
                    />
                  </View>
                  <View style={{
                    flex: 1,
                    backgroundColor: '#B8B8B8',
                    height: 75,
                  }}>
                  </View>
                  <View style={{
                    flex: 114,
                    flexDirection: "column",
                    backgroundColor: '#FFFFFF',
                    height: 75,
                    borderBottomRightRadius: 8,
                    borderTopRightRadius: 8,
                    alignItems: 'center',
                    borderWidth: 1, 
                    borderColor: "#B8B8B8",
                  }}>
                    <TextInput
                      keyboardType='numeric'
                      style={{ paddingBottom: -20, height: 45, fontSize: 29 }}
                      maxLength={3}
                      placeholder = '777'
                      onChangeText={this.changeAutoNumberRegionCode}
                      value={this.state.auto_number_region_code}
                    />
                    <View style={{
                      flexDirection: "row",
                      alignItems: 'center',
                      justifyContent: 'center',
                      height: 20,
                    }}>
                      <Text style={{ paddingRight: 5, fontSize: 14, color: "#2c2c2c" }}>RUS</Text>
                      <Image source={require('../images/flag_rus.png')} style={{ width: 24, height: 12 }}/>
                    </View>
                  </View>
                </View>
              </View>
            </View>

            <View style={{
              flexDirection: "row",
              //width: 370,
            }}>
              <View style={{
                flex: 1,
                height: 110,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <TouchableOpacity
                  disabled={this.state.modalCheckRnisButtonDisabled}
                  style={this.setCheckRnisButtonStyle()}
                  onPress={() => {
                      console.log('call check_rnis')
                      Keyboard.dismiss();
                      AsyncStorage.getItem('token').then((value) => this.checkRnis(value));
                    }
                  }
                >
                  <Text style={this.setCheckRnisButtonTextStyle()}>Проверить в РНИС</Text>
                </TouchableOpacity>
              </View>
            </View>

            { this.state.checkRnisVisible ? (
              <>
                { this.state.rnis_indicator ? (
                    <ActivityIndicator size="large" color="#313131" animating={true}/>
                  ) : (
                    <View style={{ flexDirection: "column", margin: 20, padding: 10 }}>

                      { typeof(this.state.auto_rnis_data.registrationOk) == 'undefined' ? (
                          <View style={{
                              flexDirection: "row"
                          }}>
                            <Image source={require('../images/rnis_unsuccess.png')}/>
                            <Text style={{ paddingLeft: 10, fontSize: 15, color: "#313131"}}>Данные о регистрации в РНИС не найдены</Text>
                          </View>
                        ) : (
                          <>
                            { this.state.auto_rnis_data.registrationOk != 1 ? (
                            <View style={{
                              flexDirection: "row"
                            }}>
                              <Image source={require('../images/rnis_unsuccess.png')}/>
                              <Text style={{ paddingLeft: 10, fontSize: 15, color: "#313131"}}>Данные о регистрации в РНИС не найдены</Text>
                            </View>
                              ) : (
                                <View style={{
                                  flexDirection: "row"
                                }}>
                                  <Image source={require('../images/rnis_success.png')}/>
                                  <View style={{
                                    paddingLeft: 10
                                  }}>
                                    <Text style={{ fontSize: 15, color: "#313131"}}>Зарегистрирован в РНИС. </Text>
                                    { this.state.auto_rnis_data.rnis_registered != null ? (
                                        <Text style={{ fontSize: 15, color: "#313113"}}>Дата регистрации: {this.state.auto_rnis_data.rnis_registered}</Text>
                                        ) : null
                                    }
                                  </View>
                                </View>
                              )
                            }

                            { this.state.auto_rnis_data.telematicsOk == 0 ? (
                                <View style={{
                                    flexDirection: "row"
                                }}>
                                  <Image source={require('../images/rnis_unsuccess.png')}/>
                                  <Text style={{ paddingLeft: 10, fontSize: 15, color: "#313131"}}>Навигационные данные в РНИС не поступали</Text>
                                </View>
                              ) : (
                                <View style={{
                                  flexDirection: "row"
                                }}>

                                  <Image source={require('../images/rnis_success.png')}/>
                                  <View style={{
                                    paddingLeft: 10
                                  }}>
                                    <Text style={{ fontSize: 15, color: "#313131"}}>Телематика передается. </Text>
                                    { this.state.auto_rnis_data.telematics_date != 0 ? (
                                        <Text style={{ fontSize: 15, color: "#313113"}}>Последняя передача: {this.state.auto_rnis_data.telematics_date}</Text>
                                        ) : null
                                    }
                                  </View>
                                </View>
                              )
                            }
                          </>
                        )
                      }

                    </View>
                  )
                }
              </>

            ) : null }


          </>
          ) : null }

          </View>
          </ScrollView>
          </View>

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

  header_back: {
    position: 'absolute',
    top: 20,
    left: 20,
    padding: 10,
    ...Platform.select({
      ios: {
        top: 65,
      },
      android: {
        top: 20,
      },
      default: {
        top: 20,
      }
   })
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
