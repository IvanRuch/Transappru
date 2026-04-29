# Mobile App Development

<!-- Content to be migrated from /docs/ -->

## Stack

React Native 0.81.5 + Expo 54 + TypeScript 5.9 (strict) + NativeWind 4.

See `src/CLAUDE.md` for coding conventions and
[Screen Development Conventions](dev-screen-conventions.md) for the mandatory
screen / screen-pair playbook (ADR-003 shared hooks, ADR-005 shared UI,
NativeWind styling rules, prod-ready web checklist).

## Project Structure

- `app/` — Expo Router file-based routes
- `src/components/` — reusable components
- `src/hooks/` — custom hooks
- `src/services/` — API and integrations
- `src/screens/` — screen logic
- `src/contexts/` — React Context providers
- `src/config/` — feature flags

## Feature Flags

<!-- Document feature flags from src/config/features.ts -->

## Screens

<!-- Document key screens and their routes -->

## Auto list ordering

Vehicle list is sorted by the **main numeric segment** of the licence
plate, not by the leading letter. Manager-team request: «`А456БВ77,
К123ОР99, М234ХА50` → `К123ОР99, М234ХА50, А456БВ77`» (123 < 234 < 456,
буквы и регион не учитываются).

| Sort key | Source field | Behaviour |
|----------|-------------|-----------|
| Primary  | first digit run of `auto_number_base` (fallback `auto_number`) | numeric ascending |
| Secondary (tie-break) | full `auto_number` | `localeCompare(_, 'ru')` for stable Cyrillic ordering |

### Where it lives

- Single source of truth: `sortAutoListByPlateNumber()` in
  `src/utils/plateHelpers.ts` (alongside `plateSortKey` and
  `compareByPlateNumber`).
- Wired into `src/hooks/useAutoData.ts` in three spots — initial set,
  cache write, pagination append. The shared hook is consumed by both
  `AutoListScreen.tsx` and `AutoListScreen.web.tsx`, so mobile and web
  see identical order without per-screen code.
- Sort is **immutable** (`[...items].sort`) — does not mutate the
  fetched array, keeps React's reference-based change detection clean.
- **Idempotent**: if the legacy `/get-auto-list` backend ever adopts the
  same numeric order, our sort becomes O(n) on already-sorted input
  (Timsort) — no rollback needed.

### Why frontend, not backend

The list comes from the legacy `/get-auto-list` service on
`ivan.trans-konsalt.ru` / `transapp.ru` — separate team, separate repo.
Coordinating a release there is high-friction. Frontend post-sort runs
on the already-fetched array (fleet sizes are dozens, not thousands —
< 1 ms) and ships immediately for both platforms.

### Pagination caveat

Because the backend paginates lexicographically, pressing "load more"
fetches the next 30 server-side and we re-merge the result into the
numeric order on the frontend. The window may shift slightly when more
data is loaded, but this is invisible at typical fleet sizes (one
organisation rarely has > 100 vehicles). When that ever becomes a
problem the right fix is to add `sort_by=plate_digits` on the backend.

### Tests

`src/utils/__tests__/plateHelpers-sort.test.ts` — 11 cases covering
`plateSortKey`, `compareByPlateNumber`, and `sortAutoListByPlateNumber`:
extraction, region irrelevance, alphabetical tie-break, missing
`auto_number_base` fallback, empty input, immutability, idempotency.

## Planned Improvements

| Task | Screen | Description |
|------|--------|-------------|
| OTP-style PIN input | `screens/auth/PinScreen.tsx` | Replace single TextInput with 4 separate digit fields (as done in `PinScreen.web.tsx`). Auto-advance on input, backspace returns to previous field, paste support. |
