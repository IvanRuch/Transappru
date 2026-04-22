import axios, { AxiosInstance, AxiosResponse, AxiosError, InternalAxiosRequestConfig } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';

// На localhost используем dev-сервер с настроенными CORS заголовками.
// В продакшене веб-приложение деплоится на тот же домен что и API — CORS не нужен.
const getBaseUrl = (): string => {
  const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'https://ivan.trans-konsalt.ru/api/';
  }
  return `https://${hostname}/api/`;
};

// Paths where a 401 should NOT redirect to '/'. Pre-auth / half-auth
// flow routes — user is already there, redirecting would either be a
// no-op or blank just-entered form state (see services/api.web.ts for
// the full rationale).
const AUTH_FLOW_PATHS = new Set(['/', '/pin', '/onboarding']);
const isAuthFlowPath = (path: string) => AUTH_FLOW_PATHS.has(path);

// Сериализует тело запроса в application/x-www-form-urlencoded.
// Вложенные объекты/массивы сериализуются через JSON.stringify.
// Это "simple request" по стандарту CORS — preflight не отправляется,
// что позволяет обойти HTTP Basic Auth на OPTIONS у сервера.
const serializeToFormData = (data: any): string => {
  if (!data || typeof data !== 'object') return String(data ?? '');
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(data)) {
    if (value === null || value === undefined) continue;
    params.append(key, typeof value === 'object' ? JSON.stringify(value) : String(value));
  }
  return params.toString();
};

const Api: AxiosInstance = axios.create({
  baseURL: getBaseUrl(),
  responseType: 'json',
  timeout: 15000,
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  transformRequest: [(data) => serializeToFormData(data)],
});

// Request Interceptor
Api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    console.log(`⬆️ [API Web] ${config.method?.toUpperCase()} ${config.url}`, config.data ?? '');
    return config;
  },
  (error: AxiosError) => {
    console.error('❌ [API Web] Request Error:', error);
    return Promise.reject(error);
  }
);

// Response Interceptor
Api.interceptors.response.use(
  (response: AxiosResponse) => {
    if (response.config.url?.includes('get-user-agreement-and-privacy-policy')) {
      console.log(`⬇️ [API Web] ${response.status} ${response.config.url} (Data hidden: too large)`);
    } else {
      console.log(`⬇️ [API Web] ${response.status} ${response.config.url}`, response.data);
    }
    return response;
  },
  async (error: AxiosError) => {
    if (error.response?.status === 401) {
      const onAuthFlow =
        typeof window !== 'undefined' &&
        isAuthFlowPath(window.location.pathname);
      if (onAuthFlow) {
        // See services/api.web.ts: on auth-flow pages a 401 is almost
        // always a stale request from the previous session. Don't touch
        // stored tokens (would nuke the fresh interim one) and don't
        // redirect (we're already in the auth funnel).
        console.warn('🔒 [API Web] 401 on auth-flow path — stale request, ignored');
      } else {
        console.warn('🔒 [API Web] 401 Unauthorized. Clearing session...');
        try {
          await AsyncStorage.removeItem('token');
          await AsyncStorage.removeItem('last_sent_fcm_token');
          router.replace('/');
        } catch (e) {
          console.error('Error clearing session:', e);
        }
      }
    }

    if (error.response) {
      console.error(`❌ [API Web] Error ${error.response.status} ${error.config?.url}:`, error.response.data);
    } else if (error.request) {
      console.error(`❌ [API Web] No response from ${error.config?.url}:`, error.message);
      console.log('Error details:', error.toJSON ? error.toJSON() : error);
    } else {
      console.error('❌ [API Web] Setup Error:', error.message);
    }
    return Promise.reject(error);
  }
);

export default Api;
