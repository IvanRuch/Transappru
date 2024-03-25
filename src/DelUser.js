import React from 'react';
import { Text, View, Image, TouchableOpacity, TouchableHighlight, Modal, TextInput, ImageBackground, ActivityIndicator,  FlatList, Pressable, ScrollView, Share } from 'react-native';

import styles from './styles/Styles.js';

class DelUser extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      invite_user_data: { firm: '', inn: '', fio: '', phone: '', email: '' },
      modalAddButtonDisabled: true,
    };
  }

  componentDidMount() {
    console.log('DelUser DidMount')
  }

  /* */

  render() {
    return (

      <View style={styles.container}>

        <Text style={styles.header}>Ваш профиль был удален</Text>

        <Text style={{ paddingLeft: 20, paddingRight: 20, paddingTop: 20, fontSize: 15, fontWeight: "normal", color: "#E8E8E8" }}>Спасибо, что были с нами!</Text>

      </View>
    );
  }
}

export default DelUser;
