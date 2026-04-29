// Web Firebase config — read from build-time env vars (EXPO_PUBLIC_*).
// Values are injected by `nginx/Dockerfile.prod` from GitHub Secrets via
// `--build-arg` → `ARG` → `ENV` → `npx expo export`. Three of the six
// fields are project-private (apiKey, appId, vapidKey) and live in
// GitHub Secrets; the other three could be derived from `google-services.json`
// but are also wired through secrets for clean parity.
//
// If the secrets are not configured (typical in local dev), this returns a
// config with empty strings and `isFirebaseWebConfigured()` returns false.
// The web push hook treats that as a graceful no-op — no errors, no banner,
// matches the previous behaviour where web push was a stub.

export interface FirebaseWebConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  vapidKey: string;
}

// Metro inlines values for *direct* `process.env.EXPO_PUBLIC_*` reads at
// build time, but does NOT inline through destructuring (verified
// empirically — `const { EXPO_PUBLIC_FOO } = process.env` survives as a
// runtime read against an empty `process.env` on the client). So we
// access each var directly as a property to ensure substitution.
const projectId = process.env.EXPO_PUBLIC_FIREBASE_WEB_PROJECT_ID ?? '';

export const firebaseWebConfig: FirebaseWebConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_WEB_API_KEY ?? '',
  appId: process.env.EXPO_PUBLIC_FIREBASE_WEB_APP_ID ?? '',
  projectId,
  // authDomain is a deterministic string built from projectId — Firebase
  // always serves the auth UI from `<project>.firebaseapp.com`, so no
  // separate secret needed.
  authDomain: projectId ? `${projectId}.firebaseapp.com` : '',
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_WEB_MESSAGING_SENDER_ID ?? '',
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_WEB_STORAGE_BUCKET ?? '',
  vapidKey: process.env.EXPO_PUBLIC_FIREBASE_WEB_VAPID_KEY ?? '',
};

/**
 * Returns true only when all three project-private values are present.
 * Used by `usePushNotifications.web.ts` and `useWebPushPermission` to
 * skip the entire web-push pipeline when secrets are not configured —
 * keeps local dev and unconfigured deploys clean (no console errors,
 * no banner promise we can't keep).
 */
export function isFirebaseWebConfigured(): boolean {
  return Boolean(
    firebaseWebConfig.apiKey &&
      firebaseWebConfig.appId &&
      firebaseWebConfig.vapidKey,
  );
}
