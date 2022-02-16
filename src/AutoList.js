import React from 'react';
import { Linking, Text, View, Image, TouchableOpacity, TouchableHighlight, Modal, TextInput, ImageBackground, ActivityIndicator, FlatList, Pressable, ScrollView } from 'react-native';
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

class MenuContacts extends React.Component {
  render() {
    return (
        <View style={{ alignItems: 'center', padding: 5 }}>
          <Image source={require('../images/menu_contacts.png')} />
          <Text style={{ fontSize: 9, color: "#fff" }}>контакты</Text>
        </View>
    );
  }
}

class MenuSelContacts extends React.Component {
  render() {
    return (
        <View style={{ alignItems: 'center', padding: 5 }}>
          <Image source={require('../images/sel_menu_contacts.png')} />
          <Text style={{ fontSize: 9, color: "#fff" }}>контакты</Text>
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

class MenuUserList extends React.Component {
  render() {
    return (
        <View style={{ alignItems: 'center', padding: 5 }}>
          <Image source={require('../images/menu_user_list.png')} />
          <Text style={{ fontSize: 9, color: "#fff" }}>организации</Text>
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
      manager_name: '',
      tech_support_name: '',

      manager_data: {},
      user_data: {},
      user_str: '',
      user_list: [],

      auto_str: '',
      auto_list: [],
      indicator: false,
      marked_cnt: 0,

      user_edit_data: { id: '', firm: '', inn: '', phone: '' },
      editUserButtonDisabled: true,
      editUserMode: '',
      editUserMsg: '',
      editUserVisible: false,

      modalViewContacts: false,
      findAutoVisible: false,
      modalSelectUserVisible: false,
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

  /* */
  contactEmail = (email, subject, body) => {
    console.log('contactEmail. email = ' + email)

    let emailStr = 'mailto:' + email + '?subject=' + subject + '&body=' + body

    Linking.openURL(emailStr);
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

  contactWhatsapp = (phone, greetings) => {
    console.log('contactWhatsapp. phone = ' + phone)

    let phoneStr ='whatsapp://send?text=' + greetings + '&phone=' + phone

    Linking.openURL(phoneStr);
  }

  /* открыть контакты */
  openContacts = () => {
    console.log('openContacts')

    console.log('this.state.user_data')
    console.log(this.state.user_data)

    this.setState({ modalViewContacts: !this.state.modalViewContacts,
                    manager_name: this.state.user_data.manager_data.name,
                    tech_support_name: this.state.user_data.tech_support_data.name })
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

  /* добавление/редактирование клиента ( режим менеджера ) */
  changeEditUserValue = (value, field) => {
    console.log('changeEditUserValue. field = ' + field + ' | value = ' + value)

    let user_edit_data_new = this.state.user_edit_data

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
      user_edit_data_new[field] = value
    }
    else
    {
      user_edit_data_new[field] = value
    }

    //
    if(user_edit_data_new['firm'] != '' &&
       user_edit_data_new['inn'].match(/^(\d{10})$|^(\d{12})$/) &&
       user_edit_data_new['phone'].match(/\+7(\d{10})/) )
    {
      this.setState({editUserButtonDisabled: false})
    }
    else
    {
      this.setState({editUserButtonDisabled: true})
    }

    this.setState({user_edit_data: user_edit_data_new})
  };

  /* изменение стилей кнопки редактирования клиента ( режим менеджера ) */
  setEditUserButtonStyle = () => {
    let backgroundColor = this.state.editUserButtonDisabled ? "#c0c0c0" : "#FEE600";
    return { height: 50, fontSize: 10, margin: 25, borderRadius: 5, alignItems: 'center', justifyContent: 'center', backgroundColor: backgroundColor }
  }

  setEditUserButtonTextStyle = () => {
    let color = this.state.editUserButtonDisabled ? "#E8E8E8" : "#2B2D33";
    return { paddingLeft: 20, paddingRight: 20, fontSize: 14, color: color }
  }

  /* добавление/редактирование клиента ( режим менеджера ) */
  editUser = (value) => {
    console.log('editUser. value = ' + value)

    console.log('this.state.user_edit_data = ')
    console.log(this.state.user_edit_data)

    let phone = this.state.user_edit_data.phone
        phone = phone.replace(/\+/, '')
    console.log('phone = ' + phone)

    Api.post('/edit-user-by-manager', { token: value, inn: this.state.user_edit_data.inn, firm: this.state.user_edit_data.firm, phone: phone })
       .then(res => {

          const data = res.data;
          console.log(data);

          if(data.auth_required == 1)
          {
            this.props.navigation.navigate('Auth')
          }
          else
          {
            if(data.error == 1)
            {
              this.setState({editUserMsg: data.msg})
            }

            else
            {
              AsyncStorage.getItem('token').then((token) => {

                Api.post('/auth-as-user', { token: token, inn: this.state.user_edit_data.inn })
                   .then(res => {

                      const data = res.data;
                      console.log('data')
                      console.log(data);

                      this.setState({ modalSelectUserVisible: false, user_str: '' }, () => this.screenFocus())
                      //this.setState({ modalSelectUserVisible: false, user_str: '' })
                    })
                    .catch(error => {
                      console.log('error.response.status = ' + error.response.status);
                      if(error.response.status == 401) { this.props.navigation.navigate('Auth') }
                    });
              });
            }

          }
        })
        .catch(error => {
          console.log('error.response.status = ' + error.response.status);
          if(error.response.status == 401) { this.props.navigation.navigate('Auth') }
        });
  }

  /* ввод по клиенту ( режим менеджера ) */
  changeUserStr = (value) => {
    console.log('changeUserStr. value = ' + value)

    if(value.length >= 3 || value.length == 0)
    {
      this.setState({user_str: value}, () => this.findUser())
    }
    else
    {
      this.setState({user_str: value})
    }
  }

  /* очистить поисковую строку ( режим менеджера ) */
  clearUserStr = () => {
    console.log('clearUserStr')

    this.setState({user_str: ''}, () => this.findUser())
  }

  /* поиск клиента ( режим менеджера ) */
  findUser = () => {
    console.log('findUser')

    AsyncStorage.getItem('token').then((value) => this.getUserList(value))
  }

  /* закрыть модальное окно выбора клиента ( режим менеджера ) */
  modalSelectUserCancel = () => {
    console.log('modalSelectUserCancel')

    this.setState({ modalSelectUserVisible: false, editUserVisible: false })
  }

  /* авторизуемся как клиент ( режим менеджера ) */
  authAsUser = (item, index) => {
    console.log('authAsUser. item = ')
    console.log(item)
    console.log('index = ' + index)

    AsyncStorage.getItem('token').then((token) => {

      Api.post('/auth-as-user', { token: token, inn: item.inn })
         .then(res => {

            const data = res.data;
            console.log('data')
            console.log(data);

            this.setState({ modalSelectUserVisible: false, user_str: '' }, () => this.screenFocus())
            //this.setState({ modalSelectUserVisible: false, user_str: '' })
          })
          .catch(error => {
            console.log('error.response.status = ' + error.response.status);
            if(error.response.status == 401) { this.props.navigation.navigate('Auth') }
          });
    });
  };

  /* */
  getUserList = (value) => {
    console.log('getUserList. value = ' + value)

    if(!value)
    {
      console.log('null')
      this.props.navigation.navigate('Auth')
    }

    else
    {
      Api.post('/get-user-list', { token: value, user_str: this.state.user_str })
         .then(res => {

            const data = res.data;
            console.log('data')
            console.log(data);

            this.setState({user_list: data.user_list})

          })
          .catch(error => {
            console.log('error.response.status = ' + error.response.status);
            if(error.response.status == 401) { this.props.navigation.navigate('Auth') }
          });
    }
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

  /* фильтр по номеру авто */
  changeAutoStr = (value) => {
    console.log('changeAutoStr. value = ' + value)

    if(value.length >= 3 || value.length == 0)
    {
      this.setState({auto_str: value}, () => this.findAuto())
    }
    else
    {
      this.setState({auto_str: value})
    }
  }

  clearAutoStr = () => {
    console.log('clearAutoStr')

    this.setState({auto_str: ''}, () => this.findAuto())
  }

  /* поиск по номеру авто */
  findAuto = () => {
    console.log('findAuto')

    AsyncStorage.getItem('token').then((value) => this.getAutoList(value))
  }

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

      Api.post('/get-auto-list', { token: value, auto_str: this.state.auto_str })
         .then(res => {

            const data = res.data;
            console.log(data);

            //
            this.setState({indicator: false})

            if(typeof(data.user_data) != 'undefined')
            {
              console.log('typeof(data.user_data) = ' + typeof(data.user_data))
              this.setState({user_data: data.user_data})
            }

            if(typeof(data.manager_data) != 'undefined')
            {
              console.log('typeof(data.manager_data) = ' + typeof(data.manager_data))
              this.setState({manager_data: data.manager_data})
            }

            //
            if(data.auto_list.length == 0)
            {
              console.log('data.auto_list.length = ' + data.auto_list.length)
              if(typeof(data.manager_data) != 'undefined' && typeof(data.user_data) == 'undefined')
              {
                this.setState({modalSelectUserVisible: true})
                AsyncStorage.getItem('token').then((value) => this.getUserList(value));
              }
              else if(typeof(data.manager_data) == 'undefined')
              {
                this.setState({modalAddAutoVisible: true})
              }
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
  renderUserItem = (item, index) => {

    return (

      <Pressable
        key={item.id}
        onPress={() => this.authAsUser(item, index)}
      >
        <View style={{ flexDirection: "row", marginLeft: 20, marginRight: 20, marginBottom: 20, padding: 10, backgroundColor: "#2C2C2C", borderRadius: 8 }}>
          <View style={{
            flex: 1,
            flexDirection: "column",
          }}>
            <Text style={{ fontSize: 17, color: "#E8E8E8"}}>{ item.firm }</Text>
            <Text style={{ fontSize: 15, color: "#AAABAD"}}>{ item.inn }</Text>
          </View>
        </View>
      </Pressable>
    );

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

        { Object.keys(this.state.user_data).length != 0 ? ( <Text style={styles.header}>Мой автопарк</Text> ) : null }
        { Object.keys(this.state.user_data).length != 0 && Object.keys(this.state.manager_data).length != 0 ? (
          <Text style={styles.sub_header}>{this.state.user_data.firm}{"\n"}инн:{this.state.user_data.inn}</Text>
        ) : null }

        { this.state.auto_list.length != 0 ? (
            <TouchableHighlight
              style={styles.header_back}
              onPress={() => {
                console.log('find auto')
                this.setState({findAutoVisible: !this.state.findAutoVisible})
              }}>
              { this.state.findAutoVisible ? (
                  <Image source={require('../images/filter_open.png')} />
                ) : (
                  <Image source={require('../images/filter.png')} />
                )
              }
            </TouchableHighlight>
          ) : null
        }

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

        {/* модальное окно выбора клиента ( режим менеджера ) */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={this.state.modalSelectUserVisible}
          onRequestClose={() => {
            //Alert.alert("Modal has been closed.");
            this.setState({modalSelectUserVisible: false})
          }}
        >
          <ScrollView>
            <View style={{
              flex: 1,
              marginTop: 50,
              marginBottom: 20,
              backgroundColor: '#8C8C8C',
              borderRadius: 25,
              alignItems: 'stretch',
              justifyContent: 'center',
              paddingBottom: 20,
              //marginTop: 70
            }}>

              <View style={{
                flex: 1,
                flexDirection: "row",
              }}>
                <View style={{
                  flex: 5,
                  alignItems: 'flex-start',
                }}>
                  <Text style={{ paddingLeft: 16, paddingTop: 16, fontSize: 24, fontWeight: "normal", color: "#E8E8E8" }}>Список организаций</Text>
                </View>
                <View style={{
                  flex: 1,
                  alignItems: 'flex-start',
                }}>
                  <TouchableHighlight
                    style={{ padding: 28 }}
                    onPress={() => this.setState({editUserVisible: !this.state.editUserVisible, editUserMsg: ''})}
                    >
                    { this.state.editUserVisible ?
                      ( <Image source={require('../images/minus.png')} /> ) :
                      ( <Image source={require('../images/plus.png')} /> )
                    }
                  </TouchableHighlight>
                </View>
                <View style={{
                  flex: 1,
                  alignItems: 'flex-end',
                }}>

                  { Object.keys(this.state.user_data).length != 0 ? (
                      <TouchableHighlight
                        style={{ padding: 30 }}
                        onPress={() => this.modalSelectUserCancel()}>
                        <Image source={require('../images/xclose.png')} />
                      </TouchableHighlight>
                    ) : null }

                </View>
              </View>


              { this.state.editUserVisible ? (
                  <>
                    {/* форма добавления клиента */}
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
                          style={{ height: 55, fontSize: 20, borderBottomColor: '#E9EAEA', borderBottomWidth: 1, color: "#E8E8E8" }}
                          placeholder = 'Название организации'
                          placeholderTextColor={'#8C8C8C'}
                          onChangeText={(value) => this.changeEditUserValue(value, 'firm')}
                          value={this.state.user_edit_data.firm}
                        />
                      </View>
                      <View style={{
                        alignItems: 'stretch',
                        paddingTop: 20,
                        paddingLeft: 20,
                        paddingRight: 20,
                      }}>
                        <TextInput
                          style={{ height: 55, fontSize: 20, borderBottomColor: '#E9EAEA', borderBottomWidth: 1, color: "#E8E8E8" }}
                          placeholder = 'ИНН'
                          placeholderTextColor={'#8C8C8C'}
                          onChangeText={(value) => this.changeEditUserValue(value, 'inn')}
                          value={this.state.user_edit_data.inn}
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
                          style={{ height: 55, fontSize: 20, borderBottomColor: '#E9EAEA', borderBottomWidth: 1, color: "#E8E8E8" }}
                          placeholder = 'Номер телефона'
                          placeholderTextColor={'#8C8C8C'}
                          onChangeText={(value) => this.changeEditUserValue(value, 'phone')}
                          value={this.state.user_edit_data.phone}
                        />
                      </View>

                      <View style={{
                        alignItems: 'stretch',
                        paddingLeft: 20,
                        paddingRight: 20,
                        paddingBottom: 20,
                      }}>
                        <Text style={{ fontSize: 16, fontWeight: "normal", color: "#960000" }}>{this.state.editUserMsg}</Text>
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
                          disabled={this.state.editUserButtonDisabled}
                          style={this.setEditUserButtonStyle()}
                          onPress={() =>  {
                            console.log('call edit_user')
                            AsyncStorage.getItem('token').then((value) => this.editUser(value));
                          }}
                          >
                          <Text style={this.setEditUserButtonTextStyle()}>{ this.state.editUserMode == 'add' ? 'Добавить' : 'Сохранить' }</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </> ) : (
                  <>
                    {/* поисковая строка */}
                    <View style={{
                      flexDirection: "row",
                      backgroundColor: '#4C4C4C',
                      borderRadius: 25,
                      marginLeft: 30,
                      marginRight: 30,
                      marginBottom: 20,
                    }}>
                      <View style={{
                        flex: 5,
                      }}>
                        <TextInput
                          ref="userInput"
                          style={{ paddingLeft: 20, fontSize: 16, color: "#E8E8E8" }}
                          placeholder = 'введите инн или название'
                          placeholderTextColor={'#E8E8E8'}
                          onChangeText={this.changeUserStr}
                          value={this.state.user_str}
                        />
                      </View>
                      <View style={{
                        flex: 1,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                        <TouchableHighlight
                          onPress={() => this.clearUserStr()}
                          >
                          <Image source={require('../images/clear.png')} />
                        </TouchableHighlight>
                      </View>
                    </View>

                    {/* список клиентов */}
                    <View>
                      {this.state.user_list.map((item, index) => this.renderUserItem(item, index))}
                    </View>
                  </> )
              }

            </View>

          </ScrollView>
        </Modal>

        {/*  фильтр по авто */}
        { this.state.findAutoVisible ? (
            <View style={{
              flexDirection: "row",
              backgroundColor: '#4C4C4C',
              borderRadius: 25,
              marginLeft: 30,
              marginRight: 30,
              marginTop: 10,
            }}>
              <View style={{
                flex: 5,
              }}>
                <TextInput
                  ref="autoInput"
                  style={{ paddingLeft: 20, fontSize: 16, color: "#E8E8E8" }}
                  placeholder = 'введите номер авто'
                  placeholderTextColor={'#E8E8E8'}
                  onChangeText={this.changeAutoStr}
                  value={this.state.auto_str}
                />
              </View>
              <View style={{
                flex: 1,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <TouchableHighlight
                  onPress={() => this.clearAutoStr()}
                  >
                  <Image source={require('../images/clear.png')} />
                </TouchableHighlight>
              </View>
            </View> ) : null
        }

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

        {/* окно контактов  */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={this.state.modalViewContacts}
          onRequestClose={() => {
            //Alert.alert("Modal has been closed.");
            this.setState({modalViewContacts: false})
          }}
        >

          <View style={{
            flexDirection: "row",
            backgroundColor: '#8C8C8C',
            borderTopLeftRadius: 25,
            borderTopRightRadius: 25,
            position: 'absolute',
            bottom: 80,
          }}>

            <View style={{
              flex: 1,
              flexDirection: "column",
            }}>

              {/*
              <View style={{
                alignItems: 'stretch',
              }}>
                <TouchableHighlight
                  onPress={() => {
                    this.setState({modalViewContacts: false })
                  }}
                  >
                    <View style={{ alignItems: 'center', paddingTop: 15, paddingBottom: 5 }}>
                      <Image source={require('../images/curtain_handle.png')} />
                    </View>
                </TouchableHighlight>
              </View>

              <View>
                <Text style={{ paddingLeft: 16, fontSize: 24, fontWeight: "normal", color: "#E8E8E8" }}>Контакты</Text>
              </View>
              */}

              <View style={{
                flexDirection: "row",
              }}>
                <View style={{
                  flex: 5,
                  alignItems: 'flex-start',
                }}>
                  <Text style={{ paddingLeft: 16, paddingTop: 16, fontSize: 24, fontWeight: "normal", color: "#E8E8E8" }}>Контакты</Text>
                </View>
                <View style={{
                  flex: 1,
                  alignItems: 'flex-end',
                }}>
                  <TouchableHighlight
                    style={{ padding: 30 }}
                    onPress={() => {
                      this.setState({modalViewContacts: false })
                    }}
                    >
                    <Image source={require('../images/xclose.png')} />
                  </TouchableHighlight>
                </View>
              </View>

              {/* менеджер */}
              <View style={{ flexDirection: "row", marginLeft: 20, marginRight: 20, padding: 10, backgroundColor: "#2C2C2C", borderRadius: 16 }}>
                <View style={{
                  flex: 1,
                  flexDirection: "column",
                }}>
                  <Text style={{ paddingTop: 10, fontSize: 17, color: "#E8E8E8"}}>Менеджер</Text>
                  <Text style={{ paddingTop: 5, fontSize: 15, color: "#AAABAD"}}>{this.state.manager_name}</Text>

                  <View style={{
                    flexDirection: "row",
                    paddingTop: 15,
                    paddingBottom: 10
                  }}>
                    <View style={{
                      flex: 2,
                      alignItems: 'flex-end',
                      justifyContent: 'center',
                    }}>
                      <TouchableHighlight
                        onPress={() => this.contactEmail(this.state.user_data.manager_data.email,
                                                         this.state.user_data.manager_data.email_subject,
                                                         this.state.user_data.manager_data.email_body )}
                        >
                        <View style={{ alignItems: 'center', padding: 5 }}>
                          <Image source={require('../images/contact_mail.png')} />
                        </View>
                      </TouchableHighlight>
                    </View>
                    <View style={{
                      flex: 1,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      <Image source={require('../images/contact_separator.png')} />
                    </View>
                    <View style={{
                      flex: 1,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      <TouchableHighlight
                        onPress={() => this.contactPhone(this.state.user_data.manager_data.mobile_phone)}
                        >
                        <View style={{ alignItems: 'center', padding: 5 }}>
                          <Image source={require('../images/contact_phone.png')} />
                        </View>
                      </TouchableHighlight>
                    </View>
                    <View style={{
                      flex: 1,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      <Image source={require('../images/contact_separator.png')} />
                    </View>
                    <View style={{
                      flex: 2,
                      alignItems: 'flex-start',
                      justifyContent: 'center',
                    }}>
                      <TouchableHighlight
                        onPress={() => this.contactWhatsapp(this.state.user_data.manager_data.mobile_phone,
                                                            this.state.user_data.manager_data.whatapp_greetings)}
                        >
                        <View style={{ alignItems: 'center', padding: 5 }}>
                          <Image source={require('../images/contact_whatsapp.png')} />
                        </View>
                      </TouchableHighlight>
                    </View>
                  </View>

                </View>
              </View>

              {/* техподдержка */}
              <View style={{ flexDirection: "row", marginTop: 20, marginLeft: 20, marginRight: 20, marginBottom: 20, padding: 10, backgroundColor: "#2C2C2C", borderRadius: 16 }}>
                <View style={{
                  flex: 1,
                  flexDirection: "column",
                }}>
                  <Text style={{ paddingTop: 10, fontSize: 17, color: "#E8E8E8"}}>Техническая поддержка</Text>
                  <Text style={{ paddingTop: 5, fontSize: 15, color: "#AAABAD"}}>{this.state.tech_support_name}</Text>

                  <View style={{
                    flexDirection: "row",
                    paddingTop: 15,
                    paddingBottom: 10
                  }}>
                    <View style={{
                      flex: 2,
                      alignItems: 'flex-end',
                      justifyContent: 'center',
                    }}>
                      <TouchableHighlight
                        onPress={() => this.contactEmail(this.state.user_data.tech_support_data.email,
                                                         this.state.user_data.tech_support_data.email_subject,
                                                         this.state.user_data.tech_support_data.email_body )}
                        >
                        <View style={{ alignItems: 'center', padding: 5 }}>
                          <Image source={require('../images/contact_mail.png')} />
                        </View>
                      </TouchableHighlight>
                    </View>
                    <View style={{
                      flex: 1,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      <Image source={require('../images/contact_separator.png')} />
                    </View>
                    <View style={{
                      flex: 1,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      <TouchableHighlight
                        onPress={() => this.contactPhone(this.state.user_data.tech_support_data.mobile_phone)}
                        >
                        <View style={{ alignItems: 'center', padding: 5 }}>
                          <Image source={require('../images/contact_phone.png')} />
                        </View>
                      </TouchableHighlight>
                    </View>
                    <View style={{
                      flex: 1,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      <Image source={require('../images/contact_separator.png')} />
                    </View>
                    <View style={{
                      flex: 2,
                      alignItems: 'flex-start',
                      justifyContent: 'center',
                    }}>
                      <TouchableHighlight
                        onPress={() => this.contactWhatsapp(this.state.user_data.tech_support_data.mobile_phone,
                                                            this.state.user_data.tech_support_data.whatapp_greetings)}
                        >
                        <View style={{ alignItems: 'center', padding: 5 }}>
                          <Image source={require('../images/contact_whatsapp.png')} />
                        </View>
                      </TouchableHighlight>
                    </View>
                  </View>

                </View>
              </View>
            </View>

          </View>
        </Modal>

        {/* нижнее меню / нижнее меню при выделенных item */}
        { Object.keys(this.state.user_data).length != 0 ? (
          <>
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
                      onPress={() => this.openContacts()}
                      >
                      { this.state.modalViewContacts ? ( <MenuSelContacts/> ) : ( <MenuContacts/> ) }
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

                  {   Object.keys(this.state.manager_data).length != 0 ? (

                        <View style={{
                          flex: 1,
                          height: 80,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}>
                          <TouchableHighlight
                            onPress={() => {
                              console.log('-> show modal user list')
                              this.setState({modalSelectUserVisible: true})
                              AsyncStorage.getItem('token').then((value) => this.getUserList(value));
                            }}>
                            <MenuUserList />
                          </TouchableHighlight>
                        </View>
                      ) : null
                  }

                  {/*
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
                  */}
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
                  {/*
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
                  */}
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
          </>
        ) : null }

      </View>
    );
  }
}

export default AutoList;
