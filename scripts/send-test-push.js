#!/usr/bin/env node
/**
 * Send a single FCM test push from the local terminal.
 *
 * Uses `firebase-admin` (devDependency) with the service account JSON
 * the partner team shipped over. No gcloud, no manual OAuth, no
 * Firebase Console GUI access required — handy when you want to verify
 * end-to-end push delivery while iterating locally.
 *
 * Setup (one time):
 *   1. Place the service account JSON at .secrets/firebase-server-account.json
 *      (.gitignored via .secrets/ rule — safe to keep locally).
 *   2. The browser side has already produced an FCM token in DevTools
 *      Console: '[push.web] FCM token (DEV only): ...'  (DEV-only log).
 *
 * Usage:
 *   node scripts/send-test-push.js <FCM_TOKEN>
 *   node scripts/send-test-push.js <FCM_TOKEN> "Custom body"
 *   node scripts/send-test-push.js <FCM_TOKEN> "Body" "Custom title"
 *
 * Tab in foreground → in-app banner via NotificationContext.
 * Tab in background → OS-level notification via the service worker.
 */

const fs = require('node:fs');
const path = require('node:path');
const admin = require('firebase-admin');

const SA_PATH = path.resolve(__dirname, '..', '.secrets', 'firebase-server-account.json');

const [, , token, body, title] = process.argv;

if (!token) {
  console.error('Usage: node scripts/send-test-push.js <FCM_TOKEN> [body] [title]');
  console.error('');
  console.error('Get the token from the browser DevTools Console after granting');
  console.error('notification permission — look for "[push.web] FCM token (DEV only)".');
  process.exit(1);
}

if (!fs.existsSync(SA_PATH)) {
  console.error(`Service account JSON not found at ${SA_PATH}`);
  console.error('Place the Firebase Admin SDK service account file there. It looks like:');
  console.error('  { "type": "service_account", "project_id": "...", "private_key": "...", ... }');
  console.error('See Writerside/topics/dev-push-notifications.md for details.');
  process.exit(1);
}

const sa = JSON.parse(fs.readFileSync(SA_PATH, 'utf8'));

admin.initializeApp({ credential: admin.credential.cert(sa) });

const message = {
  token,
  notification: {
    title: title || 'TransApp',
    body: body || 'Тестовое сообщение из локального скрипта',
  },
  webpush: {
    fcmOptions: { link: '/auto-list' },
  },
};

admin
  .messaging()
  .send(message)
  .then((id) => {
    console.log(`Sent. messageId: ${id}`);
    process.exit(0);
  })
  .catch((err) => {
    console.error('Send failed:', err.code || err.message || err);
    if (err.errorInfo) console.error('Details:', err.errorInfo);
    process.exit(1);
  });
