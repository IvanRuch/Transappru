import React, { useEffect } from 'react';
import {
  Modal, View, Text, TouchableHighlight, Image, ScrollView,
  StyleSheet, KeyboardAvoidingView, Platform, Pressable,
} from 'react-native';
import { InnInput } from '../common';
import InnConfirmationModal from './InnConfirmationModal';
import { useAddAccount, type AddAccountUserData } from '../../hooks/useAddAccount';
import { showAlert } from '../../utils/alert';

interface AddAccountModalProps {
  visible: boolean;
  /** Snapshot of the currently-active user — used to switch back after bind. */
  userData: AddAccountUserData;
  onClose: () => void;
}

/**
 * Modal entry point for "Добавить аккаунт" on web — replaces the
 * full-screen `InnScreen` flow we used to reach via the sidebar.
 * Shares the look of `AddAutoModal` / `RnisCheckModal`: bordered
 * rounded card, header with close, description, `<InnInput>`, primary
 * button "Добавить". On success, the existing `InnConfirmationModal`
 * appears over the top to confirm that the application is registered
 * and pending approval.
 *
 * Uses `useAddAccount` — a lightweight hook that handles just the
 * existing-user `/bind-inn` + return-to-original-org branch without
 * the route-param concerns `useInnBinding` carries.
 */
export default function AddAccountModal({ visible, userData, onClose }: AddAccountModalProps) {
  const {
    inn, innValid, submitting,
    error, clearError,
    confirmationVisible, managerPhone,
    changeInn, handleBindInn, closeConfirmation, reset,
  } = useAddAccount(userData);

  useEffect(() => {
    if (error) {
      showAlert('Ошибка', error);
      clearError();
    }
  }, [error, clearError]);

  const handleClose = () => {
    reset();
    onClose();
  };

  // When the success confirmation closes, close the outer modal too so the
  // user returns to the sidebar state they came from.
  const handleConfirmationClose = () => {
    closeConfirmation();
    handleClose();
  };

  const buttonEnabled = innValid && !submitting;

  return (
    <Modal
      animationType="fade"
      transparent
      visible={visible}
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Pressable style={styles.overlay} onPress={handleClose}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.container}>
              <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
                {/* Header + close */}
                <View style={styles.header}>
                  <View style={styles.headerLeft}>
                    <Text style={styles.headerTitle}>Добавить аккаунт</Text>
                  </View>
                  <View style={styles.headerRight}>
                    <TouchableHighlight
                      style={styles.closeButton}
                      activeOpacity={1}
                      underlayColor="#FFFFFF"
                      onPress={handleClose}
                      accessibilityRole="button"
                      accessibilityLabel="Закрыть"
                    >
                      <Image source={require('../../../assets/images/xclose_2.png')} />
                    </TouchableHighlight>
                  </View>
                </View>

                {/* Intro */}
                <Text style={styles.description}>
                  Введите ИНН организации, которую вы хотите добавить к текущему аккаунту.
                  После подтверждения вы сможете переключаться между организациями в левом меню.
                </Text>

                <View style={styles.body}>
                  <InnInput
                    value={inn}
                    onChangeText={changeInn}
                    autoFocus
                    style={styles.innInput}
                  />

                  <TouchableHighlight
                    style={[
                      styles.primaryButton,
                      { backgroundColor: buttonEnabled ? '#3A3A3A' : '#C0C0C0' },
                    ]}
                    activeOpacity={1}
                    underlayColor={buttonEnabled ? '#2A2A2A' : '#C0C0C0'}
                    onPress={handleBindInn}
                    disabled={!buttonEnabled}
                    accessibilityRole="button"
                    accessibilityLabel="Добавить организацию"
                    accessibilityState={{ disabled: !buttonEnabled }}
                  >
                    <Text
                      style={[
                        styles.primaryButtonText,
                        { color: buttonEnabled ? '#FFFFFF' : '#E8E8E8' },
                      ]}
                    >
                      Добавить
                    </Text>
                  </TouchableHighlight>
                </View>
              </Pressable>
            </View>
          </ScrollView>
        </Pressable>
      </KeyboardAvoidingView>

      {/* Layered on top of the add-modal when bind succeeds. */}
      <InnConfirmationModal
        visible={confirmationVisible}
        managerPhone={managerPhone}
        onClose={handleConfirmationClose}
      />
    </Modal>
  );
}

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
    maxWidth: 400,
    paddingBottom: 24,
    ...Platform.select({
      web: { boxShadow: '0 8px 32px rgba(0,0,0,0.18)' },
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
  description: {
    paddingLeft: 16,
    paddingRight: 16,
    paddingTop: 14,
    fontSize: 16,
    color: '#4C4C4C',
    lineHeight: 22,
  },
  body: {
    paddingHorizontal: 16,
    paddingTop: 24,
  },
  innInput: {
    marginBottom: 16,
  },
  primaryButton: {
    height: 60,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
});
