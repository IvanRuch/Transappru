import React, { useEffect } from 'react';
import {
  Modal, View, Text, TouchableHighlight, Image, ScrollView,
  StyleSheet, KeyboardAvoidingView, Platform, Pressable,
} from 'react-native';
import { PlateField } from '../common';
import RnisResultCard from './RnisResultCard';
import { useRnisCheck } from '../../hooks/useRnisCheck';
import { showAlert } from '../../utils/alert';

interface RnisCheckModalProps {
  visible: boolean;
  onClose: () => void;
}

/**
 * Modal entry point for "Проверить в РНИС" — replaces the full-screen
 * flow we used to reach via the web sidebar. Shares the look of
 * `AddAutoModal`: bordered rounded card, header with close button,
 * description, `<PlateField>`, primary button, result area.
 *
 * Uses `useRnisCheck` (lightweight — no route params, no INN binding).
 * Inputs are wiped every time the modal closes so reopening yields a
 * fresh form.
 */
export default function RnisCheckModal({ visible, onClose }: RnisCheckModalProps) {
  const {
    autoNumberBase,
    autoNumberRegion,
    rnisLoading,
    rnisData,
    rnisButtonEnabled,
    error,
    clearError,
    changeAutoNumberBase,
    changeAutoNumberRegion,
    handleCheckRnis,
    reset,
  } = useRnisCheck();

  // Surface backend/network errors as a platform alert.
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
                    <Text style={styles.headerTitle}>Проверить в РНИС</Text>
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
                  Вы можете проверить автомобиль на наличие регистрации в РНИС и передачу телематики.
                </Text>

                <View style={styles.body}>
                  <PlateField
                    label="Государственный регистрационный знак:"
                    base={autoNumberBase}
                    region={autoNumberRegion}
                    onChangeBase={changeAutoNumberBase}
                    onChangeRegion={changeAutoNumberRegion}
                  />

                  <View style={styles.buttonWrapper}>
                    <TouchableHighlight
                      style={[
                        styles.primaryButton,
                        { backgroundColor: rnisButtonEnabled ? '#3A3A3A' : '#C0C0C0' },
                      ]}
                      activeOpacity={1}
                      underlayColor={rnisButtonEnabled ? '#2A2A2A' : '#C0C0C0'}
                      onPress={handleCheckRnis}
                      disabled={!rnisButtonEnabled || rnisLoading}
                      accessibilityRole="button"
                      accessibilityLabel="Проверить в РНИС"
                      accessibilityState={{ disabled: !rnisButtonEnabled || rnisLoading }}
                    >
                      <Text
                        style={[
                          styles.primaryButtonText,
                          { color: rnisButtonEnabled ? '#FFFFFF' : '#E8E8E8' },
                        ]}
                      >
                        Проверить в РНИС
                      </Text>
                    </TouchableHighlight>
                  </View>

                  <RnisResultCard loading={rnisLoading} data={rnisData} />
                </View>
              </Pressable>
            </View>
          </ScrollView>
        </Pressable>
      </KeyboardAvoidingView>
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
    paddingBottom: 20,
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
  },
  body: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingTop: 24,
  },
  buttonWrapper: {
    width: 305,
    alignItems: 'center',
    paddingTop: 24,
  },
  primaryButton: {
    width: 305,
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
