import React from 'react';
import { Linking, Text, View, Image, TouchableOpacity, TouchableHighlight, TextInput, ImageBackground, ActivityIndicator, FlatList, Pressable, ScrollView, Dimensions } from 'react-native';
import Modal from 'react-native-modal';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { getDeviceInfo } from './utils/PushNotificationHelper';
import styles from './styles/Styles.js';
import Api from "./utils/Api";

const maxStep = 15;
const intervalTime = 10000;
const auto_list_limit = 10;

class MenuAdd extends React.Component {
  render() {
    return (
        <View style={{ alignItems: 'center', padding: 5 }}>
          <Image source={require('../images/menu_add_2.png')} />
          <Text style={{ fontSize: 11, color: "#909090", marginTop: 5 }}>добавить {this.props.str}</Text>
        </View>
    );
  }
}

class MenuSelAdd extends React.Component {
  render() {
    return (
        <View style={{ alignItems: 'center', padding: 5 }}>
          <Image source={require('../images/sel_menu_add_2.png')} />
          <Text style={{ fontSize: 11, color: "#313131", marginTop: 5 }}>добавить {this.props.str}</Text>
        </View>
    );
  }
}

class MenuDriver extends React.Component {
  render() {
    return (
        <View style={{ alignItems: 'center', padding: 5 }}>
          <Image source={require('../images/menu_driver_2.png')} />
          <Text style={{ fontSize: 11, color: "#909090", marginTop: 5 }}>водители</Text>
        </View>
    );
  }
}

class MenuContacts extends React.Component {
  render() {
    return (
        <View style={{ alignItems: 'center', padding: 5 }}>
          <Image source={require('../images/menu_contacts_2.png')} />
          <Text style={{ fontSize: 11, color: "#909090", marginTop: 5 }}>обратная связь</Text>
        </View>
    );
  }
}

class MenuSelContacts extends React.Component {
  render() {
    return (
        <View style={{ alignItems: 'center', padding: 5 }}>
          <Image source={require('../images/sel_menu_contacts_2.png')} />
          <Text style={{ fontSize: 11, color: "#313131" }}>контакты</Text>
        </View>
    );
  }
}

class MenuUser extends React.Component {
  render() {
    return (
        <View style={{ alignItems: 'center', padding: 5 }}>
          <Image source={require('../images/menu_user_2.png')} />
          <Text style={{ fontSize: 11, color: "#909090", marginTop: 5 }}>профиль</Text>
        </View>
    );
  }
}

class MenuInviteUser extends React.Component {
  render() {
    return (
        <View style={{ alignItems: 'center', padding: 5 }}>
          <Image source={require('../images/menu_invite_user_2.png')} />
          <Text style={{ fontSize: 11, color: "#909090", marginTop: 5 }}>пригласи друга</Text>
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
          <Image source={require('../images/sel_menu_del_item_2.png')} />
          <Text style={{ fontSize: 11, color: "#313131", marginTop: 5}}>удалить</Text>
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
          <Image source={require('../images/sel_menu_pass_2.png')} />
          <Text style={{ fontSize: 11, color: "#313131", marginTop: 5 }}>пропуск в Москву</Text>
        </View>
    );
  }
}

class SelMenuUndoSelect extends React.Component {
  render() {
    return (
        <View style={{ alignItems: 'center', padding: 5 }}>
          <Image source={require('../images/sel_menu_undo_select_2.png')} />
          <Text style={{ fontSize: 11, color: "#313131", marginTop: 5 }}>сбросить</Text>
        </View>
    );
  }
}

class AutoList extends React.Component {

  constructor(props) {
    super(props);

    this.onEndReachedCalledDuringMomentum = true;
    this.intervals = null;

    this.state = {
      manager_name: '',
      tech_support_name: '',

      manager_data: {},
      user_data: {},
      user_str: '',
      user_list: [],
      user_list_empty_str: '',
      other_user_list: [],

      auto_str: '',
      auto_cancelled: false,
      auto_pass_ended: false,
      auto_pass_ends: false,
      auto_pass_ends_until_date: '',
      auto_list: [],
      auto_list_count: 0,
      auto_list_from: 0,
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
      sts_by_auto_number_indicator: false,

      onboarding_expired: 1,

      menuLeftVisible: false,
    };
  }

  /* */
  onEndReached = ({ distanceFromEnd }) => {
    if(!this.onEndReachedCalledDuringMomentum)
    {
      //this.fetchData();

      console.log('onEndReached work!')

      AsyncStorage.getItem('token').then((value) => this.getAutoList(value))

      this.onEndReachedCalledDuringMomentum = true;
    }
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

    this.setState({ sts_by_auto_number_indicator: true })

    Api.post('/get-sts-by-auto-number', { token: value, auto_number: auto_number })
       .then(res => {

          const data = res.data;
          console.log(data);

          this.setState({ sts_by_auto_number_indicator: false })

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

  changeSts = (value) => {
    console.log('changeSts. value = ' + value)

    if(value.match(/^[АВЕКМНОРСТУХABEKMHOPCTYX0-9]*$/i))
    {
      this.setState({sts: value})
    }

    this.setState({sts_ok: value.length == 10 ? true : false}, () => this.checkAddAutoEnabled())
  };

  setAddAutoButtonStyle = () => {
    let backgroundColor = this.state.modalAddAutoButtonDisabled ? "#c0c0c0" : "#3A3A3A";
    return { height: 50, fontSize: 10, margin: 25, borderRadius: 5, alignItems: 'center', justifyContent: 'center', backgroundColor: backgroundColor }
  }

  setAddAutoButtonTextStyle = () => {
    let color = this.state.modalAddAutoButtonDisabled ? "#E8E8E8" : "#FFFFFF";
    return { paddingLeft: 20, paddingRight: 20, fontSize: 14, fontWeight: 500, color: color }
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
    let color = this.state.modalViewContacts || 
                this.state.modalAddAutoVisible ||
                this.state.modalDelAutoVisible ? 'rgba(29,29,29, 0)' : ( this.state.auto_list[index].marked == 1 ? "#E9E9E9" : "#ffffff" );
    return { flexDirection: "column", margin: 20, padding: 10, backgroundColor: color, borderRadius: 8, borderWidth: 1, borderColor: "#B8B8B8" }
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

  /* поиск по авто */
  findAuto = () => {
    console.log('findAuto')

    this.onEndReachedCalledDuringMomentum = true;

    this.setState({ marked_cnt: 0, auto_list: [], auto_list_count: 0, auto_list_from: 0 })     

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

    else if(this.state.auto_list_from > this.state.auto_list_count)
    {
      console.log('this.state.auto_list_from = ', this.state.auto_list_from, ' > then')
      console.log('this.state.auto_list_count = ', this.state.auto_list_count)
    }

    else
    {
      this.setState({indicator: true})

      console.log('this.state.auto_str = ', this.state.auto_str)
      console.log('this.state.auto_cancelled = ', this.state.auto_cancelled)
      console.log('this.state.auto_pass_ended = ', this.state.auto_pass_ended)
      console.log('this.state.auto_pass_ends = ', this.state.auto_pass_ends)
      console.log('this.state.auto_pass_ends_until_date = ', this.state.auto_pass_ends_until_date)

      console.log('this.state.auto_list_from = ', this.state.auto_list_from)
      console.log('auto_list_limit = ', auto_list_limit)

      let device_info = getDeviceInfo();

      Api.post('/get-auto-list', { token: value, 
                                   device_info: device_info,
                                   auto_str: this.state.auto_str,
                                   auto_cancelled: this.state.auto_cancelled ? 1 : 0,
                                   auto_pass_ended: this.state.auto_pass_ended ? 1 : 0,
                                   auto_pass_ends: this.state.auto_pass_ends ? 1 : 0,
                                   auto_pass_ends_until_date: this.state.auto_pass_ends_until_date,
                                   auto_list_from: this.state.auto_list_from,
                                   auto_list_limit: auto_list_limit
                                   })
         .then(res => {

          this.onEndReachedCalledDuringMomentum = false;

            const data = res.data;
            console.log(data);

            //
            this.setState({indicator: false})

            if(data.onboarding_viewed == 0)
            {
              this.props.navigation.navigate('OnBoarding')
            }

            this.setState({onboarding_expired: data.onboarding_expired})

            //
            if(typeof(data.user_data) != 'undefined')
            {
              console.log('typeof(data.user_data)(0) = ' + typeof(data.user_data))
              this.setState({user_data: data.user_data})

              console.log('data.other_user_list');  
              console.log(data.other_user_list);  
              this.setState({other_user_list: data.other_user_list})              
            }
            else
            {
              console.log('typeof(data.user_data)(1) = ' + typeof(data.user_data))

              this.props.navigation.navigate('Auth')
            }

            if(typeof(data.manager_data) != 'undefined')
            {
              console.log('typeof(data.manager_data) = ' + typeof(data.manager_data))

              console.log('data.manager_data')
              console.log(data.manager_data)

              this.setState({manager_data: data.manager_data})
            }

            //
            this.setState({auto_list_count: data.auto_list_count, 
                           auto_list_from: this.state.auto_list_from + auto_list_limit })    

            //
            if(data.auto_list.length == 0)
            {
              console.log('data.auto_list.length = ' + data.auto_list.length)

                if(this.state.findAutoVisible)
                {
                  this.setState({auto_list: data.auto_list})
                }
                else if(this.state.auto_list_from == 0)
                {
                  this.setState({modalAddAutoVisible: true})
                }

            }
            else
            {
              let auto_list_new = this.state.auto_list;

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

                auto_list_new.push(data.auto_list[i])
              }

              //
              //this.setState({auto_list: data.auto_list})
              this.setState({auto_list: auto_list_new})
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
                auto_list_new[i].check_passes_string            = data.check_passes_string
                auto_list_new[i].check_passes_year_period_color = data.check_passes_year_period_color
                auto_list_new[i].check_passes_expared           = 0
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
      //
      let ind;

      for (var i=0; i<this.state.auto_list.length; i++)
      {
        if(this.state.auto_list[i].id == id)
        {
          ind = i;
          break;
        }
      }

      console.log('ind(' + id + ') = ' + ind)

      //
      let t = 0;

      let check_fines = setInterval(() => {

        console.log('t(' + id + ') = ' + t);

        Api.post('/get-auto-check-fines', { token: value, id: id, intervally: 1 })
        .then(res => {

          const data = res.data;
          console.log('data')
          console.log(data);

          let auto_list_new = this.state.auto_list

          if(typeof(data['error']) != 'undefined')
          {
            auto_list_new[ind].check_fines_color    = 'white'
            auto_list_new[ind].check_fines_string   = ''
            auto_list_new[ind].check_fines_expared  = 0

            this.setState({auto_list: auto_list_new}) 
          }
          else
          {
            if(data.in_progress == 0)
            {
              auto_list_new[ind].check_fines_string  = data.check_fines_string
              auto_list_new[ind].check_fines_expared = 0

              this.setState({auto_list: auto_list_new})  
            }
          }
        })
        .catch(error => {
          console.log('error.response.status = ' + error.response.status);
          if(error.response.status == 401) { this.props.navigation.navigate('Auth') }
        });

        console.log('after setInterval(t(' + id + ') = ' + t)

        if(typeof(this.state.auto_list[ind]) == 'undefined')
        {
          console.log('clearInterval(' + id + ')')
          check_fines = clearInterval(check_fines);
        }
        else if((this.state.auto_list[ind].check_fines_expared == 0) || (t >= maxStep * intervalTime))
        {
          console.log('clearInterval(' + id + ')')
          check_fines = clearInterval(check_fines);
        }        

        t += intervalTime;

      }, intervalTime);  

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
      //
      let ind;

      for (var i=0; i<this.state.auto_list.length; i++)
      {
        if(this.state.auto_list[i].id == id)
        {
          ind = i;
          break;
        }
      }

      console.log('ind(' + id + ') = ' + ind)

      //
      let t = 0;

      let check_diagnostic_card = setInterval(() => {

        console.log('t(' + id + ') = ' + t);

        Api.post('/get-auto-check-diagnostic-card', { token: value, id: id, intervally: 1 })
        .then(res => {

          const data = res.data;
          console.log('data')
          console.log(data);

          let auto_list_new = this.state.auto_list

          if(typeof(data['error']) != 'undefined')
          {
            auto_list_new[ind].check_diagnostic_card_string       = ''
            auto_list_new[ind].check_diagnostic_card_period_color = ''
            auto_list_new[ind].check_diagnostic_card_expared      = 0

            this.setState({auto_list: auto_list_new}) 
          }
          else
          {
            if(data.in_progress == 0)
            {
              auto_list_new[ind].check_diagnostic_card_string       = data.check_diagnostic_card_string
              auto_list_new[ind].check_diagnostic_card_period_color = data.check_diagnostic_card_period_color
              auto_list_new[ind].check_diagnostic_card_expared      = 0

              this.setState({auto_list: auto_list_new})  
            }
          }
        })
        .catch(error => {
          console.log('error.response.status = ' + error.response.status);
          if(error.response.status == 401) { this.props.navigation.navigate('Auth') }
        });

        if(typeof(this.state.auto_list[ind]) == 'undefined')
        {
          console.log('clearInterval(' + id + ')')
          check_diagnostic_card = clearInterval(check_diagnostic_card);
        }
        else if((this.state.auto_list[ind].check_diagnostic_card_expared == 0) || (t >= maxStep * intervalTime))
        {
          console.log('clearInterval(' + id + ')')
          check_diagnostic_card = clearInterval(check_diagnostic_card);
        }

        t += intervalTime;

      }, intervalTime);  

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
      //
      let ind;

      for (var i=0; i<this.state.auto_list.length; i++)
      {
        if(this.state.auto_list[i].id == id)
        {
          ind = i;
          break;
        }
      }

      console.log('ind(' + id + ') = ' + ind)

      //
      let t = 0;

      let check_osago = setInterval(() => {

        console.log('t(' + id + ') = ' + t);

        Api.post('/get-auto-check-osago', { token: value, id: id, intervally: 1 })
        .then(res => {

          const data = res.data;
          console.log('data')
          console.log(data);

          let auto_list_new = this.state.auto_list

          if(typeof(data['error']) != 'undefined')
          {
            auto_list_new[ind].check_osago_string       = ''
            auto_list_new[ind].check_osago_period_color = ''
            auto_list_new[ind].check_osago_expared      = 0

            this.setState({auto_list: auto_list_new}) 
          }
          else
          {
            if(data.in_progress == 0)
            {
              auto_list_new[ind].check_osago_string       = data.check_osago_string
              auto_list_new[ind].check_osago_period_color = data.check_osago_period_color
              auto_list_new[ind].check_osago_expared      = 0
  
              this.setState({auto_list: auto_list_new})  
            }
          }
        })
        .catch(error => {
          console.log('error.response.status = ' + error.response.status);
          if(error.response.status == 401) { this.props.navigation.navigate('Auth') }
        });

        if(typeof(this.state.auto_list[ind]) == 'undefined')
        {
          console.log('clearInterval(' + id + ')')
          check_osago = clearInterval(check_osago);
        }
        else if((this.state.auto_list[ind].check_osago_expared == 0) || (t >= maxStep * intervalTime))
        {
          console.log('clearInterval(' + id + ')')
          check_osago = clearInterval(check_osago);
        }

        t += intervalTime;

      }, intervalTime);  

    }
  }

  setCurrentInn = (item, index) => {
    console.log('setCurrentInn. item = ')
    console.log(item)
    console.log('index = ' + index)

    if(item.user_confirmed == 1 && item.phone_inn_confirmed == 1)
    {
      AsyncStorage.getItem('token').then((token) => {

        Api.post('/set-current-inn', { token: token, current_inn: item.inn })
           .then(res => {

              const data = res.data;
              console.log('data')
              console.log(data);

              this.setState({menuLeftVisible: false}, () => this.screenFocus())
            })
            .catch(error => {
              console.log('error.response.status = ' + error.response.status);
              if(error.response.status == 401) { this.props.navigation.navigate('Auth') }
            });
      });
    }
  }

  changeAutoPassEndsValue = () => {
    console.log('changeAutoPassEndsValue')

    if(this.state.auto_pass_ends)
    {
      this.setState({auto_pass_ends: false, auto_pass_ends_until_date: '' }, () => this.findAuto()) 
    }
    else
    {
      this.setState({auto_pass_ends: true }, () => this.findAuto())
    }
  }

  changeAutoPassEndsUntilDateValue = (value) => {
    console.log('changeAutoPassEndsUntilDateValue | value = ' + value)

    let value_new

    if(value.match(/^[0-9]{2}$/i))
    {
      value_new = value + '.'
    }
    else if(value.match(/^[0-9]{2}\.[0-9]{2}$/i))
    {
      value_new = value + '.'
    }
    else if(value.match(/^[\.0-9]*$/i))
    {
      value_new = value
    }

    console.log('value_new.length = ', value_new.length)

    if(value_new.length == 0)
    {
      this.setState({ auto_pass_ends_until_date: value_new, auto_pass_ends: false }, () => this.findAuto())
    }
    else if(value_new.length == 10)
    {
      this.setState({ auto_pass_ends_until_date: value_new, auto_pass_ends: true }, () => this.findAuto())
    }
    else
    {
      this.setState({ auto_pass_ends_until_date: value_new, auto_pass_ends: false })
    }
  };

  setTabBgColor = (color) => {

    let bgcolor;

    if(this.state.modalViewContacts || 
       this.state.modalAddAutoVisible ||
       this.state.modalDelAutoVisible)
    {
      bgcolor = 'rgba(29,29,29, 0)'
    }
    else if(color == 'green')
    {
      bgcolor = "#E6FDDA"
    }    
    else if(color == 'red')
    {
      bgcolor = "#FFE7E7"
    }
    else if(color == 'yellow')
    {
      bgcolor = "#FAEEBA"
    }
    else if(color == 'white')
    {
      bgcolor = "#F7F7F7"
    }    
    
    return bgcolor
  }

  setTabStyle = (color) => {      

    return { flex: 3, alignItems: 'center', height: 29, backgroundColor: this.setTabBgColor(color), marginRight: 5 }
  }

  setTabUnderlay = (color) => {

    let underlay_color;

    if(color == 'green')
    {
      underlay_color = "#E6FDDA"
    }    
    else if(color == 'red')
    {
      underlay_color = "#FFE7E7"
    }
    else if(color == 'yellow')
    {
      underlay_color = "#FAEEBA"
    }
    else if(color == 'white')
    {
      underlay_color = "#F7F7F7"
    }       

    return underlay_color
  }

  showHideTab = (mode, ind) => {
    console.log('showHideTab. ind = ' + ind)

    let auto_list_new = this.state.auto_list

    for (var i=0; i<auto_list_new.length; i++)
    {
      if(i == ind)
      {
        if(mode == 'fines')
        {
          auto_list_new[i].check_fines_tab_show = auto_list_new[i].check_fines_tab_show == 0 ? 1 : 0
          auto_list_new[i].check_osago_tab_show = 0
          auto_list_new[i].check_diagnostic_card_tab_show = 0
        }
        else if(mode == 'osago')
        {
          auto_list_new[i].check_fines_tab_show = 0
          auto_list_new[i].check_osago_tab_show = auto_list_new[i].check_osago_tab_show == 0 ? 1 : 0
          auto_list_new[i].check_diagnostic_card_tab_show = 0
        }
        else if(mode == 'diagnostic_card')
        {
          auto_list_new[i].check_fines_tab_show = 0
          auto_list_new[i].check_osago_tab_show = 0
          auto_list_new[i].check_diagnostic_card_tab_show = auto_list_new[i].check_diagnostic_card_tab_show == 0 ? 1 : 0
        }
      }
    }

    this.setState({auto_list: auto_list_new})
  }  

  setContainerStyle = () => {

    let container_style     = styles.container
    let container_style_new = {}

    for (let key in container_style)
    {
      container_style_new[key] = key != 'backgroundColor' ? container_style[key] : ( 
        this.state.modalViewContacts || 
        this.state.modalAddAutoVisible ||
        this.state.modalDelAutoVisible ? 'rgba(29,29,29,0.6)' : '#FFFFFF' )
    }

    return container_style_new
  }

  screenFocus = () => {
    console.log('AutoList screenFocus')

    this.onEndReachedCalledDuringMomentum = true;

    this.setState({ marked_cnt: 0, auto_list: [], auto_list_count: 0, auto_list_from: 0 })        

    AsyncStorage.getItem('token').then((value) => this.getAutoList(value));
  }

  componentDidMount() {
    console.log('AutoList DidMount')

    this.props.navigation.addListener('focus', () => this.screenFocus())
    this.props.navigation.addListener('beforeRemove', () => { console.log('AutoList screenBeforeRemove'); return; })

    //AsyncStorage.getItem('token').then((value) => this.getAutoList(value));
  }

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
              flexDirection: "row"
          }}>
            <View style={{
              flex: 8
            }}>
             <Text style={{ fontSize: 18, fontWeight: "bold", color: "#313131" }}>{item.auto_number_base}{item.auto_number_region_code}</Text>   
            </View>
            <View style={{
              flex: 1,
              alignItems: 'flex-end',
              justifyContent: 'flex-end',
            }}>
              <TouchableHighlight
                style={{ paddingLeft: 20, alignItems: 'flex-end', justifyContent: 'flex-end' }}
                activeOpacity={1}
                underlayColor="#ffffff"                
                onPress={() => {
                  console.log('-> move to Auto')
                  this.props.navigation.navigate('Auto', { auto_data: item })
              }}>
                <Image source={require('../images/arrow_to_right_2.png')}/>
              </TouchableHighlight>
            </View>
          </View>
          <View style={{
              flexDirection: "row",
          }}>
            <View style={{ borderBottomColor: "#DDDDDD", borderBottomWidth: 1, height: 10, width: "100%" }}></View>     
          </View>

          {/* текущие пропуска */}    
          { item.check_passes_expared != 1 ? ( 
          <>  
            <View style={{
                flexDirection: "row",
                alignItems: "stretch",
                marginTop: 10
            }}>

              <View style={[{
                flex: 1,
                alignItems: 'center',
                height: 29,
                padding: 5,
                marginRight: 5
              },
              { backgroundColor: this.setTabBgColor('white') }]}>
                <Image source={require('../images/pass_item.png')}/>
              </View>  

              { item.check_passes_year_propusktype != '' ? ( 
              <>  
                <View style={[{
                  flex: 2,
                  alignItems: 'center',
                  height: 29,
                  padding: 5,
                  marginRight: 5
                },
                { backgroundColor: this.setTabBgColor('white') }]}>
                  <Text style={{ fontSize: 14, color: "#3A3A3A" }}>{item.check_passes_year_propusktype}</Text>
                </View>
                <View style={[{
                  flex: 2,
                  alignItems: 'center',
                  height: 29,
                  padding: 5,
                  marginRight: 5
                },
                { backgroundColor: this.setTabBgColor('white') }]}>
                  <Text style={{ fontSize: 14, color: "#3A3A3A" }}>{item.check_passes_year_type_of_pass_string}</Text>
                </View>

                { item.check_passes_year_cancelled != 1 ? ( 
                  <View style={[{
                    flex: 3,
                    alignItems: 'center',
                    height: 29,
                    padding: 5,
                  },
                  { backgroundColor: this.setTabBgColor('green') }]}>
                    <Text style={{ color: "#40882C" }}>Действителен</Text>
                  </View> 
                ) : (
                  <View style={[{
                    flex: 3,
                    alignItems: 'center',
                    height: 29,
                    backgroundColor: "#FFE7E7",
                    padding: 5,
                  },
                  { backgroundColor: this.setTabBgColor('red') } ]}>
                    <Text style={{ color: "#D74747" }}>Аннулирован</Text>
                  </View> 
                ) }
              </> ) : (
              <View style={[{
                  flex: 7,
                  alignItems: 'center',
                  height: 29,
                  backgroundColor: "#F7F7F7",
                  padding: 5,
                },
                { backgroundColor: this.setTabBgColor('white') }]}>
                <Text style={{ fontSize: 14, color: "#3A3A3A" }}>{ item.check_passes_string }</Text>
              </View>   
              ) }  

            </View>

            { item.check_passes_year_propusktype != '' ? ( 
            <View style={{
                flexDirection: "row",
                alignItems: "stretch",
                marginTop: 10
            }}>
              <View style={{
                flex: 4,
                alignItems: 'center'
              }}>
                <Text style={styles[item.check_passes_year_period_color]}>{ item.check_passes_year_cancelled != 1 ? 'дней осталось: ' + item.check_passes_pass_end_left : 'был аннулирован'}</Text>
              </View>
              <View style={{
                flex: 3,
                alignItems: 'center'
              }}>
                <Text style={styles[item.check_passes_year_period_color]}>{ item.check_passes_year_cancelled != 1 ? 'до ' + item.check_passes_pass_end_str : item.check_passes_dat_cancel_year_str }</Text>
              </View>
            </View> ) : null }

            {/* еще один пропуск ( в случае наличия такового ) */}  
            { item.check_passes_another_year_propusktype != '' ? ( 
              <>
                <View style={{
                flexDirection: "row",
                alignItems: "stretch",
                marginTop: 10
                }}>
              <View style={{
                  flex: 1,
                  alignItems: 'center',
                  height: 29,
                  padding: 5,
                  marginRight: 5
                }}>
              </View>                    
                  <View style={[{
                    flex: 2,
                    alignItems: 'center',
                    height: 29,
                    padding: 5,
                    marginRight: 5
                  },
                  { backgroundColor: this.setTabBgColor('white') }]}>
                    <Text style={{ fontSize: 14, color: "#3A3A3A" }}>{item.check_passes_another_year_propusktype}</Text>
                  </View>
                  <View style={[{
                    flex: 2,
                    alignItems: 'center',
                    height: 29,
                    padding: 5,
                    marginRight: 5
                  },
                  { backgroundColor: this.setTabBgColor('white') }]}>
                    <Text style={{ fontSize: 14, color: "#3A3A3A" }}>{item.check_passes_another_year_type_of_pass_string}</Text>
                  </View>
                  <View style={[{
                      flex: 3,
                      alignItems: 'center',
                      height: 29,
                      padding: 5,
                    },
                    { backgroundColor: this.setTabBgColor('green') }]}>
                    <Text style={{ color: "#40882C" }}>Действителен</Text>
                  </View>     
                </View>              
                <View style={{
                  flexDirection: "row",
                  alignItems: "stretch",
                  marginTop: 10
                }}>
                  <View style={{
                    flex: 4,
                    alignItems: 'center'
                  }}>
                    <Text style={{ color: '#40882C' }}>{ 'дней осталось: ' + item.check_passes_another_pass_end_left }</Text>
                  </View>
                  <View style={{
                    flex: 3,
                    alignItems: 'center'
                  }}>
                    <Text style={{ color: '#40882C' }}>{ 'до ' + item.check_passes_another_pass_end_str }</Text>
                  </View>
                </View>
              </>
            ) : null }
            
          </>   ) : (

          <View style={{
              flexDirection: "row",
              alignItems: "stretch",
              marginTop: 10
          }}>

            <View style={[{
                flex: 1,
                alignItems: 'center',
                height: 29,
                padding: 5,
                marginRight: 5
              },
              { backgroundColor: this.setTabBgColor('white') }]}>
              <Image source={require('../images/pass_item.png')}/>
            </View>  

            <View style={[{
                flex: 2,
                alignItems: 'center',
                height: 29,
                padding: 5,
                marginRight: 5
              },
              { backgroundColor: this.setTabBgColor('white') }]}>
              <View style={{ 
                alignItems: 'center',
                flexDirection: "row"
              }}>
                <ActivityIndicator size="small" color="#313131" animating={true}/> 
                <Text style={{ fontSize: 14, color: "#3A3A3A", paddingLeft: 10 }}>проверяем пропуск</Text>
              </View>  
            </View>

          </View>

          ) }

          {/* статус заявки */}    
          { item.status_header != '' ? ( 
          <View style={{
            flexDirection: "row",
            alignItems: "stretch",
            marginTop: 10
          }}>              
            <View style={[{
              flex: 3,
              alignItems: 'center',
              height: 29,
              padding: 5,
              marginRight: 5
            },
            { backgroundColor: this.setTabBgColor('white') }]}>
              <Text style={{ fontSize: 14, color: "#3A3A3A" }}>{item.status_propusktype}</Text>
            </View>
            <View style={[{
              flex: 2,
              alignItems: 'center',
              height: 29,
              padding: 5,
              marginRight: 5
            },
            { backgroundColor: this.setTabBgColor('white') }]}>
              <Text style={{ fontSize: 14, color: "#3A3A3A" }}>{item.status_type_of_pass_string}</Text>
            </View>
            <View style={[{
              flex: 3,
              alignItems: 'center',
              height: 29,
              padding: 5,
            },
            { backgroundColor: this.setTabBgColor('yellow') }]}>
              <Text style={{ fontSize: 14, color: "#705B00" }}>{ item.status_header }</Text>
            </View>             
          </View> ) : null }

          {/* задолженность */}  
          { item.debt_sum != '0.00' ? ( 
            <View style={{
                flexDirection: "row",
                alignItems: "stretch",
                marginTop: 10
            }}>
              <View style={{
                flex: 4,
                alignItems: 'center',
              }}>
                <View style={{
                  alignItems: 'center',
                  flexDirection: "row",
                }}>
                  <Image source={require('../images/alert-circle.png')}/>
                  <Text style={styles.red}> задолженность</Text>
                </View>
              </View>
              <View style={{
                flex: 3,
                alignItems: 'center'
              }}>
                <Text style={styles.red}>{ item.debt_sum }₽</Text>
              </View>
            </View> ) : null }          

          <View style={{
              flexDirection: "row",
          }}>
            <View style={{ borderBottomColor: "#DDDDDD", borderBottomWidth: 1, height: 10, width: "100%" }}></View>     
          </View>

          {/* штрафы - осаго - дк */}  
          <View style={{
              flexDirection: "row",
              alignItems: "stretch",
              marginTop: 10
          }}>
            { item.check_fines_expared != 1 ? ( 
              <View style={this.setTabStyle(item.check_fines_color)}>
                <TouchableHighlight style={{ 
                    alignItems: 'center',
                    flexDirection: "row"
                  }}
                  activeOpacity={1}
                  underlayColor={this.setTabUnderlay(item.check_fines_color)}
                  onPress={() => this.showHideTab('fines', index) }>   
                  <>           
                    <Text style={styles[item.check_fines_color]}>Штрафы</Text>
                    { item.check_fines_tab_show != 0 ? ( 
                      <Image source={require('../images/arrow_hide.png')}/>
                    ) : (
                      <Image source={require('../images/arrow_show.png')}/>
                    ) }
                  </>
                </TouchableHighlight> 
              </View> ) : (
              <View style={this.setTabStyle('white')}>
                <View style={{ 
                    alignItems: 'center',
                    flexDirection: "row"
                  }}>          
                    <Text style={{ color: "#3A3A3A", paddingRight: 5 }}>Штрафы</Text>
                    <ActivityIndicator size="small" color="#313131" animating={true}/> 
                </View> 
              </View>
            ) }

            { item.check_osago_expared != 1 ? (       
              <View style={this.setTabStyle(item.check_osago_period_color)}>
                <TouchableHighlight
                  style={{ 
                    alignItems: 'center',
                    flexDirection: "row"
                  }}
                  activeOpacity={1}
                  underlayColor={this.setTabUnderlay(item.check_osago_period_color)}
                  onPress={() => this.showHideTab('osago', index) }>   
                  <>           
                    <Text style={styles[item.check_osago_period_color]}>ОСАГО</Text>
                    { item.check_osago_tab_show != 0 ? ( 
                      <Image source={require('../images/arrow_hide.png')}/>
                    ) : (
                      <Image source={require('../images/arrow_show.png')}/>
                    ) }
                  </>
                </TouchableHighlight>
              </View> ) : (
              <View style={this.setTabStyle('white')}>
                <View style={{ 
                    alignItems: 'center',
                    flexDirection: "row"
                  }}>          
                    <Text style={{ color: "#3A3A3A", paddingRight: 5 }}>ОСАГО</Text>
                    <ActivityIndicator size="small" color="#313131" animating={true}/> 
                </View> 
              </View>
            ) }

            { item.check_diagnostic_card_expared != 1 ? (         
              <View style={this.setTabStyle(item.check_diagnostic_card_period_color)}>
                <TouchableHighlight
                  style={{ 
                    alignItems: 'center',
                    flexDirection: "row"
                  }}
                  activeOpacity={1}
                  underlayColor={this.setTabUnderlay(item.check_diagnostic_card_period_color)}
                  onPress={() => this.showHideTab('diagnostic_card', index) }>   
                  <>           
                    <Text style={styles[item.check_diagnostic_card_period_color]}>ДК</Text>
                    { item.check_diagnostic_card_tab_show != 0 ? ( 
                      <Image source={require('../images/arrow_hide.png')}/>
                    ) : (
                      <Image source={require('../images/arrow_show.png')}/>
                    ) }
                  </>
                </TouchableHighlight>
              </View> ) : (
              <View style={this.setTabStyle('white')}>
                <View style={{ 
                    alignItems: 'center',
                    flexDirection: "row"
                  }}>          
                    <Text style={{ color: "#3A3A3A", paddingRight: 5 }}>ДК</Text>
                    <ActivityIndicator size="small" color="#313131" animating={true}/> 
                </View> 
              </View>
            ) }

          </View>      

          {/* штрафы */}    
          { item.check_fines_tab_show != 0 ? (     
          <View style={{
              flexDirection: "row",
              alignItems: "stretch",
              marginTop: 10
          }}>
            <View style={{
              flex: 7,
              alignItems: 'center'
            }}>
              <Text style={styles[item.check_fines_color]}>{ item.check_fines_string }</Text>
            </View>
          </View>) : null }

          {/* осаго */}     
          { item.check_osago_tab_show != 0 ? (     
          <View style={{
              flexDirection: "row",
              alignItems: "stretch",
              marginTop: 10
          }}>
            { item.check_osago_date_to_left != '' ? (
            <>  
              <View style={{
                flex: 4,
                alignItems: 'center'
              }}>
                <Text style={styles[item.check_osago_period_color]}>{ 'дней осталось: ' + item.check_osago_date_to_left }</Text>
              </View>
              <View style={{
                flex: 3,
                alignItems: 'center'
              }}>
                <Text style={styles[item.check_osago_period_color]}>{ 'до ' + item.check_osago_date_to_str }</Text>
              </View>  
            </>  
            ) : (          
            <View style={{
              flex: 7,
              alignItems: 'center'
            }}>
              <Text style={styles[item.check_osago_period_color]}>{ item.check_osago_string }</Text>
            </View>
            ) }
          </View>) : null }     

          {/* дк */}     
          { item.check_diagnostic_card_tab_show != 0 ? (     
          <View style={{
              flexDirection: "row",
              alignItems: "stretch",
              marginTop: 10
          }}>
            { item.check_diagnostic_card_date_to_left != '' ? (
            <>  
              <View style={{
                flex: 4,
                alignItems: 'center'
              }}>
                <Text style={styles[item.check_diagnostic_card_period_color]}>{ 'дней осталось: ' + item.check_diagnostic_card_date_to_left }</Text>
              </View>
              <View style={{
                flex: 3,
                alignItems: 'center'
              }}>
                <Text style={styles[item.check_diagnostic_card_period_color]}>{ 'до ' + item.check_diagnostic_card_date_to_str }</Text>
              </View>  
            </>  
            ) : (          
            <View style={{
              flex: 7,
              alignItems: 'center'
            }}>
              <Text style={styles[item.check_diagnostic_card_period_color]}>{ item.check_diagnostic_card_string }</Text>
            </View>
            ) }
          </View>) : null }                    

        </View>
      </Pressable>
    );
  }

  renderOtherUserItem = (item, index) => {

    return (

      <Pressable style={{
        paddingTop: 10,
        paddingBottom: 10,
      }}
        key={item.id}
        onPress={() => this.setCurrentInn(item, index)}
      >
        <View style={{
          flexDirection: "row",
          alignItems: "stretch"
        }}>              
          <View style={{
            flex: 1,
            alignItems: 'center',
            padding: 5
          }}>
            <>
              <Image source={require('../images/menu_left_other_user.png')} />
              { item.notification_unviewed_count > 0 ? (
                <View style={{ 
                  flexDirection: "row",
                  position: 'absolute',
                  top: 17,
                  left: 17, 
                  backgroundColor: '#EE505A', 
                  borderRadius: 12
                }}>
                  <Text style={{ 
                    flex: 1,
                    textAlign: "center",
                    fontSize: 12,
                    fontWeight: "bold", 
                    color: "#FFFFFF",
                    margin: 2
                  }} numberOfLines={1}>{ item.notification_unviewed_count }</Text>
                </View> ) : null
              }
            </>
          </View>
          <View style={{
            flex: 7,
            alignItems: 'left',
            paddingLeft: 10,
          }}>

            { item.user_confirmed == 1 && item.phone_inn_confirmed == 1 ? (
                <>
                  <Text style={{ fontSize: 14, fontWeight: "bold", color: "#3A3A3A" }}>{item.firm}</Text>
                  <Text style={{ fontSize: 12, fontWeight: "normal", color: "#3A3A3A" }}>инн: {item.inn}</Text>
                  <Text style={{ fontSize: 12, fontWeight: "normal", color: "#3A3A3A" }}>количество авто: {item.user_auto_count}</Text>
                </> 
              ) : (
                <>
                  <Text style={{ fontSize: 14, fontWeight: "normal", color: "#656565" }}>{item.firm}</Text>
                  <Text style={{ fontSize: 12, fontWeight: "normal", color: "#656565" }}>инн: {item.inn}</Text>
                  <Text style={{ fontSize: 12, fontWeight: "normal", color: "#3A3A3A" }}>количество авто: {item.user_auto_count}</Text>
                </> 
              )
            }

            { item.user_confirmed == 0 ? (
                <Text style={{ fontSize: 12, fontWeight: "normal", color: "#656565" }}>инн ожидает подтверждения</Text>
              ) : null
            }

            { item.phone_inn_confirmed == 0 ? (
                <Text style={{ fontSize: 12, fontWeight: "normal", color: "#656565" }}>телефон ожидает подтверждения</Text>
              ) : null
            }            
          </View>            
        </View>
      </Pressable>
    );
  }

  render() {
    return (

      <View style={this.setContainerStyle()}>

        { Object.keys(this.state.user_data).length != 0 ? ( <Text style={styles.header}>Мой автопарк</Text> ) : null }
        { Object.keys(this.state.user_data).length != 0 && Object.keys(this.state.manager_data).length != 0 ? (
          <Text style={styles.sub_header}>{this.state.user_data.firm}{"\n"}инн:{this.state.user_data.inn}</Text>
        ) : null }

        { this.state.auto_list.length != 0 ? (
            <TouchableHighlight
              style={styles.header_filter}
              activeOpacity={1}
              underlayColor="#ffffff"
              onPress={() => {
                console.log('find auto')
                this.setState({findAutoVisible: !this.state.findAutoVisible})
              }}>
              { this.state.findAutoVisible ? (
                  <Image source={require('../images/filter_2_open.png')} />
                ) : (
                  <Image source={require('../images/filter_2.png')} />
                )
              }
            </TouchableHighlight>
          ) : null
        }


        { this.state.indicator == false ? (
          <TouchableHighlight
              style={styles.header_back}
              activeOpacity={1}
              underlayColor="#ffffff"
              onPress={() => {
                console.log('-> call MenuLeft')
                this.setState({menuLeftVisible: true})
              }}>
              { this.state.user_data.other_user_notification_unviewed_count > 0 ? (  
                  <Image source={require('../images/menu_left_notification_unviewed.png')} /> 
                ) : (
                  <Image source={require('../images/menu_left.png')} /> 
                )
              }
          </TouchableHighlight> ) : null
        }

        { ( this.state.indicator == false ) && ( typeof(this.state.user_data) != 'undefined' ) ? (
          <TouchableHighlight
            style={styles.header_onboarding}
            activeOpacity={1}
            underlayColor="#ffffff"
            onPress={() => {
              console.log('-> move to NotificationList')
              this.props.navigation.navigate('NotificationList')
            }}>
              <>
                <Image source={require('../images/notification.png')} />
                { this.state.user_data.notification_unviewed_count > 0 ? (
                <View style={{ 
                  flexDirection: "row",
                  position: 'absolute',
                  top: 10,
                  left: 22, 
                  backgroundColor: '#EE505A', 
                  borderRadius: 12
                }}>
                  <Text style={{ 
                    flex: 1,
                    textAlign: "center",
                    fontSize: 12,
                    fontWeight: "bold", 
                    color: "#FFFFFF",
                    margin: 2
                  }} numberOfLines={1}>{ this.state.user_data.notification_unviewed_count }</Text>
                </View> ) : null
                }
              </>
          </TouchableHighlight> ) : null
        }

        {/* левое меню */}
        <Modal
          isVisible={this.state.menuLeftVisible}
          animationIn="slideInLeft"
          animationOut="slideOutLeft"
          onBackButtonPress={() => this.setState({menuLeftVisible: false})}
          onBackdropPress={() => this.setState({menuLeftVisible: false})}
          style={{
            //justifyContent: 'flex-end',
            flex: 1,
            flexDirection: 'column',
            alignItems: 'flex-start',
            margin: 0,
          }}
        >
          <View style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <View style={{
              backgroundColor: '#FFFFFF',
              alignItems: 'stretch',
              justifyContent: 'top',
              position: 'absolute',
              left: 0,
              width: 300,
              height: '100%',
            }}>
              <View style={{
                //flex: 1,
                backgroundColor: '#B8B8B8',
                alignItems: 'stretch',
                justifyContent: 'center',
                //position: 'absolute',
                //top: 0,
                width: '100%'
              }}>

                <Text style={{ paddingLeft: 16, paddingRight: 16, paddingTop: 24, fontSize: 16, fontWeight: "bold", color: "#FFFFFF" }}>{this.state.user_data.firm}</Text>

                <Text style={{ paddingLeft: 16, paddingRight: 16, fontSize: 12, fontWeight: "bold", color: "#FFFFFF" }}>инн: {this.state.user_data.inn}</Text>

                <Text style={{ paddingLeft: 16, paddingRight: 16, paddingBottom: 24, paddingTop: 10, fontSize: 12, fontWeight: "normal", color: "#FFFFFF" }}>+{this.state.user_data.phone}</Text>
              </View>

              {/* компании с другими инн, привязанные к телефону клиента */}  
              <View>
                {this.state.other_user_list.map((item, index) => this.renderOtherUserItem(item, index))}
              </View>
            
              <TouchableHighlight 
                style={{ paddingTop: 20, borderTopWidth: 1, borderTopColor: '#B8B8B8' }}
                activeOpacity={1}
                underlayColor='#FFFFFF'
                onPress={() => {
                  console.log('add account')
                  this.setState({menuLeftVisible: false})
                  this.props.navigation.navigate('Inn', { user_data: this.state.user_data })
                }}
                >
                <View style={{
                  flexDirection: "row",
                  alignItems: "stretch"
                }}>              
                  <View style={{
                    flex: 1,
                    alignItems: 'center',
                    height: 29,
                    padding: 5,
                    //backgroundColor: "#B8B8B8"
                  }}>
                    <Image source={require('../images/menu_left_add.png')} />
                  </View>
                  <View style={{
                    flex: 7,
                    alignItems: 'left',
                    height: 29,
                    paddingTop: 5,
                    paddingBottom: 5,
                    paddingLeft: 10,
                    //backgroundColor: "grey",
                  }}>
                    <Text style={{ fontSize: 14, fontWeight: "bold", color: "#3A3A3A" }}>Добавить аккаунт</Text>
                  </View>            
                </View>
              </TouchableHighlight>

              <TouchableHighlight 
                style={{ paddingTop: 20 }}
                activeOpacity={1}
                underlayColor='#FFFFFF'
                onPress={() => {
                  console.log('driver list')
                  this.setState({menuLeftVisible: false})
                  this.props.navigation.navigate('DriverList')
                }}
                >
                <View style={{
                  flexDirection: "row",
                  alignItems: "stretch"
                }}>              
                  <View style={{
                    flex: 1,
                    alignItems: 'center',
                    height: 29,
                    padding: 5,
                    //backgroundColor: "#B8B8B8"
                  }}>
                    <Image source={require('../images/menu_left_driver_list.png')} />
                  </View>
                  <View style={{
                    flex: 7,
                    alignItems: 'left',
                    height: 29,
                    paddingTop: 5,
                    paddingBottom: 5,
                    paddingLeft: 10,
                    //backgroundColor: "grey",
                  }}>
                    <Text style={{ fontSize: 14, fontWeight: "bold", color: "#3A3A3A" }}>Список водителей</Text>
                  </View>            
                </View>
              </TouchableHighlight>

              { this.state.onboarding_expired == 0 ? (
                <TouchableHighlight 
                  style={{ paddingTop: 20 }}
                  activeOpacity={1}
                  underlayColor='#FFFFFF'
                  onPress={() => {
                    console.log('-> move to OnBoarding')
                    this.setState({menuLeftVisible: false})
                    this.props.navigation.navigate('OnBoarding')
                  }}
                  >
                  <View style={{
                    flexDirection: "row",
                    alignItems: "stretch"
                  }}>              
                    <View style={{
                      flex: 1,
                      alignItems: 'center',
                      height: 29,
                      padding: 5,
                      //backgroundColor: "#B8B8B8"
                    }}>
                      <Image source={require('../images/menu_left_onboarding.png')} />
                    </View>
                    <View style={{
                      flex: 7,
                      alignItems: 'left',
                      height: 29,
                      paddingTop: 5,
                      paddingBottom: 5,
                      paddingLeft: 10,
                      //backgroundColor: "grey",
                    }}>
                      <Text style={{ fontSize: 14, fontWeight: "bold", color: "#3A3A3A" }}>Как работать в приложении?</Text>
                    </View>            
                  </View>
                </TouchableHighlight> ) : null
              }

            </View>
          </View>
        </Modal>

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
              backgroundColor: '#FFFFFF',
              borderRadius: 25,
              alignItems: 'stretch',
              justifyContent: 'center',
              borderWidth: 1, 
              borderColor: "#B8B8B8",
              //marginTop: 70
            }}>

              <Text style={{ paddingLeft: 16, paddingRight: 16, paddingTop: 24, fontSize: 16, fontWeight: "normal", color: "#313131" }}>Удалить {this.state.marked_cnt} авто? Действие нельзя будет отменить</Text>

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
                      style={{ height: 50, fontSize: 10, margin: 25, borderRadius: 5, alignItems: 'center', justifyContent: 'center', backgroundColor: "#3A3A3A" }}
                      onPress={() =>  {
                        console.log('call del_auto')
                        AsyncStorage.getItem('token').then((value) => this.delAuto(value));
                      }}>
                      <Text style={{ paddingLeft: 20, paddingRight: 20, fontSize: 14, fontWeight: 'bold', color: "#FFFFFF" }}>Удалить</Text>
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
                      <Text style={{ paddingLeft: 20, paddingRight: 20, fontSize: 14, fontWeight: 'bold', color: "#313131" }}>Отменить</Text>
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
              marginTop: 20,
              marginBottom: 20,
            }}>

              <View style={{
                //flex: 1,
                backgroundColor: '#FFFFFF',
                borderRadius: 25,
                alignItems: 'stretch',
                justifyContent: 'center',
                borderWidth: 1, 
                borderColor: "#B8B8B8",
                //marginTop: 70
              }}>

                <View style={{
                  flexDirection: "row",
                }}>
                  <View style={{
                    flex: 5,
                    alignItems: 'flex-start',
                  }}>
                    <Text style={{ paddingLeft: 16, paddingTop: 26, fontSize: 24, fontWeight: "bold", color: "#313131" }}>Добавить авто</Text>
                  </View>
                  <View style={{
                    flex: 1,
                    alignItems: 'flex-end',
                  }}>
                    <TouchableHighlight
                      style={{ padding: 30 }}
                      activeOpacity={1}
                      underlayColor='#FFFFFF'
                      onPress={() => this.modalAddAutoCancel()}>
                      <Image source={require('../images/xclose_2.png')} />
                    </TouchableHighlight>
                  </View>
                </View>

                <Text style={{ paddingLeft: 16, paddingRight: 16, paddingTop: 14, fontSize: 16, fontWeight: "normal", color: "#4C4C4C" }}>Добавьте данные автомобиля и Вы сможете подать заявку на получение пропуска. {"\n"}{"\n"} Проверяйте сроки действия пропусков, полиса ОСАГО, диагностической карты, наличие штрафов по Вашему автомобилю</Text>

                <View style={{
                  //flex: 1,
                  //backgroundColor: 'grey',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>

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
                    <Text style={{ fontSize: 12, fontWeight: "normal", color: "#313131" }}>Государственный регистрационный знак:</Text>
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
                          backgroundColor: '#FFFFFF',
                          height: 80,
                          borderBottomLeftRadius: 8,
                          borderTopLeftRadius: 8,
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderWidth: 1, 
                          borderColor: "#B8B8B8",
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
                          flex: 1,
                          backgroundColor: '#B8B8B8',
                          height: 80,
                        }}>
                        </View>
                        <View style={{
                          flex: 114,
                          flexDirection: "column",
                          backgroundColor: '#FFFFFF',
                          height: 80,
                          borderBottomRightRadius: 8,
                          borderTopRightRadius: 8,
                          alignItems: 'center',
                          borderWidth: 1, 
                          borderColor: "#B8B8B8",
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
                    <Text style={{ fontSize: 12, fontWeight: "normal", color: "#313131" }}>Свидетельство о регистрации ТС:</Text>
                    <View style={{
                      alignItems: 'center',
                      paddingTop: 20,
                    }}>
                      <View style={{
                        width: 305,
                        height: 80,
                        justifyContent: 'center',
                      }}>

                        {
                          this.state.sts_by_auto_number_indicator ? (
                            <ActivityIndicator size="large" color="#313131" animating={true}/>
                          ) : (
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
                          )
                        }

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

        {/*  фильтр по авто */}
        { this.state.findAutoVisible ? (

            <View style={[{
              flexDirection: "column",
              borderRadius: 8,
              borderWidth: 1,
              borderColor: "#B8B8B8",
              marginLeft: 20,
              marginRight: 20,
              marginTop: 20 }, 
              {
                backgroundColor: this.state.modalViewContacts || 
                                 this.state.modalAddAutoVisible ||
                                 this.state.modalDelAutoVisible ? 'rgba(29,29,29, 0)' : "#FFFFFF"
              } 
            ]}>            
              <View style={{
                flexDirection: "row",
                borderRadius: 8,
                borderWidth: 1,
                borderColor: "#B8B8B8",
                marginLeft: 20,
                marginRight: 20,
                marginTop: 20,
                marginBottom: 15,
                height: 50
              }}>
                <View style={{
                  flex: 5,
                  justifyContent: 'center',
                }}>
                  <TextInput
                    ref="autoInput"
                    style={{ paddingLeft: 20, fontSize: 16, color: "#313131" }}
                    placeholder = 'введите номер авто'
                    placeholderTextColor={'#313131'}
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
                    activeOpacity={1}
                    underlayColor="#ffffff"
                    onPress={() => this.clearAutoStr()}
                    >
                    <Image source={require('../images/clear_2.png')} />
                  </TouchableHighlight>
                </View>
              </View> 
              <Text style={{ paddingLeft: 20, marginBottom: 15, fontSize: 14, fontWeight: "bold", color: "#313131" }}>Пропуск:</Text>
              <TouchableHighlight
                style={{
                  marginBottom: 15
                }}
                activeOpacity={1}
                underlayColor="#ffffff"
                onPress={() => { this.setState({auto_cancelled: this.state.auto_cancelled ? false : true }, () => this.findAuto()) }}
                >
                  <View style={{
                    flexDirection: "row",
                  }}>
                    {
                      this.state.auto_cancelled ? (
                        <Image style={{ marginLeft: 20 }} source={require('../images/checkbox_checked_2.png')} />
                      ) : (
                        <Image style={{ marginLeft: 20 }} source={require('../images/checkbox_unchecked_2.png')} />
                      )
                    }
                    <Text style={{ paddingLeft: 10, fontSize: 14, fontWeight: "normal", color: "#313131" }}>аннулирован</Text>
                  </View>
              </TouchableHighlight>
              <TouchableHighlight
                style={{
                  marginBottom: 15
                }}
                activeOpacity={1}
                underlayColor="#ffffff"
                onPress={() => { this.setState({auto_pass_ended: this.state.auto_pass_ended ? false : true }, () => this.findAuto()) }}
                >
                  <View style={{
                    flexDirection: "row",
                  }}>
                    {
                      this.state.auto_pass_ended ? (
                        <Image style={{ marginLeft: 20 }} source={require('../images/checkbox_checked_2.png')} />
                      ) : (
                        <Image style={{ marginLeft: 20 }} source={require('../images/checkbox_unchecked_2.png')} />
                      )
                    }
                    <Text style={{ paddingLeft: 10, fontSize: 14, fontWeight: "normal", color: "#313131" }}>закончился</Text>
                  </View>
              </TouchableHighlight>
              <TouchableHighlight
                style={{
                  marginBottom: 15
                }}
                activeOpacity={1}
                underlayColor="#ffffff"
                onPress={() => this.changeAutoPassEndsValue()}
                >
                  <View style={{
                    flexDirection: "row",
                  }}>
                    {
                      this.state.auto_pass_ends ? (
                        <Image style={{ marginLeft: 20 }} source={require('../images/checkbox_checked_2.png')} />
                      ) : (
                        <Image style={{ marginLeft: 20 }} source={require('../images/checkbox_unchecked_2.png')} />
                      )
                    }
                    <Text style={{ paddingLeft: 10, paddingRight: 10, fontSize: 14, fontWeight: "normal", color: "#313131" }}>заканчивается до</Text>
                    <TextInput
                      keyboardType='numeric'
                      style={{ height: 45, fontSize: 16, paddingLeft: 10, paddingRight: 10, borderColor: '#656565', borderWidth: 1, borderRadius: 8, color: "#313131" }}
                      maxLength={10}
                      placeholder = '00.00.0000'
                      placeholderTextColor={'#8C8C8C'}
                      onChangeText={(value) => this.changeAutoPassEndsUntilDateValue(value)}
                      value={this.state.auto_pass_ends_until_date}
                    />
                  </View>
              </TouchableHighlight>
            </View>
            
            ) : null
        }

        {/* список авто */}
        <ActivityIndicator size="large" color="#313131" animating={this.state.indicator}/>

        { !this.state.indicator ? (
        <View style={{
          flexDirection: "row",
        }}>
          <View style={{
            flex: 1,
            alignItems: 'flex-start',
            justifyContent: 'center',
          }}>
            <Text style={{ paddingLeft: 30, paddingRight: 16, paddingBottom: 10, fontSize: 12, fontWeight: "normal", color: "#656565" }}>Всего {this.state.auto_list_count} авто:</Text>
          </View>
          <View style={{
            flex: 1,
            alignItems: 'flex-end',
            justifyContent: 'center',
          }}>
            <TouchableHighlight
              style={{
                paddingRight: 30,
              }}
              activeOpacity={1}
              underlayColor="#ffffff"
              onPress={() => this.setState({ modalAddAutoVisible: true })}> 
              <View style={{
                flexDirection: "row",
                alignItems: 'right',
              }}
              >
                <Text style={{ paddingLeft: 16, paddingRight: 5, paddingBottom: 10, fontSize: 12, fontWeight: "normal", color: "#656565" }}>добавить авто</Text>
                <Image source={require('../images/edit_2.png')} />
              </View>
            </TouchableHighlight>
          </View>
        </View> ) : null }

        <FlatList
          data={this.state.auto_list}
          initialNumToRender={10}
          renderItem={({item, index}) => this.renderItem({item, index})}
          keyExtractor={item => item.id}
          onEndReachedThreshold={0.2}
          onEndReached={this.onEndReached.bind(this)}
          onMomentumScrollBegin={() => { this.onEndReachedCalledDuringMomentum = false; }}
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
          style={{
            justifyContent: 'flex-end',
            margin: 0,
          }}
        >
          <View style={{
            flexDirection: "row",
            backgroundColor: '#FFFFFF',
            borderTopLeftRadius: 25,
            borderTopRightRadius: 25,
            position: 'absolute',
            borderWidth: 1, 
            borderColor: "#B8B8B8",
            bottom: 0,
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
                  <Text style={{ paddingLeft: 16, paddingTop: 26, fontSize: 24, fontWeight: "bold", color: "#313131" }}>Контакты</Text>
                </View>
                <View style={{
                  flex: 1,
                  alignItems: 'flex-end',
                }}>
                  <TouchableHighlight
                    style={{ padding: 30 }}
                    activeOpacity={1}
                    underlayColor='#FFFFFF'
                    onPress={() => {
                      this.setState({modalViewContacts: false })
                    }}
                    >
                    <Image source={require('../images/xclose_2.png')} />
                  </TouchableHighlight>
                </View>
              </View>

              {/* менеджер */}
              <View style={{ 
                flexDirection: "row", 
                marginLeft: 20, 
                marginRight: 20, 
                padding: 10, 
                backgroundColor: "#F7F7F7", 
                borderRadius: 16,             
                borderWidth: 1, 
                borderColor: "#B8B8B8" }}>
                <View style={{
                  flex: 1,
                  flexDirection: "column",
                }}>
                  <Text style={{ paddingTop: 10, fontSize: 17, fontWeight: 'normal', color: "#313131"}}>Менеджер</Text>
                  <Text style={{ paddingTop: 5, fontSize: 15, fontWeight: 'bold', color: "#3A3A3A"}}>{this.state.manager_name}</Text>

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
                        activeOpacity={1}
                        underlayColor="#F7F7F7"     
                        onPress={() => this.contactEmail(this.state.user_data.manager_data.email,
                                                         this.state.user_data.manager_data.email_subject,
                                                         this.state.user_data.manager_data.email_body )}
                        >
                        <View style={{ alignItems: 'center', padding: 5 }}>
                          <Image source={require('../images/contact_mail_2.png')} />
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
                        activeOpacity={1}
                        underlayColor="#F7F7F7"  
                        onPress={() => this.contactPhone(this.state.user_data.manager_data.mobile_phone)}
                        >
                        <View style={{ alignItems: 'center', padding: 5 }}>
                          <Image source={require('../images/contact_phone_2.png')} />
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
                        activeOpacity={1}
                        underlayColor="#F7F7F7"  
                        onPress={() => this.contactWhatsapp(this.state.user_data.manager_data.mobile_phone,
                                                            this.state.user_data.manager_data.whatapp_greetings)}
                        >
                        <View style={{ alignItems: 'center', padding: 5 }}>
                          <Image source={require('../images/contact_whatsapp_2.png')} />
                        </View>
                      </TouchableHighlight>
                    </View>
                  </View>

                </View>
              </View>

              {/* техподдержка */}
              <View style={{ 
                flexDirection: "row", 
                margin: 20, 
                padding: 10, 
                backgroundColor: "#F7F7F7", 
                borderRadius: 16,             
                borderWidth: 1, 
                borderColor: "#B8B8B8" }}>
                <View style={{
                  flex: 1,
                  flexDirection: "column",
                }}>
                  <Text style={{ paddingTop: 10, fontSize: 17, fontWeight: 'normal', color: "#313131"}}>Техническая поддержка</Text>
                  <Text style={{ paddingTop: 5, fontSize: 15, fontWeight: 'bold', color: "#3A3A3A"}}>{this.state.tech_support_name}</Text>

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
                        activeOpacity={1}
                        underlayColor="#F7F7F7"  
                        onPress={() => this.contactEmail(this.state.user_data.tech_support_data.email,
                                                         this.state.user_data.tech_support_data.email_subject,
                                                         this.state.user_data.tech_support_data.email_body )}
                        >
                        <View style={{ alignItems: 'center', padding: 5 }}>
                          <Image source={require('../images/contact_mail_2.png')} />
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
                        activeOpacity={1}
                        underlayColor="#F7F7F7"  
                        onPress={() => this.contactPhone(this.state.user_data.tech_support_data.mobile_phone)}
                        >
                        <View style={{ alignItems: 'center', padding: 5 }}>
                          <Image source={require('../images/contact_phone_2.png')} />
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
                        activeOpacity={1}
                        underlayColor="#F7F7F7"  
                        onPress={() => this.contactWhatsapp(this.state.user_data.tech_support_data.mobile_phone,
                                                            this.state.user_data.tech_support_data.whatapp_greetings)}
                        >
                        <View style={{ alignItems: 'center', padding: 5 }}>
                          <Image source={require('../images/contact_whatsapp_2.png')} />
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
                  backgroundColor: '#EEEEEE',
                  borderRadius: 25,
                  borderWidth: 1, 
                  borderColor: "#B8B8B8",
                  height: 80,
                }}>
                  <View style={{
                    flex: 1,
                    height: 80,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                  <TouchableHighlight
                      activeOpacity={1}
                      underlayColor='#EEEEEE'
                      onPress={() => this.setState({ modalAddAutoVisible: true }) }
                      >
                      <SelMenuPass />  
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
                      activeOpacity={1}
                      underlayColor='#EEEEEE'
                      onPress={() => {
                        console.log('-> menu driver')
                        this.props.navigation.navigate('DriverList')
                      }}
                      >
                      <MenuDriver />
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
                      activeOpacity={1}
                      underlayColor='#EEEEEE'
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
                      activeOpacity={1}
                      underlayColor='#EEEEEE'
                      onPress={() => {
                        console.log('-> move to invite user')
                        this.props.navigation.navigate('InviteUser', { manager_data: this.state.user_data.manager_data })
                      }}>
                      <MenuInviteUser />
                    </TouchableHighlight>
                  </View>

                  <View style={{
                    flex: 1,
                    height: 80,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <TouchableHighlight
                      activeOpacity={1}
                      underlayColor='#EEEEEE'
                      onPress={() => this.openContacts()}
                      >
                      { this.state.modalViewContacts ? ( <MenuSelContacts/> ) : ( <MenuContacts/> ) }
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
                  backgroundColor: '#D9D9D9',
                  borderRadius: 25,
                  borderWidth: 1, 
                  borderColor: "#B8B8B8",
                  height: 80,
                }}>
                  <View style={{
                    flex: 1,
                    height: 80,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <TouchableHighlight
                      activeOpacity={1}
                      underlayColor='#D9D9D9'
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
                      activeOpacity={1}
                      underlayColor='#D9D9D9'
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
                      activeOpacity={1}
                      underlayColor='#D9D9D9'
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
