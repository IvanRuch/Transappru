import { useState, useEffect, useCallback, useMemo } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import PaymentService, { CommissionResponse, ChargeItemDTO } from '../services/payment';
import { ChargeItem } from '../types/charges';

/**
 * Shared payment-confirm logic for mobile and web.
 *
 * Handles: charge parsing from route params, commission calculation,
 * FIO validation, kvit toggle, payment initiation + navigation.
 *
 * Error reporting: sets `fioError` state. Mobile screen can additionally
 * call Alert.alert; web screen shows inline error box.
 */
export function usePaymentConfirm() {
  const router = useRouter();
  const params = useLocalSearchParams();

  // ── UI state ───────────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(false);
  const [commissionData, setCommissionData] = useState<CommissionResponse | null>(null);
  const [calculating, setCalculating] = useState(true);
  const [showDiscountInfo, setShowDiscountInfo] = useState(false);
  const [showAllCharges, setShowAllCharges] = useState(false);

  // ── FIO + kvit ─────────────────────────────────────────────────────────────
  const [fio, setFio] = useState('');
  const [kvit, setKvit] = useState(false);
  const [fioError, setFioError] = useState('');

  // ── Parse charges from route params ────────────────────────────────────────
  const charges: ChargeItem[] = useMemo(() => {
    if (params.charges) {
      try {
        const chargesStr = Array.isArray(params.charges) ? params.charges[0] : params.charges;
        if (typeof chargesStr === 'string') return JSON.parse(chargesStr);
      } catch (e) {
        console.error('Error parsing charges:', e);
        return [];
      }
    } else if (params.fine_data) {
      try {
        const fineDataStr = Array.isArray(params.fine_data) ? params.fine_data[0] : params.fine_data;
        if (typeof fineDataStr === 'string') return [JSON.parse(fineDataStr)];
      } catch (e) {
        console.error('Error parsing fine_data:', e);
        return [];
      }
    }
    return [];
  }, [params.charges, params.fine_data]);

  // ── Derived values ─────────────────────────────────────────────────────────
  const isSingle = charges.length === 1;
  const firstCharge = charges[0];
  const totalAmount = charges.reduce((sum, c) => sum + parseFloat(c.sum || '0'), 0);

  const hasDiscount = isSingle && firstCharge?.discount_time_left && firstCharge.discount_time_left !== '';
  const discountPercent = hasDiscount ? parseInt(firstCharge.discount_percent || '0') : 0;
  const fullAmount = isSingle ? parseFloat(firstCharge?.full_sum || firstCharge?.sum || '0') : totalAmount;
  const discountAmount = hasDiscount ? fullAmount * (discountPercent / 100) : 0;

  // ── Helpers ────────────────────────────────────────────────────────────────
  const getDepType = useCallback((charge: ChargeItem) =>
    (charge.is_platon === '1' || charge.is_platon === 1) ? 'paidRoads' : 'gibdd',
  []);

  const getTypeName = useCallback((type: string) => {
    switch (type) {
      case 'gibdd': return 'ГИБДД';
      case 'paidRoads': return 'Платные дороги';
      case 'fssp': return 'ФССП';
      case 'fns': return 'ФНС';
      default: return 'Прочее';
    }
  }, []);

  // ── Commission calculation ─────────────────────────────────────────────────
  const calculateCommission = useCallback(async () => {
    if (charges.length === 0) return;
    try {
      setCalculating(true);
      let data;
      if (isSingle) {
        data = await PaymentService.calculateCommission(totalAmount, getDepType(firstCharge));
      } else {
        const chargesDTO: ChargeItemDTO[] = charges.map(c => ({
          amount: parseFloat(c.sum || '0'),
          depType: getDepType(c),
        }));
        data = await PaymentService.calculateMultiCommission(chargesDTO);
      }
      setCommissionData(data);
    } catch (err) {
      console.error('Error calculating commission:', err);
    } finally {
      setCalculating(false);
    }
  }, [charges, isSingle, firstCharge, totalAmount, getDepType]);

  useEffect(() => {
    calculateCommission();
  }, [calculateCommission]);

  // ── FIO validation ─────────────────────────────────────────────────────────
  const validateFio = useCallback((): string | null => {
    const trimmed = fio.trim();
    if (!trimmed) return 'Пожалуйста, укажите ФИО плательщика';
    const words = trimmed.split(/\s+/);
    if (words.length < 2) return 'Пожалуйста, укажите Фамилию и Имя (минимум два слова)';
    if (words.length > 6) return 'ФИО слишком длинное. Пожалуйста, проверьте правильность ввода.';
    if (!/^[а-яА-ЯёЁ\s-]+$/.test(trimmed)) return 'ФИО должно содержать только кириллицу';
    return null;
  }, [fio]);

  // ── Payment initiation ─────────────────────────────────────────────────────
  /**
   * Validate FIO, call payment API, navigate to webview.
   * Returns error string if validation fails, null on success.
   */
  const handlePay = useCallback(async (): Promise<string | null> => {
    const validationError = validateFio();
    if (validationError) {
      setFioError(validationError);
      return validationError;
    }
    setFioError('');
    setLoading(true);

    try {
      let response;
      const trimmedFio = fio.trim();

      if (isSingle) {
        response = await PaymentService.initiatePayment(
          firstCharge.uin,
          totalAmount,
          `Оплата начисления ${firstCharge.uin}`,
          trimmedFio,
          undefined,
          kvit,
        );
      } else {
        const uins = charges.map(c => c.uin);
        const depType = getDepType(firstCharge);
        response = await PaymentService.initiateMultiPayment(
          uins, totalAmount, trimmedFio, undefined, kvit, depType,
        );
      }

      if (response && response.payment_url) {
        router.push({
          pathname: '/(authenticated)/fine-payment-webview' as any,
          params: {
            payment_url: response.payment_url,
            fine_data: JSON.stringify(firstCharge),
            payment_id: response.payment_id,
          },
        });
        return null;
      } else {
        throw new Error('Не удалось получить ссылку на оплату');
      }
    } catch (err: any) {
      console.error('Error getting payment URL:', err);
      const msg = err.response?.data?.detail || err.response?.data?.message
        || 'Не удалось инициализировать оплату. Попробуйте позже.';
      return msg;
    } finally {
      setLoading(false);
    }
  }, [validateFio, fio, isSingle, firstCharge, charges, totalAmount, kvit, getDepType, router]);

  return {
    // Charges
    charges,
    isSingle,
    firstCharge,
    totalAmount,
    // Discount
    hasDiscount,
    discountPercent,
    fullAmount,
    discountAmount,
    // Commission
    calculating,
    commissionData,
    // FIO
    fio,
    setFio,
    fioError,
    setFioError,
    // Kvit
    kvit,
    setKvit,
    // UI state
    loading,
    showDiscountInfo,
    setShowDiscountInfo,
    showAllCharges,
    setShowAllCharges,
    // Actions
    handlePay,
    getDepType,
    getTypeName,
  };
}
