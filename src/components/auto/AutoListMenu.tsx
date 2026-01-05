import React from 'react';
import { View, Image, Text } from 'react-native';

// Компоненты меню для AutoListScreen

export const MenuAdd: React.FC<{ str: string }> = ({ str }) => {
  return (
    <View style={{ alignItems: 'center', padding: 5 }}>
      <Image source={require('../../../assets/images/menu_add_2.png')} />
      <Text style={{ fontSize: 11, color: "#909090", marginTop: 5 }}>добавить {str}</Text>
    </View>
  );
};

export const SelMenuAdd: React.FC<{ str: string }> = ({ str }) => {
  return (
    <View style={{ alignItems: 'center', padding: 5 }}>
      <Image source={require('../../../assets/images/sel_menu_add_2.png')} />
      <Text style={{ fontSize: 11, color: "#313131", marginTop: 5 }}>добавить {str}</Text>
    </View>
  );
};

export const MenuDriver: React.FC = () => {
  return (
    <View style={{ alignItems: 'center', padding: 5 }}>
      <Image source={require('../../../assets/images/menu_driver_2.png')} />
      <Text style={{ fontSize: 11, color: "#909090", marginTop: 5 }}>водители</Text>
    </View>
  );
};

export const MenuContacts: React.FC = () => {
  return (
    <View style={{ alignItems: 'center', padding: 5 }}>
      <Image source={require('../../../assets/images/menu_contacts_2.png')} />
      <Text style={{ fontSize: 10, color: "#909090", marginTop: 5, textAlign: 'center' }} numberOfLines={2}>
        обратная{'\n'}связь
      </Text>
    </View>
  );
};

export const SelMenuContacts: React.FC = () => {
  return (
    <View style={{ alignItems: 'center', padding: 5 }}>
      <Image source={require('../../../assets/images/sel_menu_contacts_2.png')} />
      <Text style={{ fontSize: 11, color: "#313131" }}>контакты</Text>
    </View>
  );
};

export const MenuUser: React.FC = () => {
  return (
    <View style={{ alignItems: 'center', padding: 5 }}>
      <Image source={require('../../../assets/images/menu_user_2.png')} />
      <Text style={{ fontSize: 11, color: "#909090", marginTop: 5 }}>профиль</Text>
    </View>
  );
};

export const MenuInviteUser: React.FC = () => {
  return (
    <View style={{ alignItems: 'center', padding: 5 }}>
      <Image source={require('../../../assets/images/menu_invite_user_2.png')} />
      <Text style={{ fontSize: 10, color: "#909090", marginTop: 5, textAlign: 'center' }} numberOfLines={2}>
        пригласи{'\n'}друга
      </Text>
    </View>
  );
};

export const MenuUserList: React.FC = () => {
  return (
    <View style={{ alignItems: 'center', padding: 5 }}>
      <Image source={require('../../../assets/images/menu_user_list.png')} />
      <Text style={{ fontSize: 9, color: "#fff" }}>организации</Text>
    </View>
  );
};

export const MenuMessenger: React.FC = () => {
  return (
    <View style={{ alignItems: 'center', padding: 5 }}>
      <Image source={require('../../../assets/images/menu_messenger.png')} />
      <Text style={{ fontSize: 9, color: "#fff" }}>контакты</Text>
    </View>
  );
};

export const SelMenuDelItem: React.FC = () => {
  return (
    <View style={{ alignItems: 'center', padding: 5 }}>
      <Image source={require('../../../assets/images/sel_menu_del_item_2.png')} />
      <Text style={{ fontSize: 11, color: "#313131", marginTop: 5}}>удалить</Text>
    </View>
  );
};

export const SelMenuAddDriver: React.FC = () => {
  return (
    <View style={{ alignItems: 'center', padding: 5 }}>
      <Image source={require('../../../assets/images/sel_menu_add_driver.png')} />
      <Text style={{ fontSize: 9, color: "#fff" }}>назначить</Text>
    </View>
  );
};

export const SelMenuPass: React.FC = () => {
  return (
    <View style={{ alignItems: 'center', padding: 5 }}>
      <Image source={require('../../../assets/images/sel_menu_pass_2.png')} />
      <Text style={{ fontSize: 10, color: "#313131", marginTop: 5, textAlign: 'center' }} numberOfLines={2}>
        пропуск{'\n'}в Москву
      </Text>
    </View>
  );
};

export const SelMenuUndoSelect: React.FC = () => {
  return (
    <View style={{ alignItems: 'center', padding: 5 }}>
      <Image source={require('../../../assets/images/sel_menu_undo_select_2.png')} />
      <Text style={{ fontSize: 11, color: "#313131", marginTop: 5 }}>сбросить</Text>
    </View>
  );
};

export const MenuCharges: React.FC = () => {
  return (
    <View style={{ alignItems: 'center', padding: 5, paddingTop: 0 }}>
      <Image 
        source={require('../../../assets/images/menu_charges_2.png')} 
        style={{ width: 24, height: 24, marginTop: -5 }}
      />
      <Text style={{ fontSize: 11, color: "#909090", marginTop: 5 }}>начисления</Text>
    </View>
  );
};
