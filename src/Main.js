import React from 'react';
import { StyleSheet, View, Text, Image, TouchableOpacity, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-community/async-storage';

import Api from "./utils/Api";

class Main extends React.Component {

  constructor(props) {
    super(props);
  }

  checkToken = (value) => {
    console.log('checkToken. value = ' + value)

    if(!value)
    {
      console.log('null')

      this.props.navigation.navigate('Auth')
    }

    Api.post('/check-session', { token: value })
       .then(res => {

          const data = res.data;
          console.log(data);

          if(data.auth_required == 1)
          {
            this.props.navigation.navigate('Auth')
          }
          else
          {
            this.props.navigation.navigate('AutoList')
          }

        })
        .catch(error => {
            console.log('error');
        });

  }

  componentDidMount() {
    console.log('Main DidMount')
    AsyncStorage.getItem('token').then((value) => this.checkToken(value));
  }

  render() {
    return (

      <View style={styles.container}>

        <ActivityIndicator size="large" color="#C9A86B" animating={true}/>

        {/*
        <Text style={{ paddingLeft: 20, paddingTop: 11, fontSize: 28, fontWeight: "bold", color: "#E8E8E8" }}>Главный экран</Text>

        <View style={{
          flexDirection: "row",
          padding: 10,
        }}>
          <View style={styles.service}>
            <Image source={require('../images/exclamation_triangle_circle.png')}/>
            <Text style={{ paddingLeft: 10, paddingTop: 10, fontSize: 12, fontWeight: "bold", color: "#E8E8E8" }}>Проверка пропусков</Text>
          </View>
        </View>

        <TouchableOpacity
          style={{ height: 50, fontSize: 10, margin: 25, borderRadius: 5, alignItems: 'center', justifyContent: 'center', backgroundColor: "#C9A86B" }}
          onPress={() => {
              console.log('-> move to AutoList')
              this.props.navigation.navigate('AutoList')
            }
          }
        >
          <Text style={{ fontSize: 24, color: "#E8E8E8" }}>Ваш автотранспорт</Text>
        </TouchableOpacity>
        */}

      </View>
    );
  }
}

// ...

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#2c2c2c',
    //alignItems: 'stretch',
    //justifyContent: 'flex-start',
    alignItems: 'center',
    justifyContent: 'center',
  },

});

export default Main;
