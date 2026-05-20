import axios, { AxiosInstance } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Основной API (старый бэкенд)
const MAIN_API_URL = 'https://transapp.ru/api/';

// API микросервиса оплаты (новый бэкенд)
// Android Emulator: 10.0.2.2
// iOS Simulator: localhost
// Real Device: Ваш локальный IP
const DEV_PAYMENT_API_URL = Platform.select({
  android: 'http://10.0.2.2:8001/api', 
  ios: 'http://localhost:8001/api',
  default: 'http://localhost:8001/api',
});

const PROD_PAYMENT_API_URL = 'https://payment.transapp.ru/api'; // Пример URL для продакшена

const PAYMENT_API_URL = __DEV__ ? DEV_PAYMENT_API_URL : PROD_PAYMENT_API_URL;

console.log('Main API URL:', MAIN_API_URL);
console.log('Payment API URL:', PAYMENT_API_URL);

class ApiService {
  private api: AxiosInstance;
  private paymentApi: AxiosInstance;

  constructor() {
    // Клиент для основного API
    this.api = axios.create({
      baseURL: MAIN_API_URL,
      responseType: 'json',
      timeout: 30000,
    });

    // Клиент для микросервиса оплаты
    this.paymentApi = axios.create({
      baseURL: PAYMENT_API_URL,
      responseType: 'json',
      timeout: 30000,
    });

    this.setupInterceptors(this.api);
    this.setupInterceptors(this.paymentApi);
  }

  private setupInterceptors(instance: AxiosInstance) {
    // Request interceptor — always stamp t0 on the request config so
    // catch sites (useAutoData, UserDataContext) can compute duration
    // for classifyLoadError. The accompanying console.log is gated to
    // __DEV__ — useful in dev/staging for tracing /get-auto-list
    // slowness, silent in production. See ADR-024.
    instance.interceptors.request.use(
      async config => {
        (config as any).metadata = { t0: Date.now() };
        if (__DEV__) {
          console.log(`⬆️ [API] ${(config.method || 'POST').toUpperCase()} ${config.url} @ ${(config as any).metadata.t0}`);
        }
        return config;
      },
      error => Promise.reject(error)
    );

    // Response interceptor
    instance.interceptors.response.use(
      response => {
        if (__DEV__) {
          const t0 = (response.config as any).metadata?.t0;
          const dt = t0 ? Date.now() - t0 : -1;
          let size = -1;
          try { size = JSON.stringify(response.data ?? '').length; } catch { /* ignore */ }
          console.log(`⬇️ [API] ${response.status} ${response.config.url} in ${dt}ms, size=${size}`);
        }
        return response;
      },
      async error => {
        if (error.response) {
          const { status, data } = error.response;

          if (status === 401) {
            console.log('API: 401 Unauthorized - clearing token');
            await AsyncStorage.removeItem('token');
          }

          if (__DEV__) {
            const t0 = error.config?.metadata?.t0;
            const dt = t0 ? Date.now() - t0 : -1;
            console.log('✗ [API] Error:', {
              url: error.config?.url,
              method: error.config?.method,
              status,
              dt_ms: dt,
              data,
            });
          }
        } else if (error.request) {
          if (__DEV__) {
            const t0 = error.config?.metadata?.t0;
            const dt = t0 ? Date.now() - t0 : -1;
            console.log(`✗ [API] Network/Timeout on ${error.config?.url} after ${dt}ms — code=${error.code}, msg=${error.message}`);
          }
        } else {
          if (__DEV__) {
            console.log(`✗ [API] Request Setup Error on ${error.config?.url} - ${error.message}`);
          }
        }

        return Promise.reject(error);
      }
    );
  }

  // Методы для основного API (совместимость)
  get(url: string, config?: any) {
    return this.api.get(url, config);
  }

  post(url: string, data?: any, config?: any) {
    return this.api.post(url, data, config);
  }

  put(url: string, data?: any, config?: any) {
    return this.api.put(url, data, config);
  }

  delete(url: string, config?: any) {
    return this.api.delete(url, config);
  }

  // Методы для платежного API
  payment = {
    get: (url: string, config?: any) => this.paymentApi.get(url, config),
    post: (url: string, data?: any, config?: any) => this.paymentApi.post(url, data, config),
  };
}

export default new ApiService();
