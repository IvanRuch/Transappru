import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, Pressable, TextInput, Modal, ActivityIndicator,
  ScrollView, StyleSheet, Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import api from '../../../services/api';

const noSelect = Platform.OS === 'web' ? { userSelect: 'none' as const } : {};

interface DriverData {
  id: string;
  vu: string;
  vu_reg: string;
  name_f: string;
  name_i: string;
  name_o: string;
}

const EMPTY_DRIVER: DriverData = { id: '', vu: '', vu_reg: '', name_f: '', name_i: '', name_o: '' };

function handleAuthRequired(data: any, router: any): boolean {
  if (data.auth_required === 1 || data.auth_required === '1') {
    router.replace('/');
    return true;
  }
  return false;
}

// ── Main component ──────────────────────────────────────────────────────────

export function DriversTab() {
  const router = useRouter();

  const [drivers, setDrivers] = useState<DriverData[]>([]);
  const [loading, setLoading] = useState(true);
  const [editModal, setEditModal] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);
  const [editMode, setEditMode] = useState<'add' | 'edit'>('add');
  const [form, setForm] = useState<DriverData>(EMPTY_DRIVER);
  const [saving, setSaving] = useState(false);

  // ── Load drivers ────────────────────────────────────────────────────────

  const loadDrivers = useCallback(async () => {
    const token = await AsyncStorage.getItem('token');
    if (!token) { router.replace('/'); return; }
    setLoading(true);
    try {
      const res = await api.post('/get-driver-list', { token });
      if (handleAuthRequired(res.data, router)) return;
      setDrivers(res.data.user_driver_list || []);
    } catch (err: any) {
      console.log('Error loading drivers:', err);
      if (err.response?.status === 401) router.replace('/');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => { loadDrivers(); }, [loadDrivers]);

  // ── Validation ──────────────────────────────────────────────────────────

  const isFormValid =
    /^[0-9]{10}$/.test(form.vu) &&
    /^[0-9]{2}\.[0-9]{2}\.[0-9]{4}$/.test(form.vu_reg) &&
    form.name_f.trim() !== '' &&
    form.name_i.trim() !== '';

  // ── Field change ────────────────────────────────────────────────────────

  const changeField = (field: keyof DriverData, value: string) => {
    if (field === 'vu') {
      if (/^[0-9]*$/.test(value) && value.length <= 10) {
        setForm(prev => ({ ...prev, vu: value }));
      }
    } else if (field === 'vu_reg') {
      let digits = value.replace(/\D/g, '').slice(0, 8);
      let formatted = digits.slice(0, 2);
      if (digits.length > 2) formatted += '.' + digits.slice(2, 4);
      if (digits.length > 4) formatted += '.' + digits.slice(4, 8);
      setForm(prev => ({ ...prev, vu_reg: formatted }));
    } else {
      setForm(prev => ({ ...prev, [field]: value }));
    }
  };

  // ── Save ────────────────────────────────────────────────────────────────

  const saveDriver = async () => {
    const token = await AsyncStorage.getItem('token');
    if (!token) { router.replace('/'); return; }
    setSaving(true);
    try {
      const res = await api.post('/edit-driver', { token, user_driver_data: form });
      if (handleAuthRequired(res.data, router)) return;
      setEditModal(false);
      setForm(EMPTY_DRIVER);
      loadDrivers();
    } catch (err: any) {
      console.log('Error saving driver:', err);
      if (err.response?.status === 401) router.replace('/');
    } finally {
      setSaving(false);
    }
  };

  // ── Delete ──────────────────────────────────────────────────────────────

  const deleteDriver = async () => {
    const token = await AsyncStorage.getItem('token');
    if (!token) { router.replace('/'); return; }
    try {
      const res = await api.post('/del-driver', { token, id: form.id });
      if (handleAuthRequired(res.data, router)) return;
      setDrivers(prev => prev.filter(d => d.id !== form.id));
      setDeleteModal(false);
      setEditModal(false);
      setForm(EMPTY_DRIVER);
    } catch (err: any) {
      console.log('Error deleting driver:', err);
      if (err.response?.status === 401) router.replace('/');
    }
  };

  // ── Open modals ─────────────────────────────────────────────────────────

  const openAdd = () => {
    setForm(EMPTY_DRIVER);
    setEditMode('add');
    setEditModal(true);
  };

  const openEdit = (driver: DriverData) => {
    setForm({ ...driver });
    setEditMode('edit');
    setEditModal(true);
  };

  // ── Render ──────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color="#313131" />
      </View>
    );
  }

  return (
    <ScrollView style={s.root} contentContainerStyle={s.content}>
      {/* Add button */}
      <Pressable style={s.addBtn} onPress={openAdd}>
        <Text style={s.addBtnPlus}>+</Text>
        <Text style={s.addBtnText}>Добавить водителя</Text>
      </Pressable>

      {drivers.length === 0 && (
        <Text style={s.empty}>Водители не добавлены</Text>
      )}

      {/* Driver cards */}
      {drivers.map(driver => (
        <View key={driver.id} style={s.card}>
          <View style={s.cardInfo}>
            <Text style={s.cardName}>
              {driver.name_f} {driver.name_i} {driver.name_o}
            </Text>
            <Text style={s.cardDetail}>ВУ: {driver.vu}</Text>
            <Text style={s.cardDetail}>Дата выдачи: {driver.vu_reg}</Text>
          </View>
          <Pressable style={s.editBtn} onPress={() => openEdit(driver)}>
            <Text style={s.editBtnText}>Изменить</Text>
          </Pressable>
        </View>
      ))}

      {/* ── Edit / Add modal ──────────────────────────────────────────────── */}
      <Modal visible={editModal} transparent animationType="fade" onRequestClose={() => setEditModal(false)}>
        <Pressable style={s.overlay} onPress={() => setEditModal(false)}>
          <Pressable style={s.modal} onPress={e => e.stopPropagation()}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Данные водителя</Text>
              <Pressable onPress={() => setEditModal(false)}>
                <Text style={s.modalClose}>✕</Text>
              </Pressable>
            </View>

            {/* License block */}
            <View style={s.formSection}>
              <Text style={s.fieldLabel}>Номер водительского удостоверения *</Text>
              <TextInput
                style={s.input}
                value={form.vu}
                onChangeText={v => changeField('vu', v)}
                placeholder="0000000000"
                placeholderTextColor="#8C8C8C"
                maxLength={10}
                inputMode="numeric"
              />
              <Text style={s.fieldLabel}>Дата выдачи *</Text>
              <TextInput
                style={s.input}
                value={form.vu_reg}
                onChangeText={v => changeField('vu_reg', v)}
                placeholder="00.00.0000"
                placeholderTextColor="#8C8C8C"
                maxLength={10}
                inputMode="numeric"
              />
            </View>

            {/* Name block */}
            <View style={s.formSection}>
              <Text style={s.fieldLabel}>Владелец</Text>
              <TextInput
                style={s.input}
                value={form.name_f}
                onChangeText={v => changeField('name_f', v)}
                placeholder="Фамилия *"
                placeholderTextColor="#8C8C8C"
              />
              <TextInput
                style={s.input}
                value={form.name_i}
                onChangeText={v => changeField('name_i', v)}
                placeholder="Имя *"
                placeholderTextColor="#8C8C8C"
              />
              <TextInput
                style={s.input}
                value={form.name_o}
                onChangeText={v => changeField('name_o', v)}
                placeholder="Отчество"
                placeholderTextColor="#8C8C8C"
              />
            </View>

            {/* Buttons */}
            <View style={s.modalButtons}>
              <Pressable
                style={[s.saveBtn, !isFormValid && s.saveBtnDisabled]}
                onPress={saveDriver}
                disabled={!isFormValid || saving}
              >
                <Text style={s.saveBtnText}>
                  {saving ? 'Сохранение...' : editMode === 'add' ? 'Добавить' : 'Сохранить'}
                </Text>
              </Pressable>
              {editMode === 'edit' && (
                <Pressable
                  style={s.deleteBtn}
                  onPress={() => { setEditModal(false); setDeleteModal(true); }}
                >
                  <Text style={s.deleteBtnText}>Удалить</Text>
                </Pressable>
              )}
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── Delete confirmation modal ─────────────────────────────────────── */}
      <Modal visible={deleteModal} transparent animationType="fade" onRequestClose={() => setDeleteModal(false)}>
        <Pressable style={s.overlay} onPress={() => setDeleteModal(false)}>
          <Pressable style={s.deleteModalBox} onPress={e => e.stopPropagation()}>
            <Text style={s.deleteModalTitle}>Удалить водителя?</Text>
            <Text style={s.deleteModalName}>{form.name_f} {form.name_i}</Text>
            <View style={s.deleteModalButtons}>
              <Pressable style={s.confirmDeleteBtn} onPress={deleteDriver}>
                <Text style={s.confirmDeleteText}>Удалить</Text>
              </Pressable>
              <Pressable style={s.cancelBtn} onPress={() => setDeleteModal(false)}>
                <Text style={s.cancelBtnText}>Отменить</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: 20 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },

  // Add button
  addBtn: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  addBtnPlus: { fontSize: 28, color: '#3A3A3A', marginRight: 8, fontWeight: '300', ...noSelect },
  addBtnText: { fontSize: 18, color: '#3A3A3A', ...noSelect },

  empty: { fontSize: 15, color: '#888', marginTop: 12 },

  // Driver card
  card: {
    flexDirection: 'row',
    padding: 14,
    marginBottom: 10,
    backgroundColor: '#EEEEEE',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#B8B8B8',
  },
  cardInfo: { flex: 1 },
  cardName: { fontSize: 16, fontWeight: '700', color: '#313131', marginBottom: 4, ...noSelect },
  cardDetail: { fontSize: 14, color: '#656565', marginTop: 2, ...noSelect },
  editBtn: { justifyContent: 'center', paddingLeft: 12 },
  editBtnText: { fontSize: 14, color: '#3A3A3A', textDecorationLine: 'underline', ...noSelect },

  // Overlay
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Edit modal
  modal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    width: '90%',
    maxWidth: 480,
    maxHeight: '90%',
    padding: 24,
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 22, fontWeight: '700', color: '#313131', ...noSelect },
  modalClose: { fontSize: 20, color: '#888', padding: 4, ...noSelect },

  formSection: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  fieldLabel: { fontSize: 14, color: '#313131', marginBottom: 8, marginTop: 4, ...noSelect },
  input: {
    height: 48,
    fontSize: 16,
    paddingHorizontal: 14,
    backgroundColor: '#FFFFFF',
    borderColor: '#CCC',
    borderWidth: 1,
    borderRadius: 8,
    color: '#313131',
    marginBottom: 12,
  },

  modalButtons: { flexDirection: 'row', gap: 12, marginTop: 4 },
  saveBtn: {
    flex: 1,
    height: 48,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3A3A3A',
  },
  saveBtnDisabled: { backgroundColor: '#C0C0C0' },
  saveBtnText: { fontSize: 15, fontWeight: '600', color: '#FFFFFF', ...noSelect },
  deleteBtn: {
    flex: 1,
    height: 48,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#B8B8B8',
  },
  deleteBtnText: { fontSize: 15, color: '#313131', ...noSelect },

  // Delete confirmation
  deleteModalBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '80%',
    maxWidth: 360,
    alignItems: 'center',
  },
  deleteModalTitle: { fontSize: 20, fontWeight: '700', color: '#313131', ...noSelect },
  deleteModalName: { fontSize: 16, color: '#656565', marginTop: 12, ...noSelect },
  deleteModalButtons: { flexDirection: 'row', gap: 12, marginTop: 24, width: '100%' },
  confirmDeleteBtn: {
    flex: 1,
    height: 48,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#D32F2F',
  },
  confirmDeleteText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF', ...noSelect },
  cancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#B8B8B8',
  },
  cancelBtnText: { fontSize: 15, color: '#313131', ...noSelect },
});
