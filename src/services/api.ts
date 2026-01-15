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
    // Request interceptor
    instance.interceptors.request.use(
      async config => {
        return config;
      },
      error => Promise.reject(error)
    );

    // Response interceptor
    instance.interceptors.response.use(
      response => response,
      async error => {
        if (error.response) {
          const { status, data } = error.response;
          
          if (status === 401) {
            console.log('API: 401 Unauthorized - clearing token');
            await AsyncStorage.removeItem('token');
          }
          
          console.log('API Error:', {
            url: error.config?.url,
            method: error.config?.method,
            status,
            data
          });
        } else if (error.request) {
          console.log('API: Network Error - no response received', error.message);
        } else {
          console.log('API: Request Setup Error -', error.message);
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
