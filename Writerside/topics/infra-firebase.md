# Firebase Setup

<!-- Content to be migrated from /docs/FIREBASE_SETUP.md -->

## Overview

Firebase is used for push notifications via FCM (Firebase Cloud Messaging).

## Configuration

- iOS: `GoogleService-Info.plist` (gitignored)
- Android: `google-services.json` (gitignored)

## Key Files

- `src/services/firebase.ts` — initialization and token management
- `src/hooks/usePushNotifications.ts` — notification hook
- `plugins/withFirebaseApp.js` — Expo config plugin
