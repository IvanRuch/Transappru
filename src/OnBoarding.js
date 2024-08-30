import React from 'react';
import { Text, View, Image, TouchableOpacity, TouchableHighlight, Modal, TextInput, ImageBackground, ActivityIndicator,  FlatList, Pressable, ScrollView, Share } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import styles from './styles/Styles.js';
import Api from "./utils/Api";

class OnBoarding extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      invite_user_data: { firm: '', inn: '', fio: '', phone: '', email: '' },
      modalAddButtonDisabled: true,

      current: 0,
      screen_current: {
        msg: '',
        src: require('../images/1x1.png')
      },
      src: '../images/ellipse_2.png',
      screens: [
        { msg: 'Добавляйте авто', src: require('../images/onboarding1.png') },
        { msg: 'Проверяйте штрафы, ОСАГО, диагностические карты', src: require('../images/onboarding2.png') },
        { msg: 'Заказывайте пропуска на транспорт', src: require('../images/onboarding3.png') },
        { msg: 'Добавляйте файлы', src: require('../images/onboarding4.png') },
      ]

    };
  }

  renderEllipseItem = (item, index) => {

    return (

      index == this.state.current ? (
          <Image key={index} style={{ margin: 5 }} source={require('../images/ellipse_active_2.png')} />
        ) : (
          <Image key={index} style={{ margin: 5 }} source={require('../images/ellipse_2.png')} />
        )


    );

  }

  tapNext = () => {
    console.log('tapNext')

    let current = this.state.current + 1

    if(current >= this.state.screens.length)
    {
      this.props.navigation.navigate('AutoList')
    }
    else
    {
      this.showScreen(current)
    }
  }

  showScreen = (current) => {
    console.log('showScreen, current = ' + current)

    this.setState({ current: current, screen_current: this.state.screens[current] })
  }

  getOnboarding = (value) => {
    console.log('getOnboarding. value = ' + value)

    if(!value)
    {
      console.log('null')
      this.props.navigation.navigate('Auth')
    }

    else
    {
      Api.post('/get-onboarding', { token: value })
          .then(res => {

            const data = res.data;
            console.log('data')
            console.log(data);
          })
          .catch(error => {
            console.log('error.response.status = ' + error.response.status);
            if(error.response.status == 401) { this.props.navigation.navigate('Auth') }
          });
    }
  }

  componentDidMount() {
    console.log('OnBoarding DidMount')

    this.showScreen(0)

    AsyncStorage.getItem('token').then((value) => this.getOnboarding(value));
  }

  /* */

  render() {
    return (

      <View style={styles.container}>

        <View style={{
            position: 'absolute',
            backgroundColor: '#EEEEEE',
            borderRadius: 5, 
            left: 20,
            right: 20,
            top: 70,
            bottom: 220,
            alignItems: 'center',
            justifyContent: 'center',
        }}>
          <Image style={{ 
            margin: 5, 
            height: '90%', 
          }} source={ this.state.screen_current.src } 
          resizeMode='contain'/>      
        </View>

        <Text style={{ 
          position: 'absolute',
          textAlign: 'center',
          bottom: 150,
          left: 20,
          right: 20,
          fontSize: 20, 
          fontWeight: 600, 
          color: "#313131" 
        }}>{ this.state.screen_current.msg }</Text>

        <View style={{
            position: 'absolute',
            bottom: 120,
            height: 10, 
            left: 20,
            right: 20,
            alignItems: 'center',
        }}>
            <View style={{
                flex: 1,
                flexDirection: "row",
                alignItems: 'center'
            }}>
                {this.state.screens.map((item, index) => this.renderEllipseItem(item, index))}
            </View>
        </View>

        <TouchableOpacity
            style={{ position: 'absolute', bottom: 50, left: 20, right: 20, height: 50, fontSize: 10, borderRadius: 5, alignItems: 'center', justifyContent: 'center', backgroundColor: "#3A3A3A" }}
            onPress={() =>  { this.tapNext() }}
            >
            <Text style={{ paddingLeft: 20, paddingRight: 20, fontSize: 14, fontWeight: 'bold', color: "#FFFFFF" }}>Далее</Text>
        </TouchableOpacity>

      </View>
    );
  }
}

export default OnBoarding;
