# Data provider health & user transparency

## Status

**Phase 1 completed** (2026-04-30, merged in PR #18 → master commit
`f85c16b`). Tactical first step shipped: per-provider banner
(`DataProviderStatusBanner` + `providerHealth` rolling-window state
machine + `useDataProviderHealth` subscriber + 4 loader integration
points in `useAutoData` + 12 unit tests). Strategic phases 2–5 stay
draft until backend coordination + first prod measurements provide
their respective triggers (see "Triggers — when to start each phase"
section at the bottom).

## Background

TransApp displays vehicle data (fines / OSAGO / diagnostic card / RNIS
/ tolled roads / passes) sourced from third-party providers via our
backend. Per contract, providers guarantee endpoint uptime but **not**
data freshness or completeness. Some providers parse official sites
(scrape-fragile); others (eKazna-class) hit interagency state APIs that
themselves go down. **Clients are leaving us over unreliable data.**

Audit on 2026-04-30 showed the symptom is silent:
- `passes` and `diagnostic-card` retry 3× with 5s delay on
  `in_progress === 1`, then **silently give up** — UI shows empty / stale.
- `fines` and `osago` have **no retry at all** — single failure → empty UI.
- `rnis` and `avtodor` (web detail screen) — same one-shot pattern.
- `/get-auto-list` response carries no system-level status field.
- No `/system-status` or `/health/dependencies` endpoint on main backend.
- Frontend has no aggregation, no banner, no notification of any of this.

Net effect: a client whose fines provider is down sees "0 fines" and
believes everything is fine, then gets surprised by a real notice.
That's the trust hit we're paying for in churn.

## Goal

End state: a client whose data is degraded **knows it**, and trusts us
because we tell them honestly. Same UX on web and mobile. Surface should
be unobtrusive — never blocks the app, never overlays content.

## Architecture decision: hybrid trigger

**Phase 1 (this PR)**: pure frontend detection. Track success/failure
of every per-provider endpoint call in a module-level event emitter,
roll a sliding window, surface a banner when ≥1 provider is degraded
or down.

**Phase 2 (separate, after backend coord)**: backend adds
`system_notice` field to `/get-auto-list` response. Frontend prefers
backend signal when present, falls back to frontend detection
otherwise. Backend signal is precise (it sees the upstream); frontend
detection covers the case when backend itself doesn't know yet.

This split lets us ship value to clients today without blocking on
backend changes (same hybrid pattern we used for the auto-list sort).

## Phase 1 — frontend detection + per-provider banner (this PR)

### Files

- `src/utils/providerHealth.ts` — pure module:
  - `reportProviderResult(provider, success: boolean)` — call from
    every per-provider request resolution
  - rolling 60s window per provider (configurable constant)
  - state machine per provider: `unknown | ok | degraded | down`
    - `unknown`: 0 attempts in window
    - `ok`: ≥1 attempt and failure rate < 30%
    - `degraded`: failure rate 30–80% **or** 2 consecutive failures
    - `down`: failure rate ≥ 80% **or** 3+ consecutive failures
  - `getStatus(): Record<provider, status>` — snapshot
  - `subscribe(listener): () => void` — change notification
  - Exported `PROVIDER_LABELS` map (RU): `fines → 'штрафы ГИБДД'`,
    `osago → 'ОСАГО'`, `diagnostic_card → 'диагностическая карта'`,
    `passes → 'пропуска'`, `rnis → 'РНИС'`, `avtodor → 'платные дороги'`

- `src/hooks/useDataProviderHealth.ts` — React hook subscriber
  - Returns `{ degradedProviders, downProviders, hasIssues }`
  - useSyncExternalStore subscription, no polling, no Context
  - Reports re-render only when status genuinely changes

- `src/components/DataProviderStatusBanner.tsx` — cross-platform UI
  - Renders null if no issues OR session-dismissed
  - Top-sticky amber/yellow strip (#FFC107 or token), height 36px
  - Text: "Временные перебои: <list>" (joined provider labels)
  - Right side: small "✕" button → sessionStorage flag
  - Tappable to expand into a sheet with per-provider rows + current state
    (degraded vs down) — keep minimal in v1, plan note for v2

- `src/components/DataProviderStatusBanner.web.tsx` — web override only
  if positioning needs to differ (likely not — same component works)

- `src/utils/__tests__/providerHealth.test.ts` — threshold transitions:
  - empty → `unknown`
  - 1 success → `ok`
  - 2 consecutive failures → `degraded`
  - 3 consecutive failures → `down`
  - mixed within window → failure-rate math
  - rolling window expiry (use jest fake timers)
  - per-provider isolation (one fail doesn't affect another)
  - subscribe/unsubscribe lifecycle

- `src/hooks/__tests__/useDataProviderHealth.test.ts` — hook returns
  what providerHealth says + re-renders on subscribe events

### Integration

- `src/hooks/useAutoData.ts`:
  - `loadPasses` — `reportProviderResult('passes', success)` after each
    response (success = `!error && in_progress !== 1`); on retry
    exhaust → report failure
  - `loadDiagnosticCard` — same shape
  - `loadFines` — currently no retry; add `reportProviderResult('fines', ...)`
    based on `data.error` presence in response
  - `loadOsago` — same as fines
  - `.catch` blocks always report failure

- `app/_layout.tsx`:
  - Mount `<DataProviderStatusBanner />` next to `<NetworkStatusBanner />`
    so both live in the same root slot

### Tuning constants (defaults, all configurable in providerHealth.ts)

```ts
const WINDOW_MS = 60_000;             // rolling 60s
const DEGRADED_FAILURE_RATE = 0.30;   // ≥30% in window
const DOWN_FAILURE_RATE = 0.80;       // ≥80% in window
const DEGRADED_CONSECUTIVE = 2;       // OR 2 consecutive fails
const DOWN_CONSECUTIVE = 3;           // OR 3 consecutive fails
```

Conservative on purpose (don't cry wolf). Tune after first prod run.

### Dismiss behaviour

- `sessionStorage` flag `ta_provider_status_dismissed_v1`. While set,
  banner stays hidden **even if** new providers go down.
- Reset on new browser session (close tab → reset).
- On native: module-level `let` flag (no AsyncStorage; fresh on app
  cold-start).
- Auto-show again if hidden + a fresh provider transitions ok→down
  AFTER dismiss (i.e. dismiss is for the current outage, not for "all
  future outages").

### What we deliberately do NOT do in Phase 1

- No backend ask. Not a blocker for the value of Phase 1.
- No per-provider drill-down screen. Plan note for Phase 3.
- No "data freshness" age indicator on individual cards. Phase 4.
- No recovery toast ("штрафы снова работают"). Phase 5.
- No telemetry to product analytics. Could add when we have analytics.

## Phase 2 — backend `system_notice` contract

When backend can ship status. Add to `/get-auto-list` response:

```json
{
  "system_notice": {
    "level": "info" | "warning" | "error",
    "message": "Штрафы временно недоступны",
    "providers": ["fines"],          // optional, used if present
    "expires_at": "2026-12-31T15:30:00Z"
  }
}
```

Frontend preference order in banner: backend `system_notice` >
frontend-detected degraded list > nothing.

When backend says "ok" (no `system_notice`) but frontend detects
degraded — show frontend version (backend may not yet know). When both
present — backend wins.

## Phase 3 — per-provider drill-down

Banner taps open a modal listing each provider with its current state,
last successful update time, and a "Обновить" button per row that
forces re-fetch. Useful for support: client says "штрафы не приходят",
user can show this screen as evidence.

## Phase 4 — stale-data indicator on cards

Badge "Обновлено N часов назад" on AutoListItem when the relevant data
field on the item has a `last_fetched_at` older than threshold (TBD —
1h for "fresh", 24h+ for "stale", separately per data type because
fines refresh weekly while RNIS could be daily).

Requires backend to ship `last_fetched_at` per data field, OR frontend
to track per-item-per-field success timestamps locally.

## Phase 5 — recovery notification

When a provider transitions down → ok and the banner was visible,
swap the banner to green "✓ Данные восстановлены" for 5s, then hide.
Avoids leaving stale red/amber UI when problem is solved.

## Open questions (resolve at pickup time)

1. **Banner colour token**: amber (#FFC107) vs softer yellow vs branded
   accent? Should align with future design tokens — coordinate with
   Phase 1 of the auto-list redesign plan if it lands first.
2. **Mobile banner placement**: under or over the safe-area top? Native
   StatusBar style change?
3. **Provider labels canonical list**: confirm Russian labels with
   product / manager team before shipping (can change without code
   change — they live in PROVIDER_LABELS constant).
4. **Telemetry**: when we adopt analytics, log every degraded/down
   transition + dismiss event so we can correlate with actual provider
   outages reported by partners.

## Triggers — when to start each phase

- **Phase 1**: now (this PR).
- **Phase 2**: when backend dev confirms readiness to add the field.
  Frontend Phase 1 lands first — backend can add later without
  breaking anything (Phase 1 falls back to its own detection).
- **Phase 3**: when a client support case calls for it ("покажите мне
  что у вас сломано"), or when product asks for explicit transparency.
- **Phase 4**: blocks on backend shipping `last_fetched_at` per data
  field; or when we start tracking it client-side as Phase 4 first
  sub-step.
- **Phase 5**: anytime after Phase 1 ships and we have one real outage
  observed in production — confirms the recovery transition is worth
  the polish budget.
