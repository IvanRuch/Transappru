import React from 'react';
import { StyleSheet, Text, View, Image, TouchableOpacity, TouchableHighlight, Modal, TextInput, ImageBackground, ActivityIndicator,  FlatList, Pressable, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import styles from './styles/Styles.js';
import Api from "./utils/Api";

class AutoDriver extends React.Component {

  constructor(props) {
    super(props);

    this.state = {
      indicator: false,
      user_driver_list: [],
      auto_list: props.route.params.auto_list,
    };
  }

  /* */
  getDriverList = (value) => {
    console.log('getDriverList. value = ' + value)

    if(!value)
    {
      console.log('null')

      this.props.navigation.navigate('Auth')
    }

    else
    {
      this.setState({indicator: true})

      Api.post('/get-driver-list', { token: value })
         .then(res => {

            const data = res.data;
            console.log(data);

            if(data.auth_required == 1)
            {
              this.props.navigation.navigate('Auth')
            }
            else
            {
              this.setState({indicator: false, user_driver_list: data.user_driver_list})
            }
          })
          .catch(error => {
            console.log('error.response.status = ' + error.response.status);
            if(error.response.status == 401) { this.props.navigation.navigate('Auth') }
          });
    }
  }

  componentDidMount() {
    console.log('AutoDriver DidMount')

    AsyncStorage.getItem('token').then((value) => this.getDriverList(value));
  }

  /* */

  renderDriverItem = (item, index) => {

    //console.log('renderItem')
    //console.log({item})
    //console.log('item.id = ' + item.id + ' | index = ' + index)

    return (

      <Pressable
        key={item.id}
        //onPress={() => this.openModalEditDriver( 'edit', item )}
      >
        <View style={{ flexDirection: "row", margin: 20, padding: 10, backgroundColor: "#2C2C2C", borderRadius: 8 }}>
          <View style={{
            flex: 3,
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: "column",
          }}>
            <Image source={require('../images/driver.png')}/>
          </View>
          <View style={{
            flex: 5,
            flexDirection: "column",
            paddingLeft: 10,
          }}>
            <Text style={{ color: "#E8E8E8"}}>{item.name_f} {item.name_i} {item.name_o}</Text>
          </View>
          <View style={{
            flex: 1,
            alignItems: 'flex-end',
            justifyContent: 'flex-end',
          }}>
            {/*<Image source={require('../images/edit.png')}/>*/}
          </View>
        </View>
      </Pressable>
    );
  }

  /* */
  renderItem = (item) => {

    return (

      <View
        key={item.id}
        style={{ flexDirection: "row", margin: 20, padding: 10, backgroundColor: "#2C2C2C", borderRadius: 8 }}
      >
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
            <Text style={{ color: "#E8E8E8"}}>Пропуск - {item.check_passes_string}</Text>
          </View>

          <View style={{
            flexDirection: "row",
          }}>
            <Text style={{ color: "#E8E8E8"}}>Штрафы - {item.check_fines_string}</Text>
          </View>

          <View style={{
            flexDirection: "row",
          }}>
            <Text style={{ color: "#E8E8E8"}}>ДК - {item.check_diagnostic_card_string}</Text>
          </View>

          <View style={{
            flexDirection: "row",
          }}>
            <Text style={{ color: "#E8E8E8"}}>ОСАГО - {item.check_osago_string}</Text>
          </View>

        </View>
        <View style={{
          flex: 1,
          alignItems: 'flex-end',
          justifyContent: 'flex-end',
        }}>
          <Image source={require('../images/emojione-v1_right-arrow.png')}/>
        </View>
      </View>
    );

  }

  render() {
    return (

      <View style={styles.container}>

        <Text style={styles.header}>Назначить водителя</Text>

        <TouchableHighlight
          style={styles.header_back}
          onPress={() => {
            console.log('-> move to AutoList')
            this.props.navigation.navigate('AutoList')
          }}>
          <Image source={require('../images/back.png')} />
        </TouchableHighlight>



        <ScrollView>

          <ActivityIndicator size="large" color="#C9A86B" animating={this.state.indicator}/>

          <View>
            {this.state.user_driver_list.map((item, index) => this.renderDriverItem(item, index))}
          </View>

          {/*
          <FlatList
            data={this.state.user_driver_list}
            initialNumToRender={10}
            renderItem={({item, index}) => this.renderItem({item, index})}
            keyExtractor={item => item.id}
          />
          */}

          <Text style={{ paddingLeft: 20, paddingRight: 20, paddingTop: 20, fontSize: 15, fontWeight: "normal", color: "#E8E8E8" }}>Закрепленные автомобили:</Text>

          <View>
            {this.state.auto_list.map((item) => this.renderItem(item))}
          </View>

        </ScrollView>

        {/* ******** */}
        {
          this.state.mos_ru_address ? (
            <TouchableHighlight
              style={{ position: 'absolute', left: 10, bottom: 10, right: 10, height: 50, fontSize: 10, margin: 25, borderRadius: 5, alignItems: 'center', justifyContent: 'center', backgroundColor: "#C9A86B" }}
              onPress={() => {
                console.log('call add_address')
                AsyncStorage.getItem('token').then((value) => this.addAddress(value));
              }}>
              <Text style={{ fontSize: 24, color: "#E8E8E8" }}>Заказать пропуск</Text>
            </TouchableHighlight>
          ) : null
        }

      </View>
    );
  }

}

export default AutoDriver;
