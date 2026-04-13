/**
 * Web-only version of PinScreen (SMS code verification).
 * Metro resolves *.web.tsx for the web platform automatically.
 *
 * Layout mirrors AuthScreen.web.tsx:
 *  - Mobile web  (<768 px): centered card
 *  - Desktop web (≥768 px): left branding panel + right form card
 */
import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Image,
  Modal,
  Pressable,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';

import api from '../../services/api';

export default function PinScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  // ── State ─────────────────────────────────────────────────────────────────
  const [code, setCode] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [msg, setMsg] = useState('');
  const [canGoBack, setCanGoBack] = useState(false);

  const disabled = !/^\d{4}$/.test(code);

  // ── Check if user can go back ─────────────────────────────────────────────
  useEffect(() => {
    const checkCanGoBack = async () => {
      const savedToken = await AsyncStorage.getItem('saved_token_for_return');
      if (savedToken) setCanGoBack(true);
    };
    checkCanGoBack();
  }, []);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const changeCode = (value: string) => {
    setCode(value.replace(/\D/g, '').substring(0, 4));
  };

  const handleSubmit = async () => {
    const token = await AsyncStorage.getItem('token');
    if (!token) return;

    try {
      const res = await api.post('/confirm-token', { token, code });
      const data = res.data;

      console.log('========================================');
      console.log('PIN SCREEN (web) - confirm-token response:');
      console.log('error:', data.error);
      console.log('phone_inn_bind:', data.phone_inn_bind);
      console.log('is_manager:', data.is_manager);
      const needsOnboarding = data.onboarding_expired === 0 || data.onboarding_expired === '0';
      console.log('onboarding_expired:', data.onboarding_expired,
        needsOnboarding ? '→ should show onboarding' : '→ skip onboarding');
      console.log('========================================');

      if (data.error === 1) {
        setMsg(data.msg);
        setModalVisible(true);
      } else {

        if (
          (data.phone_inn_bind === 1 || data.phone_inn_bind === '1') ||
          (data.is_manager === 1 || data.is_manager === '1')
        ) {
          if (needsOnboarding) {
            console.log('→ Redirecting to onboarding');
            router.replace('/onboarding' as any);
          } else {
            router.replace('/(authenticated)/auto-list' as any);
          }
        } else {
          router.replace('/(authenticated)/inn' as any);
        }
      }
    } catch (error) {
      console.log('Error confirming PIN:', error);
    }
  };

  const handleGoBack = async () => {
    const savedToken = await AsyncStorage.getItem('saved_token_for_return');
    if (savedToken) {
      await AsyncStorage.setItem('token', savedToken);
      await AsyncStorage.removeItem('saved_token_for_return');
    }
    router.back();
  };

  const handleChangeNumber = async () => {
    await AsyncStorage.removeItem('token');
    router.replace('/');
  };

  // ── Error modal ───────────────────────────────────────────────────────────
  const errorModal = (
    <Modal
      animationType="fade"
      transparent
      visible={modalVisible}
      onRequestClose={() => setModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <Text style={styles.modalText}>{msg}</Text>
          <Pressable
            style={styles.modalBtn}
            onPress={() => {
              setModalVisible(false);
              router.replace('/' as any);
            }}
          >
            <Text style={styles.modalBtnText}>Получить ещё раз</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );

  // ── Form card (inline JSX to avoid remounting) ────────────────────────────
  const formCard = (
    <View style={[styles.card, isDesktop && styles.cardDesktop]}>
      <Text style={styles.formTitle}>Код подтверждения</Text>
      <Text style={styles.formSubtitle}>Введите 4-значный код из SMS</Text>

      <View style={styles.codeRow}>
        <input
          type="tel"
          placeholder="0000"
          value={code}
          onChange={(e: any) => changeCode(e.target.value)}
          autoFocus
          style={{
            width: '100%',
            height: 64,
            fontSize: 36,
            color: '#1A1A1A',
            border: 'none',
            outline: 'none',
            backgroundColor: 'transparent',
            textAlign: 'center',
            letterSpacing: 12,
            fontFamily: 'inherit',
          }}
        />
      </View>

      <TouchableOpacity
        disabled={disabled}
        style={[styles.submitBtn, disabled && styles.submitBtnDisabled]}
        onPress={handleSubmit}
      >
        <Text style={styles.submitBtnText}>Подтвердить</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={handleChangeNumber} style={styles.linkWrap}>
        <Text style={styles.linkText}>Войти с другим номером</Text>
      </TouchableOpacity>
    </View>
  );

  // ── Root render ───────────────────────────────────────────────────────────
  return (
    <View style={styles.root}>
      {errorModal}

      {isDesktop ? (
        <View style={styles.desktopRow}>
          {/* Left branding panel */}
          <View style={styles.brandPanel}>
            {canGoBack && (
              <TouchableOpacity onPress={handleGoBack} style={styles.backBtn}>
                <Image
                  source={require('../../../assets/images/back_2.png')}
                  style={styles.backIcon}
                  resizeMode="contain"
                />
              </TouchableOpacity>
            )}
            <Image
              source={require('../../../assets/images/icon.png')}
              style={styles.brandLogo}
              resizeMode="contain"
            />
            <Text style={styles.brandTitle}>TransApp</Text>
            <Text style={styles.brandSub}>Транспортные решения{'\n'}для вашего бизнеса</Text>
          </View>

          {/* Right form */}
          <View style={styles.formPanel}>
            {formCard}
          </View>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.mobileScroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {canGoBack && (
            <TouchableOpacity onPress={handleGoBack} style={styles.backBtnMobile}>
              <Image
                source={require('../../../assets/images/back_2.png')}
                style={styles.backIcon}
                resizeMode="contain"
              />
            </TouchableOpacity>
          )}
          {formCard}
        </ScrollView>
      )}
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F0F2F5',
  },

  // ── Desktop layout ────────────────────────────────────────────────────────
  desktopRow: {
    flex: 1,
    flexDirection: 'row',
  },
  brandPanel: {
    flex: 1,
    backgroundColor: '#1A1A1A',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 48,
  },
  brandLogo: {
    width: 72,
    height: 72,
    marginBottom: 24,
    borderRadius: 16,
  },
  brandTitle: {
    fontSize: 36,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  brandSub: {
    fontSize: 16,
    color: '#B0B0B0',
    textAlign: 'center',
    lineHeight: 24,
  },
  formPanel: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 40,
  },

  // ── Mobile layout ─────────────────────────────────────────────────────────
  mobileScroll: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 40,
  },

  // ── Card ──────────────────────────────────────────────────────────────────
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 32,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  cardDesktop: {
    maxWidth: 400,
  },

  // ── Form elements ─────────────────────────────────────────────────────────
  formTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 6,
    textAlign: 'center',
  },
  formSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  codeRow: {
    height: 64,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D0D0D0',
    marginBottom: 16,
    backgroundColor: '#FAFAFA',
    overflow: 'hidden',
    justifyContent: 'center',
  },
  submitBtn: {
    height: 50,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3A3A3A',
    marginBottom: 20,
  },
  submitBtnDisabled: {
    backgroundColor: '#C0C0C0',
  },
  submitBtnText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  linkWrap: {
    alignItems: 'center',
  },
  linkText: {
    fontSize: 14,
    color: '#666666',
    textDecorationLine: 'underline',
  },

  // ── Back button ───────────────────────────────────────────────────────────
  backBtn: {
    position: 'absolute',
    top: 24,
    left: 24,
    padding: 8,
    zIndex: 10,
  },
  backBtnMobile: {
    alignSelf: 'flex-start',
    padding: 8,
    marginBottom: 16,
  },
  backIcon: {
    width: 24,
    height: 24,
    tintColor: '#FFFFFF',
  },

  // ── Modal ─────────────────────────────────────────────────────────────────
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
    maxWidth: 340,
    width: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  modalText: {
    fontSize: 16,
    color: '#1A1A1A',
    textAlign: 'center',
    marginBottom: 20,
  },
  modalBtn: {
    height: 44,
    borderRadius: 8,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3A3A3A',
  },
  modalBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
