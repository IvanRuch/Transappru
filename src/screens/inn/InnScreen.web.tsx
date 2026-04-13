/**
 * Web-only INN screen.
 * Renders inside WebAppLayout (sidebar already present).
 * Two modes:
 *  - INN binding (default): enter 10/12-digit INN to register
 *  - RNIS check: enter license plate to check RNIS status
 */
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  ScrollView,
  Image,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';

import api from '../../services/api';

// Latin → Cyrillic conversion map for license plates
const LATIN_TO_CYRILLIC: Record<string, string> = {
  A: 'А', B: 'В', E: 'Е', K: 'К', M: 'М', H: 'Н',
  O: 'О', P: 'Р', C: 'С', T: 'Т', Y: 'У', X: 'Х',
};

function latinToCyrillic(value: string): string {
  return value
    .toUpperCase()
    .split('')
    .map(ch => LATIN_TO_CYRILLIC[ch] || ch)
    .join('');
}

export default function InnScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  // Parse route params
  const [userData] = useState<any>(() => {
    try {
      return params.user_data ? JSON.parse(params.user_data as string) : {};
    } catch { return {}; }
  });
  const [checkRnis] = useState(() => params.check_rnis === '1');
  const isExistingUser = Object.keys(userData).length > 0;

  // INN state
  const [inn, setInn] = useState('');
  const innValid = /^(\d{10})$|^(\d{12})$/.test(inn);

  // RNIS state
  const [autoNumberBase, setAutoNumberBase] = useState('');
  const [autoNumberRegion, setAutoNumberRegion] = useState('');
  const [rnisLoading, setRnisLoading] = useState(false);
  const [rnisData, setRnisData] = useState<any>(null);

  const rnisButtonEnabled =
    autoNumberBase.length === 6 &&
    (autoNumberRegion.length === 2 || autoNumberRegion.length === 3);

  // Modals
  const [confirmationModal, setConfirmationModal] = useState(false);
  const [errorModal, setErrorModal] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [managerPhone, setManagerPhone] = useState('');

  // ── INN handlers ──────────────────────────────────────────────────────────

  const changeInn = (value: string) => {
    setInn(value.replace(/\D/g, '').substring(0, 12));
  };

  const handleBindInn = async () => {
    const token = await AsyncStorage.getItem('token');
    if (!token) return;

    try {
      const res = await api.post('/bind-inn', { token, inn });
      const data = res.data;
      console.log('bindInn response:', data);

      if (data.token) {
        await AsyncStorage.setItem('token', data.token);
      }

      if (data.auth_required === 1) {
        router.replace('/');
        return;
      }

      if (data.error == 1) {
        setErrorMsg(data.msg);
        setErrorModal(true);
      } else {
        if (isExistingUser) {
          const originalInn = userData.inn;
          const currentToken = data.token || token;

          try {
            await api.post('/set-current-inn', { token: currentToken, current_inn: originalInn });
          } catch (e) {
            console.log('Error returning to original org:', e);
          }

          setManagerPhone(userData.manager_data?.mobile_phone || '');
          setConfirmationModal(true);
        } else {
          // New user — redirect to Auth to wait for manager confirmation
          router.replace('/');
        }
      }
    } catch (error: any) {
      console.log('Error binding INN:', error);
      if (error.response?.status === 401) {
        router.replace('/');
      }
    }
  };

  // ── RNIS handlers ─────────────────────────────────────────────────────────

  const changeAutoNumberBase = (value: string) => {
    const converted = latinToCyrillic(value);
    if (/^[АВЕКМНОРСТУХABEKMHOPCTYX0-9]*$/i.test(converted)) {
      setAutoNumberBase(converted.substring(0, 6));
    }
  };

  const changeAutoNumberRegion = (value: string) => {
    if (/^[0-9]*$/.test(value)) {
      setAutoNumberRegion(value.substring(0, 3));
    }
  };

  const handleCheckRnis = async () => {
    const token = await AsyncStorage.getItem('token');
    if (!token) return;

    setRnisLoading(true);
    setRnisData(null);

    try {
      const res = await api.post('/check-rnis', {
        token,
        auto_number_base: autoNumberBase,
        auto_number_region_code: autoNumberRegion,
      });
      setRnisData(res.data.auto_rnis_data || {});
    } catch (error: any) {
      console.log('Error checking RNIS:', error);
      if (error.response?.status === 401) {
        router.replace('/');
      }
    } finally {
      setRnisLoading(false);
    }
  };

  // ── Confirmation modal ────────────────────────────────────────────────────
  const confirmationModalEl = (
    <Modal
      animationType="fade"
      transparent
      visible={confirmationModal}
      onRequestClose={() => setConfirmationModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>Ваша заявка зарегистрирована!</Text>
          <Text style={styles.modalText}>Дождитесь подтверждения указанного Вами ИНН</Text>

          {managerPhone ? (
            <View style={styles.managerBlock}>
              <Text style={styles.modalText}>Вы можете связаться с менеджером</Text>
              <a
                href={`tel:${managerPhone}`}
                style={{ textDecoration: 'none', marginTop: 12, display: 'flex', alignItems: 'center', gap: 8 }}
              >
                <Image
                  source={require('../../../assets/images/contact_phone_2.png')}
                  style={{ width: 32, height: 32 }}
                  resizeMode="contain"
                />
                <span style={{ color: '#3A3A3A', fontSize: 16, fontWeight: 600 }}>{managerPhone}</span>
              </a>
            </View>
          ) : null}

          <TouchableOpacity
            style={styles.modalBtn}
            onPress={() => {
              setConfirmationModal(false);
              router.replace('/(authenticated)/auto-list' as any);
            }}
          >
            <Text style={styles.modalBtnText}>Закрыть</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  // ── Error modal ───────────────────────────────────────────────────────────
  const errorModalEl = (
    <Modal
      animationType="fade"
      transparent
      visible={errorModal}
      onRequestClose={() => setErrorModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <Text style={styles.modalText}>{errorMsg}</Text>
          <TouchableOpacity
            style={styles.modalBtn}
            onPress={() => setErrorModal(false)}
          >
            <Text style={styles.modalBtnText}>OK</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  // ── INN form ──────────────────────────────────────────────────────────────
  const innForm = (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>
        {checkRnis ? 'Проверить в РНИС' : 'Введите ИНН'}
      </Text>

      {!isExistingUser && !checkRnis && (
        <Text style={styles.cardSubtitle}>
          для более точной идентификации Вас как клиента
        </Text>
      )}

      {!checkRnis && (
        <>
          <View style={styles.inputRow}>
            <input
              type="text"
              inputMode="numeric"
              placeholder="ИНН организации (10 или 12 цифр)"
              value={inn}
              onChange={(e: any) => changeInn(e.target.value)}
              autoFocus
              style={{
                width: '100%',
                height: 56,
                fontSize: 24,
                color: '#1A1A1A',
                border: 'none',
                outline: 'none',
                backgroundColor: 'transparent',
                textAlign: 'center',
                letterSpacing: 4,
                fontFamily: 'inherit',
              }}
            />
          </View>

          <TouchableOpacity
            disabled={!innValid}
            style={[styles.submitBtn, !innValid && styles.submitBtnDisabled]}
            onPress={handleBindInn}
          >
            <Text style={styles.submitBtnText}>
              {isExistingUser ? 'Добавить' : 'Зарегистрироваться'}
            </Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );

  // ── RNIS form ─────────────────────────────────────────────────────────────
  const rnisForm = !isExistingUser || checkRnis ? (
    <View style={[styles.card, { marginTop: 16 }]}>
      {!checkRnis && (
        <Text style={styles.cardSubtitle}>
          Вы можете проверить автомобиль на наличие регистрации в РНИС и передачу телематики
        </Text>
      )}

      <Text style={[styles.cardTitle, { fontSize: 16, marginBottom: 16 }]}>
        Государственный регистрационный знак
      </Text>

      <View style={styles.plateRow}>
        <View style={styles.plateBase}>
          <input
            type="text"
            placeholder="А000АА"
            value={autoNumberBase}
            onChange={(e: any) => changeAutoNumberBase(e.target.value)}
            maxLength={6}
            style={{
              width: '100%',
              height: 56,
              fontSize: 28,
              color: '#1A1A1A',
              border: 'none',
              outline: 'none',
              backgroundColor: 'transparent',
              textAlign: 'center',
              textTransform: 'uppercase',
              fontFamily: 'inherit',
            }}
          />
        </View>

        <View style={styles.plateDivider} />

        <View style={styles.plateRegion}>
          <input
            type="text"
            inputMode="numeric"
            placeholder="777"
            value={autoNumberRegion}
            onChange={(e: any) => changeAutoNumberRegion(e.target.value)}
            maxLength={3}
            style={{
              width: '100%',
              height: 40,
              fontSize: 28,
              color: '#1A1A1A',
              border: 'none',
              outline: 'none',
              backgroundColor: 'transparent',
              textAlign: 'center',
              fontFamily: 'inherit',
            }}
          />
          <View style={styles.plateRusRow}>
            <Text style={styles.plateRusText}>RUS</Text>
            <Image
              source={require('../../../assets/images/flag_rus.png')}
              style={{ width: 24, height: 12 }}
              resizeMode="contain"
            />
          </View>
        </View>
      </View>

      <TouchableOpacity
        disabled={!rnisButtonEnabled}
        style={[styles.submitBtn, !rnisButtonEnabled && styles.submitBtnDisabled]}
        onPress={handleCheckRnis}
      >
        <Text style={styles.submitBtnText}>Проверить в РНИС</Text>
      </TouchableOpacity>

      {/* RNIS results */}
      {rnisLoading && (
        <ActivityIndicator size="large" color="#3A3A3A" style={{ marginTop: 24 }} />
      )}

      {rnisData && !rnisLoading && (
        <View style={styles.rnisResult}>
          <Text style={styles.rnisResultTitle}>Результат проверки:</Text>
          {rnisData.rnis_status ? (
            <>
              <Text style={styles.rnisResultRow}>Статус: {rnisData.rnis_status}</Text>
              {rnisData.rnis_owner && <Text style={styles.rnisResultRow}>Владелец: {rnisData.rnis_owner}</Text>}
              {rnisData.rnis_brand && <Text style={styles.rnisResultRow}>Марка: {rnisData.rnis_brand}</Text>}
              {rnisData.rnis_model && <Text style={styles.rnisResultRow}>Модель: {rnisData.rnis_model}</Text>}
              {rnisData.rnis_year && <Text style={styles.rnisResultRow}>Год выпуска: {rnisData.rnis_year}</Text>}
            </>
          ) : (
            <Text style={styles.rnisResultRow}>Данные не найдены</Text>
          )}
        </View>
      )}
    </View>
  ) : null;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {confirmationModalEl}
      {errorModalEl}
      {innForm}
      {rnisForm}
    </ScrollView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 40,
  },

  // ── Card ──────────────────────────────────────────────────────────────────
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 32,
    width: '100%',
    maxWidth: 480,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 8,
    textAlign: 'center',
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },

  // ── Inputs ────────────────────────────────────────────────────────────────
  inputRow: {
    height: 64,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D0D0D0',
    marginBottom: 16,
    backgroundColor: '#FAFAFA',
    overflow: 'hidden',
    justifyContent: 'center',
  },

  // ── License plate ─────────────────────────────────────────────────────────
  plateRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    height: 72,
    marginBottom: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D0D0D0',
    overflow: 'hidden',
  },
  plateBase: {
    flex: 3,
    backgroundColor: '#FAFAFA',
    justifyContent: 'center',
  },
  plateDivider: {
    width: 1,
    backgroundColor: '#D0D0D0',
  },
  plateRegion: {
    flex: 2,
    backgroundColor: '#FAFAFA',
    alignItems: 'center',
  },
  plateRusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  plateRusText: {
    fontSize: 12,
    color: '#666',
  },

  // ── Submit button ─────────────────────────────────────────────────────────
  submitBtn: {
    height: 50,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3A3A3A',
  },
  submitBtnDisabled: {
    backgroundColor: '#C0C0C0',
  },
  submitBtnText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // ── RNIS results ──────────────────────────────────────────────────────────
  rnisResult: {
    marginTop: 24,
    padding: 20,
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
  },
  rnisResultTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 12,
  },
  rnisResultRow: {
    fontSize: 15,
    color: '#333',
    marginBottom: 6,
    lineHeight: 22,
  },

  // ── Modals ────────────────────────────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    maxWidth: 400,
    width: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
    textAlign: 'center',
    marginBottom: 12,
  },
  modalText: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 22,
  },
  managerBlock: {
    alignItems: 'center',
    marginBottom: 16,
  },
  modalBtn: {
    height: 44,
    borderRadius: 8,
    paddingHorizontal: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3A3A3A',
    marginTop: 8,
  },
  modalBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
