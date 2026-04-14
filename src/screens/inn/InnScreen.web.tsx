/**
 * Web-only INN screen.
 * Uses shared useInnBinding hook for business logic.
 * Platform-specific: native <input>, <a> for phone, web styles.
 */
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  StyleSheet,
  ScrollView,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useInnBinding } from '../../hooks/useInnBinding';

export default function InnScreen() {
  const router = useRouter();

  const {
    userData, checkRnis, isExistingUser,
    inn, innValid, changeInn,
    autoNumberBase, autoNumberRegion, rnisButtonEnabled, rnisLoading, rnisData,
    changeAutoNumberBase, changeAutoNumberRegion,
    confirmationModal, errorModal, errorMsg, managerPhone,
    closeErrorModal, closeConfirmationModal,
    handleBindInn, handleCheckRnis,
  } = useInnBinding(() => router.replace('/(authenticated)/auto-list' as any));

  // ── Confirmation modal ────────────────────────────────────────────────────
  const confirmationModalEl = (
    <Modal
      animationType="fade"
      transparent
      visible={confirmationModal}
      onRequestClose={closeConfirmationModal}
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
            onPress={closeConfirmationModal}
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
      onRequestClose={closeErrorModal}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <Text style={styles.modalText}>{errorMsg}</Text>
          <TouchableOpacity
            style={styles.modalBtn}
            onPress={closeErrorModal}
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
