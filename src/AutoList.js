import React from 'react';
import { Text, View, Image, TouchableOpacity, TouchableHighlight, Modal, TextInput, ImageBackground, ActivityIndicator, FlatList, Pressable, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-community/async-storage';

import styles from './styles/Styles.js';
import Api from "./utils/Api";

class MenuAdd extends React.Component {
  render() {
    return (
        <View style={{ alignItems: 'center', padding: 5 }}>
          <Image source={require('../images/menu_add.png')} />
          <Text style={{ fontSize: 9, color: "#fff" }}>добавить {this.props.str}</Text>
        </View>
    );
  }
}

class MenuDriver extends React.Component {
  render() {
    return (
        <View style={{ alignItems: 'center', padding: 5 }}>
          <Image source={require('../images/menu_driver.png')} />
          <Text style={{ fontSize: 9, color: "#fff" }}>водители</Text>
        </View>
    );
  }
}

class MenuUser extends React.Component {
  render() {
    return (
        <View style={{ alignItems: 'center', padding: 5 }}>
          <Image source={require('../images/menu_user.png')} />
          <Text style={{ fontSize: 9, color: "#fff" }}>профиль</Text>
        </View>
    );
  }
}

class MenuMessenger extends React.Component {
  render() {
    return (
        <View style={{ alignItems: 'center', padding: 5 }}>
          <Image source={require('../images/menu_messenger.png')} />
          <Text style={{ fontSize: 9, color: "#fff" }}>контакты</Text>
        </View>
    );
  }
}

class SelMenuDelItem extends React.Component {
  render() {
    return (
        <View style={{ alignItems: 'center', padding: 5 }}>
          <Image source={require('../images/sel_menu_del_item.png')} />
          <Text style={{ fontSize: 9, color: "#fff" }}>удалить</Text>
        </View>
    );
  }
}

class SelMenuAddDriver extends React.Component {
  render() {
    return (
        <View style={{ alignItems: 'center', padding: 5 }}>
          <Image source={require('../images/sel_menu_add_driver.png')} />
          <Text style={{ fontSize: 9, color: "#fff" }}>назначить</Text>
        </View>
    );
  }
}

class SelMenuPass extends React.Component {
  render() {
    return (
        <View style={{ alignItems: 'center', padding: 5 }}>
          <Image source={require('../images/sel_menu_pass.png')} />
          <Text style={{ fontSize: 9, color: "#fff" }}>пропуск</Text>
        </View>
    );
  }
}

class SelMenuUndoSelect extends React.Component {
  render() {
    return (
        <View style={{ alignItems: 'center', padding: 5 }}>
          <Image source={require('../images/sel_menu_undo_select.png')} />
          <Text style={{ fontSize: 9, color: "#fff" }}>сбросить</Text>
        </View>
    );
  }
}

class AutoList extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      auto_list: [],
      indicator: false,
      marked_cnt: 0,

      modalDelAutoVisible: false,
      modalAddAutoVisible: false,
      modalAddAutoButtonDisabled: true,
      auto_number_base: '',
      auto_number_base_ok: false,
      auto_number_region_code: '',
      auto_number_region_code_ok: false,
      sts: '',
      sts_ok: false,
    };
  }

  /* Назначить водителя */
  AutoDriver = () => {
    console.log('AutoDriver')

    let auto_list_marked = [];
    for (var i=0; i<this.state.auto_list.length; i++)
    {
      if(this.state.auto_list[i].marked)
      {
        auto_list_marked.push(this.state.auto_list[i])
      }
    }

    this.props.navigation.navigate('AutoDriver', { auto_list: auto_list_marked })
  }

  /* сделать пропуск */
  makePass = () => {
    console.log('makePass')

    let auto_list_marked = [];
    for (var i=0; i<this.state.auto_list.length; i++)
    {
      if(this.state.auto_list[i].marked)
      {
        auto_list_marked.push(this.state.auto_list[i])
      }
    }

    this.props.navigation.navigate('Pass', { auto_list: auto_list_marked })
  }

  /* отмена выделения */
  undoSelect = () => {
    console.log('undoSelect')

    let auto_list_new = [];
    for (var i=0; i<this.state.auto_list.length; i++)
    {
      this.state.auto_list[i].marked = false
      auto_list_new.push(this.state.auto_list[i])
    }

    this.setState({auto_list: auto_list_new, marked_cnt: 0})
  }

  /* удаление авто */
  delAuto = (value) => {
    console.log('delAuto. value = ' + value)

    let auto_list_new = [];
    let ids = [];
    for (var i=0; i<this.state.auto_list.length; i++)
    {
      if(this.state.auto_list[i].marked)
      {
        ids.push(this.state.auto_list[i].id)
      }
      else
      {
        auto_list_new.push(this.state.auto_list[i])
      }
    }

    if(ids.length)
    {
      Api.post('/del-auto', { token: value, ids: ids.join(',') })
         .then(res => {

            const data = res.data;
            console.log(data);

            if(data.auth_required == 1)
            {
              this.props.navigation.navigate('Auth')
            }
            else
            {
              this.setState({auto_list: auto_list_new, marked_cnt: 0 })
            }
          })
          .catch(error => {
            console.log('error.response.status = ' + error.response.status);
            if(error.response.status == 401) { this.props.navigation.navigate('Auth') }
          });
    }

    this.setState({modalDelAutoVisible: false})
  }

  /* добавление авто */
  getStsByAutoNumber = (value, auto_number) => {
    console.log('getStsByAutoNumber. value = ' + value + ', auto_number = ' + auto_number)

    Api.post('/get-sts-by-auto-number', { token: value, auto_number: auto_number })
       .then(res => {

          const data = res.data;
          console.log(data);

          if(data.auth_required == 1)
          {
            this.props.navigation.navigate('Auth')
          }
          else
          {
            if(data.sts != '' && this.state.sts.length == 0)
            {
              this.setState({sts: data.sts, sts_ok: true })

              if(this.state.auto_number_base_ok && this.state.auto_number_region_code_ok)
              {
                this.setState({modalAddAutoButtonDisabled: false })
              }
            }
          }

        })
        .catch(error => {
          console.log('error.response.status = ' + error.response.status);
          console.log('error.response');
          console.log(error.response);
          if(error.response.status == 401) { this.props.navigation.navigate('Auth') }
        });
  }

  checkAddAutoEnabled = () => {
    console.log('checkEnabled')

    if(this.state.auto_number_base_ok && this.state.auto_number_region_code_ok && this.state.sts.length == 0)
    {
      console.log('getStsByAutoNumber')

      AsyncStorage.getItem('token').then((value) => this.getStsByAutoNumber(value, this.state.auto_number_base + this.state.auto_number_region_code));

    }

    this.setState({modalAddAutoButtonDisabled: this.state.auto_number_base_ok &&
                                               this.state.auto_number_region_code_ok &&
                                               this.state.sts_ok ? false : true})
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

  changeSts = (value) => {
    console.log('changeSts. value = ' + value)

    if(value.match(/^[АВЕКМНОРСТУХABEKMHOPCTYX0-9]*$/i))
    {
      this.setState({sts: value})
    }

    this.setState({sts_ok: value.length == 10 ? true : false}, () => this.checkAddAutoEnabled())
  };

  setAddAutoButtonStyle = () => {
    let backgroundColor = this.state.modalAddAutoButtonDisabled ? "#c0c0c0" : "#FEE600";
    return { height: 50, fontSize: 10, margin: 25, borderRadius: 5, alignItems: 'center', justifyContent: 'center', backgroundColor: backgroundColor }
  }

  setAddAutoButtonTextStyle = () => {
    let color = this.state.modalAddAutoButtonDisabled ? "#E8E8E8" : "#2B2D33";
    return { paddingLeft: 20, paddingRight: 20, fontSize: 14, color: color }
  }

  modalAddAutoCancel = () => {
    console.log('modalAddAutoCancel')

    this.setState({ modalAddAutoVisible: false,
                    auto_number_base: '',
                    auto_number_base_ok: false,
                    auto_number_region_code: '',
                    auto_number_region_code_ok: false,
                    sts: '',
                    sts_ok: false })
  }

  addAuto = (value) => {
    console.log('addAuto. value = ' + value)

    Api.post('/add-auto', { token: value,
                            auto_number_base: this.state.auto_number_base,
                            auto_number_region_code: this.state.auto_number_region_code,
                            sts: this.state.sts })
       .then(res => {

          const data = res.data;
          console.log(data);

          if(data.auth_required == 1)
          {
            this.props.navigation.navigate('Auth')
          }
          else
          {
            this.setState({ modalAddAutoVisible: false,
                            auto_number_base: '',
                            auto_number_base_ok: false,
                            auto_number_region_code: '',
                            auto_number_region_code_ok: false,
                            sts: '',
                            sts_ok: false })

            let auto_list_new = this.state.auto_list
                auto_list_new.push(data.auto_data)

            //AsyncStorage.getItem('token').then((value) => this.getAutoListCheckPasses(value, data.auto_data.id));

            this.setState({auto_list: auto_list_new})

            let _id = data.auto_data.id;
            AsyncStorage.getItem('token').then((value) => this.getAutoCheckPasses(value, _id));
            AsyncStorage.getItem('token').then((value) => this.getAutoCheckFines(value, _id));
            AsyncStorage.getItem('token').then((value) => this.getAutoCheckDiagnosticCard(value, _id));
            AsyncStorage.getItem('token').then((value) => this.getAutoCheckOsago(value, _id));
          }

        })
        .catch(error => {
          console.log('error.response.status = ' + error.response.status);
          if(error.response.status == 401) { this.props.navigation.navigate('Auth') }
        });
  }

  /* список авто */
  setItemStyle = (index) => {
    let color = this.state.auto_list[index].marked == 1 ? "#4C4C4C" : "#2C2C2C";
    return { flexDirection: "row", margin: 20, padding: 10, backgroundColor: color, borderRadius: 8 }
  }

  markItem = (item, index) => {
    console.log('markItem. item = ')
    console.log(item)
    console.log('index = ' + index)

    let item_new = item
        item_new.marked = !item_new.marked

    let auto_list_new = this.state.auto_list
        auto_list_new.splice(index, 1, item_new)

    let marked_cnt = item_new.marked ? this.state.marked_cnt + 1 : this.state.marked_cnt - 1

    this.setState({marked_cnt: marked_cnt})
    this.setState({auto_list: auto_list_new})
  };


  /* */
  getAutoList = (value) => {
    console.log('getAutoList. value = ' + value)

    if(!value)
    {
      console.log('null')

      this.props.navigation.navigate('Auth')
    }

    else
    {
      this.setState({indicator: true})

      Api.post('/get-auto-list', { token: value })
         .then(res => {

            const data = res.data;
            console.log(data);

            this.setState({indicator: false})

            if(data.auto_list.length == 0)
            {
              this.setState({modalAddAutoVisible: true})
            }
            else
            {
              for (var i=0; i<data.auto_list.length; i++)
              {
                if(data.auto_list[i].check_passes_expared == 1)
                {
                  let _id = data.auto_list[i].id;
                  AsyncStorage.getItem('token').then((value) => this.getAutoCheckPasses(value, _id));
                }
                if(data.auto_list[i].check_fines_expared == 1)
                {
                  let _id = data.auto_list[i].id;
                  AsyncStorage.getItem('token').then((value) => this.getAutoCheckFines(value, _id));
                }
                if(data.auto_list[i].check_diagnostic_card_expared == 1)
                {
                  let _id = data.auto_list[i].id;
                  AsyncStorage.getItem('token').then((value) => this.getAutoCheckDiagnosticCard(value, _id));
                }
                if(data.auto_list[i].check_osago_expared == 1)
                {
                  let _id = data.auto_list[i].id;
                  AsyncStorage.getItem('token').then((value) => this.getAutoCheckOsago(value, _id));
                }
              }

              //
              this.setState({auto_list: data.auto_list})
            }
          })
          .catch(error => {
            console.log('error.response.status = ' + error.response.status);
            if(error.response.status == 401) { this.props.navigation.navigate('Auth') }
          });
    }
  }

  /* */
  getAutoCheckPasses = (value, id) => {
    console.log('getAutoCheckPasses. value = ' + value + ' | id = ' + id)

    if(!value)
    {
      console.log('null')
      this.props.navigation.navigate('Auth')
    }

    else
    {
      Api.post('/get-auto-check-passes', { token: value, id : id })
         .then(res => {

            const data = res.data;
            console.log(data);

            let auto_list_new = this.state.auto_list

            for (var i=0; i<auto_list_new.length; i++)
            {
              if(auto_list_new[i].id == id)
              {
                auto_list_new[i].check_passes_string = data.check_passes_string
                auto_list_new[i].check_passes_expared = 0
              }
            }

            this.setState({auto_list: auto_list_new})
          })
          .catch(error => {
            console.log('error.response.status = ' + error.response.status);
            if(error.response.status == 401) { this.props.navigation.navigate('Auth') }
          });
    }
  }

  /* */
  getAutoCheckFines = (value, id) => {
    console.log('getAutoCheckFines. value = ' + value + ' | id = ' + id)

    if(!value)
    {
      console.log('null')
      this.props.navigation.navigate('Auth')
    }

    else
    {

      Api.post('/get-auto-check-fines', { token: value, id : id })
         .then(res => {

            const data = res.data;
            console.log('data')
            console.log(data);

            let auto_list_new = this.state.auto_list

            for (var i=0; i<auto_list_new.length; i++)
            {
              if(auto_list_new[i].id == id)
              {
                auto_list_new[i].check_fines_string = data.check_fines_string
                auto_list_new[i].check_fines_expared = 0
              }
            }

            this.setState({auto_list: auto_list_new})
          })
          .catch(error => {
            console.log('error.response.status = ' + error.response.status);
            if(error.response.status == 401) { this.props.navigation.navigate('Auth') }
          });

    }
  }

  /* */
  getAutoCheckDiagnosticCard = (value, id) => {
    console.log('getAutoCheckDiagnosticCard. value = ' + value + ' | id = ' + id)

    if(!value)
    {
      console.log('null')
      this.props.navigation.navigate('Auth')
    }

    else
    {
      Api.post('/get-auto-check-diagnostic-card', { token: value, id : id })
         .then(res => {

            const data = res.data;
            console.log('data')
            console.log(data);

            let auto_list_new = this.state.auto_list

            for (var i=0; i<auto_list_new.length; i++)
            {
              if(auto_list_new[i].id == id)
              {
                auto_list_new[i].check_diagnostic_card_string = data.check_diagnostic_card_string
                auto_list_new[i].check_diagnostic_card_expared = 0
              }
            }

            this.setState({auto_list: auto_list_new})
          })
          .catch(error => {
            console.log('error.response.status = ' + error.response.status);
            if(error.response.status == 401) { this.props.navigation.navigate('Auth') }
          });


    }
  }

  /* */
  getAutoCheckOsago = (value, id) => {
    console.log('getAutoCheckOsago. value = ' + value + ' | id = ' + id)

    if(!value)
    {
      console.log('null')
      this.props.navigation.navigate('Auth')
    }

    else
    {
      Api.post('/get-auto-check-osago', { token: value, id : id })
         .then(res => {

            const data = res.data;
            console.log('data')
            console.log(data);

            let auto_list_new = this.state.auto_list

            for (var i=0; i<auto_list_new.length; i++)
            {
              if(auto_list_new[i].id == id)
              {
                auto_list_new[i].check_osago_string = data.check_osago_string
                auto_list_new[i].check_osago_expared = 0
              }
            }

            this.setState({auto_list: auto_list_new})
          })
          .catch(error => {
            console.log('error.response.status = ' + error.response.status);
            if(error.response.status == 401) { this.props.navigation.navigate('Auth') }
          });
    }
  }

  screenFocus = () => {
    console.log('AutoList screenFocus')

    this.setState({marked_cnt: 0})

    AsyncStorage.getItem('token').then((value) => this.getAutoList(value));
  }


  componentDidMount() {
    console.log('AutoList DidMount')

    this.props.navigation.addListener('focus', () => this.screenFocus())
    this.props.navigation.addListener('beforeRemove', () => { console.log('AutoList screenBeforeRemove'); return; })

    //AsyncStorage.getItem('token').then((value) => this.getAutoList(value));
  }

  /* */

  renderItem = ({item, index}) => {

    //console.log('renderItem')
    //console.log({item})
    //console.log('item.id = ' + item.id + ' | index = ' + index)

    return (

      <Pressable
        onPress={() => this.markItem(item, index)}
      >
        <View style={this.setItemStyle(index)}>
          <View style={{
            flex: 3,
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: "column",
          }}>
            <Image source={require('../images/truck.png')} style={styles.auto}/>
            <View style={{
              flexDirection: "row",
              justifyContent: 'flex-end',
            }}>
              <Text style={{ fontSize: 14, color: "#C9A86B" }}>{item.auto_number_base}</Text>
              <Image source={require('../images/line_11.png')} style={{ marginLeft: 5, marginRight: 5, marginTop: 10 }}/>
              <View style={{
                flexDirection: "column",
              }}>
                <Text style={{ fontSize: 12, color: "#C9A86B" }}>{item.auto_number_region_code}</Text>
                <View style={{
                  flexDirection: "row",
                }}>
                  <Text style={{ fontSize: 10, color: "#C9A86B" }}>RUS</Text>
                  <Image source={require('../images/flag_rus.png')} style={{ width: 12, height: 8, }}/>
                </View>
              </View>
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
              { item.check_passes_expared == 1 ? ( <Text style={{ color: "#E8E8E8"}}>Пропуск - проверяем </Text> ) : null }
              { item.check_passes_expared == 1 ? ( <ActivityIndicator size="small" color="#C9A86B" animating={true}/> ) : null }
              { item.check_passes_expared != 1 ? ( <Text style={{ color: "#E8E8E8"}}>Пропуск - {item.check_passes_string}</Text> ) : null }
            </View>

            <View style={{
              flexDirection: "row",
            }}>
              { item.check_fines_expared == 1 ? ( <Text style={{ color: "#E8E8E8"}}>Штрафы - проверяем </Text> ) : null }
              { item.check_fines_expared == 1 ? ( <ActivityIndicator size="small" color="#C9A86B" animating={true}/> ) : null }
              { item.check_fines_expared != 1 ? ( <Text style={{ color: "#E8E8E8"}}>Штрафы - {item.check_fines_string}</Text> ) : null }
            </View>

            <View style={{
              flexDirection: "row",
            }}>
              { item.check_diagnostic_card_expared == 1 ? ( <Text style={{ color: "#E8E8E8"}}>ДК - проверяем </Text> ) : null }
              { item.check_diagnostic_card_expared == 1 ? ( <ActivityIndicator size="small" color="#C9A86B" animating={true}/> ) : null }
              { item.check_diagnostic_card_expared != 1 ? ( <Text style={{ color: "#E8E8E8"}}>ДК - {item.check_diagnostic_card_string}</Text> ) : null }
            </View>

            <View style={{
              flexDirection: "row",
            }}>
              { item.check_osago_expared == 1 ? ( <Text style={{ color: "#E8E8E8"}}>ОСАГО - проверяем </Text> ) : null }
              { item.check_osago_expared == 1 ? ( <ActivityIndicator size="small" color="#C9A86B" animating={true}/> ) : null }
              { item.check_osago_expared != 1 ? ( <Text style={{ color: "#E8E8E8"}}>ОСАГО - {item.check_osago_string}</Text> ) : null }
            </View>

          </View>
          <View style={{
            flex: 1,
            alignItems: 'flex-end',
            justifyContent: 'flex-end',
          }}>
            <TouchableHighlight
              style={{ paddingTop: 20, paddingLeft: 20, alignItems: 'flex-end', justifyContent: 'flex-end' }}
              onPress={() => {
                console.log('-> move to Auto')
                this.props.navigation.navigate('Auto', { auto_data: item })
            }}>
              <Image source={require('../images/emojione-v1_right-arrow.png')}/>
            </TouchableHighlight>
          </View>
        </View>
      </Pressable>
    );
  }

  render() {
    return (

      <View style={styles.container}>

        <Text style={styles.header}>Мой автопарк</Text>

        {/*
        <TouchableHighlight
          style={styles.header_back}
          onPress={() => {
            console.log('-> move to Main')
            this.props.navigation.navigate('Main')
          }}>
          <Image source={require('../images/back.png')} />
        </TouchableHighlight>
        */}

        {/* модальное окно подтверждения удаления авто */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={this.state.modalDelAutoVisible}
          onRequestClose={() => {
            //Alert.alert("Modal has been closed.");
            this.setState({modalDelAutoVisible: false})
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

              <Text style={{ paddingLeft: 16, paddingRight: 16, paddingTop: 24, fontSize: 16, fontWeight: "normal", color: "#4C4C4C" }}>Удалить {this.state.marked_cnt} авто? Действие нельзя будет отменить</Text>

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
                    //flex: 1,
                    height: 100,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <TouchableOpacity
                      style={{ height: 50, fontSize: 10, margin: 25, borderRadius: 5, alignItems: 'center', justifyContent: 'center', backgroundColor: "#FEE600" }}
                      onPress={() =>  {
                        console.log('call del_auto')
                        AsyncStorage.getItem('token').then((value) => this.delAuto(value));
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
                      onPress={() =>  { this.setState({modalDelAutoVisible: false}) }}>
                      <Text style={{ paddingLeft: 20, paddingRight: 20, fontSize: 14, color: "#E8E8E8" }}>Отменить</Text>
                    </TouchableOpacity>
                  </View>
                </View>


              </View>
            </View>
          </View>
        </Modal>

        {/* модальное окно добавления авто */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={this.state.modalAddAutoVisible}
          onRequestClose={() => {
            //Alert.alert("Modal has been closed.");
            this.setState({modalAddAutoVisible: false})
          }}
        >
          <ScrollView>
            <View style={{
              flex: 1,
              alignItems: 'center',
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
                    <Text style={{ paddingLeft: 16, paddingTop: 16, fontSize: 24, fontWeight: "normal", color: "#E8E8E8" }}>Добавить авто</Text>
                  </View>
                  <View style={{
                    flex: 1,
                    alignItems: 'flex-end',
                  }}>
                    <TouchableHighlight
                      style={{ padding: 30 }}
                      onPress={() => this.modalAddAutoCancel()}>
                      <Image source={require('../images/xclose.png')} />
                    </TouchableHighlight>
                  </View>
                </View>

                <Text style={{ paddingLeft: 16, paddingRight: 16, paddingTop: 24, fontSize: 16, fontWeight: "normal", color: "#4C4C4C" }}>Добавьте данные автомобиля и Вы сможете проверить сроки действия пропусков, полиса ОСАГО, диагностической карты, наличие штрафов, а также подать заявку на получение пропуска:</Text>

                <View style={{
                  //flex: 1,
                  //backgroundColor: 'grey',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>

                  <View style={{
                    backgroundColor: '#4C4C4C',
                    borderRadius: 25,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginTop: 24,
                    paddingTop: 24,
                    paddingBottom: 24,
                    paddingLeft: 10,
                    paddingRight: 10,
                    alignItems: 'flex-start',
                  }}>
                    <Text style={{ fontSize: 12, fontWeight: "normal", color: "#E8E8E8" }}>Государственный регистрационный знак:</Text>
                    <View style={{
                      alignItems: 'center',
                      paddingTop: 20,
                    }}>
                      <View style={{
                        flexDirection: "row",
                        width: 305,
                        height: 80,
                      }}>
                        <View style={{
                          flex: 188,
                          backgroundColor: '#E8E8E8',
                          height: 80,
                          borderBottomLeftRadius: 8,
                          borderTopLeftRadius: 8,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}>
                          <TextInput
                            style={{ paddingTop: 5, fontSize: 34 }}
                            maxLength={6}
                            placeholder = 'А000АА'
                            onChangeText={this.changeAutoNumberBase}
                            value={this.state.auto_number_base}
                          />
                        </View>
                        <View style={{
                          flex: 3,
                          backgroundColor: '#2c2c2c',
                          height: 80,
                        }}>
                        </View>
                        <View style={{
                          flex: 114,
                          flexDirection: "column",
                          backgroundColor: '#E8E8E8',
                          height: 80,
                          borderBottomRightRadius: 8,
                          borderTopRightRadius: 8,
                          alignItems: 'center',
                        }}>
                          <TextInput
                            keyboardType='numeric'
                            style={{ paddingBottom: -10, height: 55, fontSize: 34 }}
                            maxLength={3}
                            placeholder = '777'
                            onChangeText={this.changeAutoNumberRegionCode}
                            value={this.state.auto_number_region_code}
                          />
                          <View style={{
                            flexDirection: "row",
                            alignItems: 'center',
                            justifyContent: 'center',
                            height: 25,
                          }}>
                            <Text style={{ paddingRight: 5, fontSize: 16, color: "#2c2c2c" }}>RUS</Text>
                            <Image source={require('../images/flag_rus.png')} style={{ width: 24, height: 12 }}/>
                          </View>
                        </View>
                      </View>
                    </View>
                  </View>

                  <View style={{
                    backgroundColor: '#4C4C4C',
                    borderRadius: 25,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginTop: 24,
                    paddingTop: 24,
                    paddingBottom: 24,
                    paddingLeft: 10,
                    paddingRight: 10,
                    alignItems: 'flex-start',
                  }}>
                    <Text style={{ fontSize: 12, fontWeight: "normal", color: "#E8E8E8" }}>Свидетельство о регистрации ТС:</Text>
                    <View style={{
                      alignItems: 'center',
                      paddingTop: 20,
                    }}>
                      <View style={{
                        width: 305,
                        height: 80,
                        justifyContent: 'center',
                      }}>
                        <ImageBackground source={require('../images/scale_2400_1.png')} resizeMode="cover" style={{ width: 305, height: 80, alignItems: 'center', justifyContent: 'center' }}>
                          <TextInput
                            style={{ paddingTop: 5, fontSize: 37 }}
                            maxLength={10}
                            placeholder = '0000000000'
                            placeholderTextColor={'#E8E8E8'}
                            onChangeText={this.changeSts}
                            value={this.state.sts}
                          />
                        </ImageBackground>
                      </View>
                    </View>
                  </View>

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
                        disabled={this.state.modalAddAutoButtonDisabled}
                        style={this.setAddAutoButtonStyle()}
                        onPress={() => {
                            console.log('call add_auto')
                            AsyncStorage.getItem('token').then((value) => this.addAuto(value));
                          }
                        }
                      >
                        <Text style={this.setAddAutoButtonTextStyle()}>Добавить авто</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                </View>
              </View>
            </View>
          </ScrollView>
        </Modal>

        {/* список авто */}
        <ActivityIndicator size="large" color="#C9A86B" animating={this.state.indicator}/>

        <FlatList
          data={this.state.auto_list}
          initialNumToRender={10}
          renderItem={({item, index}) => this.renderItem({item, index})}
//          ListHeaderComponent={() => (!this.state.auto_list.length?
//                                      <Text style={{ paddingLeft: 20, paddingTop: 11, fontSize: 15, fontWeight: "bold", color: "#E8E8E8" }}>Список пуст</Text>
//                                      : null)}
          keyExtractor={item => item.id}
        />

        {/* нижнее меню / нижнее меню при выделенных item */}
        {
          !this.state.marked_cnt ? (

            <View style={{
              flexDirection: "row",
              backgroundColor: '#4C4C4C',
              borderRadius: 25,
              height: 80,
            }}>
              <View style={{
                flex: 1,
                height: 80,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <TouchableHighlight
                  onPress={() => this.setState({ modalAddAutoVisible: true }) }
                  >
                  <MenuAdd />
                </TouchableHighlight>
              </View>
              <View style={{
                flex: 1,
                height: 80,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <TouchableHighlight
                  onPress={() => {
                    console.log('-> menu driver')
                    this.props.navigation.navigate('DriverList')
                  }}
                  >
                  <MenuDriver />
                </TouchableHighlight>
              </View>
              <View style={{
                flex: 1,
                height: 80,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <TouchableHighlight
                  onPress={() => {
                    console.log('-> move to user')
                    this.props.navigation.navigate('User')
                  }}>
                  <MenuUser />
                </TouchableHighlight>
              </View>
              <View style={{
                flex: 1,
                height: 80,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <TouchableHighlight
                  onPress={() => {
                    console.log('-> menu messenger')
                    this.props.navigation.navigate('AutoAdd')
                  }}>
                  <MenuMessenger />
                </TouchableHighlight>
              </View>
            </View>

          ) : (

            <View style={{
              flexDirection: "row",
              backgroundColor: '#4C4C4C',
              borderRadius: 25,
              height: 80,
            }}>
              <View style={{
                flex: 1,
                height: 80,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <TouchableHighlight
                  onPress={() => {
                    console.log('-> sel menu del item')
                    this.setState({modalDelAutoVisible: true})
                  }}>
                  <SelMenuDelItem />
                </TouchableHighlight>
              </View>
              <View style={{
                flex: 1,
                height: 80,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <TouchableHighlight
                  onPress={() => {
                    console.log('-> sel menu add driver')
                    this.AutoDriver()
                  }}>
                  <SelMenuAddDriver />
                </TouchableHighlight>
              </View>
              <View style={{
                flex: 1,
                height: 80,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <TouchableHighlight
                  onPress={() => {
                    console.log('-> sel menu pass')
                    this.makePass()
                  }}>
                  <SelMenuPass />
                </TouchableHighlight>
              </View>
              <View style={{
                flex: 1,
                height: 80,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <TouchableHighlight
                  onPress={() => {
                    console.log('-> sel menu undo select')
                    this.undoSelect()
                  }}>
                  <SelMenuUndoSelect />
                </TouchableHighlight>
              </View>

            </View>

          )
        }

      </View>
    );
  }
}

export default AutoList;
