/**
 * Tests for the user-id AsyncStorage cache (ADR-012). Verifies:
 *   - set/get round-trip with positive integer values
 *   - clearing on null / empty / "0"
 *   - defensive null on corrupt storage values
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

import { getCachedUserId, setCachedUserId } from '../userIdCache';

const STORAGE_KEY = 'transapp:user_id';

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('setCachedUserId + getCachedUserId', () => {
  it('persists a positive integer', async () => {
    await setCachedUserId(678);
    expect(await getCachedUserId()).toBe(678);
  });

  it('accepts a string id and converts to integer', async () => {
    await setCachedUserId('42');
    expect(await getCachedUserId()).toBe(42);
  });

  it('returns null for unset key', async () => {
    expect(await getCachedUserId()).toBeNull();
  });

  it('clears storage when called with null', async () => {
    await setCachedUserId(123);
    await setCachedUserId(null);
    expect(await getCachedUserId()).toBeNull();
  });

  it('clears storage when called with empty string', async () => {
    await setCachedUserId(123);
    await setCachedUserId('');
    expect(await getCachedUserId()).toBeNull();
  });

  it('refuses to persist 0 (treated as logged-out)', async () => {
    await setCachedUserId(0);
    expect(await getCachedUserId()).toBeNull();
  });

  it('returns null when stored value is corrupt (non-numeric)', async () => {
    await AsyncStorage.setItem(STORAGE_KEY, 'not-a-number');
    expect(await getCachedUserId()).toBeNull();
  });

  it('returns null when stored value is negative', async () => {
    await AsyncStorage.setItem(STORAGE_KEY, '-5');
    expect(await getCachedUserId()).toBeNull();
  });

  it('idempotent set with the same value', async () => {
    await setCachedUserId(99);
    await setCachedUserId(99);
    expect(await getCachedUserId()).toBe(99);
  });
});
