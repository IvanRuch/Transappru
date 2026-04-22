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

// Платёжный микросервис (Litestar/Python, принимает JSON).
// На localhost — docker-compose exposes port 8001.
// В продакшене — через nginx-прокси на том же домене (/payment-api/).
const getPaymentApiUrl = (): string => {
  const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://localhost:8001/api';
  }
  return `https://${hostname}/payment-api`;
};

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

// Paths where a 401 should NOT redirect the user to '/'. These are the
// routes that make up the pre-auth / half-auth flow — user is already
// here, redirecting would either be a no-op (on '/') or would yank them
// back to the start and destroy just-entered form state.
const AUTH_FLOW_PATHS = new Set(['/', '/pin', '/onboarding']);
const isAuthFlowPath = (path: string) => AUTH_FLOW_PATHS.has(path);

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

    // Payment service (Litestar) expects JSON, not form-urlencoded
    this.paymentApi = axios.create({
      baseURL: getPaymentApiUrl(),
      responseType: 'json',
      timeout: 30000,
      headers: { 'Content-Type': 'application/json' },
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
            try { localStorage.removeItem('ta_onboarding_done'); } catch {}
            // Don't forcibly redirect when the user is in the auth flow
            // ('/', '/pin', '/onboarding'). A late-arriving 401 from a
            // pre-auth endpoint (e.g. `/get-user-agreement` fired from
            // useAuthFlow.init and still in flight while the user moves
            // to /pin) must NOT yank them back to / — doing so remounts
            // the Stack and blanks the just-entered phone number.
            if (
              typeof window !== 'undefined' &&
              !isAuthFlowPath(window.location.pathname)
            ) {
              router.replace('/');
            }
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
