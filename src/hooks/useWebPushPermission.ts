// Web push permission state machine.
//
// Why a state machine instead of just reading `Notification.permission`:
// the browser API only knows three states (default/granted/denied) and
// doesn't track user intent over time. Best-practice permission UX
// (Mozilla MDN, web.dev) requires tracking "user said NOT NOW, snooze
// for 14 days" and "user dismissed permanently" separately — neither
// fits into the native `Notification.permission` enum.
//
// Storage:
//   transapp:push:snoozedUntil  — ISO date string; if Date.now() < this,
//                                  state is `snoozed` and banner hides.
//   transapp:push:userOptedIn   — '1' once the user has explicitly granted;
//                                  used for analytics / settings toggle.
//
// This hook never calls `Notification.requestPermission()` automatically —
// it only fires inside `requestPermission()`, which the banner's
// "Включить" button invokes. That's the soft-prompt pattern: don't ask
// until the user signals interest by clicking our own UI.

import { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { isFirebaseWebConfigured } from '../config/firebaseWebConfig';

export type PermissionState =
  | 'unsupported' // browser/platform can't do FCM web push
  | 'idle' // default permission, no recent snooze — banner can be shown
  | 'snoozed' // user clicked "Позже"; respect 14d quiet period
  | 'requesting' // native browser dialog open (transient)
  | 'granted' // permission granted; FCM token fetched
  | 'denied'; // permission denied; only Site Settings can revert

const SNOOZE_KEY = 'transapp:push:snoozedUntil';
const OPT_IN_KEY = 'transapp:push:userOptedIn';

// 14 days in ms — chosen per AskUserQuestion. Matches NN/g and web.dev
// recommendations for a re-prompt cooldown that feels respectful but
// still nudges users who simply haven't considered the value yet.
export const SNOOZE_DURATION_MS = 14 * 24 * 60 * 60 * 1000;

// "Forever" for dismiss(): 100 years past now. Effectively permanent
// without using a separate boolean — keeps state derivation in one place.
const DISMISS_DURATION_MS = 100 * 365 * 24 * 60 * 60 * 1000;

function isWebPushSupported(): boolean {
  if (Platform.OS !== 'web') return false;
  if (typeof window === 'undefined') return false;
  return (
    'Notification' in window &&
    'serviceWorker' in navigator &&
    'PushManager' in window
  );
}

function readSnoozedUntil(): number | null {
  try {
    const raw = window.localStorage.getItem(SNOOZE_KEY);
    if (!raw) return null;
    const ts = parseInt(raw, 10);
    return Number.isFinite(ts) ? ts : null;
  } catch {
    // localStorage can throw in privacy modes / quota — treat as no snooze
    return null;
  }
}

function writeSnoozedUntil(ts: number): void {
  try {
    window.localStorage.setItem(SNOOZE_KEY, String(ts));
  } catch {
    // Best-effort — if the user is in privacy mode, they'll just get
    // the banner again next session. Acceptable.
  }
}

function readOptedIn(): boolean {
  try {
    return window.localStorage.getItem(OPT_IN_KEY) === '1';
  } catch {
    return false;
  }
}

function writeOptedIn(value: boolean): void {
  try {
    if (value) {
      window.localStorage.setItem(OPT_IN_KEY, '1');
    } else {
      window.localStorage.removeItem(OPT_IN_KEY);
    }
  } catch {
    // Same — best-effort.
  }
}

/**
 * Derives the current state from the browser's `Notification.permission`
 * and our own snooze marker. Pure function — easy to unit test.
 */
export function deriveState(
  browserPermission: NotificationPermission | undefined,
  snoozedUntil: number | null,
  now: number,
): PermissionState {
  if (browserPermission === undefined) return 'unsupported';
  if (browserPermission === 'granted') return 'granted';
  if (browserPermission === 'denied') return 'denied';
  // 'default' bucket — possibly snoozed
  if (snoozedUntil !== null && snoozedUntil > now) return 'snoozed';
  return 'idle';
}

/**
 * Public hook used by the banner UI and the settings toggle.
 * On native (Platform.OS !== 'web') always returns `unsupported` and
 * no-op functions — safe to call from cross-platform components.
 */
export function useWebPushPermission() {
  const supported = isWebPushSupported() && isFirebaseWebConfigured();

  // Initial state derived synchronously so the banner doesn't flash on
  // mount. We re-evaluate on `Notification.permission` changes via a
  // visibility listener (browser doesn't fire a dedicated event).
  const [state, setState] = useState<PermissionState>(() => {
    if (!supported) return 'unsupported';
    return deriveState(Notification.permission, readSnoozedUntil(), Date.now());
  });

  // Re-check when the tab regains focus — covers the case where the
  // user changed permission in Site Settings without reloading.
  useEffect(() => {
    if (!supported) return;
    const recheck = () => {
      setState(deriveState(Notification.permission, readSnoozedUntil(), Date.now()));
    };
    document.addEventListener('visibilitychange', recheck);
    return () => document.removeEventListener('visibilitychange', recheck);
  }, [supported]);

  const requestPermission = useCallback(async (): Promise<PermissionState> => {
    if (!supported) return 'unsupported';
    setState('requesting');
    try {
      const result = await Notification.requestPermission();
      const next = deriveState(result, null, Date.now());
      if (result === 'granted') writeOptedIn(true);
      setState(next);
      return next;
    } catch (err) {
      console.warn('[useWebPushPermission] requestPermission failed:', err);
      setState(deriveState(Notification.permission, readSnoozedUntil(), Date.now()));
      return 'idle';
    }
  }, [supported]);

  const snooze = useCallback(() => {
    if (!supported) return;
    writeSnoozedUntil(Date.now() + SNOOZE_DURATION_MS);
    setState('snoozed');
  }, [supported]);

  const dismiss = useCallback(() => {
    if (!supported) return;
    writeSnoozedUntil(Date.now() + DISMISS_DURATION_MS);
    setState('snoozed');
  }, [supported]);

  // DEV-only debug helper: window.__transappPushReset() clears localStorage
  // markers and re-derives state. Lets you re-test the prompt flow without
  // hand-editing DevTools → Application → Local Storage.
  // No-op in production builds.
  useEffect(() => {
    if (!__DEV__ || Platform.OS !== 'web' || typeof window === 'undefined') return;
    (window as any).__transappPushReset = () => {
      try {
        window.localStorage.removeItem(SNOOZE_KEY);
        window.localStorage.removeItem(OPT_IN_KEY);
      } catch {
        // localStorage quota / privacy mode — ignore
      }
      const next = supported
        ? deriveState(Notification.permission, null, Date.now())
        : 'unsupported';
      setState(next);
      console.log('[push.web] reset → state:', next, '(reload to re-trigger 10s banner timer)');
    };
    return () => {
      delete (window as any).__transappPushReset;
    };
  }, [supported]);

  return {
    state,
    supported,
    isOptedIn: state === 'granted' && readOptedIn(),
    requestPermission,
    snooze,
    dismiss,
  };
}
