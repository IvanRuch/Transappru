# AutoListScreen redesign

**Status:** draft
**Created:** 2026-04-23
**Last updated:** 2026-04-30
**Scope:** web first, mobile follow-up

> **2026-04-30 re-validation:** Phase 1 issue list re-checked against
> master after PRs #11–#19. **All 9 P0–P3 items remain open** — none of
> the recent merges touched the planned pain-points. Touches in the
> scope files were unrelated:
> - PR #11 (`feat(web): production-ready head, favicon, security headers + UX fixes`) — head/favicon/security; the "UX fixes" were not auto-list redesign work.
> - PR #12 (`feat(auto): sort vehicle list by main numeric segment of plate`) — `useAutoData` only, not the screen UI.
> - PR #13 (`feat(push): web push restored`) — push notifications, separate concern.
> - PR #15 (`feat(web): submit auth/PIN/INN forms on Enter key press`) — auth screens, not auto-list.
> - PR #16 (`fix(sidebar): show correct car count for the active organization row`) — point fix on `WebSidebar.tsx`, see new "keep" entry below.
> - PR #17 (`test: MSW infrastructure + useAutoData coverage (Phase 1)`) — test infrastructure + characterisation tests; no behaviour change.
> - PR #18 (`feat(banner): per-provider data-source status banner (web + mobile)`) — adds a top-sticky banner above the screen, doesn't restructure it; integrates with `useAutoData` loaders only.
> - PR #19 (`build(android): patch node binary path resolution for GUI Gradle sync`) — Android Gradle build fix only.
>
> When picking up Phase 2 (Brief for Claude Design), the issue list is
> still the right starting input.

## Goal

Improve the main authenticated screen (vehicle list + side menu) on web,
while preserving all existing functions and mobile/web parity (ADR-003).

## Scope

### In scope
- `src/screens/auto/AutoListScreen.web.tsx` — web screen
- `src/components/web/WebSidebar.tsx` — side menu (web)
- Sub-components in `src/components/auto/` that this screen renders:
  `AutoListItem`, `AutoListFilterChips`, `AutoCountToolbar`,
  `AutoListEmptyState`, `FindAutoPanel`, `AutoListMenu`
- Design tokens in `tailwind.config.js` if needed
- Writerside: `dev-web.md`, `decision-log.md` (new ADR)

### Out of scope (for this iteration)
- Mobile `AutoListScreen.tsx` + `LeftMenuModal.tsx` — document parity
  implications but don't touch until web is validated
- Business logic in `useAutoActions.ts`, `useAutoData.ts` — stays unchanged
- API endpoints — unchanged
- Payment / Pass / Charges flows — only entry points from this screen may shift

## Phase 1 — Diagnosis (current)

Goal: produce an evidence-based list of UX and technical issues BEFORE
any redesign work in Claude Design.

Method:
- `/critique` skill on `AutoListScreen.web.tsx` + sidebar — UX pain points,
  information hierarchy, anti-patterns, cognitive load
- `/audit` skill on the same — a11y (WCAG AA), contrast, touch targets,
  ARIA, responsive behaviour, performance hotspots

### /critique findings

**Nielsen Heuristics total: 19/40 — Fair** (mid range for real-world UIs).
Lowest-scoring heuristics: Flexibility/Efficiency (1), Help/Documentation (1).

**What's working (keep)**
- Org switcher as radio-list with optimistic swap (`WebSidebar.tsx:385-416`)
- Grid stretching `alignSelf: stretch + fillHeight` for equal card heights
- Sidebar request lifecycle (AbortController latest-wins + visibility refetch)
- **Sidebar active-org car count = `auto_list_count` substitution** (added
  in PR #16, 2026-04-30). Backend omits `user_auto_count` from
  `data.user_data` for the active org but ships it on every entry of
  `other_user_list`; sidebar fills the gap from the top-level
  `auto_list_count` (same number the main screen shows). Same shape on
  web (`WebSidebar.tsx`) and mobile (`LeftMenuModal.tsx` via
  `autoListCount` prop from `AutoListScreen.tsx`). **Don't break this in
  Phase 5 implementation** when the WebSidebar gets restructured —
  re-validate by clicking the active org row and confirming the count
  matches `AutoCountToolbar` on the main screen.
- **`useAutoData` loaders → `reportProviderResult` reporting** (added in
  PR #18, 2026-04-30). The 4 detail loaders (`loadPasses`,
  `loadDiagnosticCard`, `loadFines`, `loadOsago`) report success/failure
  to `src/utils/providerHealth.ts` after each resolve/reject — feeds
  the per-provider `<DataProviderStatusBanner/>`. **Don't strip these
  calls during Phase 5 rewrite of the data-fetching layer** — the
  banner depends on them; if the rewrite changes loader signatures,
  port the `reportProviderResult` calls over.
- **`useAutoData` test characterisation** (PR #17, 2026-04-30). 7
  jest cases over MSW infrastructure capture current behaviour of
  load / cache / pagination / 401 / reset / org-list surface. Phase 5
  refactors of `useAutoData` should keep these tests passing as a
  behaviour-preservation contract; if a behavioural change is
  intentional, update the tests in the same commit with a clear note.

**AI-slop verdict:** not AI-generated — honest hand-authored legacy UI mid-way
through NativeWind migration. Tells against AI: inconsistent paradigms,
Russian inline comments, numeric-flag fields.

### /audit findings (deterministic)

Impeccable CLI: exit 0 (no built-in anti-pattern hits — no gradients,
glassmorphism, etc). Custom grep-heuristics against `src/CLAUDE.md` rules
surfaced ~50 call-outs across 6 files:

- **Hardcoded hex in JSX / inline styles** (violates NativeWind rule §1):
  - Heavy: `FindAutoPanel.tsx` (19+ hex), `AutoListItem.tsx` (status color map),
    `WebSidebar.tsx` (5 module-level constants + 6 inline)
  - Light: `AutoListScreen.web.tsx`, `AutoCountToolbar.tsx`
  - Clean: `AutoListEmptyState.tsx`, `AutoListFilterChips.tsx`
- **Missing `accessibilityLabel`** on `Pressable` / `TouchableHighlight`:
  every target file except `AutoListEmptyState.tsx`. Biggest: the main
  card tap target in `AutoListItem.tsx:67`.
- **`FlatList` / `ScrollView` without `keyboardShouldPersistTaps`**:
  `AutoListScreen.web.tsx:232`, `WebSidebar.tsx:285`, `FindAutoPanel.tsx:104`
- Hardcoded fixed width `120` in `FindAutoPanel.tsx:372`

### Synthesized issue list (P0 → P3)

| Pri | Issue | Anchor | Suggested command |
|-----|-------|--------|:-----------------:|
| **P0** | `AutoListItem` is an info-firehose — ~9 equal-weight horizontal bands (pass, days, pass2, days2, status, debt, tabs×2, details×5). Plate + primary status have no hierarchy over noise. 4-col grid at 1920px = 4 walls of competing text. | `AutoListItem.tsx:66-465` | `/distill` |
| **P0** | Whole-card tap = select (landmine). `Pressable onPress={() => onMark(item, index)}` is the outer wrapper ALWAYS — not only in pass-mode. First-timers tap plate expecting "open", get marked instead. Tiny arrow at `:79-86` is the only "open details" affordance. | `AutoListItem.tsx:67-70` | `/clarify` |
| **P1** | Sidebar cognitive load. Expanded: 11+ top-level items, all same visual weight. Collapsed: 10+ near-identical mono-tone icons, no tooltips. **"Пропуск" sidebar item opens `AddAutoModal`** (comment acknowledges label mismatch) — that's a bug, not just UX. Tools vs navigation not differentiated. | `WebSidebar.tsx:287-444` | `/arrange` |
| **P1** | Pass-mode selection has no "you are in selection mode" chrome. No counter (`Выбрано: N`), no select-all, no bulk invert, no ESC exit. Footer CTA materialises only when `markedCnt > 0`. | `AutoListScreen.web.tsx:260-284` | `/onboard` |
| **P2** | Filter panel (`FindAutoPanel`) is a `react-native-modal` bottom-sheet — correct metaphor on mobile, wrong on 1920px canvas. Should be right-side drawer or popover. Filter funnel icon hidden until list is non-empty. | `FindAutoPanel.tsx` used from `AutoListScreen.web.tsx:188-191` | `/adapt` |
| **P2** | Design-system drift. ~50 hardcoded hex colors in JSX/inline styles across 6 files — violates `src/CLAUDE.md` NativeWind rule. Biggest: `AutoListItem`, `FindAutoPanel`, `WebSidebar`. | (listed above) | `/normalize` |
| **P2** | A11y gaps. Interactive elements lack `accessibilityLabel`/`aria-label` — card, sidebar rows, filter chips, header buttons. Keyboard nav on grid not verified. | all target files | `/harden` |
| **P3** | Status surface ambiguity — 5 color-coded pills carry critical meaning with no legend, no tooltips, acronyms (ОСАГО/ДК/РНИС/СК) unexpanded. | `AutoListItem.tsx` status cells | `/clarify` |
| **P3** | Header double-surfaces debt info (icon button + inside each card). "Наши услуги ▲/▼" uses unicode in label strings (`WebSidebar.tsx:322`). `🔍` emoji as search icon inconsistent with PNG icon language. | multiple | `/polish` |

### Persona red flags (auto-selected)

- **First-timer (invited, 0 cars):** Empty-state "нажмите кнопку выше" with no arrow/highlight. "Добавить авто" button is low-contrast text+pencil. Sidebar looks full of features they can't use.
- **Fleet manager (50+ vehicles):** No bulk, no sorting, no saved filters, no "only problems" preset. Column count caps at 4. Scanning is linear-time.
- **Driver/dispatcher (not tech-savvy):** Acronym-heavy card (ОСАГО ДК РНИС СК). Red-green pills with no legend. `mode=pass` drops into selection with no explanation.

## Phase 2 — Brief for Claude Design

_to be written after Phase 1 synthesis_

## Phase 3 — Claude Design iteration

_..._

## Phase 4 — Validation

_..._

## Phase 5 — Implementation

_..._ (feature branch: `redesign/auto-list-screen`)

## Phase 6 — Rollout

_..._

## Open questions

- Какие существующие функции этого экрана пользователи используют ЧАЩЕ всего?
  (нет данных аналитики; делать обоснованные предположения)
- Есть ли жалобы от пользователей на сложность / непонятность / лишние клики?
- Насколько агрессивно можно менять mental model
  (радикальный редизайн vs эволюция)?

## Notes

- Respect ADR-003 (business logic in hooks) + ADR-005 (shared sub-components)
- Web layout already provided by `_layout.web.tsx` (no `<WebAppLayout>` wrap)
- Mobile pair exists — after web is validated, mirror to mobile
