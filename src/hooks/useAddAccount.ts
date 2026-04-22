import { useCallback, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import api from '../services/api';

/**
 * Minimum shape of the currently-active user we need for the
 * "Add another account" flow. `inn` is required because we switch back
 * to this organization after the new INN is successfully bound.
 * `manager_data.mobile_phone` is surfaced in the confirmation modal.
 */
export interface AddAccountUserData {
  inn: string;
  manager_data?: { mobile_phone?: string };
}

/**
 * Lightweight hook for the "Добавить аккаунт" modal (web sidebar entry).
 *
 * Replaces the existing-user branch of `useInnBinding` without pulling in
 * route-param parsing, RNIS state, register-new-user redirect, etc. The
 * modal owner passes the current user's snapshot (from the sidebar state)
 * and the hook:
 *   - validates INN (10 or 12 digits)
 *   - POSTs /bind-inn, refreshes token, handles auth_required / errors
 *   - on success: calls /set-current-inn to switch back to the original
 *     org (the add-inn endpoint implicitly switches the session to the
 *     new org, which we don't want on the sidebar flow — the user should
 *     stay in their current context and see "заявка зарегистрирована")
 *   - exposes confirmationModal + managerPhone for the success screen
 *
 * `reset()` is called by the modal on close so reopening starts clean.
 */
export function useAddAccount(userData: AddAccountUserData) {
  const router = useRouter();

  const [inn, setInn] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmationVisible, setConfirmationVisible] = useState(false);
  const [managerPhone, setManagerPhone] = useState('');

  const innValid = /^(\d{10})$|^(\d{12})$/.test(inn);

  const changeInn = useCallback((value: string) => {
    // Digits only, capped at 12.
    setInn(value.replace(/\D/g, '').substring(0, 12));
  }, []);

  const clearError = useCallback(() => setError(null), []);

  const handleBindInn = useCallback(async () => {
    if (!innValid) return;
    const token = await AsyncStorage.getItem('token');
    if (!token) {
      router.replace('/' as any);
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post('/bind-inn', { token, inn });
      const data = res.data;

      if (data.token) {
        await AsyncStorage.setItem('token', data.token);
      }

      if (data.auth_required === 1) {
        router.replace('/' as any);
        return;
      }

      if (data.error == 1) {
        setError(data.msg || 'Не удалось привязать ИНН');
        return;
      }

      // Switch session back to the originally-active org so the user stays
      // in context; the new INN sits in `other_user_list` pending approval.
      const currentToken = data.token || token;
      try {
        await api.post('/set-current-inn', {
          token: currentToken,
          current_inn: userData.inn,
        });
      } catch (e) {
        console.log('Error returning to original org:', e);
      }

      setManagerPhone(userData.manager_data?.mobile_phone || '');
      setConfirmationVisible(true);
    } catch (e: any) {
      console.log('Error binding INN:', e);
      if (e?.response?.status === 401) {
        router.replace('/' as any);
      } else {
        setError('Не удалось привязать ИНН. Попробуйте позже.');
      }
    } finally {
      setSubmitting(false);
    }
  }, [inn, innValid, router, userData.inn, userData.manager_data]);

  const closeConfirmation = useCallback(() => {
    setConfirmationVisible(false);
  }, []);

  const reset = useCallback(() => {
    setInn('');
    setError(null);
    setConfirmationVisible(false);
    setManagerPhone('');
    setSubmitting(false);
  }, []);

  return {
    inn,
    innValid,
    submitting,
    error,
    clearError,
    confirmationVisible,
    managerPhone,
    changeInn,
    handleBindInn,
    closeConfirmation,
    reset,
  };
}
