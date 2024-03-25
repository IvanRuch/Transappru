import React from 'react';
import { Text, View, Image, TouchableOpacity, TouchableHighlight, Modal, TextInput, ImageBackground, ActivityIndicator,  FlatList, Pressable, ScrollView, Share } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
//import Share from "react-native-share";

import styles from './styles/Styles.js';
import Api from "./utils/Api";

class InviteUser extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      invite_user_data: { firm: '', inn: '', fio: '', phone: '', email: '' },
      modalAddButtonDisabled: true,
    };
  }

  /* */
  onShare = (msg) => {

    console.log('onShare...')

    try {
      const result = Share.share({
        message: msg,
      });
      if (result.action === Share.sharedAction) {
        if (result.activityType) {
          // shared with activity type of result.activityType
        } else {
          // shared
        }
      } else if (result.action === Share.dismissedAction) {
        // dismissed
      }
    } catch (error) {
      //Alert.alert(error.message);
    }
  }

  inviteUser = (value) => {
    console.log('inviteUser. value = ' + value)

    Api.post('/invite-user', { token: value,
                               firm: this.state.invite_user_data.firm,
                               inn: this.state.invite_user_data.inn,
                               fio: this.state.invite_user_data.fio,
                               phone: this.state.invite_user_data.phone })
       .then(res => {

          const data = res.data;
          console.log(data);

          if(data.auth_required == 1)
          {
            this.props.navigation.navigate('Auth')
          }
          else
          {
            console.log('data.msg');
            console.log(data.msg);

            this.onShare(data.msg);
          }
        })
        .catch(error => {
          console.log('error.response.status = ' + error.response.status);
          if(error.response.status == 401) { this.props.navigation.navigate('Auth') }
        });

  }

  changeValue = (value, field) => {
    console.log('changeValue. field = ' + field + ' | value = ' + value)

    let invite_user_data_new = this.state.invite_user_data

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
      invite_user_data_new[field] = value
    }
    else
    {
      invite_user_data_new[field] = value
    }

    console.log('value(res) = ' + value)

    //
    this.setState({invite_user_data: invite_user_data_new})

    if(this.state.invite_user_data.firm != '' && this.state.invite_user_data.fio != '' && this.state.invite_user_data.inn.match(/^(\d{10})$|^(\d{12})$/) && this.state.invite_user_data.phone.match(/\+7(\d{10})/))
    {
      this.setState({modalAddButtonDisabled: false})
    }
    else
    {
      this.setState({modalAddButtonDisabled: true})
    }
  };

  setInviteUserButtonStyle = () => {
    let backgroundColor = this.state.modalAddButtonDisabled ? "#c0c0c0" : "#C9A86B";
    return { position: 'absolute', left: 10, bottom: 10, right: 10, height: 50, fontSize: 10, margin: 25, borderRadius: 5, alignItems: 'center', justifyContent: 'center', backgroundColor: backgroundColor }
  }

  setInviteUserTextStyle = () => {
    let color = this.state.modalAddButtonDisabled ? "#E8E8E8" : "#E8E8E8";
    return { fontSize: 24, color: color }
  }

  setBorderBottomStyle = (field) => {

    let color, width;

    if(field == 'phone')
    {
      color = this.state.invite_user_data.phone.match(/\+7(\d{10})/) ? "#E8E8E8" : "#960000"
      width = this.state.invite_user_data.phone.match(/\+7(\d{10})/) ? 1 : 2
    }

    if(field == 'firm')
    {
      color = this.state.invite_user_data.firm != '' ? "#E8E8E8" : "#960000"
      width = this.state.invite_user_data.firm != '' ? 1 : 2
    }

    if(field == 'fio')
    {
      color = this.state.invite_user_data.fio != '' ? "#E8E8E8" : "#960000"
      width = this.state.invite_user_data.fio != '' ? 1 : 2
    }

    if(field == 'inn')
    {
      color = this.state.invite_user_data.inn.match(/^(\d{10})$|^(\d{12})$/) ? "#E8E8E8" : "#960000"
      width = this.state.invite_user_data.inn.match(/^(\d{10})$|^(\d{12})$/) ? 1 : 2
    }

    return { height: 55, fontSize: 20, borderBottomColor: color, borderBottomWidth: width, color: "#E8E8E8" }
  }

  componentDidMount() {
    console.log('InviteUser DidMount')
  }

  /* */

  render() {
    return (

      <View style={styles.container}>

        <Text style={styles.header}>Пригласи друга</Text>

        <TouchableHighlight
          style={styles.header_back}
          onPress={() => {
            console.log('-> move to AutoList')
            this.props.navigation.navigate('AutoList')
          }}>
          <Image source={require('../images/back.png')} />
        </TouchableHighlight>

        <ScrollView>

          <Text style={{ paddingLeft: 20, paddingRight: 20, paddingTop: 20, fontSize: 15, fontWeight: "normal", color: "#E8E8E8" }}>Название организации *:</Text>

          <View style={{
            alignItems: 'stretch',
            paddingLeft: 30,
            paddingRight: 30,
          }}>
            <TextInput
              style={this.setBorderBottomStyle('firm')}
              onChangeText={(value) => this.changeValue(value, 'firm')}
              value={this.state.invite_user_data.firm}
            />
          </View>

          <Text style={{ paddingLeft: 20, paddingRight: 20, paddingTop: 30, fontSize: 15, fontWeight: "normal", color: "#E8E8E8" }}>ИНН *:</Text>

          <View style={{
            alignItems: 'stretch',
            paddingLeft: 30,
            paddingRight: 30,
          }}>
            <TextInput
              keyboardType='numeric'
              style={this.setBorderBottomStyle('inn')}
              maxLength={12}
              onChangeText={(value) => this.changeValue(value, 'inn')}
              value={this.state.invite_user_data.inn}
            />
          </View>

          <Text style={{ paddingLeft: 20, paddingRight: 20, paddingTop: 30, fontSize: 15, fontWeight: "normal", color: "#E8E8E8" }}>ФИО *:</Text>

          <View style={{
            alignItems: 'stretch',
            paddingLeft: 30,
            paddingRight: 30,
          }}>
            <TextInput
              style={this.setBorderBottomStyle('fio')}
              onChangeText={(value) => this.changeValue(value, 'fio')}
              value={this.state.invite_user_data.fio}
            />
          </View>

          <Text style={{ paddingLeft: 20, paddingRight: 20, paddingTop: 30, fontSize: 15, fontWeight: "normal", color: "#E8E8E8" }}>Номер телефона *:</Text>

          <View style={{
            alignItems: 'stretch',
            paddingLeft: 30,
            paddingRight: 30,
          }}>
            <TextInput
              style={this.setBorderBottomStyle('phone')}
              maxLength={12}
              onChangeText={(value) => this.changeValue(value, 'phone')}
              value={this.state.invite_user_data.phone}
            />
          </View>

          {/*
          <Text style={{ paddingLeft: 20, paddingRight: 20, paddingTop: 30, fontSize: 15, fontWeight: "normal", color: "#E8E8E8" }}>E-mail:</Text>

          <View style={{
            alignItems: 'stretch',
            paddingLeft: 30,
            paddingRight: 30,
          }}>
            <TextInput
              style={{ height: 55, fontSize: 20, borderBottomColor: '#960000', borderBottomWidth: 2, color: "#E8E8E8" }}
              maxLength={12}
              onChangeText={(value) => this.changeValue(value, 'email')}
              value={this.state.phone}
            />
          </View>
          */}

        </ScrollView>

        {
          this.state.modalAddButtonDisabled ? null : (

            <TouchableHighlight
              disabled={this.state.modalAddButtonDisabled}
              style={this.setInviteUserButtonStyle()}
              onPress={() =>  {
                console.log('call set_invite_user')
                AsyncStorage.getItem('token').then((value) => this.inviteUser(value));
              }}>
              <Text style={this.setInviteUserTextStyle()}>Отправить приглашение</Text>
            </TouchableHighlight>

          )
        }

      </View>
    );
  }
}

export default InviteUser;
