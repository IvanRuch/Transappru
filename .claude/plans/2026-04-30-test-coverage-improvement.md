# Test coverage improvement

## Status

**Phase 1 completed** (2026-04-30, merged in PR #17 → master commit
`9921113`). MSW v2 infrastructure shipped; `useAutoData` covers 7
core cases. Latest-wins AbortController + 5-minute cache deferred to
a follow-up suite. Phases 2–5 still draft, awaiting their triggers.

### Phase 1 — what landed

- ✅ MSW v2 installed, jsdom env conditions overridden, polyfills wired
  in `jest-msw.setup.ts`, `__DEV__` global stubbed in `jest-setup.ts`.
- ✅ `src/test-utils/` package — server, default handlers, factories
  (`makeUserData`, `makeAutoItem`, `makeAutoList`,
  `makeGetAutoListResponse`), `index.ts` re-exports.
- ✅ Smoke suite — 3/3 PASS (default response, per-test override, reset).
- ✅ `useAutoData` test — 7/7 PASS: initial load, updateAutoItem (merge
  + sibling-isolation), loadMore + numeric merge order, 401 → token
  cleared, resetData, surfaces other_user_list + our_services_list.
- ⏭ Deferred from Phase 1: Latest-wins AbortController; 5-min cache.
  Both rationale-documented in the test file's top comment; pick up
  as separate suite when worth the time.
- 📊 At end of Phase 1: 14 suites / 83 tests → 16 / 93 (after merge of
  Phase 1 of `data-provider-health` plan, total on master is now
  17 / 105 — `providerHealth` adds 12 cases on top).

### Phase 1.x follow-ups (post-merge, low priority)

- Add `useDataProviderHealth` hook + `<DataProviderStatusBanner/>` UI
  tests when jsdom + RN render story stabilises (currently both
  deferred — see notes in `data-provider-health.md` plan).
- Latest-wins + 5-min cache `useAutoData` suite.

## Background

Self-audit on 2026-04-30 of the test estate. Question we asked ourselves:
"can we honestly call current coverage the best professional level?"
Answer: **no, it's a pragmatic minimum**. This plan captures the gap so
that when the trigger event arrives (team growth, prod release, backend
churn) we have a ready prioritised path instead of starting from scratch.

Out of scope by explicit decision (see `session-state.md` 2026-04-29 +
`deploy-web.yml` smoke job): **Playwright E2E**. Replaced by post-deploy
curl smoke. This plan does NOT propose adding it back.

## Current state (snapshot 2026-04-30)

```
Frontend (src/)
  utils:        12 src files,  6 with tests   = 50%
  hooks:        25 src files,  7 with tests   = 28%
  components:   65 src files,  0 with tests   = 0%
  screens:      53 src files,  0 with tests   = 0%
  services:      6 src files,  0 with tests   = 0%
Backend (payment-service/app/)
  endpoints:     8 src files,  2 test files   = ~25%
                 (only /notify signature + /health, /health/ready)

Total: 14 frontend test files / 83 tests + 2 backend / 10 tests.
Stack: Jest 29.7 (frontend), pytest + AsyncTestClient (backend).
CI gating: tests must pass; **no coverage threshold**.
```

## What we cover well

- `plateHelpers` (Cyrillic/Latin normalisation + numeric sort comparator,
  11 cases on sort)
- 7 hook state-machines: `useInnBinding`, `useRnisCheck`,
  `useWebPushPermission` (full state machine, 11 cases), `usePassOrder`,
  `useUserProfile`, `useDriverList`, `useNotificationList`
- Helpers: `passMapBridge`, `switchOrganization`, `navigateToInn`, `alert`
- Backend `/notify` Kazna webhook signature (md5) + 4 HTTP cases
- Backend `/health` + `/health/ready` (3 cases)

## Critical gaps (in priority order — read top-to-bottom when picking up)

1. **`useAutoData`** — central hook (~530 LOC, multiple state machines:
   load / cache / filter / pagination / org-switch / AbortController /
   latest-wins). If it breaks, the whole auto flow breaks. **No tests.**
2. **`useAuthFlow`** — primary auth path (phone, validation, async
   submit, isCheckingToken, modalWaitConfirmation). No tests.
3. **`usePinConfirm`** — auth step with network race conditions. No tests.
4. **`useCharges` + `useChargesSelection` + `usePaymentConfirm`** —
   **financial flows**, highest business-risk area. No tests.
5. **Backend payment endpoints** — `/calculate-commission`,
   `/payment-status`, `/payment-info`, `/create-payment` — only `/notify`
   webhook signature is covered. Sums/commissions logic untested.
6. **API client (`services/api.ts`)** — interceptors, auth header
   injection, refresh logic. If it breaks, everything breaks. No tests.
7. **All components (65) and screens (53)** — zero tests. No snapshot,
   no RTL behaviour tests on forms / modals / lists.

## Strategic infrastructure missing

- **Coverage threshold in CI**. `npm test` currently passes at 5% and at
  95% identically. No drop detection.
- **API mocking infrastructure** (e.g. MSW). Without it, network-dependent
  hooks are painful to test — direct cause of items 1–4 above being
  uncovered.
- **Test data factories**. Each test builds fixtures by hand, repeatable
  yields are low.
- **Component snapshot baseline**. Even basic regression detection on UI
  is absent.
- **Integration tests** on critical flows (Auth → INN → AutoList;
  AutoList → fine → PaymentConfirm). Currently manual QA only.

## Phase 1 — `useAutoData` tests + MSW infrastructure (biggest ROI)

Why first: highest-traffic hook, central to every authenticated screen,
most regression-prone, and brings MSW into the project (unblocks 2 + 3 +
4 + 5).

Steps:
- Add MSW (`msw` + `@mswjs/data` for factories) to dev-deps. Configure
  for jest-environment-jsdom.
- Create `src/test-utils/`: `setupServer.ts`, `factories/userData.ts`,
  `factories/autoItem.ts`, `factories/getAutoListResponse.ts`.
- `src/hooks/__tests__/useAutoData.test.tsx` covering:
  - Initial load: empty → loading → list rendered
  - Filter: debounce, cache restore on clear, server fetch on >= 3 chars
  - Pagination: load-more appends + correct merge order
  - Cache: 5-min lifetime, invalidation on refresh
  - 401 → redirect
  - Latest-wins AbortController (two requests in flight, only newer wins)
  - Active org switch (via `switchOrganization`) reloads
  - `auto_list_count` string coercion (`"14"` → `14`)
- Estimated effort: 1 dev day (most of it MSW setup + first hook).

## Phase 2 — Backend payment endpoints

Why second: financial operations, highest business-risk gap.

Steps:
- `tests/test_calculate_commission.py` — Kazna sandbox commission math
  (split: kazna_commission, transapp_commission, total_amount). Edge
  cases: 0, very large, currency precision.
- `tests/test_payment_status.py` — happy path + 404 on unknown id +
  status transitions (created → paid → cancelled).
- `tests/test_payment_info.py` — Kazna proxy with mocked HTTP.
- `tests/test_create_payment.py` — INSERT into payment_db, transaction
  isolation, idempotency by external id.
- Use existing `conftest.py` in-memory SQLite fixture pattern.
- Estimated effort: 1 dev day.

## Phase 3 — Coverage threshold in CI

Why third: locks in gains from phases 1–2 and any future tests.

Steps:
- Add `--coverage` flag to jest config + `coverageThreshold` block.
- Initial threshold: **whatever current is** + 0% (so we don't immediately
  fail). Baseline measurement first, then realistic target.
- Add `pytest --cov=app --cov-fail-under=N` to backend.
- Wire into `.github/workflows/test.yml` (or whichever CI step runs `npm
  test`); fail PR if coverage drops.
- Estimated effort: half a day.

## Phase 4 — Critical hooks (`useAuthFlow`, `usePinConfirm`, `useCharges*`, `usePaymentConfirm`)

Now that MSW is in (Phase 1), these become straightforward.

Steps:
- One test file per hook. Cover happy path + 1–2 most likely failure
  modes (network error, validation, race).
- Don't aim for 100% — aim for "wouldn't ship a regression silently".
- Estimated effort: ~2 hours per hook = 1 dev day for the four.

## Phase 5 — Snapshot tests on critical screens

Why last: weakest signal-to-noise of the bunch (snapshots are notoriously
churn-prone), but cheapest insurance against UI regression on screens
where regression hurts most.

Targets (4 screens):
- `AuthScreen` (web + native variants)
- `PinScreen` (web + native variants)
- `AutoListScreen` (header + list item)
- `PaymentConfirmScreen` (the money button)

Steps:
- Use `react-test-renderer` (already in deps).
- Snapshot the rendered tree for: empty / loading / loaded / error
  states each.
- Document in `dev-screen-conventions.md` how to update snapshots
  intentionally (`jest -u` after visual diff review).
- Estimated effort: half a day for the four.

## Open questions (resolve at pickup time)

1. **Coverage threshold values** — set to current baseline + 0% initially,
   or aim for round numbers (utils 80% / hooks 60% / endpoints 80%)?
2. **MSW vs alternatives** — MSW is industry-standard but heavy; for a
   single-dev project we could also do `jest.mock('axios')` patterns.
   Decision affects Phase 1 scope.
3. **Backend tests against real Kazna sandbox or fully mocked** — sandbox
   is rate-limited and external; mocks isolate but lose contract
   verification. Probably mock + a single nightly contract job.
4. **Snapshot tests on web (`.web.tsx`) or only native (`.tsx`)?** —
   double the snapshots if both, but native baseline gives mobile
   regression detection.

## Triggers — when to start

Pick the **earliest** that fires:

- **Team grows beyond 2 devs** → start Phase 3 first (lock the bar before
  contributors can lower it).
- **First production release** → start Phase 2 (financial ops untested
  in prod = unacceptable risk).
- **Backend asks for big shape change to `/get-auto-list` or payment
  endpoints** → start Phase 1 + 2 (test cover before refactor).
- **Major regression caught in prod** → start whichever phase covers the
  affected area.
- **Calm sprint with no feature pressure** → start Phase 1 (highest ROI
  per hour).

## Won't do (explicit non-goals)

- **Playwright E2E** — already decided against in 2026-04-29 (over-engineering
  for single-dev cadence; replaced by post-deploy curl smoke in
  `deploy-web.yml`). Do NOT revisit unless team size or release cadence
  changes drastically.
- **100% line coverage chase** — diminishing returns, brittle tests.
  Aim for "every meaningful branch + every state machine transition"
  rather than line-coverage absolutism.
- **Storybook** — separate UI-development tool, not strictly testing.
  Different conversation.
- **Full RTL behaviour tests on every component** — out of proportion
  to project size. Snapshots (Phase 5) are the cheaper substitute.

## How to use this plan

When you decide to start, read the **Triggers** section first to pick
the right phase, then the relevant Phase block (each one is
self-contained). Phase 1 is a hard prerequisite for Phases 4 and 5
(needs MSW). Phases 2 and 3 are independent of Phase 1.
