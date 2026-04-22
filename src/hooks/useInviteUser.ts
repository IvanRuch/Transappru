import { useCallback, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';

export interface InviteUserForm {
  firm: string;
  inn: string;
  fio: string;
  phone: string;
}

export type InviteUserSubmitResult =
  | { status: 'ok'; message: string }
  | { status: 'auth_required' }
  | { status: 'error'; error: string };

const EMPTY_FORM: InviteUserForm = { firm: '', inn: '', fio: '', phone: '' };
const GENERIC_ERROR = 'Не удалось отправить приглашение. Попробуйте позже.';

/**
 * Shared state + validation + API wiring for the "Пригласить друга"
 * flow. Used by:
 *   - mobile `InviteUserScreen` (full-screen form + native Share sheet)
 *   - web `InviteUserModal` (modal + copy-to-clipboard on success)
 *
 * Validation rules match the legacy behaviour:
 *   firm  — any non-empty string
 *   inn   — 10 or 12 digits
 *   fio   — any non-empty string
 *   phone — exactly +7 followed by 10 digits
 */
export function useInviteUser() {
  const [form, setForm] = useState<InviteUserForm>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);

  const firmValid = form.firm.trim().length > 0;
  const innValid = /^(\d{10})$|^(\d{12})$/.test(form.inn);
  const fioValid = form.fio.trim().length > 0;
  const phoneValid = /^\+7\d{10}$/.test(form.phone);
  const allValid = firmValid && innValid && fioValid && phoneValid;

  const changeFirm = useCallback((value: string) => {
    setForm(prev => ({ ...prev, firm: value }));
  }, []);

  const changeFio = useCallback((value: string) => {
    setForm(prev => ({ ...prev, fio: value }));
  }, []);

  const changeInn = useCallback((value: string) => {
    // Digits only, capped at 12 by `InnInput`-style rules.
    setForm(prev => ({ ...prev, inn: value.replace(/\D/g, '').substring(0, 12) }));
  }, []);

  /**
   * Phone input sticks to "+7XXXXXXXXXX". The hook enforces the prefix
   * so screens don't have to replicate the defensive handling the legacy
   * code had (trimming "+", handling leading 7/8, prepending +7 on first digit).
   */
  const changePhone = useCallback((value: string) => {
    // Pull digits out; drop a leading 7 or 8 so the user can paste either.
    let digits = value.replace(/\D/g, '');
    if (digits.startsWith('7') || digits.startsWith('8')) digits = digits.substring(1);
    if (digits.length > 10) digits = digits.substring(0, 10);
    setForm(prev => ({ ...prev, phone: digits.length > 0 ? '+7' + digits : '' }));
  }, []);

  const submit = useCallback(async (): Promise<InviteUserSubmitResult> => {
    const token = await AsyncStorage.getItem('token');
    if (!token) return { status: 'auth_required' };

    setSubmitting(true);
    try {
      console.log('Inviting user:', form);
      const res = await api.post('/invite-user', { token, ...form });
      const data = res.data;
      console.log('Invite user response:', data);

      if (data?.auth_required === 1) return { status: 'auth_required' };

      const message = typeof data?.msg === 'string' ? data.msg : '';
      if (!message) return { status: 'error', error: GENERIC_ERROR };

      return { status: 'ok', message };
    } catch (e: any) {
      console.log('Error inviting user:', e);
      if (e?.response?.status === 401) return { status: 'auth_required' };
      return { status: 'error', error: GENERIC_ERROR };
    } finally {
      setSubmitting(false);
    }
  }, [form]);

  const reset = useCallback(() => {
    setForm(EMPTY_FORM);
    setSubmitting(false);
  }, []);

  return {
    form,
    firmValid,
    innValid,
    fioValid,
    phoneValid,
    allValid,
    submitting,
    changeFirm,
    changeInn,
    changeFio,
    changePhone,
    submit,
    reset,
  };
}
