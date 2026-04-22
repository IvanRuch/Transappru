import React, { useEffect, useState } from 'react';
import {
  Modal, View, Text, TextInput, TouchableHighlight, Image, ScrollView,
  StyleSheet, KeyboardAvoidingView, Platform, Pressable,
} from 'react-native';
import { InnInput } from '../common';
import { useInviteUser } from '../../hooks/useInviteUser';
import { useSafariAutofillFix } from '../../hooks/useSafariAutofillFix';
import { showAlert } from '../../utils/alert';

interface InviteUserModalProps {
  visible: boolean;
  onClose: () => void;
}

/**
 * Web entry point for "Пригласить друга" — replaces the full-screen
 * `InviteUserScreen` flow when opened from the sidebar. Shares the look
 * of `AddAccountModal` / `RnisCheckModal` (bordered rounded card, header
 * with close, description, form fields, primary button).
 *
 * On success the backend returns a pre-composed invitation message. On
 * web we can't use the native Share sheet, so we show a success state
 * with the message in a read-only text area + "Скопировать" button that
 * writes it to the clipboard. The user then forwards it wherever they
 * want.
 */
export default function InviteUserModal({ visible, onClose }: InviteUserModalProps) {
  const {
    form, firmValid, innValid, fioValid, phoneValid, allValid, submitting,
    changeFirm, changeInn, changeFio, changePhone,
    submit, reset,
  } = useInviteUser();

  const firmRef = React.useRef<any>(null);
  const fioRef = React.useRef<any>(null);
  const phoneRef = React.useRef<any>(null);
  useSafariAutofillFix([firmRef, fioRef, phoneRef], visible);

  // Success state: invitation message ready to be copied / shared.
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleClose = () => {
    reset();
    setSuccessMessage(null);
    setCopied(false);
    onClose();
  };

  const handleSubmit = async () => {
    if (!allValid || submitting) return;
    const result = await submit();
    if (result.status === 'ok') {
      setSuccessMessage(result.message);
    } else if (result.status === 'auth_required') {
      // Close silently — a global redirect will handle re-auth.
      handleClose();
    } else {
      showAlert('Ошибка', result.error);
    }
  };

  const handleCopy = async () => {
    if (!successMessage) return;
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(successMessage);
        setCopied(true);
      }
    } catch (e) {
      showAlert('Ошибка', 'Не удалось скопировать в буфер обмена');
    }
  };

  // Reset the "Скопировано" feedback after a couple of seconds.
  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  const buttonEnabled = allValid && !submitting;

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
                    <Text style={styles.headerTitle}>Пригласить друга</Text>
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

                {successMessage ? (
                  <View style={styles.body}>
                    <Text style={styles.description}>
                      Приглашение готово. Скопируйте текст и отправьте его другу
                      любым удобным способом.
                    </Text>

                    <View style={styles.messageBox}>
                      <Text style={styles.messageText} selectable>
                        {successMessage}
                      </Text>
                    </View>

                    <TouchableHighlight
                      style={[
                        styles.primaryButton,
                        { backgroundColor: copied ? '#40882C' : '#3A3A3A' },
                      ]}
                      activeOpacity={1}
                      underlayColor={copied ? '#357421' : '#2A2A2A'}
                      onPress={handleCopy}
                      accessibilityRole="button"
                      accessibilityLabel="Скопировать текст приглашения"
                    >
                      <Text style={styles.primaryButtonText}>
                        {copied ? 'Скопировано' : 'Скопировать'}
                      </Text>
                    </TouchableHighlight>

                    <TouchableHighlight
                      style={styles.secondaryButton}
                      activeOpacity={1}
                      underlayColor="#EEEEEE"
                      onPress={handleClose}
                      accessibilityRole="button"
                      accessibilityLabel="Закрыть"
                    >
                      <Text style={styles.secondaryButtonText}>Закрыть</Text>
                    </TouchableHighlight>
                  </View>
                ) : (
                  <View style={styles.body}>
                    <Text style={styles.description}>
                      Пригласите коллегу или друга попробовать TransApp.
                      Отправьте заявку, и мы подготовим текст приглашения,
                      который вы сможете переслать любым способом.
                    </Text>

                    <FormField
                      label="Название организации"
                      value={form.firm}
                      onChangeText={changeFirm}
                      valid={firmValid}
                      placeholder="ООО «Ромашка»"
                      autoFocus
                      refInput={firmRef}
                    />

                    <Text style={styles.fieldLabel}>ИНН</Text>
                    <InnInput
                      value={form.inn}
                      onChangeText={changeInn}
                      style={styles.innInput}
                    />

                    <FormField
                      label="ФИО"
                      value={form.fio}
                      onChangeText={changeFio}
                      valid={fioValid}
                      placeholder="Иванов Иван Иванович"
                      refInput={fioRef}
                    />

                    <FormField
                      label="Телефон"
                      value={form.phone}
                      onChangeText={changePhone}
                      valid={phoneValid}
                      placeholder="+7"
                      keyboardType="phone-pad"
                      maxLength={12}
                      refInput={phoneRef}
                    />

                    <TouchableHighlight
                      style={[
                        styles.primaryButton,
                        { backgroundColor: buttonEnabled ? '#3A3A3A' : '#C0C0C0' },
                        { marginTop: 24 },
                      ]}
                      activeOpacity={1}
                      underlayColor={buttonEnabled ? '#2A2A2A' : '#C0C0C0'}
                      onPress={handleSubmit}
                      disabled={!buttonEnabled}
                      accessibilityRole="button"
                      accessibilityLabel="Отправить приглашение"
                      accessibilityState={{ disabled: !buttonEnabled }}
                    >
                      <Text
                        style={[
                          styles.primaryButtonText,
                          { color: buttonEnabled ? '#FFFFFF' : '#E8E8E8' },
                        ]}
                      >
                        Отправить приглашение
                      </Text>
                    </TouchableHighlight>
                  </View>
                )}
              </Pressable>
            </View>
          </ScrollView>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// Lightweight inner component for the three plain text fields (firm/fio/phone).
// Keeps the modal JSX readable and ensures each field has consistent
// "valid → white, invalid → gray" feedback that the legacy screen had.
interface FormFieldProps {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  valid: boolean;
  placeholder: string;
  autoFocus?: boolean;
  keyboardType?: 'default' | 'phone-pad';
  maxLength?: number;
  refInput: React.MutableRefObject<any>;
}

function FormField({
  label, value, onChangeText, valid, placeholder,
  autoFocus, keyboardType, maxLength, refInput,
}: FormFieldProps) {
  return (
    <View>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        ref={refInput}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#B8B8B8"
        autoFocus={autoFocus}
        keyboardType={keyboardType}
        maxLength={maxLength}
        style={[
          styles.textInput,
          {
            backgroundColor: value.length > 0 && valid ? '#FFFFFF' : '#FAFAFA',
            borderColor: value.length > 0 && valid ? '#40882C' : '#D0D0D0',
          },
        ]}
      />
    </View>
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
    maxWidth: 440,
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
  body: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  description: {
    fontSize: 15,
    color: '#4C4C4C',
    lineHeight: 22,
    paddingBottom: 20,
  },
  fieldLabel: {
    fontSize: 13,
    color: '#656565',
    marginTop: 16,
    marginBottom: 6,
  },
  innInput: {
    marginBottom: 0,
  },
  textInput: {
    height: 48,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 14,
    fontSize: 16,
    color: '#1A1A1A',
  },
  primaryButton: {
    height: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  secondaryButton: {
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#656565',
  },
  messageBox: {
    backgroundColor: '#F7F7F7',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
    minHeight: 120,
  },
  messageText: {
    fontSize: 14,
    color: '#313131',
    lineHeight: 20,
  },
});
