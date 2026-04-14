/**
 * Web-only version of AuthScreen.
 * Metro resolves *.web.tsx for the web platform automatically.
 *
 * Layout:
 *  - Mobile web  (<768 px): centered card, full-width inputs/button
 *  - Desktop web (≥768 px): left branding panel + right form card side-by-side
 */
import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TouchableHighlight,
  Image,
  Linking,
  Modal,
  ScrollView,
  useWindowDimensions,
  ActivityIndicator,
} from 'react-native';

import { useAuthFlow } from '../../hooks/useAuthFlow';
import { SessionData } from '../../types/api';

interface AuthScreenProps {
  initialSessionData?: SessionData;
}

export default function AuthScreen({ initialSessionData }: AuthScreenProps) {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  const {
    phoneDigits,
    phoneValid,
    changePhoneDigits,
    checked,
    setChecked,
    userAgreement,
    modalUserAgreement,
    setModalUserAgreement,
    privacyPolicy,
    modalPrivacyPolicy,
    setModalPrivacyPolicy,
    modalWaitConfirmation,
    sessionData,
    isCheckingToken,
    isSubmitting,
    handleSubmit,
    handleRelogin,
  } = useAuthFlow(initialSessionData);

  const disabled = !phoneValid;

  // ── Phone formatting ───────────────────────────────────────────────────────
  const formatPhone = (d: string) => {
    if (!d) return '';
    const parts = [d.substring(0, 3), d.substring(3, 6), d.substring(6, 8), d.substring(8, 10)];
    return '+7 ' + parts.filter(Boolean).join(' ');
  };

  // ── Checking spinner ───────────────────────────────────────────────────────
  if (isCheckingToken) {
    return (
      <View style={styles.fullCenter}>
        <ActivityIndicator size="large" color="#3A3A3A" />
      </View>
    );
  }

  // ── Document modal (agreement / policy) ────────────────────────────────────
  const DocumentModal = ({
    visible, title, text, onClose,
  }: { visible: boolean; title: string; text: string; onClose: () => void }) => (
    <Modal animationType="fade" transparent visible={visible} onRequestClose={onClose}>
      <View style={styles.docOverlay}>
        <View style={styles.docSheet}>
          <Text style={styles.docTitle}>{title}</Text>
          <ScrollView style={styles.docScroll} showsVerticalScrollIndicator>
            <Text style={styles.docText}>{text}</Text>
          </ScrollView>
          <TouchableOpacity style={styles.docCloseBtn} onPress={onClose}>
            <Text style={styles.docCloseTxt}>Закрыть</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  // ── Form card ──────────────────────────────────────────────────────────────
  const formCard = (
    <View style={[styles.card, isDesktop && styles.cardDesktop]}>
      <Text style={styles.formTitle}>Введите номер телефона</Text>
      <Text style={styles.formSubtitle}>чтобы войти или зарегистрироваться</Text>

      <View style={styles.phoneRow}>
        <input
          type="tel"
          placeholder="+7 000 000 00 00"
          value={phoneDigits.length > 0 ? formatPhone(phoneDigits) : ''}
          onChange={(e: any) => {
            const val = e.target.value;
            let digits: string;
            if (val.startsWith('+7')) {
              digits = val.substring(2).replace(/\D/g, '');
            } else {
              const raw = val.replace(/\D/g, '');
              digits = (raw.startsWith('7') || raw.startsWith('8')) && raw.length > 10
                ? raw.substring(1) : raw;
            }
            changePhoneDigits(digits);
          }}
          onFocus={(e: any) => {
            const input = e.target;
            if (!input.value) input.value = '+7 ';
            setTimeout(() => {
              const minPos = 3;
              if (input.selectionStart < minPos) {
                const end = input.value.length;
                input.setSelectionRange(end, end);
              }
            }, 0);
          }}
          onSelect={(e: any) => {
            const input = e.target;
            if (input.value && input.value.startsWith('+7')) {
              const minPos = 3;
              if (input.selectionStart < minPos) {
                input.setSelectionRange(minPos, Math.max(minPos, input.selectionEnd));
              }
            }
          }}
          autoComplete="tel"
          style={{
            width: '100%',
            height: 56,
            fontSize: 24,
            color: '#1A1A1A',
            border: 'none',
            outline: 'none',
            backgroundColor: 'transparent',
            textAlign: 'center',
            letterSpacing: 1,
            fontFamily: 'inherit',
          }}
        />
      </View>

      <TouchableOpacity
        disabled={disabled || !checked || isSubmitting}
        style={[styles.submitBtn, (disabled || !checked || isSubmitting) && styles.submitBtnDisabled]}
        onPress={handleSubmit}
      >
        <Text style={styles.submitTxt}>{isSubmitting ? 'Отправка...' : 'Отправить'}</Text>
      </TouchableOpacity>

      <View style={styles.checkRow}>
        <Text style={styles.checkLabel}>
          Нажимая «Отправить», я соглашаюсь с данными:
        </Text>
        <TouchableHighlight
          style={styles.checkboxWrap}
          activeOpacity={1}
          underlayColor="#FFFFFF"
          onPress={() => setChecked(v => !v)}
        >
          {checked ? (
            <Image style={styles.checkbox} source={require('../../../assets/images/checkbox_checked_512x512.png')} />
          ) : (
            <Image style={styles.checkbox} source={require('../../../assets/images/checkbox_unchecked_512x512.png')} />
          )}
        </TouchableHighlight>
      </View>

      <Text style={styles.linkText} onPress={() => setModalUserAgreement(true)}>
        Пользовательское соглашение
      </Text>
      <Text style={styles.linkText} onPress={() => setModalPrivacyPolicy(true)}>
        Политика конфиденциальности
      </Text>
    </View>
  );

  // ── Wait-for-confirmation modal ────────────────────────────────────────────
  const WaitModal = () => (
    <Modal
      animationType="fade"
      transparent
      visible={modalWaitConfirmation}
      onRequestClose={() => {}}
    >
      <View style={styles.waitOverlay}>
        <View style={styles.waitSheet}>
          <Text style={styles.waitTitle}>Ваша заявка зарегистрирована!</Text>
          <Text style={styles.waitText}>
            Наш менеджер скоро свяжется с Вами по указанному при регистрации номеру
            для заключения договора оказания услуг и ответит на все сопутствующие вопросы.
          </Text>

          {!!sessionData?.user_data?.manager_data?.mobile_phone && (
            <TouchableOpacity
              style={styles.waitContactBtn}
              onPress={() =>
                Linking.openURL(`tel:${sessionData.user_data?.manager_data?.mobile_phone}`)
              }
            >
              <Text style={styles.waitContactTxt}>Позвонить менеджеру</Text>
              <Image
                style={{ width: 28, height: 28, marginLeft: 8 }}
                source={require('../../../assets/images/contact_phone_2.png')}
              />
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.waitReloginBtn}
            onPress={async () => {
              await handleRelogin();
              try { localStorage.removeItem('ta_onboarding_done'); } catch {}
            }}
          >
            <Text style={styles.waitReloginTxt}>Войти с другим номером</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  // ── Root render ────────────────────────────────────────────────────────────
  return (
    <View style={styles.root}>
      <DocumentModal
        visible={modalUserAgreement}
        title="Пользовательское соглашение"
        text={userAgreement}
        onClose={() => setModalUserAgreement(false)}
      />
      <DocumentModal
        visible={modalPrivacyPolicy}
        title="Политика конфиденциальности"
        text={privacyPolicy}
        onClose={() => setModalPrivacyPolicy(false)}
      />
      <WaitModal />

      {isDesktop ? (
        <View style={styles.desktopRow}>
          <View style={styles.brandPanel}>
            <Image
              source={require('../../../assets/images/icon.png')}
              style={styles.brandLogo}
              resizeMode="contain"
            />
            <Text style={styles.brandTitle}>TransApp</Text>
            <Text style={styles.brandSub}>Транспортные решения{'\n'}для вашего бизнеса</Text>
          </View>
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
  fullCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },

  desktopRow: { flex: 1, flexDirection: 'row' },
  brandPanel: {
    flex: 1, backgroundColor: '#1A1A1A', alignItems: 'center',
    justifyContent: 'center', paddingHorizontal: 48,
  },
  brandLogo: { width: 72, height: 72, marginBottom: 24, borderRadius: 16 },
  brandTitle: { fontSize: 36, fontWeight: '700', color: '#FFFFFF', marginBottom: 12 },
  brandSub: { fontSize: 16, color: '#B0B0B0', textAlign: 'center', lineHeight: 24 },
  formPanel: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 32, paddingVertical: 40,
  },

  mobileScroll: {
    flexGrow: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 20, paddingVertical: 40,
  },

  card: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 32, width: '100%',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08, shadowRadius: 16, elevation: 4,
  },
  cardDesktop: { maxWidth: 400 },

  formTitle: { fontSize: 22, fontWeight: '700', color: '#1A1A1A', marginBottom: 6, textAlign: 'center' },
  formSubtitle: { fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 24 },
  phoneRow: {
    flexDirection: 'row', alignItems: 'center', height: 56, borderRadius: 8,
    borderWidth: 1, borderColor: '#D0D0D0', marginBottom: 16,
    backgroundColor: '#FAFAFA', overflow: 'hidden',
  },
  submitBtn: {
    height: 50, borderRadius: 8, alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#3A3A3A', marginBottom: 20,
  },
  submitBtnDisabled: { backgroundColor: '#C0C0C0' },
  submitTxt: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },

  checkRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  checkLabel: { flex: 1, fontSize: 12, color: '#444', lineHeight: 18, marginRight: 8 },
  checkboxWrap: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  checkbox: { width: 24, height: 24 },

  linkText: { color: '#3A7FD5', fontSize: 13, marginTop: 6, textAlign: 'center' },

  docOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center',
    alignItems: 'center', padding: 24,
  },
  docSheet: {
    backgroundColor: '#FFF', borderRadius: 12, padding: 24, width: '100%',
    maxWidth: 600, maxHeight: '80%',
  },
  docTitle: { fontSize: 18, fontWeight: '700', color: '#1A1A1A', marginBottom: 16, textAlign: 'center' },
  docScroll: { flex: 1, marginBottom: 16 },
  docText: { fontSize: 14, color: '#333', lineHeight: 22 },
  docCloseBtn: {
    height: 46, borderRadius: 8, backgroundColor: '#3A3A3A',
    alignItems: 'center', justifyContent: 'center',
  },
  docCloseTxt: { fontSize: 15, fontWeight: '600', color: '#FFF' },

  waitOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center',
    alignItems: 'center', padding: 24,
  },
  waitSheet: {
    backgroundColor: '#FFF', borderRadius: 16, padding: 28, width: '100%', maxWidth: 420,
  },
  waitTitle: { fontSize: 20, fontWeight: '700', color: '#1A1A1A', marginBottom: 16 },
  waitText: { fontSize: 15, color: '#444', lineHeight: 22, marginBottom: 20 },
  waitContactBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    marginBottom: 16, paddingVertical: 10,
  },
  waitContactTxt: { fontSize: 15, color: '#3A3A3A', fontWeight: '600' },
  waitReloginBtn: {
    height: 44, borderRadius: 8, borderWidth: 1, borderColor: '#3A3A3A',
    alignItems: 'center', justifyContent: 'center',
  },
  waitReloginTxt: { fontSize: 14, color: '#3A3A3A' },
});
