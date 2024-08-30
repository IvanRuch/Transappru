import React from 'react';
import { Text, View, Image, TouchableOpacity, TouchableHighlight, Modal, TextInput, ImageBackground, ActivityIndicator,  FlatList, Pressable, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import styles from './styles/Styles.js';
import Api from "./utils/Api";

const viewabilityConfig = {
  waitForInteraction: true,
  // At least one of the viewAreaCoveragePercentThreshold or itemVisiblePercentThreshold is required.
  //viewAreaCoveragePercentThreshold: 95,
  itemVisiblePercentThreshold: 75
};

class NotificationList extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      indicator: false,

      notification_list: [],
    };
  }

  /* */
  setNotificationAsViewed = (value, notification_ids) => {
    console.log('setNotificationAsViewed. value = ' + value)

    if(!value)
    {
      console.log('null')

      this.props.navigation.navigate('Auth')
    }

    else
    {
      Api.post('/set-notification-as-viewed', { token: value, notification_ids: notification_ids.join() })
         .then(res => {

            const data = res.data;
            console.log(data);

            if(data.auth_required == 1)
            {
              this.props.navigation.navigate('Auth')
            }
            else
            {

            }
          })
          .catch(error => {
            console.log('error.response.status = ' + error.response.status);
            if(error.response.status == 401) { this.props.navigation.navigate('Auth') }
          });
    }
  }

  onViewableItemsChanged = ({viewableItems, changed}) => {
    console.log("\n\n\nVisible items are", viewableItems);
    //console.log("Changed in this iteration", changed);

    let notification_list_new = this.state.notification_list
    let notification_ids = []

    for (var i=0; i<viewableItems.length; i++)
    {
      if(viewableItems[i].isViewable)
      {
        console.log('viewableItems[i].index = ', viewableItems[i].index)
        console.log('viewableItems[i].item.id = ', viewableItems[i].item.id)

        if(notification_list_new[ viewableItems[i].index ].viewed == 0)
        {
          notification_list_new[ viewableItems[i].index ].viewed = 1
          notification_ids.push(viewableItems[i].item.id)
        }

      }
    }

    this.setState({notification_list: notification_list_new})

    if(notification_ids.length > 0)
    {
      AsyncStorage.getItem('token').then((value) => this.setNotificationAsViewed(value, notification_ids));
    }
  };

  setItemStyle = (index) => {
    let color = ( this.state.notification_list[index].viewed == 0 ? "#E9E9E9" : "#ffffff" );

    return { flexDirection: "row", margin: 20, padding: 10, backgroundColor: color, borderRadius: 8, borderWidth: 1, borderColor: "#B8B8B8" }
  }

  getNotificationList = (value) => {
    console.log('getNotificationList. value = ' + value)

    if(!value)
    {
      console.log('null')

      this.props.navigation.navigate('Auth')
    }

    else
    {
      this.setState({indicator: true})

      Api.post('/get-notification-list', { token: value })
         .then(res => {

            const data = res.data;
            console.log(data);

            if(data.auth_required == 1)
            {
              this.props.navigation.navigate('Auth')
            }
            else
            {
              this.setState({indicator: false, notification_list: data.notification_list})
            }
          })
          .catch(error => {
            console.log('error.response.status = ' + error.response.status);
            if(error.response.status == 401) { this.props.navigation.navigate('Auth') }
          });
    }
  }

  componentDidMount() {
    console.log('DriverList DidMount')

    AsyncStorage.getItem('token').then((value) => this.getNotificationList(value));
  }

  /* */

  renderItem = ({item, index}) => {

    //console.log('renderItem')
    //console.log({item})
    //console.log('item.id = ' + item.id + ' | index = ' + index)

    return (

        <View style={this.setItemStyle(index)}>
            <View style={{
              flexDirection: "column",
              alignItems: "stretch"
            }}>
                <Text style={{ paddingTop: 5, fontSize: 16, fontWeight: "bold", color: "#313131" }}>{item.title}</Text>

                <Text style={{ paddingTop: 5, fontSize: 14, fontWeight: "normal", color: "#313131" }}>{item.body}</Text>

                <Text style={{ paddingTop: 5, fontSize: 12, fontWeight: "normal", color: "#313131" }}>{item.registered}</Text>

            </View>
        </View>
    );
  }

  render() {
    return (

      <View style={styles.container}>

        <Text style={styles.header}>Уведомления</Text>

        <TouchableHighlight
          style={styles.header_back}
          activeOpacity={1}
          underlayColor='#FFFFFF'
          onPress={() => {
            console.log('-> move to AutoList')
            this.props.navigation.navigate('AutoList')
          }}>
          <Image source={require('../images/back_2.png')} />
        </TouchableHighlight>        

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
            <Text style={{ paddingLeft: 30, paddingRight: 16, paddingBottom: 10, fontSize: 12, fontWeight: "normal", color: "#656565" }}>Всего {this.state.notification_list.length} уведомлений:</Text>
          </View>
        </View> ) : null }

        <FlatList
          data={this.state.notification_list}
          initialNumToRender={10}
          renderItem={({item, index}) => this.renderItem({item, index})}
          keyExtractor={item => item.id}
          viewabilityConfig={viewabilityConfig}
          onViewableItemsChanged={this.onViewableItemsChanged}
        />

      </View>
    );
  }
}

export default NotificationList;
