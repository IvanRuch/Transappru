export type PaymentMethod = 'card' | 'sbp' | 'yandexpay';

export interface PaymentInitiateResponse {
  payment_url: string;
  payment_id: string;
}

export interface PaymentResult {
  status: 'success' | 'fail' | 'cancel';
  payment_id?: string;
  message?: string;
}
