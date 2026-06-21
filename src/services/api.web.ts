import axios, { AxiosInstance } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';

// На localhost ходим на prod-apex `transapp.ru/api` — он отдаёт
// `Access-Control-Allow-Origin: *` (CORS для cross-origin dev работает) и это
// тот же backend, что и в проде. Раньше тут стоял staging-vhost Ивана
// `ivan.trans-konsalt.ru`, но он заметно медленнее prod-apex (мониторинг: ~87%
// запросов >5s) и был лишним частным случаем — нативный dev (`api.ts`
// MAIN_API_URL) и так всегда бьёт в `transapp.ru/api`, теперь web с ним
// консистентен. В проде web и API — один origin (`<host>/api/` проксируется
// нашим nginx на prod-apex, ADR-026), CORS не нужен.
const getMainApiUrl = (): string => {
  const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'https://transapp.ru/api/';
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
    // Always stamp t0 on the request config — catch sites use it for
    // classifyLoadError duration heuristic. The accompanying
    // console.log lines are gated to __DEV__ (silent in prod). See
    // ADR-024.
    instance.interceptors.request.use(
      async config => {
        (config as any).metadata = { t0: Date.now() };
        if (__DEV__) {
          console.log(`⬆️ [API Web] ${(config.method || 'POST').toUpperCase()} ${config.url} @ ${(config as any).metadata.t0}`);
        }
        return config;
      },
      error => Promise.reject(error)
    );

    instance.interceptors.response.use(
      response => {
        if (__DEV__) {
          const t0 = (response.config as any).metadata?.t0;
          const dt = t0 ? Date.now() - t0 : -1;
          let size = -1;
          try { size = JSON.stringify(response.data ?? '').length; } catch { /* ignore */ }
          console.log(`⬇️ [API Web] ${response.status} ${response.config.url} in ${dt}ms, size=${size}`);
        }
        return response;
      },
      async error => {
        if (error.response) {
          const { status, data } = error.response;
          const onAuthFlow =
            typeof window !== 'undefined' &&
            isAuthFlowPath(window.location.pathname);
          if (status === 401) {
            if (onAuthFlow) {
              // Stale request from the previous session that was in
              // flight when the user logged out / navigated away. Don't
              // touch AsyncStorage (would nuke a fresh interim token)
              // and don't redirect (we're already in the auth funnel).
              // Silent — no need to spam the console for requests we've
              // structurally chosen to ignore.
            } else {
              console.log('API Web: 401 Unauthorized - clearing token');
              await AsyncStorage.removeItem('token');
              try { localStorage.removeItem('ta_onboarding_done'); } catch {}
              router.replace('/');
            }
          }
          // Only log actionable errors. Auth-flow 401s handled silently above.
          if (__DEV__ && !(status === 401 && onAuthFlow)) {
            const t0 = error.config?.metadata?.t0;
            const dt = t0 ? Date.now() - t0 : -1;
            console.log('✗ [API Web] Error:', { url: error.config?.url, status, dt_ms: dt, data });
          }
        } else if (error.request) {
          if (__DEV__) {
            const t0 = error.config?.metadata?.t0;
            const dt = t0 ? Date.now() - t0 : -1;
            console.log(`✗ [API Web] Network/Timeout on ${error.config?.url} after ${dt}ms — code=${error.code}, msg=${error.message}`);
          }
        } else {
          if (__DEV__) {
            console.log(`✗ [API Web] Request Setup Error on ${error.config?.url} - ${error.message}`);
          }
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
