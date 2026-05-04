/**
 * Persists the legacy `user.id` (from `/get-auto-list`'s `user_data.id`)
 * locally so any later screen can attribute outgoing actions to the
 * current user without re-fetching the list.
 *
 * Why we cache: the data-issues report endpoint
 * (`POST /payment-api/data-issues/report`) requires a `user_id` in the
 * body (no auth at the payment-service boundary, see ADR-012). The
 * frontend obtains `user_data.id` only as a side effect of `useAutoData`
 * — caching here lets `DataIssueReportButton` work on the detail screen
 * without prop-drilling user_id through the navigation graph.
 *
 * Storage key: `transapp:user_id`. Cleared on logout (alongside `token`).
 *
 * Single canonical source — do not duplicate get/set elsewhere.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'transapp:user_id';

/**
 * Persist the current user's id. Idempotent — safe to call repeatedly
 * with the same value. Pass `null` / empty string to clear (e.g. on
 * logout flow alongside removing `token`).
 */
export async function setCachedUserId(id: number | string | null): Promise<void> {
  try {
    if (id === null || id === undefined || id === '') {
      await AsyncStorage.removeItem(STORAGE_KEY);
      return;
    }
    const asString = typeof id === 'number' ? String(id) : String(id).trim();
    if (!asString || asString === '0') {
      await AsyncStorage.removeItem(STORAGE_KEY);
      return;
    }
    await AsyncStorage.setItem(STORAGE_KEY, asString);
  } catch {
    // AsyncStorage is best-effort; the data-issue report flow degrades
    // by disabling the report button rather than throwing.
  }
}

/**
 * Read the cached user.id as a positive integer. Returns null if no
 * value is stored or the value is not a valid positive integer
 * (defensive — protects the typed payload going to the backend).
 */
export async function getCachedUserId(): Promise<number | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const n = Number.parseInt(raw, 10);
    if (!Number.isFinite(n) || n <= 0) return null;
    return n;
  } catch {
    return null;
  }
}
