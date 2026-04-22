/**
 * Mobile full-screen "Пригласить друга" form.
 *
 * Shares state + validation + API via `useInviteUser` (ADR-003). Web uses
 * the same hook inside `InviteUserModal`. Visual tone kept close to the
 * legacy screen so the refactor is risk-free; migration to NativeWind +
 * shared sub-components can follow separately if the visual standard
 * shifts.
 *
 * On success: opens the native Share sheet with the invitation text
 * returned by the backend. Falls back to an alert if Share fails.
 */
import React from 'react';
import {
  View, Text, TextInput, TouchableHighlight, Image, StyleSheet, Share, Platform,
} from 'react-native';
import { KeyboardAwareScrollView } from '../../components/common/KeyboardAwareScrollView';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useInviteUser } from '../../hooks/useInviteUser';
import { showAlert } from '../../utils/alert';

export default function InviteUserScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const managerData = params.manager_data
    ? JSON.parse(params.manager_data as string)
    : null;
  const managerPhone = managerData?.mobile_phone || '+7';

  const {
    form, firmValid, innValid, fioValid, phoneValid, allValid, submitting,
    changeFirm, changeInn, changeFio, changePhone,
    submit,
  } = useInviteUser();

  const handleSubmit = async () => {
    if (!allValid || submitting) return;
    const result = await submit();
    if (result.status === 'auth_required') {
      router.replace('/' as any);
      return;
    }
    if (result.status === 'error') {
      showAlert('Ошибка', result.error);
      return;
    }
    // ok — hand the message to the native Share sheet.
    try {
      const shareResult = await Share.share({ message: result.message });
      if (shareResult.action === Share.sharedAction) {
        router.back();
      }
      // dismissedAction → stay on screen so the user can try again.
    } catch (e) {
      console.log('Error sharing:', e);
      showAlert('Ошибка', 'Не удалось открыть окно отправки');
    }
  };

  const fieldStyle = (value: string, valid: boolean) => ({
    ...styles.textInput,
    backgroundColor: value.length > 0 && valid ? '#FFFFFF' : '#F9FAF9',
    borderColor: value.length > 0 && valid ? '#656565' : '#B8B8B8',
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableHighlight
          style={styles.backButton}
          activeOpacity={1}
          underlayColor="#FFFFFF"
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Назад"
        >
          <Image source={require('../../../assets/images/back_2.png')} />
        </TouchableHighlight>
        <Text style={styles.headerTitle}>Пригласи друга</Text>
      </View>

      <KeyboardAwareScrollView
        style={styles.content}
        enableOnAndroid
        extraScrollHeight={Platform.OS === 'ios' ? 20 : 80}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 150 }}
      >
        <View style={styles.discountInfo}>
          <Text style={styles.discountText}>Подробности скидки по телефону </Text>
          <Text style={styles.phoneLink}>{managerPhone}</Text>
        </View>

        <Text style={styles.firstFieldLabel}>Название организации *:</Text>
        <View style={styles.inputContainer}>
          <TextInput
            style={fieldStyle(form.firm, firmValid)}
            placeholder="Название организации"
            placeholderTextColor="#8C8C8C"
            value={form.firm}
            onChangeText={changeFirm}
          />
        </View>

        <Text style={styles.fieldLabel}>ИНН *:</Text>
        <View style={styles.inputContainer}>
          <TextInput
            style={fieldStyle(form.inn, innValid)}
            placeholder="ИНН"
            placeholderTextColor="#8C8C8C"
            keyboardType="numeric"
            maxLength={12}
            value={form.inn}
            onChangeText={changeInn}
          />
        </View>

        <Text style={styles.fieldLabel}>ФИО *:</Text>
        <View style={styles.inputContainer}>
          <TextInput
            style={fieldStyle(form.fio, fioValid)}
            placeholder="ФИО"
            placeholderTextColor="#8C8C8C"
            value={form.fio}
            onChangeText={changeFio}
          />
        </View>

        <Text style={styles.fieldLabel}>Номер телефона *:</Text>
        <View style={styles.inputContainer}>
          <TextInput
            style={fieldStyle(form.phone, phoneValid)}
            placeholder="+7"
            placeholderTextColor="#8C8C8C"
            keyboardType="phone-pad"
            maxLength={12}
            value={form.phone}
            onChangeText={changePhone}
          />
        </View>
      </KeyboardAwareScrollView>

      {allValid && (
        <TouchableHighlight
          disabled={submitting}
          style={[
            styles.inviteButton,
            { backgroundColor: submitting ? '#c0c0c0' : '#3A3A3A' },
          ]}
          activeOpacity={1}
          underlayColor="#2E2E2E"
          onPress={handleSubmit}
          accessibilityRole="button"
          accessibilityLabel="Отправить приглашение"
        >
          <Text style={styles.inviteButtonText}>Отправить приглашение</Text>
        </TouchableHighlight>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  backButton: {
    padding: 10,
    marginRight: 10,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#313131',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  discountInfo: {
    flexDirection: 'row',
    marginTop: 30,
    flexWrap: 'wrap',
  },
  discountText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#656565',
  },
  phoneLink: {
    fontSize: 14,
    fontWeight: 'bold',
    color: 'blue',
  },
  firstFieldLabel: {
    marginTop: 10,
    paddingLeft: 20,
    paddingRight: 20,
    paddingTop: 20,
    fontSize: 14,
    fontWeight: 'normal',
    color: '#656565',
  },
  fieldLabel: {
    paddingLeft: 20,
    paddingRight: 20,
    paddingTop: 30,
    fontSize: 14,
    fontWeight: 'normal',
    color: '#656565',
  },
  inputContainer: {
    alignItems: 'stretch',
    paddingLeft: 30,
    paddingRight: 30,
  },
  textInput: {
    height: 55,
    fontSize: 20,
    paddingLeft: 20,
    borderWidth: 1,
    borderRadius: 8,
    color: '#313131',
  },
  inviteButton: {
    position: 'absolute',
    left: 10,
    bottom: 10,
    right: 10,
    height: 50,
    margin: 25,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inviteButtonText: {
    fontSize: 24,
    fontWeight: '500',
    color: '#FFFFFF',
  },
});
