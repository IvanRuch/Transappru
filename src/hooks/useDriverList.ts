import { useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import api from '../services/api';
import { DriverData, EMPTY_DRIVER } from '../types/drivers';

/**
 * Shared driver-list logic for mobile and web.
 *
 * Manages: list load (GET /get-driver-list), form state with validation,
 * create+update (POST /edit-driver), delete (POST /del-driver), and the two
 * modal visibility flags. Validation rules:
 *   - vu: exactly 10 digits
 *   - vu_reg: DD.MM.YYYY (auto-formatted while typing)
 *   - name_f, name_i: non-empty
 *
 * Error handling follows the hook pattern: actions return `string | null`
 * (null = success). Screens decide how to surface errors (showAlert, inline).
 */
export function useDriverList() {
  const router = useRouter();

  const [drivers, setDrivers] = useState<DriverData[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Modal state
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [editMode, setEditMode] = useState<'add' | 'edit'>('add');
  const [form, setForm] = useState<DriverData>(EMPTY_DRIVER);

  // ── Helpers ───────────────────────────────────────────────────────────────

  const getToken = useCallback(async (): Promise<string | null> => {
    const token = await AsyncStorage.getItem('token');
    if (!token) {
      router.replace('/');
      return null;
    }
    return token;
  }, [router]);

  const handleAuthRequired = useCallback((data: any): boolean => {
    if (data?.auth_required === 1 || data?.auth_required === '1') {
      router.replace('/');
      return true;
    }
    return false;
  }, [router]);

  // ── Load ──────────────────────────────────────────────────────────────────

  const loadDrivers = useCallback(async () => {
    const token = await getToken();
    if (!token) return;
    setLoading(true);
    try {
      const res = await api.post('/get-driver-list', { token });
      if (handleAuthRequired(res.data)) return;
      setDrivers(res.data.user_driver_list || []);
    } catch (err: any) {
      if (err.response?.status === 401) router.replace('/');
    } finally {
      setLoading(false);
    }
  }, [getToken, handleAuthRequired, router]);

  useEffect(() => { loadDrivers(); }, [loadDrivers]);

  // ── Validation ────────────────────────────────────────────────────────────

  const isFormValid = useMemo(() =>
    /^[0-9]{10}$/.test(form.vu) &&
    /^[0-9]{2}\.[0-9]{2}\.[0-9]{4}$/.test(form.vu_reg) &&
    form.name_f.trim() !== '' &&
    form.name_i.trim() !== '',
  [form]);

  // ── Field change with per-field normalization ────────────────────────────

  const changeField = useCallback((field: keyof DriverData, value: string) => {
    if (field === 'vu') {
      // Digits only, max 10 chars
      if (/^[0-9]*$/.test(value) && value.length <= 10) {
        setForm(prev => ({ ...prev, vu: value }));
      }
      return;
    }
    if (field === 'vu_reg') {
      // Auto-format DD.MM.YYYY while typing
      const digits = value.replace(/\D/g, '').slice(0, 8);
      let formatted = digits.slice(0, 2);
      if (digits.length > 2) formatted += '.' + digits.slice(2, 4);
      if (digits.length > 4) formatted += '.' + digits.slice(4, 8);
      setForm(prev => ({ ...prev, vu_reg: formatted }));
      return;
    }
    setForm(prev => ({ ...prev, [field]: value }));
  }, []);

  // ── Save (create + update) ───────────────────────────────────────────────

  /**
   * Sends the current form via /edit-driver and reloads the list.
   * Returns null on success, an error message otherwise.
   */
  const saveDriver = useCallback(async (): Promise<string | null> => {
    if (!isFormValid) return 'Заполните обязательные поля';
    const token = await getToken();
    if (!token) return null;
    setSaving(true);
    try {
      const res = await api.post('/edit-driver', { token, user_driver_data: form });
      if (handleAuthRequired(res.data)) return null;
      setEditModalVisible(false);
      setForm(EMPTY_DRIVER);
      loadDrivers();
      return null;
    } catch (err: any) {
      if (err.response?.status === 401) {
        router.replace('/');
        return null;
      }
      return 'Не удалось сохранить водителя. Попробуйте позже.';
    } finally {
      setSaving(false);
    }
  }, [form, isFormValid, getToken, handleAuthRequired, loadDrivers, router]);

  // ── Delete ────────────────────────────────────────────────────────────────

  /**
   * Deletes the driver whose id matches the current form. Returns null on
   * success, an error message otherwise.
   */
  const deleteDriver = useCallback(async (): Promise<string | null> => {
    if (!form.id) return null;
    const token = await getToken();
    if (!token) return null;
    try {
      const res = await api.post('/del-driver', { token, id: form.id });
      if (handleAuthRequired(res.data)) return null;
      setDrivers(prev => prev.filter(d => d.id !== form.id));
      setDeleteModalVisible(false);
      setEditModalVisible(false);
      setForm(EMPTY_DRIVER);
      return null;
    } catch (err: any) {
      if (err.response?.status === 401) {
        router.replace('/');
        return null;
      }
      return 'Не удалось удалить водителя. Попробуйте позже.';
    }
  }, [form.id, getToken, handleAuthRequired, router]);

  // ── Modal control ────────────────────────────────────────────────────────

  const openAdd = useCallback(() => {
    setForm(EMPTY_DRIVER);
    setEditMode('add');
    setEditModalVisible(true);
  }, []);

  const openEdit = useCallback((driver: DriverData) => {
    setForm({ ...driver });
    setEditMode('edit');
    setEditModalVisible(true);
  }, []);

  const closeEditModal = useCallback(() => {
    setEditModalVisible(false);
  }, []);

  const openDeleteConfirm = useCallback(() => {
    setEditModalVisible(false);
    setDeleteModalVisible(true);
  }, []);

  const closeDeleteModal = useCallback(() => {
    setDeleteModalVisible(false);
  }, []);

  return {
    // Data
    drivers,
    loading,
    saving,
    // Form
    form,
    editMode,
    isFormValid,
    changeField,
    // Modal visibility
    editModalVisible,
    deleteModalVisible,
    // Actions
    loadDrivers,
    saveDriver,
    deleteDriver,
    // Modal control
    openAdd,
    openEdit,
    closeEditModal,
    openDeleteConfirm,
    closeDeleteModal,
  };
}
