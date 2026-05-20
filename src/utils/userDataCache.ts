/**
 * Persisted snapshot of the last successful `userData` from
 * `/get-auto-list`. Restored on hook mount so the first paint after a
 * cold start already has the header chrome (drawer toggle, filter
 * button, debt indicator, notification badge) instead of waiting for
 * the fresh response.
 *
 * Key is versioned (`_v1`) so future schema changes can invalidate the
 * cache without manual cleanup.
 *
 * `@react-native-async-storage/async-storage` transparently uses
 * localStorage on web, so the same module works on both platforms.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { UserData } from '../types/auto';

const KEY = 'ta_user_data_cache_v1';

export async function readCachedUserData(): Promise<UserData | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && typeof parsed.firm === 'string' && parsed.firm) {
      return parsed as UserData;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Fire-and-forget persist. Skipped if the snapshot has no `firm` —
 * caching an empty/incomplete snapshot would defeat the purpose
 * (restore guard checks `firm`).
 */
export function writeCachedUserData(data: UserData | undefined | null): void {
  if (!data || !data.firm) return;
  void AsyncStorage.setItem(KEY, JSON.stringify(data)).catch(() => { /* ignore */ });
}

export async function clearCachedUserData(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {
    // ignore — best-effort cleanup
  }
}
