// Web variant of ContactsModal — centered card, matching the project's
// established web modal style (AddAutoModal, AddAccountModal,
// RnisCheckModal, InviteUserModal).
//
// Native version (`ContactsModal.tsx`) stays a bottom sheet — that's the
// idiomatic mobile pattern for contact action sheets. Metro picks the
// `.web.tsx` automatically when bundling for web.

import React, { useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableHighlight,
  Image,
  ScrollView,
  StyleSheet,
  Platform,
  Pressable,
  Linking,
} from 'react-native';
import type { ManagerData } from '../../../types/auto';

interface ContactsModalProps {
  visible: boolean;
  managerData: ManagerData;
  techSupportData?: ManagerData;
  techSupportName?: string;
  userId?: string;
  userInn?: string;
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
  // Escape closes the modal — web convention. Same pattern as
  // ConfirmModal/InnConfirmationModal in this codebase.
  useEffect(() => {
    if (!visible || Platform.OS !== 'web') return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [visible, onClose]);

  const contactWhatsapp = (phone: string, greetings: string) => {
    if (!phone || phone === '+7' || phone.length < 5) return;
    const url = `https://wa.me/${phone.replace(/\+/g, '')}?text=${encodeURIComponent(greetings)}`;
    Linking.openURL(url).catch(() => {});
  };

  const contactTelegram = (username: string, uId?: string, uInn?: string) => {
    let text = 'Здравствуйте! У меня вопрос по приложению TransApp.';
    const details: string[] = [];
    if (uInn) details.push(`ИНН: ${uInn}`);
    if (uId) details.push(`ID: ${uId}`);
    if (details.length) text += ` (${details.join(', ')})`;
    const webUrl = `https://t.me/${username}?text=${encodeURIComponent(text)}`;
    Linking.openURL(webUrl).catch(() => {});
  };

  return (
    <Modal
      animationType="fade"
      transparent
      visible={visible}
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.container}>
            <Pressable
              style={styles.modalContent}
              onPress={(e) => e.stopPropagation()}
              accessibilityRole={Platform.OS === 'web' ? ('dialog' as any) : undefined}
            >
              {/* Header */}
              <View style={styles.header}>
                <View style={styles.headerLeft}>
                  <Text style={styles.headerTitle}>Контакты</Text>
                </View>
                <View style={styles.headerRight}>
                  <TouchableHighlight
                    style={styles.closeButton}
                    activeOpacity={1}
                    underlayColor="#FFFFFF"
                    onPress={onClose}
                  >
                    <Image source={require('../../../../assets/images/xclose_2.png')} />
                  </TouchableHighlight>
                </View>
              </View>

              {/* Manager card */}
              <View style={styles.card}>
                <View style={styles.cardContent}>
                  <Text style={styles.cardTitle}>Менеджер</Text>
                  <Text style={styles.cardName}>{managerData.name}</Text>

                  <View style={styles.actionsRow}>
                    <View style={styles.actionItem}>
                      <TouchableHighlight
                        activeOpacity={1}
                        underlayColor="#F7F7F7"
                        onPress={() =>
                          onContactEmail(
                            managerData.email || '',
                            managerData.email_subject || '',
                            managerData.email_body || '',
                          )
                        }
                      >
                        <View style={styles.actionButton}>
                          <Image source={require('../../../../assets/images/contact_mail_2.png')} />
                        </View>
                      </TouchableHighlight>
                    </View>
                    <View style={styles.separator}>
                      <Image source={require('../../../../assets/images/contact_separator.png')} />
                    </View>
                    <View style={styles.actionItem}>
                      <TouchableHighlight
                        activeOpacity={1}
                        underlayColor="#F7F7F7"
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
                        underlayColor="#F7F7F7"
                        onPress={() =>
                          contactWhatsapp(
                            managerData.mobile_phone || '',
                            managerData.whatapp_greetings || '',
                          )
                        }
                      >
                        <View style={styles.actionButton}>
                          <Image source={require('../../../../assets/images/contact_whatsapp_2.png')} />
                        </View>
                      </TouchableHighlight>
                    </View>
                  </View>
                </View>
              </View>

              {/* Tech support card */}
              {techSupportName && techSupportData && (
                <View style={styles.card}>
                  <View style={styles.cardContent}>
                    <Text style={styles.cardTitle}>Техническая поддержка</Text>
                    <Text style={styles.cardName}>{techSupportName}</Text>

                    <View style={styles.actionsRow}>
                      <View style={styles.actionItem}>
                        <TouchableHighlight
                          activeOpacity={1}
                          underlayColor="#F7F7F7"
                          onPress={() =>
                            onContactEmail(
                              techSupportData.email || '',
                              techSupportData.email_subject || '',
                              techSupportData.email_body || '',
                            )
                          }
                        >
                          <View style={styles.actionButton}>
                            <Image source={require('../../../../assets/images/contact_mail_2.png')} />
                          </View>
                        </TouchableHighlight>
                      </View>
                      <View style={styles.separator}>
                        <Image source={require('../../../../assets/images/contact_separator.png')} />
                      </View>
                      <View style={styles.actionItem}>
                        <TouchableHighlight
                          activeOpacity={1}
                          underlayColor="#F7F7F7"
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
                          underlayColor="#F7F7F7"
                          onPress={() => contactTelegram('grizodubov', userId, userInn)}
                        >
                          <View style={styles.actionButton}>
                            <Image
                              source={require('../../../../assets/images/Telegram Logos/Logo_mono_0.5x.png')}
                              style={{ width: 32, height: 32 }}
                              resizeMode="contain"
                            />
                          </View>
                        </TouchableHighlight>
                      </View>
                    </View>
                  </View>
                </View>
              )}
            </Pressable>
          </View>
        </ScrollView>
      </Pressable>
    </Modal>
  );
};

// Styles mirror AddAutoModal / RnisCheckModal / InviteUserModal so all
// project web modals share one visual language: centered card,
// borderRadius 25, web boxShadow + native shadow fallback,
// rgba(0,0,0,0.2) overlay.
const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: 20,
  },
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 25,
    alignItems: 'stretch',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#B8B8B8',
    width: '100%',
    // 480 (vs 400 in single-input modals) — contacts has two cards each
    // hosting three actions with separators, 400 felt cramped.
    maxWidth: 480,
    paddingBottom: 12,
    ...Platform.select({
      web: {
        boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.18,
        shadowRadius: 16,
        elevation: 12,
      },
    }),
  },
  header: {
    flexDirection: 'row',
  },
  headerLeft: {
    flex: 5,
    alignItems: 'flex-start',
  },
  headerTitle: {
    paddingLeft: 16,
    paddingTop: 26,
    fontSize: 24,
    fontWeight: 'bold',
    color: '#313131',
  },
  headerRight: {
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
    marginBottom: 16,
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
