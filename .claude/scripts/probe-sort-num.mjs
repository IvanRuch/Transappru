#!/usr/bin/env node
// Phase 0 probe for /get-auto-list `sort=num` parameter.
//
// Goal: empirically determine
//   1) does the backend understand the `sort` parameter at all?
//   2) where to place it — body or query string?
//   3) does the backend semantics match our frontend (sortAutoListByPlateNumber)?
//   4) does pagination follow the same order?
//
// Usage:
//   TOKEN='<your token from DevTools localStorage on transapp-dev.ru>' \
//     node .claude/scripts/probe-sort-num.mjs
//
// The script does NOT modify anything — pure read against production API.

const TOKEN = process.env.TOKEN;
if (!TOKEN) {
  console.error('Set TOKEN env var: TOKEN=... node .claude/scripts/probe-sort-num.mjs');
  process.exit(1);
}

const URL = 'https://transapp.ru/api/get-auto-list';
const LIMIT = 15;

// Mirror plateHelpers.ts:plateSortKey + compareByPlateNumber so we can
// predict what our frontend WOULD produce on the same dataset.
const PLATE_DIGIT_RUN = /\d+/;
function plateKey(plate) {
  if (!plate) return { primary: 0, secondary: '' };
  const m = PLATE_DIGIT_RUN.exec(plate);
  return { primary: m ? parseInt(m[0], 10) : 0, secondary: plate };
}
function frontendCompare(a, b) {
  const ka = plateKey(a.auto_number_base || a.auto_number);
  const kb = plateKey(b.auto_number_base || b.auto_number);
  if (ka.primary !== kb.primary) return ka.primary - kb.primary;
  return (a.auto_number || '').localeCompare(b.auto_number || '', 'ru');
}

async function fetchList({ label, url, body }) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch {
    return { label, error: `non-JSON response (${res.status}): ${text.slice(0, 200)}` };
  }
  if (data?.error) return { label, error: `api error: ${JSON.stringify(data)}` };
  return { label, items: data.auto_list || [], count: data.auto_list_count || 0 };
}

function plateLine(item, i) {
  const num = item.auto_number || '(no number)';
  const base = item.auto_number_base || '(no base)';
  return `  ${String(i + 1).padStart(2)}. ${num.padEnd(12)}  base=${base}`;
}

function printResult(r) {
  console.log(`\n── ${r.label} ──`);
  if (r.error) { console.log(`  ERROR: ${r.error}`); return; }
  console.log(`  total=${r.count}, returned=${r.items.length}`);
  r.items.slice(0, LIMIT).forEach((it, i) => console.log(plateLine(it, i)));
}

function ordersEqual(a, b) {
  if (a.length !== b.length) return false;
  return a.every((x, i) => (x.auto_number || '') === (b[i]?.auto_number || ''));
}

const baseBody = {
  token: TOKEN,
  auto_str: '',
  auto_cancelled: 0,
  auto_pass_ended: 0,
  auto_pass_ends: 0,
  auto_pass_ends_until_date: '',
  auto_list_from: 0,
  auto_list_limit: LIMIT,
};

const probes = [
  { label: '1) baseline — no sort param', url: URL, body: { ...baseBody } },
  { label: "2) sort:'num' in body", url: URL, body: { ...baseBody, sort: 'num' } },
  { label: "3) ?sort=num in query", url: `${URL}?sort=num`, body: { ...baseBody } },
  {
    label: "4) sort:'num' in body, page 2 (offset=" + LIMIT + ")",
    url: URL,
    body: { ...baseBody, sort: 'num', auto_list_from: LIMIT },
  },
];

console.log(`Probing ${URL} with limit=${LIMIT}…`);

const results = [];
for (const p of probes) {
  results.push(await fetchList(p));
}
results.forEach(printResult);

// Analysis — each check runs independently so one failed probe doesn't
// blank out unrelated comparisons.
console.log('\n══ Analysis ══');
const [r1, r2, r3, r4] = results;

function ok(r) { return r && !r.error && Array.isArray(r.items); }
function skip(label, reason) { console.log(`  ${label}: SKIP (${reason})`); }

if (ok(r1) && ok(r2)) {
  const eq = ordersEqual(r1.items, r2.items);
  console.log(`  baseline == body sort:    ${eq ? 'YES (param ignored or already same order)' : 'NO (body sort changed order — body format works)'}`);
} else {
  skip('baseline == body sort', `${ok(r1) ? '' : 'baseline failed'}${ok(r2) ? '' : ' body-sort failed'}`.trim());
}

if (ok(r1) && ok(r3)) {
  const eq = ordersEqual(r1.items, r3.items);
  console.log(`  baseline == query sort:   ${eq ? 'YES (param ignored or already same order)' : 'NO (query sort changed order — query format works)'}`);
} else {
  skip('baseline == query sort', `${ok(r1) ? '' : 'baseline failed'}${ok(r3) ? '' : ' query-sort failed'}`.trim());
}

// What frontend WOULD produce from baseline — useful even if r2/r3 errored.
if (ok(r1)) {
  const feFromBase = [...r1.items].sort(frontendCompare);
  console.log('\n  Predicted frontend(baseline) order:');
  feFromBase.slice(0, LIMIT).forEach((it, i) => console.log(plateLine(it, i)));

  if (ok(r2)) {
    const matches = ordersEqual(feFromBase, r2.items);
    console.log(`  body-sorted == frontend(baseline):  ${matches ? 'YES (semantics match)' : 'NO (semantics differ — compare lists above)'}`);
  } else {
    skip('body-sorted == frontend(baseline)', 'body-sort failed');
  }
}

// Page 2 should continue past page 1's last numeric value.
if (ok(r2) && ok(r4) && r4.items.length > 0) {
  const lastP1 = r2.items[r2.items.length - 1];
  const firstP2 = r4.items[0];
  if (lastP1 && firstP2) {
    const ka = plateKey(lastP1.auto_number_base || lastP1.auto_number);
    const kb = plateKey(firstP2.auto_number_base || firstP2.auto_number);
    const monotonic = kb.primary >= ka.primary;
    console.log(`  pagination monotonic across pages (server keeps order): ${monotonic ? 'YES' : 'NO'} (last p1 primary=${ka.primary}, first p2 primary=${kb.primary})`);
  }
} else if (ok(r4) && r4.items.length === 0) {
  console.log('  pagination check: SKIP (page 2 empty — fewer than LIMIT items in account)');
} else {
  skip('pagination check', 'page-2 probe failed');
}

console.log('\nDone.');
