import React from 'react';
import { Text, View, Image, TouchableHighlight, TouchableOpacity, Modal, TextInput, ActivityIndicator, FlatList, Pressable, ScrollView, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';

import styles from '../../styles/Styles.js';
import Api from "../../utils/Api";
import { ScreenHeader } from '../../components/common';

interface DriverData {
  id: string;
  vu: string;
  vu_reg: string;
  name_f: string;
  name_i: string;
  name_o: string;
}

interface DriverListProps {
  navigation?: any;
  route?: any;
}

interface DriverListState {
  indicator: boolean;
  user_driver_list: DriverData[];
  user_driver_data: DriverData;
  modalDelDriverVisible: boolean;
  modalEditDriverVisible: boolean;
  modalEditDriverButtonDisabled: boolean;
  modalEditDriverMode: string;
}

class DriverListClass extends React.Component<DriverListProps, DriverListState> {

  constructor(props: DriverListProps) {
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

  componentDidMount() {
    AsyncStorage.getItem('token').then((value) => this.getDriverList(value));
  }

  getDriverList = (value: any) => {
    if (!value) {
      this.props.navigation?.navigate('Auth');
      return;
    }

    this.setState({ indicator: true });

    Api.post('/get-driver-list', { token: value })
      .then(res => {
        const data = res.data;
        if (data.auth_required == 1) {
          this.props.navigation?.navigate('Auth');
        } else {
          this.setState({
            user_driver_list: data.user_driver_list || [],
            indicator: false
          });
        }
      })
      .catch(error => {
        console.log('Error loading drivers:', error);
        if (error.response?.status == 401) {
          this.props.navigation?.navigate('Auth');
        }
        this.setState({ indicator: false });
      });
  }

  delDriver = (value: any) => {
    Api.post('/del-driver', { token: value, id: this.state.user_driver_data.id })
      .then(res => {
        const data = res.data;
        if (data.auth_required == 1) {
          this.props.navigation?.navigate('Auth');
        } else {
          const user_driver_list_new = this.state.user_driver_list.filter(
            driver => driver.id !== this.state.user_driver_data.id
          );
          this.setState({
            modalDelDriverVisible: false,
            modalEditDriverButtonDisabled: true,
            modalEditDriverMode: '',
            modalEditDriverVisible: false,
            user_driver_data: { id: '', vu: '', vu_reg: '', name_f: '', name_i: '', name_o: '' },
            user_driver_list: user_driver_list_new
          });
        }
      })
      .catch(error => {
        console.log('Error deleting driver:', error);
        if (error.response?.status == 401) {
          this.props.navigation?.navigate('Auth');
        }
      });
  }

  checkEditDriverButtonEnabled = () => {
    const modalEditDriverButtonDisabled = !(
      this.state.user_driver_data.vu.match(/^[0-9]{10}$/i) &&
      this.state.user_driver_data.vu_reg.match(/^[0-9]{2}\.[0-9]{2}\.[0-9]{4}$/i) &&
      this.state.user_driver_data.name_f !== '' &&
      this.state.user_driver_data.name_i !== ''
    );

    this.setState({ modalEditDriverButtonDisabled });
  }

  changeValue = (value: string, field: keyof DriverData) => {
    const user_driver_data_new = { ...this.state.user_driver_data };

    if (field === 'vu') {
      if (value.match(/^[0-9]*$/i) && value.length <= 10) {
        user_driver_data_new[field] = value;
      }
    } else if (field === 'vu_reg') {
      let digits = value.replace(/\D/g, '');
      if (digits.length > 8) digits = digits.slice(0, 8);
      
      let formatted = '';
      if (digits.length > 0) formatted += digits.slice(0, 2);
      if (digits.length > 2) formatted += '.' + digits.slice(2, 4);
      if (digits.length > 4) formatted += '.' + digits.slice(4, 8);
      
      user_driver_data_new[field] = formatted;
    } else {
      user_driver_data_new[field] = value;
    }

    this.setState({ user_driver_data: user_driver_data_new }, () => {
      this.checkEditDriverButtonEnabled();
    });
  }

  saveDriver = (value: any) => {
    this.setState({ modalEditDriverButtonDisabled: true });

    console.log('saveDriver. mode =', this.state.modalEditDriverMode);
    console.log('user_driver_data =', this.state.user_driver_data);
    
    Api.post('/edit-driver', {
      token: value,
      user_driver_data: this.state.user_driver_data
    })
      .then(res => {
        const data = res.data;
        if (data.auth_required == 1) {
          this.props.navigation?.navigate('Auth');
        } else {
          AsyncStorage.getItem('token').then((value) => this.getDriverList(value));
          this.setState({
            modalEditDriverVisible: false,
            modalEditDriverButtonDisabled: true,
            modalEditDriverMode: '',
            user_driver_data: { id: '', vu: '', vu_reg: '', name_f: '', name_i: '', name_o: '' }
          });
        }
      })
      .catch(error => {
        console.log('Error saving driver:', error);
        if (error.response?.status == 401) {
          this.props.navigation?.navigate('Auth');
        }
        this.setState({ modalEditDriverButtonDisabled: false });
      });
  }

  openModalEditDriver = (mode: string, item?: DriverData) => {
    if (mode === 'add') {
      this.setState({
        modalEditDriverVisible: true,
        modalEditDriverMode: mode,
        user_driver_data: { id: '', vu: '', vu_reg: '', name_f: '', name_i: '', name_o: '' }
      });
    } else {
      this.setState({
        modalEditDriverVisible: true,
        modalEditDriverMode: mode,
        user_driver_data: item || { id: '', vu: '', vu_reg: '', name_f: '', name_i: '', name_o: '' }
      });
    }
  }

  renderDriverItem = (item: DriverData) => {
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
          borderColor: "#B8B8B8"
        }}
      >
        <View style={{ flex: 5, flexDirection: "column", paddingLeft: 10 }}>
          <Text style={{ fontSize: 16, fontWeight: "bold", color: "#313131" }}>
            {item.name_f} {item.name_i} {item.name_o}
          </Text>
          <Text style={{ fontSize: 14, color: "#656565", marginTop: 5 }}>
            ВУ: {item.vu}
          </Text>
          <Text style={{ fontSize: 14, color: "#656565" }}>
            Дата выдачи: {item.vu_reg}
          </Text>
        </View>
        <View style={{ flex: 1, alignItems: 'flex-end', justifyContent: 'center' }}>
          <TouchableHighlight
            style={{ padding: 10 }}
            activeOpacity={1}
            underlayColor='#EEEEEE'
            onPress={() => this.openModalEditDriver('edit', item)}
          >
            <Image source={require('../../../assets/images/edit_2.png')} />
          </TouchableHighlight>
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
        
        <ScreenHeader 
          title="Водители"
          onBack={() => this.props.navigation?.goBack()}
        />

        <ActivityIndicator size="large" color="#313131" animating={this.state.indicator} />

        {/* Кнопка добавить водителя */}
        <TouchableHighlight
          style={{ paddingLeft: 30, paddingTop: 20 }}
          activeOpacity={1}
          underlayColor='#FFFFFF'
          onPress={() => this.openModalEditDriver('add')}
        >
          <View style={{ alignItems: 'center', flexDirection: 'row' }}>
            <Image source={require('../../../assets/images/add_button_2.png')} />
            <Text style={{ fontSize: 22, color: '#3A3A3A' }}>Добавить</Text>
          </View>
        </TouchableHighlight>

        <ScrollView>
          {this.state.user_driver_list.map((item) => this.renderDriverItem(item))}
        </ScrollView>

        {/* Модалка редактирования/добавления водителя */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={this.state.modalEditDriverVisible}
          onRequestClose={() => this.setState({ modalEditDriverVisible: false })}
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
                backgroundColor: '#FFFFFF',
                borderRadius: 25,
                alignItems: 'stretch',
                justifyContent: 'center',
                borderWidth: 1,
                borderColor: "#B8B8B8",
              }}>
                {/* Заголовок с кнопкой закрытия */}
                <View style={{ flexDirection: "row" }}>
                  <View style={{ flex: 5, alignItems: 'flex-start' }}>
                    <Text style={{ paddingLeft: 16, paddingTop: 26, fontSize: 24, fontWeight: "bold", color: "#313131" }}>
                      Данные водителя
                    </Text>
                  </View>
                  <View style={{ flex: 1, alignItems: 'flex-end' }}>
                    <TouchableHighlight
                      style={{ padding: 30 }}
                      activeOpacity={1}
                      underlayColor='#FFFFFF'
                      onPress={() => this.setState({ modalEditDriverVisible: false })}
                    >
                      <Image source={require('../../../assets/images/xclose_2.png')} />
                    </TouchableHighlight>
                  </View>
                </View>

                {/* Блок с данными ВУ */}
                <View style={{
                  backgroundColor: '#EEEEEE',
                  borderRadius: 25,
                  alignItems: 'stretch',
                  justifyContent: 'center',
                  borderWidth: 1,
                  borderColor: "#B8B8B8",
                  margin: 16,
                }}>
                  <Text style={{ paddingLeft: 16, paddingRight: 16, paddingTop: 24, fontSize: 16, color: "#313131" }}>
                    Номер водительского удостоверения *:
                  </Text>
                  <View style={{ alignItems: 'stretch', paddingTop: 20, paddingLeft: 20, paddingRight: 20 }}>
                    <TextInput
                      keyboardType='numeric'
                      style={{ height: 55, fontSize: 20, paddingLeft: 20, backgroundColor: '#FFFFFF', borderColor: '#656565', borderWidth: 1, borderRadius: 8, color: "#313131" }}
                      maxLength={10}
                      placeholder='0000000000'
                      placeholderTextColor={'#8C8C8C'}
                      onChangeText={(value) => this.changeValue(value, 'vu')}
                      value={this.state.user_driver_data.vu}
                    />
                  </View>

                  <Text style={{ paddingLeft: 16, paddingRight: 16, paddingTop: 24, fontSize: 16, color: "#313131" }}>
                    Дата выдачи водительского удостоверения *:
                  </Text>
                  <View style={{ alignItems: 'stretch', paddingTop: 20, paddingLeft: 20, paddingRight: 20, paddingBottom: 20 }}>
                    <TextInput
                      keyboardType='numeric'
                      style={{ height: 55, fontSize: 20, paddingLeft: 20, backgroundColor: '#FFFFFF', borderColor: '#656565', borderWidth: 1, borderRadius: 8, color: "#313131" }}
                      maxLength={10}
                      placeholder='00.00.0000'
                      placeholderTextColor={'#8C8C8C'}
                      onChangeText={(value) => this.changeValue(value, 'vu_reg')}
                      value={this.state.user_driver_data.vu_reg}
                    />
                  </View>
                </View>

                {/* Блок с ФИО */}
                <View style={{
                  backgroundColor: '#EEEEEE',
                  borderRadius: 25,
                  alignItems: 'stretch',
                  justifyContent: 'center',
                  borderWidth: 1,
                  borderColor: "#B8B8B8",
                  margin: 16,
                }}>
                  <Text style={{ paddingLeft: 16, paddingRight: 16, paddingTop: 24, fontSize: 16, color: "#313131" }}>
                    Владелец:
                  </Text>

                  <View style={{ alignItems: 'stretch', paddingTop: 20, paddingLeft: 20, paddingRight: 20 }}>
                    <TextInput
                      style={{ height: 55, fontSize: 20, paddingLeft: 20, backgroundColor: '#FFFFFF', borderColor: '#656565', borderWidth: 1, borderRadius: 8, color: "#313131" }}
                      placeholder='Фамилия *'
                      placeholderTextColor={'#8C8C8C'}
                      onChangeText={(value) => this.changeValue(value, 'name_f')}
                      value={this.state.user_driver_data.name_f}
                    />
                  </View>

                  <View style={{ alignItems: 'stretch', paddingTop: 20, paddingLeft: 20, paddingRight: 20 }}>
                    <TextInput
                      style={{ height: 55, fontSize: 20, paddingLeft: 20, backgroundColor: '#FFFFFF', borderColor: '#656565', borderWidth: 1, borderRadius: 8, color: "#313131" }}
                      placeholder='Имя *'
                      placeholderTextColor={'#8C8C8C'}
                      onChangeText={(value) => this.changeValue(value, 'name_i')}
                      value={this.state.user_driver_data.name_i}
                    />
                  </View>

                  <View style={{ alignItems: 'stretch', paddingTop: 20, paddingLeft: 20, paddingRight: 20, paddingBottom: 20 }}>
                    <TextInput
                      style={{ height: 55, fontSize: 20, paddingLeft: 20, backgroundColor: '#FFFFFF', borderColor: '#656565', borderWidth: 1, borderRadius: 8, color: "#313131" }}
                      placeholder='Отчество'
                      placeholderTextColor={'#8C8C8C'}
                      onChangeText={(value) => this.changeValue(value, 'name_o')}
                      value={this.state.user_driver_data.name_o}
                    />
                  </View>
                </View>

                {/* Кнопки действий */}
                <View style={{ flexDirection: "row" }}>
                  <View style={{ flex: 1, height: 100, alignItems: 'center', justifyContent: 'center' }}>
                    <TouchableOpacity
                      disabled={this.state.modalEditDriverButtonDisabled}
                      style={{
                        height: 50,
                        margin: 25,
                        borderRadius: 5,
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: this.state.modalEditDriverButtonDisabled ? "#c0c0c0" : "#3A3A3A"
                      }}
                      onPress={() => AsyncStorage.getItem('token').then((value) => this.saveDriver(value))}
                    >
                      <Text style={{ paddingLeft: 20, paddingRight: 20, fontSize: 14, color: "#FFFFFF" }}>
                        {this.state.modalEditDriverMode === 'add' ? 'Добавить' : 'Сохранить'}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {this.state.modalEditDriverMode !== 'add' && (
                    <View style={{ flex: 1, height: 100, alignItems: 'center', justifyContent: 'center' }}>
                      <TouchableOpacity
                        style={{
                          height: 50,
                          margin: 25,
                          borderRadius: 5,
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderWidth: 1,
                          borderColor: "#B8B8B8"
                        }}
                        onPress={() => {
                          this.setState({ modalEditDriverVisible: false, modalDelDriverVisible: true });
                        }}
                      >
                        <Text style={{ paddingLeft: 20, paddingRight: 20, fontSize: 14, color: "#313131" }}>
                          Удалить
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </View>
            </View>
          </ScrollView>
        </Modal>

        {/* Модалка подтверждения удаления */}
        <Modal
          animationType="fade"
          transparent={true}
          visible={this.state.modalDelDriverVisible}
          onRequestClose={() => this.setState({ modalDelDriverVisible: false })}
        >
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <View style={{
              backgroundColor: '#EEEEEE',
              borderRadius: 25,
              padding: 20,
              borderWidth: 1,
              borderColor: "#B8B8B8",
              margin: 20
            }}>
              <Text style={{ fontSize: 20, fontWeight: "bold", color: "#313131", textAlign: 'center' }}>
                Удалить водителя?
              </Text>
              <Text style={{ fontSize: 16, color: "#656565", marginTop: 20, textAlign: 'center' }}>
                {this.state.user_driver_data.name_f} {this.state.user_driver_data.name_i}
              </Text>

              <View style={{ flexDirection: "row", marginTop: 20 }}>
                <View style={{ flex: 1, marginRight: 10 }}>
                  <TouchableHighlight
                    style={{
                      height: 50,
                      borderRadius: 5,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: '#D32F2F'
                    }}
                    onPress={() => AsyncStorage.getItem('token').then((value) => this.delDriver(value))}
                  >
                    <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#FFFFFF' }}>Удалить</Text>
                  </TouchableHighlight>
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <TouchableHighlight
                    style={{
                      height: 50,
                      borderRadius: 5,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: '#FFFFFF',
                      borderWidth: 1,
                      borderColor: '#B8B8B8'
                    }}
                    onPress={() => this.setState({ modalDelDriverVisible: false })}
                  >
                    <Text style={{ fontSize: 14, color: '#313131' }}>Отменить</Text>
                  </TouchableHighlight>
                </View>
              </View>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    );
  }
}

// Wrapper для работы с expo-router
const DriverList = () => {
  const router = useRouter();
  
  return (
    <DriverListClass
      navigation={{
        navigate: (screen: string) => {
          if (screen === 'Auth') {
            router.replace('/');
          }
        },
        goBack: () => router.back()
      }}
    />
  );
};

export default DriverList;
