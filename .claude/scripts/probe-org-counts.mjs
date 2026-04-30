#!/usr/bin/env node
// Diagnose the "0 cars under active org in sidebar" bug.
//
// Hypothesis: /get-auto-list response contains `auto_list_count` (the
// real total, used by AutoListScreen — shows 14) AND a separate
// per-org count `user_auto_count` packaged inside `user_data` (active
// org) and inside each `other_user_list[i]` (inactive orgs). The
// sidebar reads `user_data.user_auto_count` for the active row, which
// the user reports as 0 — while inactive rows show correct numbers.
//
// This script prints exactly what the API returns for each of those
// fields so we can confirm the asymmetry before changing any code.
//
// Usage:
//   TOKEN='<from DevTools localStorage on transapp-dev.ru>' \
//     node .claude/scripts/probe-org-counts.mjs
//
// Read-only. Does not log the token.

const TOKEN = process.env.TOKEN;
if (!TOKEN) {
  console.error('Set TOKEN env var: TOKEN=... node .claude/scripts/probe-org-counts.mjs');
  process.exit(1);
}

const URL = 'https://transapp.ru/api/get-auto-list';

const body = {
  token: TOKEN,
  auto_str: '',
  auto_cancelled: 0,
  auto_pass_ended: 0,
  auto_pass_ends: 0,
  auto_pass_ends_until_date: '',
  auto_list_from: 0,
  // limit=0 — same payload the sidebar's lightweight refresh uses
  // (useAutoData.updateUserDataOnly), so we see exactly what the
  // sidebar would see after re-mount.
  auto_list_limit: 0,
};

const res = await fetch(URL, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});
const text = await res.text();
let data;
try { data = JSON.parse(text); } catch {
  console.error(`Non-JSON response (${res.status}):`, text.slice(0, 500));
  process.exit(2);
}

function describe(v) {
  if (v === undefined) return 'undefined';
  if (v === null) return 'null';
  return `${JSON.stringify(v)} (typeof ${typeof v})`;
}

console.log('── Top-level counters ──');
console.log(`  data.auto_list_count                = ${describe(data.auto_list_count)}`);
console.log(`  data.user_list?.length              = ${describe(data.user_list?.length)}`);
console.log(`  data.other_user_list?.length        = ${describe(data.other_user_list?.length)}`);

console.log('\n── data.user_data (ACTIVE organization) ──');
const ud = data.user_data || {};
console.log(`  firm                                = ${describe(ud.firm)}`);
console.log(`  inn                                 = ${describe(ud.inn)}`);
console.log(`  user_auto_count                     = ${describe(ud.user_auto_count)}`);
// Look for any sibling field that might also carry the count under a
// different name — defensive listing of all numeric-looking keys.
const numericLikeKeys = Object.keys(ud).filter(k => /count|auto|cars?|total|num/i.test(k));
if (numericLikeKeys.length > 0) {
  console.log('  (other count-ish fields on user_data:)');
  for (const k of numericLikeKeys) console.log(`    ${k.padEnd(34)} = ${describe(ud[k])}`);
}

console.log('\n── data.other_user_list (INACTIVE orgs) ──');
const others = Array.isArray(data.other_user_list) ? data.other_user_list : [];
if (others.length === 0) {
  console.log('  (empty — user has no other organizations)');
} else {
  others.slice(0, 5).forEach((o, i) => {
    console.log(`  [${i}] firm=${describe(o.firm)}`);
    console.log(`      user_auto_count             = ${describe(o.user_auto_count)}`);
  });
  if (others.length > 5) console.log(`  ... and ${others.length - 5} more`);
}

console.log('\n── data.user_list (other USERS in active org, if any) ──');
const ul = Array.isArray(data.user_list) ? data.user_list : [];
if (ul.length === 0) {
  console.log('  (empty)');
} else {
  ul.slice(0, 3).forEach((u, i) => {
    console.log(`  [${i}] firm=${describe(u.firm)}, user_auto_count=${describe(u.user_auto_count)}`);
  });
}

console.log('\n══ Verdict ══');
const activeCount = ud.user_auto_count;
const totalCount = data.auto_list_count;
const othersHaveCounts = others.some(o => typeof o.user_auto_count === 'number' || typeof o.user_auto_count === 'string');

if (activeCount === undefined || activeCount === null) {
  console.log(`  user_data.user_auto_count is MISSING (${describe(activeCount)}).`);
  console.log(`  data.auto_list_count = ${totalCount} — this is what the main screen shows.`);
  if (othersHaveCounts) {
    console.log(`  other_user_list[*].user_auto_count IS present.`);
    console.log(`  → confirmed asymmetry. Frontend fix: read auto_list_count for the active row.`);
  } else {
    console.log(`  other_user_list either empty or also missing the field.`);
    console.log(`  → cannot infer; if other orgs are missing, backend doesn't ship the field anywhere.`);
  }
} else if (activeCount === 0 && totalCount > 0) {
  console.log(`  user_data.user_auto_count = 0 but data.auto_list_count = ${totalCount}.`);
  console.log(`  → backend ships the field but with a wrong value (zero) for the active org. Same fix applies.`);
} else if (Number(activeCount) === Number(totalCount)) {
  console.log(`  user_data.user_auto_count = ${activeCount} matches auto_list_count = ${totalCount}.`);
  console.log(`  → API is fine. The "0 in sidebar" symptom must be a frontend rendering issue.`);
} else {
  console.log(`  user_data.user_auto_count = ${activeCount} vs auto_list_count = ${totalCount}.`);
  console.log(`  → mismatch in source of truth — investigate which one the user actually expects.`);
}

console.log('\nDone.');
