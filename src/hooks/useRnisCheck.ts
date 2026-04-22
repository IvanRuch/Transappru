import { useCallback, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';
import { GRZ_ALLOWED, normalizePlate } from '../utils/plateHelpers';

/**
 * Lightweight hook for the RNIS-check modal (web sidebar entry point).
 *
 * Strips the RNIS-only concerns out of the larger `useInnBinding` hook so
 * the modal doesn't pull in INN binding, confirmation-modal state, or
 * route-param parsing it doesn't need. `useInnBinding` still covers the
 * full-screen flow (register / add-account) where RNIS is optional.
 *
 * The hook holds its own plate state and a `reset()` call so the owner
 * (modal) can wipe inputs each time it closes.
 */
export function useRnisCheck() {
  const [autoNumberBase, setAutoNumberBase] = useState('');
  const [autoNumberRegion, setAutoNumberRegion] = useState('');
  const [rnisLoading, setRnisLoading] = useState(false);
  const [rnisData, setRnisData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const rnisButtonEnabled =
    autoNumberBase.length === 6 &&
    (autoNumberRegion.length === 2 || autoNumberRegion.length === 3);

  const changeAutoNumberBase = useCallback((value: string) => {
    const converted = normalizePlate(value);
    if (GRZ_ALLOWED.test(converted)) {
      setAutoNumberBase(converted.substring(0, 6));
    }
  }, []);

  const changeAutoNumberRegion = useCallback((value: string) => {
    if (/^[0-9]*$/.test(value)) {
      setAutoNumberRegion(value.substring(0, 3));
    }
  }, []);

  const handleCheckRnis = useCallback(async () => {
    const token = await AsyncStorage.getItem('token');
    if (!token) {
      setError('Требуется авторизация');
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
    } catch (e: any) {
      console.log('Error checking RNIS:', e);
      setError('Не удалось проверить. Попробуйте позже.');
    } finally {
      setRnisLoading(false);
    }
  }, [autoNumberBase, autoNumberRegion]);

  const clearError = useCallback(() => setError(null), []);

  const reset = useCallback(() => {
    setAutoNumberBase('');
    setAutoNumberRegion('');
    setRnisData(null);
    setRnisLoading(false);
    setError(null);
  }, []);

  return {
    autoNumberBase,
    autoNumberRegion,
    rnisLoading,
    rnisData,
    rnisButtonEnabled,
    error,
    clearError,
    changeAutoNumberBase,
    changeAutoNumberRegion,
    handleCheckRnis,
    reset,
  };
}
