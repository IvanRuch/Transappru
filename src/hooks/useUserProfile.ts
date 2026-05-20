import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { useRouter } from 'expo-router';
import api from '../services/api';
import { clearCachedUserData } from '../utils/userDataCache';
import { ContactData, UserData, EMPTY_CONTACT } from '../types/user';

/**
 * Shared user-profile logic for mobile and web.
 *
 * Handles: loading org data + contact list, add/edit/delete contact (with
 * phone normalization), logout (with token preservation for quick re-login),
 * account deletion.
 *
 * Error reporting follows the hook pattern: actions return `string | null`
 * (null = success). Screens decide how to surface errors (Alert.alert vs
 * window.alert vs inline).
 */
export function useUserProfile() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [contactList, setContactList] = useState<ContactData[]>([]);

  // Edit modal state
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editMode, setEditMode] = useState<'add' | 'edit'>('add');
  const [contactForm, setContactForm] = useState<ContactData>(EMPTY_CONTACT);

  // Confirmation modals
  const [deleteContactVisible, setDeleteContactVisible] = useState(false);
  const [logoutVisible, setLogoutVisible] = useState(false);
  const [deleteProfileVisible, setDeleteProfileVisible] = useState(false);

  // ── Helpers ─────────────────────────────────────────────────────────────

  const getToken = useCallback(async (): Promise<string | null> => {
    const token = await AsyncStorage.getItem('token');
    if (!token) {
      router.replace('/' as any);
      return null;
    }
    return token;
  }, [router]);

  const handleAuth = useCallback((data: any): boolean => {
    if (data?.auth_required === 1 || data?.auth_required === '1') {
      router.replace('/' as any);
      return true;
    }
    return false;
  }, [router]);

  // ── Load ────────────────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    const token = await getToken();
    if (!token) return;
    try {
      const res = await api.post('/get-contact-list', { token });
      if (handleAuth(res.data)) return;
      if (res.data.user_data) setUserData(res.data.user_data);
      if (res.data.user_contact_list) setContactList(res.data.user_contact_list);
    } catch (err: any) {
      if (err.response?.status === 401) router.replace('/' as any);
    } finally {
      setLoading(false);
    }
  }, [getToken, handleAuth, router]);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Phone normalization ─────────────────────────────────────────────────
  // Backend stores digits only, UI shows with '+' prefix. This mirrors the
  // input typing behaviour from the legacy screen: 8/7/+ → '+7', single
  // digit → '+7' + digit, '+7' alone → cleared.
  const normalizePhoneInput = useCallback((v: string): string => {
    if (v === '+7') return '';
    if (v === '7') return '+7';
    if (v === '+' || v === '8') return '+7';
    if (/^\d$/.test(v)) return '+7' + v;
    return v;
  }, []);

  const updateContactField = useCallback(<K extends keyof ContactData>(field: K, value: string) => {
    setContactForm(prev => ({
      ...prev,
      [field]: field === 'phone' ? normalizePhoneInput(value) : value,
    }));
  }, [normalizePhoneInput]);

  const isPhoneValid = /^\+7\d{10}$/.test(contactForm.phone);

  // ── Open/close modals ───────────────────────────────────────────────────

  const openAddContact = useCallback(() => {
    setEditMode('add');
    setContactForm(EMPTY_CONTACT);
    setEditModalVisible(true);
  }, []);

  const openEditContact = useCallback((contact: ContactData) => {
    setEditMode('edit');
    // Display with '+' prefix even though backend stores digits only.
    setContactForm({ ...contact, phone: contact.phone ? '+' + contact.phone : '' });
    setEditModalVisible(true);
  }, []);

  const closeEditContact = useCallback(() => {
    setEditModalVisible(false);
    setContactForm(EMPTY_CONTACT);
  }, []);

  const openDeleteContact = useCallback(() => {
    setEditModalVisible(false);
    setDeleteContactVisible(true);
  }, []);

  const closeDeleteContact = useCallback(() => setDeleteContactVisible(false), []);

  const openLogout = useCallback(() => setLogoutVisible(true), []);
  const closeLogout = useCallback(() => setLogoutVisible(false), []);

  const openDeleteProfile = useCallback(() => setDeleteProfileVisible(true), []);
  const closeDeleteProfile = useCallback(() => setDeleteProfileVisible(false), []);

  // ── Save contact (create + update) ──────────────────────────────────────

  const saveContact = useCallback(async (): Promise<string | null> => {
    if (!isPhoneValid) return 'Введите корректный номер телефона';
    const token = await getToken();
    if (!token) return null;
    setSaving(true);
    try {
      const payload = {
        ...contactForm,
        // Backend expects digits only (no '+').
        phone: contactForm.phone.replace('+', ''),
      };
      const res = await api.post('/edit-contact', { token, user_contact_data: payload });
      if (handleAuth(res.data)) return null;
      setEditModalVisible(false);
      setContactForm(EMPTY_CONTACT);
      await loadData();
      return null;
    } catch (err: any) {
      if (err.response?.status === 401) {
        router.replace('/' as any);
        return null;
      }
      return 'Не удалось сохранить контакт. Попробуйте позже.';
    } finally {
      setSaving(false);
    }
  }, [contactForm, isPhoneValid, getToken, handleAuth, loadData, router]);

  // ── Delete contact ──────────────────────────────────────────────────────

  const deleteContact = useCallback(async (): Promise<string | null> => {
    if (!contactForm.id) return null;
    const token = await getToken();
    if (!token) return null;
    try {
      const res = await api.post('/del-contact', { token, id: contactForm.id });
      if (handleAuth(res.data)) return null;
      setDeleteContactVisible(false);
      setEditModalVisible(false);
      setContactForm(EMPTY_CONTACT);
      await loadData();
      return null;
    } catch (err: any) {
      if (err.response?.status === 401) {
        router.replace('/' as any);
        return null;
      }
      return 'Не удалось удалить контакт. Попробуйте позже.';
    }
  }, [contactForm.id, getToken, handleAuth, loadData, router]);

  // ── Logout ──────────────────────────────────────────────────────────────
  /**
   * Clears the token and returns to auth. Preserves the current token in
   * `saved_token_for_return` so PinScreen can offer a quick re-login path.
   * On web also clears the onboarding persistence flag.
   */
  const logout = useCallback(async () => {
    const current = await AsyncStorage.getItem('token');
    if (current) await AsyncStorage.setItem('saved_token_for_return', current);
    await AsyncStorage.removeItem('token');
    await clearCachedUserData();
    if (Platform.OS === 'web') {
      try { localStorage.removeItem('ta_onboarding_done'); } catch { /* ignore */ }
    }
    router.replace('/' as any);
  }, [router]);

  // ── Delete profile ──────────────────────────────────────────────────────

  const deleteProfile = useCallback(async (): Promise<string | null> => {
    const token = await getToken();
    if (!token) return null;
    try {
      await api.post('/del-user', { token });
      await AsyncStorage.removeItem('token');
      await clearCachedUserData();
      if (Platform.OS === 'web') {
        try { localStorage.removeItem('ta_onboarding_done'); } catch { /* ignore */ }
        router.replace('/' as any);
      } else {
        router.replace('/deleted' as any);
      }
      return null;
    } catch (err: any) {
      if (err.response?.status === 401) {
        router.replace('/' as any);
        return null;
      }
      return 'Не удалось удалить профиль. Попробуйте позже.';
    }
  }, [getToken, router]);

  return {
    // Data
    loading, saving,
    userData, contactList,
    // Contact form
    contactForm, editMode, isPhoneValid,
    updateContactField,
    // Edit modal control
    editModalVisible, openAddContact, openEditContact, closeEditContact,
    // Confirmation modals
    deleteContactVisible, openDeleteContact, closeDeleteContact,
    logoutVisible, openLogout, closeLogout,
    deleteProfileVisible, openDeleteProfile, closeDeleteProfile,
    // Actions
    loadData, saveContact, deleteContact, logout, deleteProfile,
  };
}
