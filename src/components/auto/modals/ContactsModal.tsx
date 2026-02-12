import React from 'react';
import { Modal, View, Text, TouchableHighlight, Image, StyleSheet, Linking } from 'react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
import type { ManagerData } from '../../../types/auto';

interface ContactsModalProps {
  visible: boolean;
  managerData: ManagerData;
  techSupportData?: ManagerData;
  techSupportName?: string;
  userId?: string; // ID пользователя
  userInn?: string; // ИНН пользователя
  onClose: () => void;
  onContactPhone: (phone: string) => void;
  onContactEmail: (email: string, subject: string, body: string) => void;
}

export const ContactsModal: React.FC<ContactsModalProps> = ({
  visible,
  managerData,
  techSupportData,
  techSupportName,
  userId,
  userInn,
  onClose,
  onContactPhone,
  onContactEmail,
}) => {
  const contactWhatsapp = (phone: string, greetings: string) => {
    const url = `whatsapp://send?phone=${phone}&text=${encodeURIComponent(greetings)}`;
    Linking.openURL(url).catch(() => {
      console.log('WhatsApp not installed');
    });
  };

  const contactTelegram = (username: string, userId?: string, userInn?: string) => {
    // Формируем приветственное сообщение
    let text = 'Здравствуйте! У меня вопрос по приложению TransApp.';
    
    const details = [];
    if (userInn) details.push(`ИНН: ${userInn}`);
    if (userId) details.push(`ID: ${userId}`);
    
    if (details.length > 0) {
        text += ` (${details.join(', ')})`;
    }
    
    // Ссылка на чат с пользователем
    const appUrl = `tg://resolve?domain=${username}&text=${encodeURIComponent(text)}`;
    const webUrl = `https://t.me/${username}?text=${encodeURIComponent(text)}`; // Fallback

    console.log('Telegram App URL:', appUrl);
    console.log('Telegram Web URL:', webUrl);

    Linking.canOpenURL(appUrl).then(supported => {
        if (supported) {
            return Linking.openURL(appUrl);
        } else {
            return Linking.openURL(webUrl);
        }
    }).catch(err => console.error('An error occurred', err));
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
      style={styles.modal}
    >
      <TouchableHighlight
        style={styles.overlay}
        activeOpacity={1}
        underlayColor="rgba(29, 29, 29, 0.6)"
        onPress={onClose}
      >
        <View style={styles.container}>
          <SafeAreaInsetsContext.Consumer>
            {(insets) => (
              <TouchableHighlight
                activeOpacity={1}
                underlayColor="#FFFFFF"
                onPress={(e) => e.stopPropagation()}
              >
                <View style={styles.content}>
                  <View style={{ flex: 1, flexDirection: 'column', paddingBottom: Math.max(insets?.bottom || 0, 20) }}>
                    {/* Заголовок и кнопка закрытия */}
                    <View style={styles.header}>
                      <View style={styles.titleContainer}>
                        <Text style={styles.title}>Контакты</Text>
                      </View>
                      <View style={styles.closeButtonContainer}>
                        <TouchableHighlight
                          style={styles.closeButton}
                          activeOpacity={1}
                          underlayColor='#FFFFFF'
                          onPress={onClose}
                        >
                          <Image source={require('../../../../assets/images/xclose_2.png')} />
                        </TouchableHighlight>
                      </View>
                    </View>

                    {/* Менеджер */}
                    <View style={styles.card}>
                      <View style={styles.cardContent}>
                        <Text style={styles.cardTitle}>Менеджер</Text>
                        <Text style={styles.cardName}>{managerData.name}</Text>

                        <View style={styles.actionsRow}>
                          <View style={styles.actionItem}>
                            <TouchableHighlight
                              activeOpacity={1}
                              underlayColor='#F7F7F7'
                              onPress={() => onContactEmail(
                                managerData.email || '',
                                managerData.email_subject || '',
                                managerData.email_body || ''
                              )}
                            >
                              <View style={styles.actionButton}>
                                <Image source={require('../../../../assets/images/contact_mail_2.png')} />
                              </View>
                            </TouchableHighlight>
                          </View>
                          <View style={styles.separator}>
                            <Image source={require('../../../../assets/images/contact_separator.png')} />
                          </View>
                          <View style={styles.actionItemCenter}>
                            <TouchableHighlight
                              activeOpacity={1}
                              underlayColor='#F7F7F7'
                              onPress={() => onContactPhone(managerData.mobile_phone || '')}
                            >
                              <View style={styles.actionButton}>
                                <Image source={require('../../../../assets/images/contact_phone_2.png')} />
                              </View>
                            </TouchableHighlight>
                          </View>
                          <View style={styles.separator}>
                            <Image source={require('../../../../assets/images/contact_separator.png')} />
                          </View>
                          <View style={styles.actionItem}>
                            <TouchableHighlight
                              activeOpacity={1}
                              underlayColor='#F7F7F7'
                              onPress={() => contactWhatsapp(
                                managerData.mobile_phone || '',
                                managerData.whatapp_greetings || ''
                              )}
                            >
                              <View style={styles.actionButton}>
                                <Image source={require('../../../../assets/images/contact_whatsapp_2.png')} />
                              </View>
                            </TouchableHighlight>
                          </View>
                        </View>
                      </View>
                    </View>

                    {/* Техподдержка */}
                    {techSupportName && techSupportData && (
                      <View style={styles.card}>
                        <View style={styles.cardContent}>
                          <Text style={styles.cardTitle}>Техническая поддержка</Text>
                          <Text style={styles.cardName}>{techSupportName}</Text>

                          <View style={styles.actionsRow}>
                            <View style={styles.actionItem}>
                              <TouchableHighlight
                                activeOpacity={1}
                                underlayColor='#F7F7F7'
                                onPress={() => onContactEmail(
                                  techSupportData.email || '',
                                  techSupportData.email_subject || '',
                                  techSupportData.email_body || ''
                                )}
                              >
                                <View style={styles.actionButton}>
                                  <Image source={require('../../../../assets/images/contact_mail_2.png')} />
                                </View>
                              </TouchableHighlight>
                            </View>
                            <View style={styles.separator}>
                              <Image source={require('../../../../assets/images/contact_separator.png')} />
                            </View>
                            <View style={styles.actionItemCenter}>
                              <TouchableHighlight
                                activeOpacity={1}
                                underlayColor='#F7F7F7'
                                onPress={() => onContactPhone(techSupportData.mobile_phone || '')}
                              >
                                <View style={styles.actionButton}>
                                  <Image source={require('../../../../assets/images/contact_phone_2.png')} />
                                </View>
                              </TouchableHighlight>
                            </View>
                            <View style={styles.separator}>
                              <Image source={require('../../../../assets/images/contact_separator.png')} />
                            </View>
                            <View style={styles.actionItem}>
                              <TouchableHighlight
                                activeOpacity={1}
                                underlayColor='#F7F7F7'
                                onPress={() => contactTelegram('grizodubov', userId, userInn)}
                              >
                                <View style={styles.actionButton}>
                                  {/* Используем новую иконку Telegram */}
                                  <Image 
                                    source={require('../../../../assets/images/Telegram Logos/Logo.png')} 
                                    style={{ width: 36, height: 36 }}
                                    resizeMode="contain"
                                  />
                                </View>
                              </TouchableHighlight>
                            </View>
                          </View>
                        </View>
                      </View>
                    )}
                  </View>
                </View>
              </TouchableHighlight>
            )}
          </SafeAreaInsetsContext.Consumer>
        </View>
      </TouchableHighlight>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modal: {
    justifyContent: 'flex-end',
    margin: 0,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(29, 29, 29, 0.6)',
    justifyContent: 'flex-end',
  },
  container: {
    justifyContent: 'flex-end',
  },
  content: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    borderWidth: 1,
    borderColor: '#B8B8B8',
  },
  header: {
    flexDirection: 'row',
  },
  titleContainer: {
    flex: 5,
    alignItems: 'flex-start',
  },
  title: {
    paddingLeft: 16,
    paddingTop: 26,
    fontSize: 24,
    fontWeight: 'bold',
    color: '#313131',
  },
  closeButtonContainer: {
    flex: 1,
    alignItems: 'flex-end',
  },
  closeButton: {
    padding: 30,
  },
  card: {
    flexDirection: 'row',
    marginLeft: 20,
    marginRight: 20,
    marginBottom: 20,
    padding: 10,
    backgroundColor: '#F7F7F7',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#B8B8B8',
  },
  cardContent: {
    flex: 1,
    flexDirection: 'column',
  },
  cardTitle: {
    paddingTop: 10,
    fontSize: 17,
    fontWeight: 'normal',
    color: '#313131',
  },
  cardName: {
    paddingTop: 5,
    fontSize: 15,
    fontWeight: 'bold',
    color: '#3A3A3A',
  },
  actionsRow: {
    flexDirection: 'row',
    paddingTop: 15,
    paddingBottom: 10,
    alignItems: 'center',
  },
  actionItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionItemCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  separator: {
    width: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButton: {
    alignItems: 'center',
    padding: 5,
  },
});
