// Native (iOS / Android) stub for `DynamicTitle`.
//
// On web, `DynamicTitle.web.tsx` renders `<Head><title>...</title></Head>` via
// `expo-router/head` to keep the browser tab title in sync with the current
// route. On native that same `<Head>` mounts Apple Continuity / Handoff via
// `NSUserActivity`, which **requires** the canonical web origin to be baked
// into the native binary at build time (Expo Config Plugin `expo-router`
// `origin` option). Without it, the native runtime throws:
//
//   "Expo Head: Add the handoff origin to the Expo Config (requires rebuild).
//    Add the Config Plugin { plugins: [["expo-router", { origin: "..." }]] }"
//
// We intentionally render `null` on native because:
//   1. iOS/Android screen titles are owned by the native navigation bar, not
//      by HTML `<title>`. `DynamicTitle` is purely a browser-tab concern.
//   2. Handoff has no user value while the web app lives on the staging
//      domain `transapp-dev.ru` behind an auth-gate without cross-device
//      session continuity — a Mac receiving the Handoff link would land on
//      the login screen.
//
// TODO(continuity): Revisit once the lk.transapp.ru cutover lands and the
// web app has a stable canonical production origin (see
// `.claude/plans/2026-05-06-lk-transapp-cutover.md`, ADR-017). At that point,
// to enable Apple Handoff:
//   1. Add `["expo-router", { origin: "https://<prod-host>" }]` to the
//      `plugins` array in `app.json` (or `app.config.*`).
//   2. Rebuild native: `npx expo prebuild --clean` followed by a fresh EAS
//      build / dev client. The `origin` value is baked into the native
//      binary at build time and cannot be changed at runtime.
//   3. Replace the body of this stub with the same implementation as
//      `DynamicTitle.web.tsx`. Metro's platform-specific resolution will
//      pick up this file on native and `.web.tsx` on web.

export function DynamicTitle(): null {
  return null;
}
