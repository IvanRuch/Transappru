import React from 'react';
import { StyleSheet, Text, View, Image, TouchableOpacity, TouchableHighlight, Modal, TextInput, ImageBackground, ActivityIndicator,  FlatList, Pressable, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-community/async-storage';

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

        <Text style={{ paddingLeft: 20, paddingTop: 20, fontSize: 28, fontWeight: "bold", color: "#E8E8E8" }}>Штраф</Text>

        <TouchableHighlight
          style={{ position: 'absolute', top: 20, right: 20, padding: 10, }}
          onPress={() => this.props.navigation.goBack()}>
          <Image source={require('../images/back.png')} />
        </TouchableHighlight>

        <ScrollView>
          <View style={{
            flex: 1,
            alignItems: 'stretch',
            justifyContent: 'flex-start',
          }}>
            { this.state.fine_data.is_paid == 1 ? (
              <View style={{ flexDirection: "row", margin: 20, padding: 10, backgroundColor: "#353535", borderRadius: 8 }}>
                <View style={{
                  flex: 5,
                  flexDirection: "column",
                  paddingLeft: 10,
                }}>
                  <Text style={{ fontSize: 20, fontWeight: "bold", color: "#E8E8E8"}}>Штраф погашен</Text>
                </View>
                <View style={{
                  flex: 1,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <Image source={require('../images/twemoji_star.png')} style={{ width: 36, height: 36 }}/>
                </View>
              </View> ) : null
            }

            { this.state.fine_data.is_paid == 0 && this.state.fine_data.discount_time_left != '' ? (
              <View style={{ flexDirection: "row", margin: 20, padding: 10, backgroundColor: "#353535", borderRadius: 8 }}>
                <View style={{
                  flex: 5,
                  flexDirection: "column",
                  paddingLeft: 10,
                }}>
                  <Text style={{ fontSize: 20, fontWeight: "bold", color: "#E8E8E8"}}>Скидка на оплату актуальна еще {this.state.fine_data.discount_time_left}</Text>
                </View>
                <View style={{
                  flex: 1,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <Image source={require('../images/whh_sale.png')} style={{ width: 36, height: 36 }}/>
                </View>
              </View> ) : null
            }

            <View style={{ flexDirection: "column", margin: 20, padding: 10 }}>
              <Text style={{ fontSize: 20, fontWeight: "bold", color: "#E8E8E8"}}>Нарушение {this.state.fine_data.dat}</Text>
              <Text style={{ fontSize: 15, color: "#E8E8E8"}}>Статья КОАП {this.state.fine_data.code}</Text>
              <Text style={{ fontSize: 15, color: "#E8E8E8"}}>{this.state.fine_data.description}</Text>
              <Text style={{ fontSize: 15, color: "#E8E8E8"}}>Номер постановления: {this.state.fine_data.uin}</Text>

              <Text style={{ paddingTop: 20, fontSize: 20, fontWeight: "bold", color: "#E8E8E8"}}>Полная сумма штрафа без скидки: {this.state.fine_data.sum}</Text>
              <Text style={{ fontSize: 15, color: "#E8E8E8"}}>{this.state.fine_data.vendor}</Text>

            </View>

          </View>

        </ScrollView>

      </View>
    );
  }

}

// ...

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#2c2c2c',
    alignItems: 'stretch',
    justifyContent: 'flex-start',
  },
});

export default AutoFine;
