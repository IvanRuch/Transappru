import React from 'react';
import { Text, View, Image, TouchableOpacity, TouchableHighlight, Modal, TextInput, ScrollView, ActivityIndicator, Platform, Linking, Keyboard } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';

import styles from '../../styles/Styles.js';
import Api from "../../utils/Api";

interface InnProps {
  route?: {
    params: {
      user_data: string;
      check_rnis: string;
    };
  };
  navigation?: any;
}

interface InnState {
  user_data: any;
  check_rnis: boolean;
  inn: string;
  disabled: boolean;
  modalWaitInnConfirmation: boolean;
  modalErrorVisible: boolean;
  msg: string;
  modalCheckRnisButtonDisabled: boolean;
  auto_number_base: string;
  auto_number_base_ok: boolean;
  auto_number_region_code: string;
  auto_number_region_code_ok: boolean;
  checkRnisVisible: boolean;
  rnis_indicator: boolean;
  auto_rnis_data: any;
}

class InnClass extends React.Component<InnProps, InnState> {

  constructor(props: InnProps) {
    super(props);
    
    let user_data = {};
    let check_rnis = false;
    
    try {
      if (props.route?.params?.user_data) {
        user_data = JSON.parse(props.route.params.user_data);
      }
      if (props.route?.params?.check_rnis) {
        check_rnis = props.route.params.check_rnis === '1';
      }
    } catch (e) {
      console.log('Error parsing params:', e);
    }
    
    this.state = {
      user_data,
      check_rnis,
      inn: '',
      disabled: true,
      modalWaitInnConfirmation: false,
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

  changeInn = (value: string) => {
    this.setState({ inn: value });

    if (value.match(/^(\d{10})$|^(\d{12})$/)) {
      this.setState({ disabled: false });
    } else {
      this.setState({ disabled: true });
    }
  }

  bindInn = (value: any) => {
    Api.post('/bind-inn', { token: value, inn: this.state.inn })
      .then(res => {
        const data = res.data;

        if (data.error == 1) {
          this.setState({ msg: data.msg, modalErrorVisible: true });
        } else {
          if (Object.keys(this.state.user_data).length != 0) {
            this.setState({ modalWaitInnConfirmation: true });
          } else {
            this.props.navigation?.navigate('AutoList');
          }
        }
      })
      .catch(error => {
        console.log('Error binding INN:', error);
      });
  }

  contactPhone = (phone: string) => {
    const phoneStr = Platform.OS === 'android' ? `tel:${phone}` : `telprompt:${phone}`;
    Linking.openURL(phoneStr);
  }

  checkRnis = (value: any) => {
    if (!value) {
      this.props.navigation?.navigate('Auth');
      return;
    }

    this.setState({ rnis_indicator: true, checkRnisVisible: true });

    Api.post('/check-rnis', {
      token: value,
      auto_number_base: this.state.auto_number_base,
      auto_number_region_code: this.state.auto_number_region_code
    })
      .then(res => {
        const data = res.data;
        this.setState({ auto_rnis_data: data.auto_rnis_data, rnis_indicator: false });
      })
      .catch(error => {
        console.log('Error checking RNIS:', error);
        if (error.response?.status == 401) {
          this.props.navigation?.navigate('Auth');
        }
        this.setState({ rnis_indicator: false });
      });
  }

  checkAddAutoEnabled = () => {
    this.setState({
      modalCheckRnisButtonDisabled: !(this.state.auto_number_base_ok && this.state.auto_number_region_code_ok)
    });
  }

  changeAutoNumberBase = (value: string) => {
    if (value.match(/^[АВЕКМНОРСТУХABEKMHOPCTYX0-9]*$/i)) {
      this.setState({ auto_number_base: value });
    }

    this.setState({ auto_number_base_ok: value.length === 6 }, () => this.checkAddAutoEnabled());
  }

  changeAutoNumberRegionCode = (value: string) => {
    if (value.match(/^[0-9]*$/i)) {
      this.setState({ auto_number_region_code: value });
    }

    this.setState({
      auto_number_region_code_ok: value.length === 2 || value.length === 3
    }, () => this.checkAddAutoEnabled());
  }

  setButtonStyle = () => {
    const backgroundColor = this.state.disabled ? "#c0c0c0" : "#3A3A3A";
    return {
      height: 50,
      borderRadius: 5,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      backgroundColor,
      alignSelf: 'stretch' as const,
      marginHorizontal: 60,
      marginTop: 10
    };
  }

  setButtonTextStyle = () => {
    const color = this.state.disabled ? "#FFFFFF" : "#FFFFFF";
    return { fontSize: 20, color };
  }

  setCheckRnisButtonStyle = () => {
    const backgroundColor = this.state.modalCheckRnisButtonDisabled ? "#c0c0c0" : "#3A3A3A";
    return {
      height: 50,
      margin: 25,
      borderRadius: 5,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      backgroundColor
    };
  }

  setCheckRnisButtonTextStyle = () => {
    const color = this.state.modalCheckRnisButtonDisabled ? "#FFFFFF" : "#FFFFFF";
    return { paddingLeft: 20, paddingRight: 20, fontSize: 20, fontWeight: '500' as const, color, marginHorizontal: 30 };
  }

  render() {
    return (
      <View style={styles.container}>
        {/* Модалка ожидания подтверждения ИНН */}
        <Modal
          animationType="slide"
          transparent={false}
          visible={this.state.modalWaitInnConfirmation}
          onRequestClose={() => this.setState({ modalWaitInnConfirmation: false })}
        >
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <View style={{
              backgroundColor: '#EEEEEE',
              borderRadius: 25,
              alignItems: 'stretch',
              justifyContent: 'center',
              padding: 20,
              borderWidth: 1,
              borderColor: "#B8B8B8"
            }}>
              <Text style={{ paddingLeft: 16, paddingRight: 16, paddingTop: 24, fontSize: 20, fontWeight: "bold", color: "#313131" }}>
                Ваша заявка зарегистрирована!
              </Text>
              <Text style={{ paddingLeft: 16, paddingRight: 16, paddingTop: 24, fontSize: 16, color: "#313131" }}>
                Дождитесь подтверждения указанного Вами ИНН
              </Text>

              {this.state.user_data?.manager_data?.mobile_phone && (
                <TouchableHighlight
                  activeOpacity={1}
                  underlayColor='#EEEEEE'
                  onPress={() => this.contactPhone(this.state.user_data.manager_data.mobile_phone)}
                >
                  <View style={{ alignItems: 'center', padding: 5 }}>
                    <Text style={{ paddingLeft: 16, paddingRight: 16, paddingTop: 24, fontSize: 16, color: "#313131" }}>
                      Вы можете связаться с менеджером
                    </Text>
                    <Image style={{ margin: 15 }} source={require('../../../assets/images/contact_phone_2.png')} />
                  </View>
                </TouchableHighlight>
              )}

              <View style={{ flexDirection: "row" }}>
                <View style={{ flex: 1, height: 100, alignItems: 'center', justifyContent: 'center' }}>
                  <TouchableOpacity
                    style={{
                      height: 50,
                      margin: 25,
                      borderRadius: 5,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: '#3A3A3A'
                    }}
                    onPress={() => {
                      this.setState({ modalWaitInnConfirmation: false });
                      this.props.navigation?.navigate('AutoList');
                    }}
                  >
                    <Text style={{ paddingLeft: 20, paddingRight: 20, fontSize: 14, fontWeight: 'bold', color: '#FFFFFF' }}>
                      Закрыть
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        </Modal>

        {/* Модалка ошибки */}
        <Modal
          animationType="fade"
          transparent={true}
          visible={this.state.modalErrorVisible}
          onRequestClose={() => this.setState({ modalErrorVisible: false })}
        >
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <View style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 20,
              padding: 35,
              alignItems: 'center',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.25,
              shadowRadius: 4,
              elevation: 5,
              margin: 20
            }}>
              <Text style={{ marginBottom: 15, textAlign: 'center', fontSize: 16 }}>{this.state.msg}</Text>
              <TouchableOpacity
                style={{
                  borderRadius: 8,
                  padding: 10,
                  paddingHorizontal: 30,
                  backgroundColor: '#3A3A3A'
                }}
                onPress={() => this.setState({ modalErrorVisible: false })}
              >
                <Text style={{ color: 'white', fontWeight: 'bold', textAlign: 'center' }}>OK</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        <ScrollView>
          {this.state.check_rnis ? (
            <Text style={styles.header}>Проверить в РНИС</Text>
          ) : (
            <Text style={styles.header}>Введите ИНН</Text>
          )}

          {Object.keys(this.state.user_data).length != 0 || this.state.check_rnis ? (
            <TouchableHighlight
              style={styles.header_back}
              activeOpacity={1}
              underlayColor='#FFFFFF'
              onPress={() => this.props.navigation?.goBack()}
            >
              <Image source={require('../../../assets/images/back_2.png')} />
            </TouchableHighlight>
          ) : (
            <Text style={{ paddingLeft: 40, paddingRight: 40, paddingTop: 20, fontSize: 14, color: "#656565", textAlign: "justify" }}>
              для более точной идентификации Вас как клиента
            </Text>
          )}
          {!this.state.check_rnis ? (
            /* Добавление организации по ИНН */
            <>
              <View style={{ alignItems: 'stretch', paddingTop: 20, paddingLeft: 60, paddingRight: 60 }}>
                <TextInput
                  keyboardType='numeric'
                  style={{
                    height: 60,
                    paddingLeft: 30,
                    paddingRight: 30,
                    color: '#4C4C4C',
                    textAlign: 'center',
                    fontSize: 30,
                    borderRadius: 5,
                    borderBottomColor: 'black',
                    borderBottomWidth: 1,
                    marginBottom: 10
                  }}
                  maxLength={12}
                  onChangeText={this.changeInn}
                  value={this.state.inn}
                />
              </View>

              <TouchableOpacity
                disabled={this.state.disabled}
                style={this.setButtonStyle()}
                onPress={() => AsyncStorage.getItem('token').then((value) => this.bindInn(value))}
              >
                {Object.keys(this.state.user_data).length != 0 ? (
                  <Text style={this.setButtonTextStyle()}>Добавить</Text>
                ) : (
                  <Text style={this.setButtonTextStyle()}>Зарегистрироваться</Text>
                )}
              </TouchableOpacity>
            </>
          ) : null}

          {Object.keys(this.state.user_data).length == 0 ? (
            /* Проверка в РНИС для неавторизованных */
            <View style={{ paddingLeft: 30, paddingRight: 30, justifyContent: 'center', alignItems: 'center' }}>
              <Text style={{ paddingLeft: 10, paddingRight: 10, paddingTop: 20, paddingBottom: 20, fontSize: 14, color: "#656565", textAlign: "justify" }}>
                Вы можете проверить автомобиль на наличие регистрации в РНИС и передачу телематики
              </Text>

              <Image source={require('../../../assets/images/down_accordion.png')} />

              <View style={{
                backgroundColor: '#F7F7F7',
                borderRadius: 25,
                marginTop: 24,
                paddingTop: 14,
                paddingBottom: 14,
                paddingLeft: 10,
                paddingRight: 10,
                borderWidth: 1,
                borderColor: "#B8B8B8",
              }}>
                <Text style={{ fontSize: 13, color: "#313131", textAlign: "center" }}>
                  Государственный регистрационный знак:
                </Text>
                <View style={{ alignItems: 'center', paddingTop: 20 }}>
                  <View style={{ flexDirection: "row", width: 255, height: 75 }}>
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
                        style={{ paddingTop: 5, fontSize: 29, textAlign: 'center' }}
                        maxLength={6}
                        placeholder='А000АА'
                        autoCapitalize='characters'
                        onChangeText={this.changeAutoNumberBase}
                        value={this.state.auto_number_base}
                      />
                    </View>
                    <View style={{ flex: 1, backgroundColor: '#B8B8B8', height: 75 }} />
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
                        style={{ paddingBottom: -20, height: 45, fontSize: 29, textAlign: 'center' }}
                        maxLength={3}
                        placeholder='777'
                        onChangeText={this.changeAutoNumberRegionCode}
                        value={this.state.auto_number_region_code}
                      />
                      <View style={{ flexDirection: "row", alignItems: 'center', justifyContent: 'center', height: 20 }}>
                        <Text style={{ paddingRight: 5, fontSize: 14, color: "#2c2c2c" }}>RUS</Text>
                        <Image source={require('../../../assets/images/flag_rus.png')} style={{ width: 24, height: 12 }} />
                      </View>
                    </View>
                  </View>
                </View>
              </View>

              <View style={{ flexDirection: "row" }}>
                <View style={{ flex: 1, height: 110, alignItems: 'center', justifyContent: 'center' }}>
                  <TouchableOpacity
                    disabled={this.state.modalCheckRnisButtonDisabled}
                    style={this.setCheckRnisButtonStyle()}
                    onPress={() => {
                      Keyboard.dismiss();
                      AsyncStorage.getItem('token').then((value) => this.checkRnis(value));
                    }}
                  >
                    <Text style={this.setCheckRnisButtonTextStyle()}>Проверить в РНИС</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Результаты проверки */}
              {this.state.checkRnisVisible && (
                <View style={{
                  marginTop: 20,
                  padding: 20,
                  backgroundColor: "#EEEEEE",
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: "#B8B8B8"
                }}>
                  {this.state.rnis_indicator ? (
                    <ActivityIndicator size="large" color="#313131" />
                  ) : (
                    <View>
                      <Text style={{ fontSize: 18, fontWeight: "bold", color: "#313131", marginBottom: 10 }}>
                        Результат проверки:
                      </Text>

                      {this.state.auto_rnis_data.rnis_status ? (
                        <View>
                          <Text style={{ fontSize: 16, color: "#313131", marginBottom: 5 }}>
                            Статус: {this.state.auto_rnis_data.rnis_status}
                          </Text>
                          {this.state.auto_rnis_data.rnis_owner && (
                            <Text style={{ fontSize: 16, color: "#313131", marginBottom: 5 }}>
                              Владелец: {this.state.auto_rnis_data.rnis_owner}
                            </Text>
                          )}
                          {this.state.auto_rnis_data.rnis_brand && (
                            <Text style={{ fontSize: 16, color: "#313131", marginBottom: 5 }}>
                              Марка: {this.state.auto_rnis_data.rnis_brand}
                            </Text>
                          )}
                          {this.state.auto_rnis_data.rnis_model && (
                            <Text style={{ fontSize: 16, color: "#313131", marginBottom: 5 }}>
                              Модель: {this.state.auto_rnis_data.rnis_model}
                            </Text>
                          )}
                          {this.state.auto_rnis_data.rnis_year && (
                            <Text style={{ fontSize: 16, color: "#313131", marginBottom: 5 }}>
                              Год выпуска: {this.state.auto_rnis_data.rnis_year}
                            </Text>
                          )}
                        </View>
                      ) : (
                        <Text style={{ fontSize: 16, color: "#656565" }}>
                          Данные не найдены
                        </Text>
                      )}
                    </View>
                  )}
                </View>
              )}
            </View>
          ) : null}
        </ScrollView>
      </View>
    );
  }
}

// Wrapper для работы с expo-router
const Inn = () => {
  const params = useLocalSearchParams();
  const router = useRouter();
  
  return (
    <InnClass
      route={{
        params: {
          user_data: params.user_data as string || '{}',
          check_rnis: params.check_rnis as string || '0'
        }
      }}
      navigation={{
        navigate: (screen: string) => {
          if (screen === 'AutoList') {
            router.push('/(authenticated)/auto-list' as any);
          } else if (screen === 'Auth') {
            router.replace('/');
          }
        },
        goBack: () => router.back()
      }}
    />
  );
};

export default Inn;
