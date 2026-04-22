/**
 * Unit tests for the shared organization-switch util.
 *
 * Covers all four documented branches:
 *   • no token → auth_required
 *   • successful response → ok
 *   • response.auth_required === 1 → auth_required + token cleared
 *   • HTTP 401 → auth_required + token cleared
 *   • generic error → error + human message
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { switchOrganization } from '../switchOrganization';
import api from '../../services/api';

jest.mock('../../services/api', () => ({
  __esModule: true,
  default: {
    post: jest.fn(),
  },
}));

const mockedApi = api as unknown as { post: jest.Mock };

describe('switchOrganization util', () => {
  beforeEach(async () => {
    mockedApi.post.mockReset();
    await AsyncStorage.clear();
  });

  it('returns auth_required when no token is stored', async () => {
    const res = await switchOrganization('7700000000');
    expect(res).toEqual({ status: 'auth_required' });
    expect(mockedApi.post).not.toHaveBeenCalled();
  });

  it('returns ok on successful response and calls the correct endpoint + body', async () => {
    await AsyncStorage.setItem('token', 'tkn-1');
    mockedApi.post.mockResolvedValueOnce({ data: { success: true } });

    const res = await switchOrganization('7700000000');

    expect(res).toEqual({ status: 'ok' });
    expect(mockedApi.post).toHaveBeenCalledWith('/set-current-inn', {
      token: 'tkn-1',
      current_inn: '7700000000',
    });
  });

  it('returns auth_required and clears token when server sets auth_required=1', async () => {
    await AsyncStorage.setItem('token', 'tkn-2');
    mockedApi.post.mockResolvedValueOnce({ data: { auth_required: 1 } });

    const res = await switchOrganization('7700000000');

    expect(res).toEqual({ status: 'auth_required' });
    expect(await AsyncStorage.getItem('token')).toBeNull();
  });

  it('returns auth_required and clears token on HTTP 401', async () => {
    await AsyncStorage.setItem('token', 'tkn-3');
    mockedApi.post.mockRejectedValueOnce({ response: { status: 401 } });

    const res = await switchOrganization('7700000000');

    expect(res).toEqual({ status: 'auth_required' });
    expect(await AsyncStorage.getItem('token')).toBeNull();
  });

  it('returns error with a human message on generic failures (preserves token)', async () => {
    await AsyncStorage.setItem('token', 'tkn-4');
    mockedApi.post.mockRejectedValueOnce(new Error('boom'));

    const res = await switchOrganization('7700000000');

    expect(res.status).toBe('error');
    if (res.status === 'error') {
      expect(res.message).toMatch(/Попробуйте позже/);
    }
    // Token must NOT be cleared on transient errors.
    expect(await AsyncStorage.getItem('token')).toBe('tkn-4');
  });
});
