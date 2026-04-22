import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';

export type SwitchOrganizationResult =
  | { status: 'ok' }
  | { status: 'auth_required' }
  | { status: 'error'; message: string };

const GENERIC_ERROR = 'Не удалось переключить организацию. Попробуйте позже.';

/**
 * Switch the authenticated user to another organization by INN.
 *
 * Performs a single API call (`POST /set-current-inn { token, current_inn }`),
 * inspects the response for the token-invalidation signal, and normalises
 * all outcomes into a discriminated union so callers (mobile screens, web
 * sidebar) can react with the right UI without duplicating the HTTP logic.
 *
 * On `auth_required` the stored token is removed — callers are expected to
 * redirect to the auth screen. The function is UI-agnostic and does not
 * trigger any alerts or navigation by itself.
 */
export async function switchOrganization(inn: string): Promise<SwitchOrganizationResult> {
  const token = await AsyncStorage.getItem('token');
  if (!token) {
    return { status: 'auth_required' };
  }

  try {
    console.log('Switching to organization with INN:', inn);
    const res = await api.post('/set-current-inn', { token, current_inn: inn });
    console.log('Switch organization response:', res.data);

    if (res.data?.auth_required === 1) {
      await AsyncStorage.removeItem('token');
      return { status: 'auth_required' };
    }

    return { status: 'ok' };
  } catch (error: any) {
    console.log('Error switching organization:', error);
    if (error?.response?.status === 401) {
      await AsyncStorage.removeItem('token');
      return { status: 'auth_required' };
    }
    return { status: 'error', message: GENERIC_ERROR };
  }
}
