import { useState, useEffect, useRef, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import api from '../services/api';
import { ApiResponse, SessionData } from '../types/api';

const MAX_POLL_STEPS = 60;
const POLL_INTERVAL = 10_000;

/**
 * Shared auth-flow logic for mobile and web AuthScreen.
 *
 * Handles: phone digits, agreements, polling for user-confirmation,
 * /auth-by-phone submit, token check on mount.
 *
 * Each screen provides its own phone-input formatting and UI layout.
 */
export function useAuthFlow(initialSessionData?: SessionData) {
  const router = useRouter();

  // ── Phone ──────────────────────────────────────────────────────────────────
  const [phoneDigits, setPhoneDigits] = useState('');
  /** Full phone with country code, e.g. "+79001234567" or "" when empty. */
  const phone = phoneDigits.length > 0 ? '+7' + phoneDigits : '';
  const phoneValid = phoneDigits.length === 10;

  const changePhoneDigits = useCallback((digits: string) => {
    setPhoneDigits(digits.replace(/\D/g, '').substring(0, 10));
  }, []);

  // ── Agreements ─────────────────────────────────────────────────────────────
  const [checked, setChecked] = useState(false);
  const [userAgreement, setUserAgreement] = useState('');
  const [modalUserAgreement, setModalUserAgreement] = useState(false);
  const [privacyPolicy, setPrivacyPolicy] = useState('');
  const [modalPrivacyPolicy, setModalPrivacyPolicy] = useState(false);

  // ── Polling / wait ─────────────────────────────────────────────────────────
  const [modalWaitConfirmation, setModalWaitConfirmation] = useState(false);
  const [sessionData, setSessionData] = useState<SessionData>(initialSessionData || {});

  // ── UI states ──────────────────────────────────────────────────────────────
  const [isCheckingToken, setIsCheckingToken] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Polling ────────────────────────────────────────────────────────────────
  const startPolling = useCallback((token: string) => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    let t = 0;
    const timer = setInterval(async () => {
      try {
        const res = await api.post<ApiResponse>('/get-session-data', { token });
        const data = res.data;
        if (data.session_data) {
          setSessionData(data.session_data);
          const c1 = data.session_data.user_data?.phone_inn_confirmed;
          const c2 = data.session_data.user_data?.user_confirmed;
          if ((c1 === 1 || c1 === '1') && (c2 === 1 || c2 === '1')) {
            clearInterval(timer);
            intervalRef.current = null;
            router.push('/(authenticated)/auto-list');
          }
        }
      } catch (e: any) {
        if (e.response?.status === 401) {
          clearInterval(timer);
          intervalRef.current = null;
        }
      }
      t += POLL_INTERVAL;
      if (t >= MAX_POLL_STEPS * POLL_INTERVAL) {
        clearInterval(timer);
        intervalRef.current = null;
        router.push('/(authenticated)/auto-list');
      }
    }, POLL_INTERVAL);
    intervalRef.current = timer;
  }, [router]);

  // ── Process session data ───────────────────────────────────────────────────
  const processSessionData = useCallback((data: SessionData, token: string) => {
    if (typeof data.user_data !== 'undefined') {
      const c1 = data.user_data.phone_inn_confirmed;
      const c2 = data.user_data.user_confirmed;
      if ((c1 === 0 || c1 === '0') || (c2 === 0 || c2 === '0')) {
        setSessionData(data);
        setModalWaitConfirmation(true);
        setIsCheckingToken(false);
        startPolling(token);
      } else {
        setIsCheckingToken(false);
      }
    } else {
      setIsCheckingToken(false);
    }
  }, [startPolling]);

  // ── Submit phone ───────────────────────────────────────────────────────────
  const handleSubmit = useCallback(async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    const cleanPhone = phone.replace(/\+/, '');
    try {
      const res = await api.post('/auth-by-phone', { phone: cleanPhone });
      await AsyncStorage.setItem('token', res.data.token);
      router.push('/pin');
    } catch {
      setIsSubmitting(false);
    }
  }, [isSubmitting, phone, router]);

  // ── Relogin (from wait-for-confirmation modal) ─────────────────────────────
  const handleRelogin = useCallback(async () => {
    await AsyncStorage.removeItem('token');
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setSessionData({});
    setPhoneDigits('');
    setModalWaitConfirmation(false);
  }, []);

  // ── Mount ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      const token = await AsyncStorage.getItem('token');
      if (token) {
        if (initialSessionData && Object.keys(initialSessionData).length > 0) {
          processSessionData(initialSessionData, token);
        } else {
          try {
            const res = await api.post<ApiResponse>('/get-session-data', { token });
            if (res.data.session_data) {
              processSessionData(res.data.session_data, token);
            } else {
              setIsCheckingToken(false);
            }
          } catch {
            setIsCheckingToken(false);
          }
        }
      } else {
        setIsCheckingToken(false);
      }

      // Load agreement & privacy policy
      try {
        const res = await api.post('/get-user-agreement-and-privacy-policy');
        setUserAgreement(res.data.content_data.user_agreement);
        setPrivacyPolicy(res.data.content_data.privacy_policy);
      } catch {}
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  return {
    // Phone
    phoneDigits,
    phone,
    phoneValid,
    changePhoneDigits,
    // Agreements
    checked,
    setChecked,
    userAgreement,
    privacyPolicy,
    modalUserAgreement,
    setModalUserAgreement,
    modalPrivacyPolicy,
    setModalPrivacyPolicy,
    // Polling / wait
    modalWaitConfirmation,
    sessionData,
    // States
    isCheckingToken,
    isSubmitting,
    // Actions
    handleSubmit,
    handleRelogin,
  };
}
