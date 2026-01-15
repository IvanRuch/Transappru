import Api from './api';
import { PaymentInitiateResponse } from '../types/payment';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface CommissionDetailItem {
  type: string;
  amount: number;
  commission: number;
  count: number;
  kazna_percent: number;
  transapp_percent: number;
}

export interface CommissionResponse {
  amount: number;
  kazna_commission: number;
  transapp_commission: number;
  total_amount: number;
  kazna_percent: number;
  transapp_percent: number;
  details?: CommissionDetailItem[];
}

export interface PaymentStatusResponse {
  id: string;
  status: string; // created, pending, auth, cancel, error
  kazna_payment_id?: string;
}

export interface ChargeItemDTO {
  amount: number;
  depType: string;
}

class PaymentService {
  /**
   * Расчет комиссии перед оплатой
   * @param amount Сумма штрафа
   * @param depType Тип ведомства (по умолчанию 'gibdd')
   */
  async calculateCommission(amount: number, depType: string = 'gibdd'): Promise<CommissionResponse> {
    const response = await Api.payment.post('/calculate-commission', {
      amount,
      depType
    });
    return response.data;
  }

  /**
   * Расчет комиссии для нескольких штрафов
   * @param charges Список штрафов (сумма и тип)
   */
  async calculateMultiCommission(charges: ChargeItemDTO[]): Promise<CommissionResponse> {
    const response = await Api.payment.post('/calculate-multi-commission', {
      charges
    });
    return response.data;
  }

  /**
   * Инициация оплаты одного штрафа
   * @param uin УИН штрафа
   * @param amount Сумма к оплате
   * @param description Назначение платежа
   * @param fio ФИО плательщика
   * @param email Email для квитанции
   * @param kvit Заказ квитанции (по умолчанию false)
   */
  async initiatePayment(
    uin: string, 
    amount: number, 
    description?: string,
    fio?: string,
    email?: string,
    kvit: boolean = false
  ): Promise<PaymentInitiateResponse> {
    const token = await AsyncStorage.getItem('token');
    
    const payload = {
      token,
      uin,
      amount,
      description,
      fio,
      email: email || null,
      kvit: !!kvit
    };

    const response = await Api.payment.post('/init-payment', payload);

    return response.data;
  }

  /**
   * Инициация оплаты нескольких штрафов (мультиплатеж)
   * @param uins Массив УИНов
   * @param amount Общая сумма
   * @param fio ФИО плательщика
   * @param email Email для квитанции
   * @param kvit Заказ квитанции (по умолчанию false)
   * @param depType Тип ведомства (по умолчанию 'gibdd')
   */
  async initiateMultiPayment(
    uins: string[], 
    amount: number,
    fio?: string,
    email?: string,
    kvit: boolean = false,
    depType: string = 'gibdd'
  ): Promise<PaymentInitiateResponse> {
    const token = await AsyncStorage.getItem('token');

    const payload = {
      token,
      uins,
      amount,
      fio,
      email: email || null,
      kvit: !!kvit,
      depType
    };

    const response = await Api.payment.post('/init-multi-payment', payload);

    return response.data;
  }

  /**
   * Получение статуса платежа
   * @param paymentId ID платежа (наш UUID)
   */
  async getPaymentStatus(paymentId: string): Promise<PaymentStatusResponse> {
    const response = await Api.payment.get(`/payment-status/${paymentId}`);
    return response.data;
  }
}

export default new PaymentService();
