import axios, { AxiosInstance } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';

// На localhost используем dev-сервер с настроенными CORS заголовками.
// В продакшене веб-приложение деплоится на тот же домен что и API — CORS не нужен.
const getMainApiUrl = (): string => {
  const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'https://ivan.trans-konsalt.ru/api/';
  }
  return `https://${hostname}/api/`;
};

// Платёжный микросервис — всегда фиксированный URL
const PAYMENT_API_URL = 'https://payment.transapp.ru/api';

// "Simple request" по стандарту CORS — браузер не делает preflight.
// Сервер принимает application/x-www-form-urlencoded.
const serializeToFormData = (data: any): string => {
  if (!data || typeof data !== 'object') return String(data ?? '');
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(data)) {
    if (value === null || value === undefined) continue;
    params.append(key, typeof value === 'object' ? JSON.stringify(value) : String(value));
  }
  return params.toString();
};

const FORM_CONFIG = {
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  transformRequest: [(data: any) => serializeToFormData(data)],
};

class ApiService {
  private api: AxiosInstance;
  private paymentApi: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: getMainApiUrl(),
      responseType: 'json',
      timeout: 30000,
      ...FORM_CONFIG,
    });

    this.paymentApi = axios.create({
      baseURL: PAYMENT_API_URL,
      responseType: 'json',
      timeout: 30000,
      ...FORM_CONFIG,
    });

    this.setupInterceptors(this.api);
    this.setupInterceptors(this.paymentApi);
  }

  private setupInterceptors(instance: AxiosInstance) {
    instance.interceptors.request.use(
      async config => config,
      error => Promise.reject(error)
    );

    instance.interceptors.response.use(
      response => response,
      async error => {
        if (error.response) {
          const { status, data } = error.response;
          if (status === 401) {
            console.log('API Web: 401 Unauthorized - clearing token');
            await AsyncStorage.removeItem('token');
            router.replace('/');
          }
          console.log('API Web Error:', { url: error.config?.url, status, data });
        } else if (error.request) {
          console.log('API Web: Network Error -', error.message);
        } else {
          console.log('API Web: Request Setup Error -', error.message);
        }
        return Promise.reject(error);
      }
    );
  }

  get(url: string, config?: any) { return this.api.get(url, config); }
  post(url: string, data?: any, config?: any) { return this.api.post(url, data, config); }
  put(url: string, data?: any, config?: any) { return this.api.put(url, data, config); }
  delete(url: string, config?: any) { return this.api.delete(url, config); }

  payment = {
    get: (url: string, config?: any) => this.paymentApi.get(url, config),
    post: (url: string, data?: any, config?: any) => this.paymentApi.post(url, data, config),
  };
}

export default new ApiService();
