/**
 * Web version of User / Profile screen.
 * Org data (read-only), contact list CRUD, logout, delete profile.
 * Uses api.web.ts (CORS-friendly), WebAppLayout wrapper.
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../src/services/api';
import WebAppLayout from '../src/components/web/WebAppLayout';

const noSelect = Platform.OS === 'web' ? { userSelect: 'none' as const } : {};

interface ContactData {
  id: string;
  fio: string;
  email: string;
  phone: string;
  position: string;
}

// ── Modal overlay (web-friendly) ─────────────────────────────────────────

function ModalOverlay({
  visible,
  children,
  onClose,
}: {
  visible: boolean;
  children: React.ReactNode;
  onClose: () => void;
}) {
  if (!visible) return null;
  return (
    <View style={m.overlay}>
      <Pressable style={m.backdrop} onPress={onClose} />
      <View style={m.content}>{children}</View>
    </View>
  );
}

const m = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    zIndex: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backdrop: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  content: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    maxWidth: 440,
    width: '90%',
    zIndex: 101,
  },
});

// ── HTML input wrapper ───────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  height: 44,
  paddingLeft: 14,
  fontSize: 16,
  border: '1px solid #CCCCCC',
  borderRadius: 8,
  color: '#313131',
  outline: 'none',
  fontFamily: 'inherit',
  width: '100%',
  boxSizing: 'border-box',
};

// ── Main screen ──────────────────────────────────────────────────────────

export default function UserScreenWeb() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState<any>(null);
  const [contactList, setContactList] = useState<ContactData[]>([]);

  // Modal state
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editMode, setEditMode] = useState<'add' | 'edit'>('add');
  const [contactData, setContactData] = useState<ContactData>({ id: '', fio: '', email: '', phone: '', position: '' });
  const [deleteContactVisible, setDeleteContactVisible] = useState(false);
  const [deleteProfileVisible, setDeleteProfileVisible] = useState(false);
  const [logoutVisible, setLogoutVisible] = useState(false);

  // ── Load data ──

  const loadData = useCallback(async () => {
    const token = await AsyncStorage.getItem('token');
    if (!token) { router.replace('/'); return; }
    try {
      const res = await api.post('/get-contact-list', { token });
      const d = res.data;
      if (d.auth_required === 1) { router.replace('/'); return; }
      if (d.user_data) setUserData(d.user_data);
      if (d.user_contact_list) setContactList(d.user_contact_list);
    } catch (err: any) {
      if (err.response?.status === 401) router.replace('/');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Phone normalization ──

  const normalizePhone = (v: string): string => {
    if (v === '+7') return '';
    if (v === '7') return '+7';
    if (v === '+' || v === '8') return '+7';
    if (/^\d$/.test(v)) return '+7' + v;
    return v;
  };

  // ── Contact CRUD ──

  const openAdd = () => {
    setEditMode('add');
    setContactData({ id: '', fio: '', email: '', phone: '', position: '' });
    setEditModalVisible(true);
  };

  const openEdit = (c: ContactData) => {
    setEditMode('edit');
    setContactData({ ...c, phone: c.phone ? '+' + c.phone : '' });
    setEditModalVisible(true);
  };

  const saveContact = async () => {
    const token = await AsyncStorage.getItem('token');
    if (!token) { router.replace('/'); return; }
    try {
      const payload = { ...contactData, phone: contactData.phone.replace('+', '') };
      const res = await api.post('/edit-contact', { token, user_contact_data: payload });
      if (res.data.auth_required === 1) { router.replace('/'); return; }
      setEditModalVisible(false);
      setContactData({ id: '', fio: '', email: '', phone: '', position: '' });
      await loadData();
    } catch (err: any) {
      if (err.response?.status === 401) router.replace('/');
    }
  };

  const deleteContact = async () => {
    const token = await AsyncStorage.getItem('token');
    if (!token) { router.replace('/'); return; }
    try {
      const res = await api.post('/del-contact', { token, id: contactData.id });
      if (res.data.auth_required === 1) { router.replace('/'); return; }
      setDeleteContactVisible(false);
      setEditModalVisible(false);
      setContactData({ id: '', fio: '', email: '', phone: '', position: '' });
      await loadData();
    } catch (err: any) {
      if (err.response?.status === 401) router.replace('/');
    }
  };

  // ── Logout ──

  const handleLogout = async () => {
    const currentToken = await AsyncStorage.getItem('token');
    if (currentToken) await AsyncStorage.setItem('saved_token_for_return', currentToken);
    await AsyncStorage.removeItem('token');
    try { localStorage.removeItem('ta_onboarding_done'); } catch {}
    router.replace('/');
  };

  // ── Delete profile ──

  const handleDeleteProfile = async () => {
    const token = await AsyncStorage.getItem('token');
    if (!token) { router.replace('/'); return; }
    try {
      await api.post('/del-user', { token });
      await AsyncStorage.removeItem('token');
      try { localStorage.removeItem('ta_onboarding_done'); } catch {}
      router.replace('/');
    } catch (err: any) {
      if (err.response?.status === 401) router.replace('/');
    }
  };

  const isPhoneValid = /\+7\d{10}/.test(contactData.phone);

  // ── Render ──

  return (
    <WebAppLayout>
      <View style={s.header}>
        <Text style={[s.title, noSelect]}>Профиль</Text>
      </View>

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color="#313131" />
        </View>
      ) : (
        <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent}>
          {/* Org info */}
          <View style={s.section}>
            <Text style={[s.sectionTitle, noSelect]}>Организация</Text>
            <View style={s.fieldRow}>
              <Text style={[s.fieldLabel, noSelect]}>Название:</Text>
              <Text style={s.fieldValue}>{userData?.firm || '—'}</Text>
            </View>
            <View style={s.fieldRow}>
              <Text style={[s.fieldLabel, noSelect]}>ИНН:</Text>
              <Text style={s.fieldValue}>{userData?.inn || '—'}</Text>
            </View>
          </View>

          {/* Contacts */}
          <View style={s.section}>
            <View style={s.sectionHeaderRow}>
              <Text style={[s.sectionTitle, noSelect]}>Контакты</Text>
              <Pressable style={s.addBtn} onPress={openAdd}>
                <Text style={[s.addBtnText, noSelect]}>+ Добавить</Text>
              </Pressable>
            </View>

            {contactList.length === 0 ? (
              <Text style={s.emptyText}>Контакты не добавлены</Text>
            ) : (
              contactList.map(c => (
                <Pressable key={c.id} style={s.contactCard} onPress={() => openEdit(c)}>
                  <View style={{ flex: 1 }}>
                    {c.fio !== '' && <Text style={s.contactLine}>ФИО: {c.fio}</Text>}
                    {c.email !== '' && <Text style={s.contactLine}>E-mail: {c.email}</Text>}
                    {c.phone !== '' && <Text style={s.contactLine}>Телефон: +{c.phone}</Text>}
                    {c.position !== '' && <Text style={s.contactLine}>Должность: {c.position}</Text>}
                  </View>
                  <Text style={s.editIcon}>✎</Text>
                </Pressable>
              ))
            )}
          </View>

          {/* Actions */}
          <View style={s.section}>
            <Pressable style={s.logoutBtn} onPress={() => setLogoutVisible(true)}>
              <Text style={[s.logoutBtnText, noSelect]}>Выйти из аккаунта</Text>
            </Pressable>
            <Pressable style={s.deleteProfileBtn} onPress={() => setDeleteProfileVisible(true)}>
              <Text style={[s.deleteProfileBtnText, noSelect]}>Удалить профиль</Text>
            </Pressable>
          </View>
        </ScrollView>
      )}

      {/* ── Edit contact modal ── */}
      <ModalOverlay visible={editModalVisible} onClose={() => setEditModalVisible(false)}>
        <Text style={s.modalTitle}>{editMode === 'add' ? 'Добавить контакт' : 'Редактировать контакт'}</Text>

        <View style={s.formGroup}>
          <Text style={s.formLabel}>ФИО</Text>
          <input
            type="text"
            style={inputStyle}
            value={contactData.fio}
            onChange={(e: any) => setContactData(prev => ({ ...prev, fio: e.target.value }))}
            placeholder="ФИО"
          />
        </View>
        <View style={s.formGroup}>
          <Text style={s.formLabel}>E-mail</Text>
          <input
            type="email"
            style={inputStyle}
            value={contactData.email}
            onChange={(e: any) => setContactData(prev => ({ ...prev, email: e.target.value }))}
            placeholder="E-mail"
          />
        </View>
        <View style={s.formGroup}>
          <Text style={s.formLabel}>Телефон *</Text>
          <input
            type="tel"
            style={inputStyle}
            maxLength={12}
            value={contactData.phone}
            onChange={(e: any) => setContactData(prev => ({ ...prev, phone: normalizePhone(e.target.value) }))}
            placeholder="+7XXXXXXXXXX"
          />
        </View>
        <View style={s.formGroup}>
          <Text style={s.formLabel}>Должность</Text>
          <input
            type="text"
            style={inputStyle}
            value={contactData.position}
            onChange={(e: any) => setContactData(prev => ({ ...prev, position: e.target.value }))}
            placeholder="Должность"
          />
        </View>

        <View style={s.modalActions}>
          <Pressable
            style={[s.primaryBtn, !isPhoneValid && s.primaryBtnDisabled]}
            onPress={saveContact}
            disabled={!isPhoneValid}
          >
            <Text style={s.primaryBtnText}>{editMode === 'add' ? 'Добавить' : 'Сохранить'}</Text>
          </Pressable>
          {editMode === 'edit' && (
            <Pressable
              style={s.dangerBtn}
              onPress={() => { setEditModalVisible(false); setDeleteContactVisible(true); }}
            >
              <Text style={s.dangerBtnText}>Удалить</Text>
            </Pressable>
          )}
          <Pressable style={s.cancelBtn} onPress={() => setEditModalVisible(false)}>
            <Text style={s.cancelBtnText}>Отмена</Text>
          </Pressable>
        </View>
      </ModalOverlay>

      {/* ── Delete contact confirmation ── */}
      <ModalOverlay visible={deleteContactVisible} onClose={() => setDeleteContactVisible(false)}>
        <Text style={s.modalTitle}>Удалить контакт?</Text>
        <View style={s.modalActions}>
          <Pressable style={s.primaryBtn} onPress={deleteContact}>
            <Text style={s.primaryBtnText}>Удалить</Text>
          </Pressable>
          <Pressable style={s.cancelBtn} onPress={() => setDeleteContactVisible(false)}>
            <Text style={s.cancelBtnText}>Отмена</Text>
          </Pressable>
        </View>
      </ModalOverlay>

      {/* ── Logout confirmation ── */}
      <ModalOverlay visible={logoutVisible} onClose={() => setLogoutVisible(false)}>
        <Text style={s.modalTitle}>Выйти из аккаунта?</Text>
        <View style={s.modalActions}>
          <Pressable style={s.primaryBtn} onPress={() => { setLogoutVisible(false); handleLogout(); }}>
            <Text style={s.primaryBtnText}>Выйти</Text>
          </Pressable>
          <Pressable style={s.cancelBtn} onPress={() => setLogoutVisible(false)}>
            <Text style={s.cancelBtnText}>Отмена</Text>
          </Pressable>
        </View>
      </ModalOverlay>

      {/* ── Delete profile confirmation ── */}
      <ModalOverlay visible={deleteProfileVisible} onClose={() => setDeleteProfileVisible(false)}>
        <Text style={s.modalTitle}>Удалить профиль?</Text>
        <Text style={s.modalSubtext}>Все ваши данные будут удалены вместе с ним</Text>
        <View style={s.modalActions}>
          <Pressable style={s.dangerBtn} onPress={() => { setDeleteProfileVisible(false); handleDeleteProfile(); }}>
            <Text style={s.dangerBtnText}>Удалить профиль</Text>
          </Pressable>
          <Pressable style={s.cancelBtn} onPress={() => setDeleteProfileVisible(false)}>
            <Text style={s.cancelBtnText}>Отмена</Text>
          </Pressable>
        </View>
      </ModalOverlay>
    </WebAppLayout>
  );
}

const s = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E8',
  },
  title: { fontSize: 24, fontWeight: '700', color: '#1A1A1A' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  scroll: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 60 },

  // Sections
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
  },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#1A1A1A', marginBottom: 12 },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },

  // Fields
  fieldRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  fieldLabel: { width: 100, fontSize: 14, color: '#888' },
  fieldValue: { flex: 1, fontSize: 15, color: '#313131' },

  // Add button
  addBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#F0F0F0',
  },
  addBtnText: { fontSize: 14, color: '#3A3A3A', fontWeight: '600' },

  emptyText: { fontSize: 14, color: '#888', fontStyle: 'italic' },

  // Contact card
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    backgroundColor: '#F9F9F9',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    marginBottom: 8,
  },
  contactLine: { fontSize: 14, color: '#313131', marginBottom: 2 },
  editIcon: { fontSize: 18, color: '#888', marginLeft: 8 },

  // Logout
  logoutBtn: {
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D0D0D0',
    marginBottom: 12,
  },
  logoutBtnText: { fontSize: 15, color: '#313131', fontWeight: '500' },

  // Delete profile
  deleteProfileBtn: {
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: '#EE505A',
  },
  deleteProfileBtnText: { fontSize: 15, color: '#FFFFFF', fontWeight: '600' },

  // Modal
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#1A1A1A', marginBottom: 12 },
  modalSubtext: { fontSize: 14, color: '#656565', marginBottom: 16 },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 16, flexWrap: 'wrap' },

  // Form
  formGroup: { marginBottom: 12 },
  formLabel: { fontSize: 13, color: '#656565', marginBottom: 4 },

  // Buttons
  primaryBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#3A3A3A',
  },
  primaryBtnDisabled: { backgroundColor: '#CCCCCC' },
  primaryBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  dangerBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#EE505A',
  },
  dangerBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  cancelBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D0D0D0',
  },
  cancelBtnText: { color: '#313131', fontSize: 14 },
});
