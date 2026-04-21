import { useState, useMemo } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';
import { GRZ_ALLOWED, normalizePlate } from '../utils/plateHelpers';

/**
 * Shared INN-binding + RNIS-check logic for mobile and web.
 *
 * Handles: param parsing, INN validation, bind-inn API,
 * RNIS plate input, check-rnis API, modal state.
 *
 * @param onConfirmationClose — called after user closes the
 *   "application registered" modal (navigation differs per platform).
 */
export function useInnBinding(onConfirmationClose?: () => void) {
  const router = useRouter();
  const params = useLocalSearchParams();

  // ── Parse route params ──────────────────────────────────────────────────────
  const userData = useMemo<any>(() => {
    try {
      if (params.user_data) {
        const str = Array.isArray(params.user_data) ? params.user_data[0] : params.user_data;
        return typeof str === 'string' ? JSON.parse(str) : {};
      }
    } catch (e) {
      console.log('Error parsing user_data:', e);
    }
    return {};
  }, [params.user_data]);

  const checkRnis = useMemo(
    () => (Array.isArray(params.check_rnis) ? params.check_rnis[0] : params.check_rnis) === '1',
    [params.check_rnis],
  );

  const isExistingUser = Object.keys(userData).length > 0;

  // ── INN state ───────────────────────────────────────────────────────────────
  const [inn, setInn] = useState('');
  const innValid = /^(\d{10})$|^(\d{12})$/.test(inn);

  const changeInn = (value: string) => {
    setInn(value.replace(/\D/g, '').substring(0, 12));
  };

  // ── RNIS state ──────────────────────────────────────────────────────────────
  const [autoNumberBase, setAutoNumberBase] = useState('');
  const [autoNumberRegion, setAutoNumberRegion] = useState('');
  const [rnisLoading, setRnisLoading] = useState(false);
  const [rnisData, setRnisData] = useState<any>(null);

  const rnisButtonEnabled =
    autoNumberBase.length === 6 &&
    (autoNumberRegion.length === 2 || autoNumberRegion.length === 3);

  const changeAutoNumberBase = (value: string) => {
    const converted = normalizePlate(value);
    if (GRZ_ALLOWED.test(converted)) {
      setAutoNumberBase(converted.substring(0, 6));
    }
  };

  const changeAutoNumberRegion = (value: string) => {
    if (/^[0-9]*$/.test(value)) {
      setAutoNumberRegion(value.substring(0, 3));
    }
  };

  // ── Modal state ─────────────────────────────────────────────────────────────
  const [confirmationModal, setConfirmationModal] = useState(false);
  /**
   * Last backend error (/bind-inn returned error === 1 with msg). Screens
   * surface it via showAlert in a useEffect, then call clearError().
   */
  const [error, setError] = useState<string | null>(null);
  const [managerPhone, setManagerPhone] = useState('');

  // ── INN binding ─────────────────────────────────────────────────────────────
  const handleBindInn = async () => {
    const token = await AsyncStorage.getItem('token');
    if (!token) {
      router.replace('/');
      return;
    }

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
        setError(data.msg || 'Не удалось привязать ИНН');
      } else {
        if (isExistingUser) {
          const originalInn = userData.inn;
          const currentToken = data.token || token;

          try {
            await api.post('/set-current-inn', { token: currentToken, current_inn: originalInn });
            console.log('Successfully returned to original organization');
          } catch (e) {
            console.log('Error returning to original org:', e);
          }

          setManagerPhone(userData.manager_data?.mobile_phone || '');
          setConfirmationModal(true);
        } else {
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

  // ── RNIS check ──────────────────────────────────────────────────────────────
  const handleCheckRnis = async () => {
    const token = await AsyncStorage.getItem('token');
    if (!token) {
      router.replace('/');
      return;
    }

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

  // ── Modal actions ───────────────────────────────────────────────────────────
  const clearError = () => setError(null);

  const closeConfirmationModal = () => {
    setConfirmationModal(false);
    onConfirmationClose?.();
  };

  return {
    // Params
    userData,
    checkRnis,
    isExistingUser,
    // INN
    inn,
    innValid,
    changeInn,
    // RNIS
    autoNumberBase,
    autoNumberRegion,
    rnisButtonEnabled,
    rnisLoading,
    rnisData,
    changeAutoNumberBase,
    changeAutoNumberRegion,
    // Modals
    confirmationModal,
    error,
    clearError,
    managerPhone,
    closeConfirmationModal,
    // Actions
    handleBindInn,
    handleCheckRnis,
  };
}
