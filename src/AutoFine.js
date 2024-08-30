import React from 'react';
import { Text, View, Image, TouchableOpacity, TouchableHighlight, Modal, TextInput, ImageBackground, ActivityIndicator,  FlatList, Pressable, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import styles from './styles/Styles.js';
import Api from "./utils/Api";

class AutoFine extends React.Component {

  constructor(props) {
    super(props);

    this.state = {
      fine_data: props.route.params.fine_data,
    };
  }

  render() {
    return (

      <View style={styles.container}>

        <Text style={styles.header}>Штраф</Text>

        <TouchableHighlight
          style={styles.header_back}
          activeOpacity={1}
          underlayColor='#FFFFFF'
          onPress={() => this.props.navigation.goBack()}>
          <Image source={require('../images/back_2.png')} />
        </TouchableHighlight>

        <ScrollView>
          <View style={{
            flex: 1,
            paddingTop: 20,
            alignItems: 'stretch',
            justifyContent: 'flex-start',
          }}>
            { this.state.fine_data.is_paid == 1 ? (
              <View style={{ 
                flexDirection: "row", 
                margin: 20, 
                padding: 10, 
                backgroundColor: "#EEEEEE", 
                borderRadius: 8,
                borderWidth: 1, 
                borderColor: "#B8B8B8" 
              }}>
                <View style={{
                  flex: 5,
                  flexDirection: "column",
                  paddingTop: 5,
                  paddingLeft: 10,
                }}>
                  <Text style={{ fontSize: 20, fontWeight: "bold", color: "#313131"}}>Штраф погашен</Text>
                </View>
                <View style={{
                  flex: 1,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <Image source={require('../images/twemoji_star_2.png')} style={{ width: 36, height: 36 }}/>
                </View>
              </View> ) : null
            }

            { this.state.fine_data.is_paid == 0 && this.state.fine_data.discount_time_left != '' ? (
              <View style={{ 
                flexDirection: "row", 
                margin: 20, 
                padding: 10, 
                backgroundColor: "#EEEEEE", 
                borderRadius: 8,
                borderWidth: 1, 
                borderColor: "#B8B8B8" 
              }}>
                <View style={{
                  flex: 5,
                  flexDirection: "column",
                  paddingLeft: 10,
                }}>
                  <Text style={{ fontSize: 20, fontWeight: "bold", color: "#313131"}}>Скидка на оплату актуальна еще {this.state.fine_data.discount_time_left}</Text>
                </View>
                <View style={{
                  flex: 1,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <Image source={require('../images/whh_sale_2.png')} style={{ width: 36, height: 36 }}/>
                </View>
              </View> ) : null
            }

            <View style={{ flexDirection: "column", margin: 20, padding: 10 }}>
              <Text style={{ fontSize: 20, fontWeight: "bold", color: "#313131"}}>Нарушение {this.state.fine_data.dat}</Text>
              <Text style={{ fontSize: 15, color: "#313131"}}>Статья КОАП {this.state.fine_data.code}</Text>
              <Text style={{ fontSize: 15, color: "#313131"}}>{this.state.fine_data.description}</Text>
              <Text style={{ fontSize: 15, color: "#313131"}}>Номер постановления: {this.state.fine_data.uin}</Text>

              <Text style={{ paddingTop: 20, fontSize: 20, fontWeight: "bold", color: "#313131"}}>Полная сумма штрафа без скидки: {this.state.fine_data.full_sum}</Text>
              <Text style={{ fontSize: 15, color: "#313131"}}>{this.state.fine_data.vendor}</Text>

            </View>

          </View>

        </ScrollView>

      </View>
    );
  }

}

export default AutoFine;
