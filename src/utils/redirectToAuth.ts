import { Platform } from 'react-native';

/**
 * Paths where a "session expired" redirect to `/` is actively harmful:
 * the user is already inside the pre-auth / half-auth flow, redirecting
 * would yank them off /pin or /onboarding and destroy just-entered form
 * state (phone, PIN digits, etc.). See `src/services/api.web.ts` for the
 * matching interceptor-level guard.
 */
const AUTH_FLOW_PATHS = new Set(['/', '/pin', '/onboarding']);

/**
 * Kick the user back to the auth screen. Safe from anywhere:
 *   - Native: always redirects (Platform.OS !== 'web' has no URL concept).
 *   - Web: skips redirect when the user is already on an auth-flow path,
 *     so a late-arriving 401 (e.g. a request that was in flight during
 *     logout or submit) does not tear the Stack down on top of the user's
 *     current form.
 *
 * Callers should use this instead of raw `router.replace('/')` inside
 * 401 / auth_required branches — keeps the guard logic in one place.
 */
export function redirectToAuth(router: { replace: (href: any) => void }): void {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    if (AUTH_FLOW_PATHS.has(window.location.pathname)) return;
  }
  router.replace('/');
}
