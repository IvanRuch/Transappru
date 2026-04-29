#!/usr/bin/env node
/**
 * Render `public/firebase-messaging-sw.js` from the template by
 * substituting placeholders with values from `.env`.
 *
 * Why a Node script instead of relying on Metro: the FCM service
 * worker runs in its own context that can't read `process.env` or
 * import application code. Firebase config has to be baked in at
 * build time. In production this is the `sed` step in
 * `nginx/Dockerfile.prod`; in local dev we'd otherwise have to run
 * the same sed manually after every `.env` change. This script makes
 * it `npm run gen:sw` instead.
 *
 * Usage:
 *   npm run gen:sw                # reads .env, writes firebase-messaging-sw.js
 *
 * The generated file is gitignored and regenerated on demand.
 *
 * Exits non-zero (with a helpful message) if any required value is
 * empty or any __PLACEHOLDER__ remains after substitution.
 */

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const ENV_PATH = path.join(ROOT, '.env');
const TEMPLATE_PATH = path.join(ROOT, 'public', 'firebase-messaging-sw.template.js');
const OUTPUT_PATH = path.join(ROOT, 'public', 'firebase-messaging-sw.js');

// 5 placeholders that exist in the template + the env var name they
// should be substituted from. VAPID is not in the SW (it's only used
// at `getToken()` call time on the client), so it's not on this list.
const SUBSTITUTIONS = [
  ['__FIREBASE_API_KEY__', 'EXPO_PUBLIC_FIREBASE_WEB_API_KEY'],
  ['__FIREBASE_APP_ID__', 'EXPO_PUBLIC_FIREBASE_WEB_APP_ID'],
  ['__FIREBASE_PROJECT_ID__', 'EXPO_PUBLIC_FIREBASE_WEB_PROJECT_ID'],
  ['__FIREBASE_MESSAGING_SENDER_ID__', 'EXPO_PUBLIC_FIREBASE_WEB_MESSAGING_SENDER_ID'],
  ['__FIREBASE_STORAGE_BUCKET__', 'EXPO_PUBLIC_FIREBASE_WEB_STORAGE_BUCKET'],
];

/** Minimal .env parser — KEY=VALUE per line, ignores comments and blanks. */
function readEnv(filePath) {
  if (!fs.existsSync(filePath)) {
    console.error(`[gen:sw] .env not found at ${filePath}`);
    console.error('[gen:sw] Copy .env.example to .env and fill in the Firebase values, then rerun.');
    process.exit(1);
  }
  const env = {};
  for (const line of fs.readFileSync(filePath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    // Strip surrounding quotes if any (shell-style: KEY="value" or KEY='value').
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

function main() {
  const env = readEnv(ENV_PATH);
  const missing = SUBSTITUTIONS.filter(([, varName]) => !env[varName]).map(([, n]) => n);
  if (missing.length > 0) {
    console.error('[gen:sw] Missing required env vars in .env:');
    for (const name of missing) console.error(`         - ${name}`);
    console.error('[gen:sw] See .env.example for where to find each value.');
    process.exit(1);
  }

  if (!fs.existsSync(TEMPLATE_PATH)) {
    console.error(`[gen:sw] Template not found at ${TEMPLATE_PATH}`);
    process.exit(1);
  }

  let content = fs.readFileSync(TEMPLATE_PATH, 'utf8');
  for (const [placeholder, varName] of SUBSTITUTIONS) {
    content = content.split(placeholder).join(env[varName]);
  }

  // Validate that no placeholders remain — guards against template
  // drift adding a new __FOO__ that the script doesn't know about.
  const leftover = content.match(/__[A-Z_]+__/g);
  if (leftover) {
    console.error('[gen:sw] Template still has unsubstituted placeholders after rendering:');
    for (const p of [...new Set(leftover)]) console.error(`         - ${p}`);
    console.error('[gen:sw] Add it to SUBSTITUTIONS in scripts/render-firebase-sw.js.');
    process.exit(1);
  }

  fs.writeFileSync(OUTPUT_PATH, content, 'utf8');
  console.log(`[gen:sw] Wrote ${path.relative(ROOT, OUTPUT_PATH)} (${content.length} bytes)`);
  console.log('[gen:sw] If a previous SW is registered in your browser, unregister it');
  console.log('[gen:sw] (DevTools → Application → Service Workers) and hard-reload.');
}

main();
