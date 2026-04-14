# Project Dashboard

> Last updated: 2026-04-14

## Current Focus

<!-- Update this section after each work session -->

| Area | Status | Notes |
|------|--------|-------|
| Mobile App | 🔄 Active development | v2.0.17, Expo 54 |
| Payment Service | ✅ Deployed | Kazna API integration |
| Web Version | 🔄 Active development | Expo Web, all screens + payment flow + pass ordering done, CI/CD configured |
| Legacy Web | ⚠️ In production | `/transappweb/` — to be replaced |
| Legacy Mobile | 📦 Archive | `/Transappru/` — reference only |
| Documentation | 🔄 Migration to Writerside | From /docs/ markdown |

## Recent Changes

- **2026-04-14**: Web: Yandex Maps JS API v3 for address selection on map (ADR-004) — PassYaMapScreen.web.tsx with zone polygons (МКАД/ТТК/СК), click-to-select address, shared polygon data extracted to src/data/moscowZonePolygons.ts. PassScreen.web.tsx: map button (📍), WebAppLayout double-sidebar fix
- **2026-04-14**: Refactoring: 8 shared hooks extracted from 16 screen pairs (ADR-003) — useAuthFlow, usePinConfirm, useOnboardingFlow, useNotificationList, useChargesSelection, usePaymentConfirm, useInnBinding, usePassOrder + plateHelpers utility + useNotificationSettings fix. InnScreen and PassScreen converted from class to functional components. Screen-layer reuse ~65-70%
- **2026-04-14**: AddAutoModal: GRZ input validation in useAutoActions.ts — Cyrillic-only letter filter (АВЕКМНОРСТУХ), Latin→Cyrillic auto-conversion, digits-only region code, uppercase normalization; Safari autofill fix (strip RN-generated attributes + CSS pseudo-element hiding); placeholder alignment (Platform.select); click-outside-to-close overlay; gray placeholders
- **2026-04-14**: Web: pass ordering flow — sidebar "Пропуск" now matches mobile behavior: AutoListScreen?mode=pass (auto-opens AddAutoModal, card click marks vehicles, footer "Заказать пропуск (N)") → PassScreen with selected vehicles. Removed self-loading fallback, added empty state redirect
- **2026-04-14**: Web: in-app navigation screens — AutoFineScreen.web.tsx (fine details, payment button), PaymentConfirmScreen.web.tsx (commission calc, FIO validation, custom toggle, inline errors), FinePaymentSuccessScreen.web.tsx (success + navigation), PassScreen.web.tsx (2-stage address autocomplete, zone tabs МКАД/ТТК/СК, vehicle list, /add-address order)
- **2026-04-14**: CI/CD: Docker deploy pipeline for Web + Payment to Yandex Cloud COI VM — nginx/Dockerfile.prod (multi-stage Expo Web build), payment-service/Dockerfile.prod (gunicorn), docker-compose.yc.yaml, GitHub Actions workflow (deploy-web.yml), SSL via Yandex Certificate Manager, api.web.ts payment URL made dynamic
- **2026-04-14**: Web: all sidebar-linked screens now have `.web.tsx` versions — DriverListScreen (wraps DriversTab), NotificationListScreen (click-to-mark-viewed), NotificationSettingsScreen (two-level toggle tree with optimistic updates), ChargesScreen (grouped fines by auto, filter pills, SHOW_PAYMENT_UI selection+footer), UserScreen (profile: org data, contact CRUD, logout, delete profile). AutoDetailScreen.web.tsx — 8-tab vehicle detail screen, 13 sub-components. Fix: onboarding redirect loop — localStorage+sessionStorage persistence
- **2026-04-13**: Web: logout fix (token removal), first-login flow (onboarding redirect + "Наши услуги" modal from /get-auto-list), anti-loop guards. Phone input cursor fix, OTP-style PIN fields. Unified API client, InnScreen.web.tsx, inline search, sidebar fixes
- **2026-04-09**: Claude Code configuration setup — CLAUDE.md (4 files), 3 PostToolUse hooks, 7 slash commands, 2 custom skills, 46 external skills, 3 MCP servers (PostgreSQL + Playwright + Context7), Writerside structure (16 topics), agnix validation

## Next Tasks

1. ~~Decide web strategy~~ — done, ADR-001: Expo Web
2. Migrate key /docs/ content to Writerside topics
3. Configure and verify MCP servers (start Docker, test PostgreSQL query)
4. Set up test framework for mobile app (Jest/Vitest)

## Version History

| Version | Date | Key Changes |
|---------|------|-------------|
| 2.0.17 | current | ... |
| 2.0.15 | ... | Double listener protection, new payload data |
| 2.0.14 | ... | OSAGO button, web support |
